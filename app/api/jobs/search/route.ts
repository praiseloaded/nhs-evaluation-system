// app/api/jobs/search/route.ts
//
// On-demand search of jobs.nhs.uk (England, Wales, Northern Ireland — includes London).
// One fetch per user search request — not bulk crawling, nothing cached/stored.
// NHS Scotland (Jobtrain SPA) is not scraped — see /jobs page for direct link out.

const NHS_JOBS_BASE = "https://www.jobs.nhs.uk/candidate/search/results"

interface JobResult {
  title: string
  employer: string
  location: string
  salary: string
  datePosted: string
  closingDate: string
  contractType: string
  workingPattern: string
  jobRef: string
  url: string
}

function decodeEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ')
    .trim()
}

function stripTags(html: string): string {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  )
}

function extractByDataTest(html: string, dataTest: string): string {
  const openTagRe = new RegExp(`<([a-z0-9]+)[^>]*data-test=["']${dataTest}["'][^>]*>`, 'i')
  const openMatch = html.match(openTagRe)
  if (!openMatch) return ''

  const tagName = openMatch[1]
  const startIdx = openMatch.index! + openMatch[0].length

  const tagRe = new RegExp(`<(/?)${tagName}\\b[^>]*>`, 'gi')
  tagRe.lastIndex = startIdx

  let depth = 1
  let m: RegExpExecArray | null
  let endIdx = -1

  while ((m = tagRe.exec(html)) !== null) {
    if (m[1] === '/') {
      depth--
      if (depth === 0) { endIdx = m.index; break }
    } else {
      depth++
    }
  }

  if (endIdx === -1) return ''
  return stripTags(html.slice(startIdx, endIdx))
}

function extractListValue(html: string, dataTest: string): string {
  const raw = extractByDataTest(html, dataTest)
  if (!raw) return ''
  return raw.replace(/^[A-Za-z][A-Za-z\s]*:\s*/, '').trim()
}

function parseJobsFromHtml(html: string): JobResult[] {
  const jobs: JobResult[] = []
  const seen = new Set<string>()

  const cards = html.split('/candidate/jobadvert/')

  for (let i = 1; i < cards.length; i++) {
    const card = cards[i]

    const refMatch = card.match(/^([A-Za-z0-9-]+)/)
    if (!refMatch) continue
    const jobRef = refMatch[1]
    if (seen.has(jobRef)) continue

    const isTitleLink = /^[A-Za-z0-9-]+[^>]*data-test=["']search-result-job-title["']/i.test(card.slice(0, 300))
      || /data-test=["']search-result-job-title["']/i.test(card.slice(0, 400))
    if (!isTitleLink) continue

    seen.add(jobRef)
    const block = card.slice(0, Math.min(card.length, 6000))

    let title = ''
    const titleBlockMatch = block.match(/^[A-Za-z0-9-]+[^>]*>([\s\S]*?)<\/a>/i)
    if (titleBlockMatch) title = stripTags(titleBlockMatch[1])
    if (!title) continue

    let employer = 'NHS'
    let location = ''
    const locBlockRaw = (() => {
      const openRe = /<div[^>]*data-test=["']search-result-location["'][^>]*>/i
      const m = block.match(openRe)
      if (!m) return ''
      const start = m.index! + m[0].length
      return block.slice(start, start + 1000)
    })()

    if (locBlockRaw) {
      const innerLocMatch = locBlockRaw.match(/<div[^>]*class="[^"]*location-font-size[^"]*"[^>]*>([\s\S]*?)<\/div>/i)
      if (innerLocMatch) {
        location = stripTags(innerLocMatch[1])
        const beforeLoc = locBlockRaw.slice(0, locBlockRaw.indexOf(innerLocMatch[0]))
        const employerText = stripTags(beforeLoc)
        if (employerText) employer = employerText
      } else {
        const wholeMatch = locBlockRaw.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i)
        if (wholeMatch) {
          const text = stripTags(wholeMatch[1])
          if (text) employer = text
        }
      }
    }

    jobs.push({
      title,
      employer,
      location,
      salary:         extractListValue(block, 'search-result-salary')         || 'Not specified',
      datePosted:     extractListValue(block, 'search-result-date')            || extractListValue(block, 'search-result-date-posted') || '',
      closingDate:    extractListValue(block, 'search-result-closing-date')    || '',
      contractType:   extractListValue(block, 'search-result-contract-type')   || '',
      workingPattern: extractListValue(block, 'search-result-work-hours')      || extractListValue(block, 'search-result-working-pattern') || '',
      jobRef,
      url: `https://www.jobs.nhs.uk/candidate/jobadvert/${jobRef}`,
    })
  }

  return jobs
}

function parseTotalCount(html: string): number {
  const patterns = [/([\d,]+)\s+jobs?\s+found/i, /<h1[^>]*>\s*([\d,]+)/i]
  for (const re of patterns) {
    const m = html.match(re)
    if (m) {
      const n = parseInt(m[1].replace(/,/g, ''), 10)
      if (!isNaN(n)) return n
    }
  }
  return 0
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const keyword  = searchParams.get('keyword')  ?? ''
    const locationRaw = searchParams.get('location') ?? ''
    // Normalise location to title case for NHS Jobs URL (they may be case-sensitive)
    // e.g. "london" → "London", "south london" → "South London"
    const location = locationRaw.replace(/\b\w/g, c => c.toUpperCase())
    const page     = searchParams.get('page')     ?? '1'
    const debug    = searchParams.get('debug')    === '1'

    const params = new URLSearchParams()
    if (keyword)  params.set('keyword', keyword)
    if (location) params.set('location', location)
    if (page !== '1') params.set('page', page)

    const targetUrl = `${NHS_JOBS_BASE}?${params.toString()}`

    const res = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-GB,en;q=0.9',
      },
      signal: AbortSignal.timeout(12000),
    })

    if (!res.ok) {
      return Response.json({ error: `NHS Jobs returned HTTP ${res.status}`, searchUrl: targetUrl }, { status: 502 })
    }

    const html = await res.text()
    const allJobs = parseJobsFromHtml(html)
    const total   = parseTotalCount(html) || allJobs.length

    // ── Location filter ───────────────────────────────────────────────────────
    // NHS Jobs ignores ?location= in GET params (it uses JS form submission).
    // We filter after parsing — fully case-insensitive.
    // Splits the location input on spaces/commas so "south london", "SW1",
    // "MANCHESTER", "sw1a 2aa" all match correctly.
    const jobs = location
      ? allJobs.filter(j => {
          const haystack = (j.location + ' ' + j.employer).toLowerCase()
          const tokens = location.toLowerCase().trim().split(/[\s,]+/).filter(w => w.length >= 2)
          return tokens.some(token => haystack.includes(token))
        })
      : allJobs

    const response: any = {
      success: true,
      total,
      page: parseInt(page, 10),
      perPage: jobs.length,
      jobs,
      searchUrl: targetUrl,
    }

    if (jobs.length === 0 || debug) {
      response.debugInfo = {
        htmlLength: html.length,
        containsJobAdvert: html.includes('/jobadvert/'),
        rawJobCount: allJobs.length,
        rawJobs: allJobs.slice(0, 3).map(j => ({ title: j.title, employer: j.employer, location: j.location })),
        sample: html.slice(0, 3000),
      }
    }

    return Response.json(response)
  } catch (error: any) {
    console.error("JOBS_SEARCH_ERROR:", error)
    return Response.json({ error: error?.message ?? "Search failed" }, { status: 500 })
  }
}