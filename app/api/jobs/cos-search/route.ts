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

// ─── Improved NHS Jobs HTML parser ───────────────────────────────────────────
// NHS Jobs renders job cards with a consistent structure:
// <li class="nhsuk-list nhsuk-list--border..."> ... </li>
// Each card has the job title in an <a href="...jobadvert/REF..."> and
// employer/location as definition list items (dt/dd pairs).
function parseJobsFromHtml(html: string) {
  const jobs: any[] = []
  const seen = new Set<string>()

  // Split on list items that look like job cards
  // NHS Jobs uses <li> elements for each search result
  const liBlocks = html.split(/<li[^>]*class="[^"]*nhsuk-list[^"]*"/i)

  for (const block of liBlocks) {
    // Find job ref from jobadvert URL
    const refMatch = block.match(/\/candidate\/jobadvert\/([A-Za-z0-9\-]+)/)
    if (!refMatch) continue
    const jobRef = refMatch[1].trim()
    if (seen.has(jobRef)) continue
    seen.add(jobRef)

    // Title — in an <a> tag linking to the jobadvert
    const titleMatch = block.match(/href="[^"]*\/candidate\/jobadvert\/[^"]*"[^>]*>([\s\S]*?)<\/a>/i)
    const title = titleMatch ? stripTags(titleMatch[1]) : ''
    if (!title || title.length < 3 || /save this job/i.test(title)) continue

    // Employer — look for <dd> after <dt> containing "Employer"
    const employerDtMatch = block.match(/<dt[^>]*>[\s\S]*?employer[\s\S]*?<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/i)
    const employer = employerDtMatch ? stripTags(employerDtMatch[1]) : extractFieldFromText(block, 'Employer')

    // Location
    const locationDtMatch = block.match(/<dt[^>]*>[\s\S]*?location[\s\S]*?<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/i)
    const location = locationDtMatch ? stripTags(locationDtMatch[1]) : extractFieldFromText(block, 'Location')

    // Salary
    const salaryDtMatch = block.match(/<dt[^>]*>[\s\S]*?salary[\s\S]*?<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/i)
    const salary = salaryDtMatch ? stripTags(salaryDtMatch[1]) : extractFieldFromText(block, 'Salary') || 'Not specified'

    // Dates
    const closingDtMatch = block.match(/<dt[^>]*>[\s\S]*?closing date[\s\S]*?<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/i)
    const closingDate = closingDtMatch ? stripTags(closingDtMatch[1]) : extractFieldFromText(block, 'Closing date')

    const postedDtMatch = block.match(/<dt[^>]*>[\s\S]*?date posted[\s\S]*?<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/i)
    const datePosted = postedDtMatch ? stripTags(postedDtMatch[1]) : extractFieldFromText(block, 'Date posted')

    // Contract / working pattern
    const contractDtMatch = block.match(/<dt[^>]*>[\s\S]*?contract type[\s\S]*?<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/i)
    const contractType = contractDtMatch ? stripTags(contractDtMatch[1]) : ''

    const patternDtMatch = block.match(/<dt[^>]*>[\s\S]*?working pattern[\s\S]*?<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/i)
    const workingPattern = patternDtMatch ? stripTags(patternDtMatch[1]) : ''

    jobs.push({
      title,
      employer: employer || 'NHS',
      location: location || '',
      salary: salary || 'Not specified',
      datePosted: datePosted || '',
      closingDate: closingDate || '',
      contractType: contractType || '',
      workingPattern: workingPattern || '',
      jobRef,
      url: `https://www.jobs.nhs.uk/candidate/jobadvert/${jobRef}`,
    })
  }

  return jobs
}

// Fallback text extraction when dt/dd pattern doesn't match
function extractFieldFromText(block: string, label: string): string {
  const clean = stripTags(block)
  const re = new RegExp(`${label}\\s*:?\\s*(.+?)(?=Salary|Location|Employer|Date posted|Closing date|Contract|Working pattern|$)`, 'i')
  const m = clean.match(re)
  return m?.[1]?.trim().slice(0, 120) ?? ''
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
    })
  } catch (error: any) {
    console.error("COS_SEARCH_ERROR:", error)
    return Response.json({ error: error?.message ?? "Search failed" }, { status: 500 })
  }
}