// app/api/jobs/scotland/route.ts
export const runtime = 'nodejs'

const PORTALS = [
  { name: 'NHS Scotland Jobs (Jobtrain)',   url: 'https://apply.jobs.scot.nhs.uk/Home/Job',                  region: 'All Scotland'        },
  { name: 'NHS Greater Glasgow & Clyde',    url: 'https://www.nhsggc.scot/working-with-us/jobs/',            region: 'Glasgow & Clyde'     },
  { name: 'NHS Lothian',                    url: 'https://jobs.nhslothian.com/AllJobs/Pages/default.aspx',   region: 'Edinburgh & Lothian' },
  { name: 'NHS Grampian (Trac)',            url: 'https://apps.trac.jobs/search/grampian',                   region: 'Aberdeen & North-East'},
  { name: 'NHS Tayside',                    url: 'https://apply.jobs.scot.nhs.uk/Home/Job?Location=Tayside', region: 'Tayside / Dundee'    },
  { name: 'GP Practice Jobs Scotland',      url: 'https://practice.jobs.nhs.scot',                           region: 'GP Practices'        },
]

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const keyword  = (searchParams.get('keyword') ?? '').trim()
  const page     = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))

  const appId  = process.env.ADZUNA_APP_ID
  const appKey = process.env.ADZUNA_APP_KEY

  if (!appId || !appKey) {
    return Response.json({ success: true, source: 'portals_only', jobs: [], total: 0, portals: PORTALS,
      message: 'Add ADZUNA_APP_ID and ADZUNA_APP_KEY to env vars. Free at developer.adzuna.com' })
  }

  try {
    // Build Adzuna URL — only valid params
    const params = new URLSearchParams()
    params.set('app_id',           appId)
    params.set('app_key',          appKey)
    params.set('results_per_page', '20')
    params.set('where',            'Scotland')
    params.set('sort_by',          'date')
    // what= is the keyword search; if no keyword, search broad NHS terms
    params.set('what', keyword || 'nurse healthcare NHS')

    const apiUrl = `https://api.adzuna.com/v1/api/jobs/gb/search/${page}?${params.toString()}`

    const res = await fetch(apiUrl, {
      headers: { 'Accept': 'application/json' },
      signal:  AbortSignal.timeout(10000),
    })

    // Read body as text first so we can log it on error
    const bodyText = await res.text()

    if (!res.ok) {
      console.error('[jobs/scotland] Adzuna error:', res.status, bodyText.slice(0, 300))
      return Response.json({
        success: false,
        error:   `Adzuna returned ${res.status}`,
        portals: PORTALS,
        jobs:    [],
      }, { status: 502 })
    }

    let data: any
    try {
      data = JSON.parse(bodyText)
    } catch {
      console.error('[jobs/scotland] Non-JSON response:', bodyText.slice(0, 300))
      return Response.json({ success: false, error: 'Invalid response from Adzuna', portals: PORTALS, jobs: [] }, { status: 502 })
    }

    const jobs = (data.results ?? []).map((j: any) => ({
      title:          j.title                  ?? '',
      employer:       j.company?.display_name  ?? 'NHS Scotland',
      location:       j.location?.display_name ?? 'Scotland',
      salary:
        j.salary_min && j.salary_max ? `£${Math.round(j.salary_min).toLocaleString()} – £${Math.round(j.salary_max).toLocaleString()}` :
        j.salary_min                 ? `From £${Math.round(j.salary_min).toLocaleString()}` :
                                       'See advert',
      datePosted:     j.created                ?? '',
      closingDate:    '',
      contractType:   j.contract_type          ?? '',
      workingPattern: j.contract_time          ?? '',
      jobRef:         String(j.id              ?? ''),
      url:            j.redirect_url           ?? '',
      description:    (j.description          ?? '').slice(0, 300),
      source:         'adzuna',
    }))

    return Response.json({
      success: true,
      source:  'adzuna',
      total:   data.count ?? jobs.length,
      page,
      jobs,
      portals: PORTALS,
    })

  } catch (err: any) {
    console.error('[jobs/scotland] fetch error:', err?.message)
    return Response.json({
      success: false,
      error:   err?.message ?? 'Request failed',
      portals: PORTALS,
      jobs:    [],
    }, { status: 500 })
  }
}