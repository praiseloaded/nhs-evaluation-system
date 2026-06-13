// app/api/jobs/cos-search/route.ts
//
// Accurate COS job search — cross-references NHS Jobs employer names against
// the official UKVI Register of Licensed Sponsors (gov.uk CSV).
//
// TIMEOUT FIX: The CSV is fetched in the background and cached. On first call,
// if the CSV hasn't loaded yet we return jobs with sponsorVerified: null and
// trigger a background load. Subsequent calls use the cache.

const GOV_UK_PUBLICATION = "https://www.gov.uk/government/publications/register-of-licensed-sponsors-workers"
const NHS_JOBS_BASE       = "https://www.jobs.nhs.uk/candidate/search/results"

// ─── In-memory cache ─────────────────────────────────────────────────────────
let sponsorCache: {
  names: Set<string>
  fetchedAt: number
  csvUrl: string
  totalSponsors: number
} | null = null

let loadingPromise: Promise<void> | null = null
const CACHE_TTL_MS = 24 * 60 * 60 * 1000

// ─── Normalise employer name ─────────────────────────────────────────────────
function normaliseName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(nhs foundation trust|nhs trust|health board|health & social care trust|hsc trust|university hospitals?|university hospital|hospitals? nhs|hospital|foundation trust|ltd|limited|llp|plc|cic|the|and|&|of|at|for)\b/g, ' ')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// ─── Match employer against sponsor set ──────────────────────────────────────
function matchesSponsor(employerName: string, sponsorNames: Set<string>): boolean {
  if (!employerName || employerName === 'NHS') return false
  const norm = normaliseName(employerName)
  if (!norm || norm.length < 4) return false

  if (sponsorNames.has(norm)) return true

  // Substring match — both sides must be >= 6 chars to avoid false positives
  if (norm.length >= 6) {
    for (const sponsor of sponsorNames) {
      if (sponsor.length >= 6 && (sponsor.includes(norm) || norm.includes(sponsor))) return true
    }
  }
  return false
}

// ─── Simple CSV line parser ───────────────────────────────────────────────────
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') { inQuotes = !inQuotes }
    else if (ch === ',' && !inQuotes) { result.push(current); current = '' }
    else { current += ch }
  }
  result.push(current)
  return result
}

// ─── Fetch + parse UKVI CSV ──────────────────────────────────────────────────
async function loadSponsorSet(): Promise<void> {
  try {
    console.log('[COS] Fetching UKVI register page...')

    // Get the current CSV URL from the publication page
    const pageRes = await fetch(GOV_UK_PUBLICATION, {
      headers: { 'User-Agent': 'NHSJobReadyAI/1.0' },
      signal: AbortSignal.timeout(15000),
    })
    if (!pageRes.ok) throw new Error(`gov.uk page returned ${pageRes.status}`)
    const html = await pageRes.text()

    const match = html.match(/https:\/\/assets\.publishing\.service\.gov\.uk\/media\/[^"'\s]+Worker_and_Temporary_Worker\.csv/)
    if (!match) throw new Error("Could not find CSV URL on gov.uk")
    const csvUrl = match[0]
    console.log('[COS] CSV URL:', csvUrl)

    // Download the CSV — large file, allow 60s
    const csvRes = await fetch(csvUrl, {
      headers: { 'User-Agent': 'NHSJobReadyAI/1.0' },
      signal: AbortSignal.timeout(60000),
    })
    if (!csvRes.ok) throw new Error(`CSV download returned ${csvRes.status}`)
    const text = await csvRes.text()

    const lines = text.split('\n')
    const names = new Set<string>()

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue
      const cols = parseCSVLine(line)
      if (cols.length < 5) continue

      const orgName    = cols[0]?.replace(/^"|"$/g, '').trim()
      const typeRating = cols[3]?.replace(/^"|"$/g, '').trim().toLowerCase()
      const route      = cols[4]?.replace(/^"|"$/g, '').trim().toLowerCase()
      if (!orgName) continue

      const isWorker   = typeRating.startsWith('worker ')
      const isRelevant = route.includes('skilled worker') || route.includes('health and care worker')
      if (isWorker && isRelevant) names.add(normaliseName(orgName))
    }

    sponsorCache = { names, fetchedAt: Date.now(), csvUrl, totalSponsors: names.size }
    console.log(`[COS] Loaded ${names.size} verified sponsors`)
  } catch (err) {
    console.error('[COS] Failed to load UKVI register:', err)
    loadingPromise = null // allow retry next request
    throw err
  }
}

async function getSponsorSet() {
  // Return cache if fresh
  if (sponsorCache && Date.now() - sponsorCache.fetchedAt < CACHE_TTL_MS) return sponsorCache

  // If already loading, don't start another fetch — return null (degrade gracefully)
  if (loadingPromise) return null

  // Start loading in background — don't await here to avoid request timeout
  loadingPromise = loadSponsorSet().finally(() => { loadingPromise = null })

  // Give it 8 seconds max before we return without waiting
  try {
    await Promise.race([
      loadingPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000))
    ])
    return sponsorCache
  } catch {
    return null // CSV still loading — return null, next request will use cache
  }
}

// ─── HTML parsing helpers ─────────────────────────────────────────────────────
function decodeEntities(str: string): string {
  return str.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ').trim()
}

function stripTags(html: string): string {
  return decodeEntities(html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
}

// ─── NHS Jobs HTML parser ─────────────────────────────────────────────────────
// NHS Jobs returns server-rendered HTML where each job card is an <article>
// or <li> element. The reliable anchor is the jobadvert URL.
// Structure around each job:
//   <a href="/candidate/jobadvert/REF">Title</a>
//   <p>Employer Name</p>
//   <ul><li>Location postcode</li><li>Contract type: ...</li>...</ul>
// We split on jobadvert anchors and parse the surrounding ~1500 chars.
function parseJobsFromHtml(html: string) {
  const jobs: any[] = []
  const seen = new Set<string>()

  // Find every jobadvert link
  const anchorRegex = /<a[^>]*href="([^"]*\/candidate\/jobadvert\/([A-Za-z0-9\-]+)[^"]*)"[^>]*>([\/\s\S]*?)<\/a>/gi
  let m: RegExpExecArray | null

  while ((m = anchorRegex.exec(html)) !== null) {
    const jobRef = m[2].trim()
    const rawTitle = stripTags(m[3])
    if (!rawTitle || rawTitle.length < 3 || seen.has(jobRef)) continue
    if (/save this job|sign in|create account/i.test(rawTitle)) continue
    seen.add(jobRef)

    // Grab the 2000 chars after this anchor for field extraction
    const afterAnchor = html.slice(m.index + m[0].length, m.index + m[0].length + 2000)
    const cleanAfter  = stripTags(afterAnchor)
    const lines       = cleanAfter.split(/\n/).map(l => l.trim()).filter(Boolean)

    // Employer is typically the first non-empty line after the title anchor
    // that isn't a postcode, list item marker, or meta field
    let employer = ''
    for (const line of lines.slice(0, 8)) {
      if (!line) continue
      if (/^[A-Z]{1,2}\d/.test(line)) break          // looks like a postcode — stop
      if (/^(Contract|Working|Salary|Date|Closing|Location|Pay band)/i.test(line)) break
      if (line.length > 3 && line.length < 120 && !/^[-•*]/.test(line)) {
        employer = line; break
      }
    }

    // Extract labelled fields from clean text
    const getText = (label: string) => {
      const re = new RegExp(`${label}\\s*:?\\s*([^\\n]{2,120})`, 'i')
      return cleanAfter.match(re)?.[1]?.trim() ?? ''
    }

    const salary         = getText('Salary') || 'Not specified'
    const datePosted     = getText('Date posted')
    const closingDate    = getText('Closing date')
    const contractType   = getText('Contract type')
    const workingPattern = getText('Working pattern')

    // Location — first line that looks like a postcode area
    const locationMatch = cleanAfter.match(/([A-Za-z][^\n]{2,60}\s[A-Z]{1,2}\d[\d\w]?\s*\d[A-Z]{2})/)
    const location      = locationMatch ? locationMatch[1].trim() : getText('Location')

    jobs.push({
      title: rawTitle,
      employer: employer || 'NHS',
      location: location || '',
      salary,
      datePosted,
      closingDate,
      contractType,
      workingPattern,
      jobRef,
      url: `https://www.jobs.nhs.uk/candidate/jobadvert/${jobRef}`,
    })
  }

  return jobs
}

function parseTotalCount(html: string): number {
  const m = html.match(/([\d,]+)\s+jobs?\s+found/i)
  return m ? parseInt(m[1].replace(/,/g, ''), 10) : 0
}

// ─── Main handler ─────────────────────────────────────────────────────────────
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const keyword  = searchParams.get('keyword')  ?? ''
    const location = searchParams.get('location') ?? ''
    const page     = searchParams.get('page')     ?? '1'
    const debug    = searchParams.get('debug')    === '1'

    // Load UKVI sponsor register (may return null if still loading)
    const sponsorData = await getSponsorSet()

    // Search NHS Jobs
    const params = new URLSearchParams()
    if (keyword)  params.set('keyword', keyword)
    if (location) params.set('location', location)
    if (page !== '1') params.set('page', page)

    const targetUrl = `${NHS_JOBS_BASE}?${params.toString()}`
    const nhsRes = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-GB,en;q=0.9',
      },
      signal: AbortSignal.timeout(12000),
    })
    if (!nhsRes.ok) return Response.json({ error: `NHS Jobs returned HTTP ${nhsRes.status}` }, { status: 502 })

    const html = await nhsRes.text()
    const jobs  = parseJobsFromHtml(html)
    const total = parseTotalCount(html) || jobs.length

    // Cross-reference with UKVI register
    const enrichedJobs = jobs.map(job => ({
      ...job,
      sponsorVerified: sponsorData ? matchesSponsor(job.employer, sponsorData.names) : null
    }))

    // If register loaded: only return verified. If not yet loaded: return all with null.
    const outputJobs = sponsorData
      ? enrichedJobs.filter(j => j.sponsorVerified === true)
      : enrichedJobs

    const registerStatus = sponsorData
      ? {
          loaded: true,
          totalSponsors: sponsorData.totalSponsors,
          csvUrl: sponsorData.csvUrl,
          cachedAt: new Date(sponsorData.fetchedAt).toISOString(),
          error: null,
        }
      : {
          loaded: false,
          totalSponsors: 0,
          csvUrl: null,
          cachedAt: null,
          error: loadingPromise
            ? 'UKVI register is still loading in the background — try again in 30 seconds.'
            : 'UKVI register failed to load.',
        }

    return Response.json({
      success: true,
      total,
      page: parseInt(page, 10),
      perPage: outputJobs.length,
      jobs: outputJobs,
      register: registerStatus,
      searchUrl: targetUrl,
      ...(debug && {
        debugInfo: {
          rawJobCount: jobs.length,
          rawJobs: jobs.slice(0, 5).map(j => ({ title: j.title, employer: j.employer, employerNormalised: normaliseName(j.employer) })),
          sampleSponsors: sponsorData ? [...sponsorData.names].filter(n => n.includes('nhs') || n.includes('hospital')).slice(0, 10) : [],
          htmlSample: html.slice(0, 2000),
        }
      })
    })
  } catch (error: any) {
    console.error("COS_SEARCH_ERROR:", error)
    return Response.json({ error: error?.message ?? "Search failed" }, { status: 500 })
  }
}