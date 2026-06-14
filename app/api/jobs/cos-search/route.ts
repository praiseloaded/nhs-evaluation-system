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
// Actual NHS Jobs structure (confirmed from live HTML):
//
//   <li>
//     <h2><a href="/candidate/jobadvert/REF?language=">Job Title</a></h2>
//     <a ...>Save this job</a>
//     <h3>Employer Name Location POSTCODE</h3>
//     <ul>
//       <li>Salary: <strong>£xx,xxx</strong></li>
//       <li>Date posted: <strong>...</strong></li>
//       <li>Closing date: <strong>...</strong></li>
//       <li>Contract type: <strong>...</strong></li>
//       <li>Working pattern: <strong>...</strong></li>
//     </ul>
//   </li>
//
// Employer + location are combined in <h3> — we split on the UK postcode.
function parseJobsFromHtml(html: string) {
  const jobs: any[] = []
  const seen = new Set<string>()

  // Split on each job card using the jobadvert URL as anchor
  const blocks = html.split(/(?=<li[^>]*>(?:(?!<\/li>)[\s\S]){0,300}?\/candidate\/jobadvert\/)/i)

  for (const block of blocks) {
    const refMatch = block.match(/\/candidate\/jobadvert\/([A-Za-z0-9\-]+)/)
    if (!refMatch) continue
    const jobRef = refMatch[1]
    if (seen.has(jobRef)) continue
    seen.add(jobRef)

    // Title — in <h2><a href="...jobadvert...">Title</a></h2>
    const titleMatch = block.match(/<h2[^>]*>[\s\S]*?<a[^>]*\/candidate\/jobadvert\/[^>]*>([\s\S]*?)<\/a>/i)
    const title = titleMatch ? stripTags(titleMatch[1]).trim() : ''
    if (!title || title.length < 3) continue
    if (/save this job|sign in|create account/i.test(title)) continue

    // Employer + location — in <h3>Employer Name Town POSTCODE</h3>
    const h3Match = block.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i)
    const h3Text  = h3Match ? stripTags(h3Match[1]).trim() : ''

    // UK postcode at the end e.g. "TN34 1BA" or "HU3 2JZ"
    const postcodeRe = /\b([A-Z]{1,2}\d[\dA-Z]?\s*\d[A-Z]{2})\b/i
    const postcodeMatch = h3Text.match(postcodeRe)

    let employer = h3Text
    let location = ''

    if (postcodeMatch) {
      const postcode = postcodeMatch[1]
      const idx = h3Text.indexOf(postcode)
      const beforePostcode = h3Text.slice(0, idx).trim()
      // Everything before postcode split: employer ends before the town
      // Town is usually the last 1-2 capitalised words before the postcode
      // Strategy: remove trailing town word(s) from employer
      const parts = beforePostcode.split(/\s+/)
      // Find where the town starts — usually after the trust/org name
      // Conservative: take last word before postcode as city if it starts with uppercase
      let townStart = parts.length
      for (let i = parts.length - 1; i >= 0; i--) {
        const word = parts[i]
        if (/^[A-Z][a-z]/.test(word) && i > 0) {
          // Check if previous word also looks like a town word
          const prev = parts[i - 1]
          if (/^[A-Z][a-z]/.test(prev) && !/\b(Trust|NHS|Health|Care|Hospital|Medical|Board|Hospitals|Services|Foundation|University|Centre|Center)\b/.test(prev)) {
            townStart = i - 1
          } else {
            townStart = i
          }
          break
        }
      }
      employer = parts.slice(0, townStart).join(' ').trim() || beforePostcode
      location = parts.slice(townStart).join(' ') + ' ' + postcode
    }

    // Extract fields from <strong> tags after label text
    const getField = (label: string): string => {
      const re = new RegExp(label + '[^<]*<strong[^>]*>([\\s\\S]*?)<\\/strong>', 'i')
      const m = block.match(re)
      return m ? stripTags(m[1]).trim() : ''
    }

    const salary         = getField('Salary')         || 'Not specified'
    const datePosted     = getField('Date posted')
    const closingDate    = getField('Closing date')
    const contractType   = getField('Contract type')
    const workingPattern = getField('Working pattern')

    jobs.push({
      title,
      employer: employer || h3Text || 'NHS',
      location: location.trim(),
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

    // Search NHS Jobs via proxy (Vercel outbound blocks jobs.nhs.uk directly)
    const params = new URLSearchParams()
    if (keyword)  params.set('keyword', keyword)
    if (location) params.set('location', location)
    if (page !== '1') params.set('page', page)

    const targetUrl = `${NHS_JOBS_BASE}?${params.toString()}`

    // Try direct fetch first, fall back to proxy
    let html = ''
    let fetchedVia = 'direct'
    try {
      const directRes = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-GB,en;q=0.9',
        },
        signal: AbortSignal.timeout(8000),
      })
      if (directRes.ok) {
        const text = await directRes.text()
        // Verify we got actual job results, not a redirect/cookie page
        if (text.includes('/candidate/jobadvert/') && text.includes('jobs found')) {
          html = text
        } else {
          throw new Error('Direct fetch returned non-results page')
        }
      } else {
        throw new Error(`Direct fetch ${directRes.status}`)
      }
    } catch (directErr: any) {
      console.log('[COS] Direct fetch failed, trying proxy:', directErr.message)
      fetchedVia = 'proxy'
      // Route via Express server on oyonews.com.ng/fetch-html
      const proxyUrl = `https://oyonews.com.ng/fetch-html?url=${encodeURIComponent(targetUrl)}`
      const proxyRes = await fetch(proxyUrl, { signal: AbortSignal.timeout(15000) })
      if (!proxyRes.ok) return Response.json({ error: `Proxy returned ${proxyRes.status}` }, { status: 502 })
      const proxyData = await proxyRes.json()
      html = proxyData.html ?? ''
      if (!html) return Response.json({ error: `Proxy returned no HTML. Status: ${proxyData.status}` }, { status: 502 })
    }

    if (!html) return Response.json({ error: 'Could not fetch NHS Jobs results' }, { status: 502 })
    const allJobs = parseJobsFromHtml(html)

    // NHS Jobs ignores ?location= in GET params (it uses JS/form POST internally).
    // Filter client-side by matching location string against job's location field.
    const jobs = location
      ? allJobs.filter(j => {
          const loc = (j.location + ' ' + j.employer).toLowerCase()
          const search = location.toLowerCase()
          // Match city name, partial postcode (e.g. "E1", "SW"), or full postcode
          return loc.includes(search) ||
            search.split(/[,\s]+/).filter(Boolean).some(part => part.length >= 2 && loc.includes(part))
        })
      : allJobs

    const total = parseTotalCount(html) || allJobs.length

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
          fetchedVia,
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