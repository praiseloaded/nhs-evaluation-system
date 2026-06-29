// app/dashboard/jobs/page.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Search, MapPin, Loader2, ExternalLink, Sparkles, ArrowLeft,
  Building2, Clock, FileText, PoundSterling, Calendar, AlertCircle,
  ChevronLeft, ChevronRight, Globe, Flag,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

// ── Types ─────────────────────────────────────────────────────────────────────
interface Job {
  title: string; employer: string; location: string; salary: string
  datePosted: string; closingDate: string; contractType: string
  workingPattern: string; jobRef: string; url: string
  source?: string; description?: string
}

interface Portal { name: string; url: string; region: string }

type Nation = 'england' | 'scotland' | 'wales' | 'ni' | 'cos'

const NATIONS: { id: Nation; label: string; flag: string; desc: string }[] = [
  { id: 'england',  label: 'England',      flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', desc: 'NHS Jobs — live vacancies across England'          },
  { id: 'scotland', label: 'Scotland',     flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', desc: 'Adzuna + direct portal links to Jobtrain & Trac'  },
  { id: 'wales',    label: 'Wales',        flag: '🏴󠁧󠁢󠁷󠁬󠁳󠁿', desc: 'NHS Jobs filtered to Wales'                       },
  { id: 'ni',       label: 'N. Ireland',   flag: '🇬🇧', desc: 'NHS Jobs filtered to Northern Ireland'            },
  { id: 'cos',      label: 'Sponsorship',   flag: '🌍', desc: 'NHS roles verified against UKVI sponsor register' },
]

const SCOTLAND_PORTALS: Portal[] = [
  { name: 'NHS Scotland Jobs (Jobtrain)',   url: 'https://apply.jobs.scot.nhs.uk/Home/Job',                         region: 'All Scotland'       },
  { name: 'NHS Greater Glasgow & Clyde',    url: 'https://www.nhsggc.scot/working-with-us/jobs/',                   region: 'Glasgow & Clyde'    },
  { name: 'NHS Lothian',                    url: 'https://jobs.nhslothian.com/AllJobs/Pages/default.aspx',          region: 'Edinburgh & Lothian'},
  { name: 'NHS Grampian (Trac)',            url: 'https://apps.trac.jobs/search/grampian',                          region: 'Aberdeen & North-East'},
  { name: 'NHS Tayside',                    url: 'https://apply.jobs.scot.nhs.uk/Home/Job?Location=Tayside',        region: 'Tayside / Dundee'   },
  { name: 'GP Practice Jobs Scotland',      url: 'https://practice.jobs.nhs.scot',                                  region: 'GP Practices'       },
]

const QUICK_SEARCHES: Record<Nation, string[]> = {
  england:  ['Healthcare Support Worker', 'Clinical Support Worker', 'Clinical Reaserh Assistance', 'Phlebotomist'],
  scotland: ['Healthcare Support Worker', 'Clinical Support Worker', 'Clinical Reaserh Assistance', 'Phlebotomist'],
  wales:    ['Healthcare Support Worker', 'Clinical Support Worker', 'Clinical Reaserh Assistance', 'Phlebotomist'],
  ni:       ['Healthcare Support Worker', 'Clinical Support Worker', 'Clinical Reaserh Assistance', 'Phlebotomist'],
  cos:      ['Healthcare Support Worker', 'Clinical Support Worker', 'Clinical Reaserh Assistance', 'Phlebotomist'],
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function getInitials(name: string) {
  return name.split(' ').filter(w => w.length > 2).slice(0, 3).map(w => w[0]).join('').toUpperCase().slice(0, 3)
}

const RAMPS = [
  { bg: 'bg-blue-50   dark:bg-blue-950/50',   text: 'text-blue-700   dark:text-blue-300'   },
  { bg: 'bg-teal-50   dark:bg-teal-950/50',   text: 'text-teal-700   dark:text-teal-300'   },
  { bg: 'bg-purple-50 dark:bg-purple-950/50', text: 'text-purple-700 dark:text-purple-300' },
  { bg: 'bg-amber-50  dark:bg-amber-950/50',  text: 'text-amber-700  dark:text-amber-300'  },
  { bg: 'bg-rose-50   dark:bg-rose-950/50',   text: 'text-rose-700   dark:text-rose-300'   },
]
function ramp(str: string) {
  let h = 0; for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) & 0xffff
  return RAMPS[h % RAMPS.length]
}

function isClosingSoon(d: string) {
  try { const diff = (new Date(d).getTime() - Date.now()) / 86400000; return diff >= 0 && diff <= 7 } catch { return false }
}
function isNew(d: string) {
  try { return (Date.now() - new Date(d).getTime()) / 86400000 <= 3 } catch { return false }
}

// ── Job Card ──────────────────────────────────────────────────────────────────
function JobCard({ job }: { job: Job }) {
  const router = useRouter()
  const soon   = isClosingSoon(job.closingDate)
  const fresh  = isNew(job.datePosted)
  const r      = ramp(job.employer)
  const init   = getInitials(job.employer)

  return (
    <div className={`rounded-xl border bg-card flex flex-col overflow-hidden transition-all ${soon ? 'border-amber-300 dark:border-amber-700' : 'border-border hover:shadow-sm'}`}>
      {soon && <div className="h-[2px] bg-amber-400" />}
      <div className="p-4 flex flex-col flex-1 gap-3">
        <div className="flex items-start gap-3">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0 border border-border ${r.bg} ${r.text}`}>
            {init || <Building2 className="w-4 h-4" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground leading-snug line-clamp-2">{job.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{job.employer}</p>
            <div className="flex gap-1.5 mt-1.5 flex-wrap">
              {fresh && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">NEW</span>}
              {soon  && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">CLOSING SOON</span>}
              {(job as any).sponsorVerified && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">✓ SPONSORS</span>}
            </div>
          </div>
        </div>

        <div className="space-y-1.5 text-xs text-muted-foreground">
          {job.location && (
            <div className="flex items-center gap-1.5"><MapPin className="w-3 h-3 shrink-0" /><span className="truncate">{job.location}</span></div>
          )}
          {job.salary && job.salary !== 'See advert' && (
            <div className="flex items-center gap-1.5"><PoundSterling className="w-3 h-3 shrink-0" /><span className="truncate">{job.salary}</span></div>
          )}
          {job.closingDate && (
            <div className="flex items-center gap-1.5"><Calendar className="w-3 h-3 shrink-0" /><span>Closes {job.closingDate}</span></div>
          )}
          {job.contractType && (
            <div className="flex items-center gap-1.5"><FileText className="w-3 h-3 shrink-0" /><span>{job.contractType}</span></div>
          )}
        </div>

        <div className="flex gap-2 mt-auto pt-1">
          <a href={job.url} target="_blank" rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            View <ExternalLink className="w-3 h-3" />
          </a>
          <button
            onClick={() => router.push(`/dashboard/new-analysis?jobUrl=${encodeURIComponent(job.url)}&jobTitle=${encodeURIComponent(job.title)}`)}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors">
            <Sparkles className="w-3 h-3" /> Analyse
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Scotland Portal Grid ──────────────────────────────────────────────────────
function ScotlandPortals({ keyword }: { keyword: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="text-sm font-bold text-foreground mb-1">NHS Scotland Job Portals</p>
      <p className="text-xs text-muted-foreground mb-4">
        NHS Scotland uses Jobtrain — not NHS Jobs. Click any portal to search directly, then paste the job description into{' '}
        <Link href="/dashboard/job-ready" className="text-primary underline hover:no-underline">Job Ready™</Link> to generate your full application.
      </p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {SCOTLAND_PORTALS.map(p => {
          const url = keyword ? `${p.url}${p.url.includes('?') ? '&' : '?'}keyword=${encodeURIComponent(keyword)}` : p.url
          return (
            <a key={p.name} href={url} target="_blank" rel="noopener noreferrer"
              className="flex items-start gap-3 rounded-xl border border-border bg-background hover:border-primary/40 hover:shadow-sm p-3.5 transition-all group">
              <Flag className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-foreground truncate">{p.name}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{p.region}</p>
              </div>
              <ExternalLink className="w-3 h-3 text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0 mt-0.5" />
            </a>
          )
        })}
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function DashboardJobsPage() {
  const [nation,     setNation]     = useState<Nation>('england')
  const [keyword,    setKeyword]    = useState('')
  const [location,   setLocation]   = useState('')
  const [jobs,       setJobs]       = useState<Job[]>([])
  const [portals,    setPortals]    = useState<Portal[]>([])
  const [total,      setTotal]      = useState(0)
  const [page,       setPage]       = useState(1)
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState<string | null>(null)
  const [hasSearched,setHasSearched]= useState(false)
  const [noAdzuna,   setNoAdzuna]   = useState(false)

  // When nation switches, reset results
  useEffect(() => {
    setJobs([]); setTotal(0); setHasSearched(false); setError(null); setPage(1)
    if (nation === 'scotland') {
      // Load Scotland portals immediately
      fetch('/api/jobs/scotland').then(r => r.json()).then(d => {
        setPortals(d.portals ?? [])
        setNoAdzuna(d.source === 'portals_only')
      }).catch(() => {})
    }
  }, [nation])

  const search = async (kw = keyword, loc = location, p = page) => {
    setLoading(true); setError(null)
    try {
      let url = ''
      if (nation === 'scotland') {
        const params = new URLSearchParams()
        if (kw) params.set('keyword', kw)
        params.set('page', String(p))
        url = `/api/jobs/scotland?${params}`
      } else if (nation === 'cos') {
        const params = new URLSearchParams()
        if (kw) params.set('keyword', kw)
        if (p > 1) params.set('page', String(p))
        url = `/api/jobs/cos-search?${params}`
      } else {
        // England / Wales / NI — all use NHS Jobs search route with location filter
        const locationMap: Record<string, string> = { wales: 'Wales', ni: 'Northern Ireland' }
        const effectiveLoc = nation !== 'england' ? (locationMap[nation] ?? '') : loc
        const params = new URLSearchParams()
        if (kw) params.set('keyword', kw)
        if (effectiveLoc) params.set('location', effectiveLoc)
        if (p > 1) params.set('page', String(p))
        url = `/api/jobs/search?${params}`
      }

      const res  = await fetch(url)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Search failed')

      let jobsList = data.jobs ?? []

      // Client-side location filter for England custom location
      if (nation === 'england' && loc) {
        const tokens = loc.toLowerCase().split(/[\s,]+/).filter((w: string) => w.length >= 2)
        jobsList = jobsList.filter((j: Job) =>
          tokens.some((t: string) => (j.location + ' ' + j.employer).toLowerCase().includes(t))
        )
      }

      setJobs(jobsList)
      setTotal(data.total ?? jobsList.length)
      setPortals(data.portals ?? [])
      setNoAdzuna(data.source === 'portals_only')
      setHasSearched(true)
    } catch (e: any) {
      setError(e.message)
      setJobs([])
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); setPage(1); search(keyword, location, 1) }
  const changePage = (p: number) => { setPage(p); search(keyword, location, p); window.scrollTo({ top: 0 }) }

  const currentNation = NATIONS.find(n => n.id === nation)!

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">

      {/* Header */}
      <div>
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-3 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
        </Link>
        <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
          <Globe className="w-6 h-6 text-primary" /> NHS Jobs
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">Live vacancies across all four nations — find a role, then analyse instantly.</p>
      </div>

      {/* Nation tabs */}
      <div className="flex gap-1.5 border-b border-border pb-0 overflow-x-auto">
        {NATIONS.map(n => (
          <button key={n.id} onClick={() => setNation(n.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 -mb-px transition-all ${
              nation === n.id
                ? 'text-primary border-primary'
                : 'text-muted-foreground border-transparent hover:text-foreground hover:border-border'
            }`}>
            <span>{n.flag}</span> {n.label}
          </button>
        ))}
      </div>

      {/* Search form */}
      <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input value={keyword} onChange={e => setKeyword(e.target.value)}
              placeholder="Job title or keyword"
              className="w-full bg-background border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-foreground placeholder-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
          {nation === 'england' ? (
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input value={location} onChange={e => setLocation(e.target.value)}
                placeholder="City or postcode (e.g. Manchester, SW1)"
                className="w-full bg-background border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-foreground placeholder-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
          ) : (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-muted/30 text-sm text-muted-foreground">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              Filtered to <span className="font-semibold text-foreground ml-1">{currentNation.flag} {currentNation.label}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button type="submit" disabled={loading}
            className="px-5 py-2 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground text-sm font-bold inline-flex items-center gap-2 transition-colors">
            {loading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Searching…</> : <><Search className="w-3.5 h-3.5" /> Search jobs</>}
          </button>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_SEARCHES[nation].map(s => (
              <button key={s} type="button" onClick={() => { setKeyword(s); setPage(1); search(s, location, 1) }}
                className="text-xs px-3 py-1.5 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors">
                {s}
              </button>
            ))}
          </div>
        </div>
      </form>

      {/* Scotland: no Adzuna key — show portals only */}
      {nation === 'scotland' && noAdzuna && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 p-4 flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Adzuna API keys not configured</p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
              Add <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">ADZUNA_APP_ID</code> and <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">ADZUNA_APP_KEY</code> to your Vercel env vars for live Scotland jobs.
              Free tier at <a href="https://developer.adzuna.com" target="_blank" rel="noopener noreferrer" className="underline">developer.adzuna.com</a>. Until then, use the portals below.
            </p>
          </div>
        </div>
      )}

      {/* COS explanation banner */}
      {nation === 'cos' && (
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/20 p-4 space-y-1.5">
          <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
            🌍 NHS roles with Skilled Worker visa sponsorship
          </p>
          <p className="text-xs text-emerald-700 dark:text-emerald-400 leading-relaxed">
            Results are cross-checked against the official <strong>UKVI Register of Licensed Sponsors</strong>. A ✓ SPONSORS badge means the employer organisation holds a valid Skilled Worker licence — it does not guarantee this specific role qualifies. Always confirm with the employer before applying.
          </p>
        </div>
      )}

      {/* Scotland portals — always show */}
      {nation === 'scotland' && (
        <ScotlandPortals keyword={keyword} />
      )}

      {/* Job Ready tip */}
      {nation === 'scotland' && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-start gap-3">
          <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <p className="text-sm text-foreground">
            Found a role on a Scottish portal? Copy the job advert and paste it into{' '}
            <Link href="/dashboard/job-ready" className="text-primary font-semibold underline hover:no-underline">Job Ready™</Link>{' '}
            — get your personal statement, cover letter, supporting statement and interview prep in 30 seconds.
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Results */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      ) : hasSearched ? (
        jobs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card/50 p-12 text-center">
            <Search className="w-7 h-7 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No jobs found. Try a different keyword or broaden your search.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Showing {jobs.length}{total > jobs.length ? ` of ${total.toLocaleString()}` : ''} {nation === 'cos' ? 'sponsoring NHS employers' : `jobs in ${currentNation.flag} ${currentNation.label}`}
              {nation === 'scotland' && <span className="ml-1 text-primary font-medium">via Adzuna</span>}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {jobs.map((job, i) => <JobCard key={job.jobRef || i} job={job} />)}
            </div>
            {total > jobs.length && (
              <div className="flex items-center justify-center gap-3 pt-2">
                <Button onClick={() => changePage(Math.max(1, page - 1))} disabled={page <= 1}
                  className="p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm text-muted-foreground">Page {page}</span>
                <Button onClick={() => changePage(page + 1)}
                  className="p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        )
      ) : !loading && nation !== 'scotland' && nation !== 'cos' && (
        <div className="rounded-xl border border-dashed border-border bg-card/50 p-12 text-center">
          <Search className="w-7 h-7 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Search by job title or keyword to see live vacancies.</p>
        </div>
      )}
    </div>
  )
}