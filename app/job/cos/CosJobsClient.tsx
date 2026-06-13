// app/job/cos/CosJobsClient.tsx
// COS jobs search — employers verified against UKVI Register of Licensed Sponsors
'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import {
  Search, MapPin, Stethoscope, Loader2, ExternalLink, Sparkles,
  Calendar, PoundSterling, AlertCircle, ChevronLeft, ChevronRight,
  Clock, FileText, Building2, Globe, ShieldCheck, ShieldAlert,
  CheckCircle2, Info,
  ArrowRight,
} from 'lucide-react'
import { ThemeSwitcher } from '@/components/theme-switcher'


function Navbar() {
  const { data: session, status } = useSession()
  const isLoading = status === 'loading'

  const initials =
    session?.user?.name
      ?.split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() ?? ''

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <div className="h-8 w-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-semibold text-[11px] tracking-wide select-none">
              NHS
            </div>
            <span className="font-semibold text-[15px] text-foreground leading-none">
              JobReady
              <span className="ml-1.5 text-[10px] font-normal text-muted-foreground bg-accent dark:bg-slate-800 px-1.5 py-0.5 rounded border border-border align-middle">
                AI
              </span>
            </span>
          </Link>

          {/* Right side */}
          <div className="flex items-center gap-1">

            {/* Browse Jobs — always visible */}
            <Link
              href="/jobs"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] text-muted-foreground hover:text-foreground hover:bg-accent dark:hover:bg-slate-800 transition-colors"
            >
              <Search className="h-3.5 w-3.5" />
              Browse jobs
            </Link>

            {/* Loading skeleton */}
            {isLoading && (
              <div className="flex items-center gap-2 ml-2">
                <div className="h-7 w-14 rounded-md bg-accent dark:bg-slate-800 animate-pulse" />
                <div className="h-7 w-28 rounded-lg bg-accent dark:bg-slate-800 animate-pulse" />
              </div>
            )}

            {/* Authenticated */}
            {!isLoading && session && (
              <>
            
               <div className="hidden sm:block w-px h-5 bg-border mx-1.5" />

                <ThemeSwitcher />

                {/* Avatar */}
                <div
                  title={session.user?.name ?? ''}
                  className="h-8 w-8 rounded-full bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 flex items-center justify-center ml-1 cursor-default select-none"
                >
                  <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                    {initials || '?'}
                  </span>
                </div>

                <Link
                  href="/dashboard"
                  className="hidden sm:flex items-center gap-1.5 ml-1.5 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-[13px] font-semibold transition-colors"
                >
                  Dashboard
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </>
            )}

            {/* Unauthenticated */}
            {!isLoading && !session && (
              <>
                <Link
                  href="/#features"
                  className="hidden md:block px-3 py-1.5 rounded-md text-[13px] text-muted-foreground hover:text-foreground hover:bg-accent dark:hover:bg-slate-800 transition-colors"
                >
                  Features
                </Link>
                <Link
                  href="/#pricing"
                  className="hidden md:block px-3 py-1.5 rounded-md text-[13px] text-muted-foreground hover:text-foreground hover:bg-accent dark:hover:bg-slate-800 transition-colors"
                >
                  Pricing
                </Link>

                <div className="hidden sm:block w-px h-5 bg-border mx-1.5" />

                <ThemeSwitcher />

                <Link
                  href="/login"
                  className="px-3 py-1.5 rounded-lg text-[13px] font-medium text-foreground border border-border hover:bg-accent dark:hover:bg-slate-800 transition-colors"
                >
                  Sign in
                </Link>

                <Link
                  href="/register"
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-[13px] font-semibold transition-colors"
                >
                  Get started free
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

interface Job {
  title: string; employer: string; location: string; salary: string
  datePosted: string; closingDate: string; contractType: string
  workingPattern: string; jobRef: string; url: string
  sponsorVerified: boolean | null
}

interface RegisterInfo {
  loaded: boolean; totalSponsors: number; csvUrl: string | null
  cachedAt: string | null; error: string | null
}

function getInitials(name: string) {
  return name.split(' ').filter(w => w.length > 2).slice(0, 3).map(w => w[0]).join('').toUpperCase().slice(0, 3)
}
const avatarRamps = [
  { bg: 'bg-[#E6F1FB] dark:bg-[#0C447C]', text: 'text-[#0C447C] dark:text-[#B5D4F4]' },
  { bg: 'bg-[#E1F5EE] dark:bg-[#085041]', text: 'text-[#085041] dark:text-[#9FE1CB]' },
  { bg: 'bg-[#EEEDFE] dark:bg-[#3C3489]', text: 'text-[#3C3489] dark:text-[#CECBF6]' },
  { bg: 'bg-[#FAEEDA] dark:bg-[#633806]', text: 'text-[#633806] dark:text-[#FAC775]' },
  { bg: 'bg-[#FAECE7] dark:bg-[#712B13]', text: 'text-[#712B13] dark:text-[#F5C4B3]' },
]
function getAvatarRamp(str: string) {
  let h = 0; for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) & 0xffff
  return avatarRamps[h % avatarRamps.length]
}

function isClosingSoon(d: string) {
  try { const diff = (new Date(d).getTime() - Date.now()) / 86400000; return diff >= 0 && diff <= 7 } catch { return false }
}
function isNew(d: string) {
  try { return (Date.now() - new Date(d).getTime()) / 86400000 <= 3 } catch { return false }
}

function CosJobCard({ job, isLoggedIn }: { job: Job; isLoggedIn: boolean }) {
  const router = useRouter()
  const soon = isClosingSoon(job.closingDate)
  const fresh = isNew(job.datePosted)
  const ramp = getAvatarRamp(job.employer)
  const initials = getInitials(job.employer)

  const handleAnalyse = () => {
    const returnTo = `/job/cos?analyse=${job.jobRef}`
    if (!isLoggedIn) {
      router.push(`/register?returnTo=${encodeURIComponent(returnTo)}&jobUrl=${encodeURIComponent(job.url)}&jobTitle=${encodeURIComponent(job.title)}`)
      return
    }
    router.push(`/dashboard/analysis/new?jobUrl=${encodeURIComponent(job.url)}&jobTitle=${encodeURIComponent(job.title)}`)
  }

  const tags: { label: string; icon: React.ReactNode }[] = []
  if (job.contractType) tags.push({ label: job.contractType, icon: <FileText className="w-3 h-3" /> })
  if (job.workingPattern) tags.push({ label: job.workingPattern, icon: <Clock className="w-3 h-3" /> })

  return (
    <div className={`rounded-xl border bg-card overflow-hidden transition-colors duration-150 flex flex-col h-full ${soon ? 'border-[#FAC775] dark:border-[#854F0B]' : 'border-border hover:border-border/80'}`}>
      {/* Verified sponsor stripe */}
      {job.sponsorVerified && <div className="h-[2px] w-full bg-emerald-500" />}
      {soon && !job.sponsorVerified && <div className="h-[2px] w-full bg-[#EF9F27]" />}

      <div className="px-5 py-4 space-y-3 flex flex-col flex-1">
        <div className="flex items-start gap-3">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-[11px] font-medium shrink-0 border border-border ${ramp.bg} ${ramp.text}`}>
            {initials || <Building2 className="w-3.5 h-3.5" />}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-[13.5px] font-medium text-foreground leading-snug">{job.title}</h3>
            <p className="text-[12px] text-muted-foreground mt-0.5 truncate">{job.employer}</p>
            <div className="flex gap-1.5 mt-1.5 flex-wrap">
              {/* Sponsorship verification badge */}
              {job.sponsorVerified === true && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 inline-flex items-center gap-1">
                  <ShieldCheck className="w-2.5 h-2.5" /> UKVI Verified
                </span>
              )}
              {job.sponsorVerified === null && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground inline-flex items-center gap-1">
                  <ShieldAlert className="w-2.5 h-2.5" /> Unverified
                </span>
              )}
              {fresh && <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#EAF3DE] text-[#3B6D11] border border-[#C0DD97] dark:bg-[#27500A] dark:text-[#C0DD97] dark:border-[#3B6D11]">New</span>}
              {soon && <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#FAEEDA] text-[#854F0B] border border-[#FAC775] dark:bg-[#633806] dark:text-[#FAC775] dark:border-[#854F0B]">Closes soon</span>}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          {job.location && <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground"><MapPin className="w-3 h-3 shrink-0" /><span className="truncate">{job.location}</span></span>}
          {job.salary && job.salary !== 'Not specified' && <span className="flex items-center gap-1.5 text-[12px] text-[#0F6E56] dark:text-[#5DCAA5] font-medium"><PoundSterling className="w-3 h-3 shrink-0" /><span className="truncate">{job.salary}</span></span>}
          {job.datePosted && <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground"><Calendar className="w-3 h-3 shrink-0" /> Posted {job.datePosted}</span>}
          {job.closingDate && <span className={`flex items-center gap-1.5 text-[12px] font-medium ${soon ? 'text-[#854F0B] dark:text-[#FAC775]' : 'text-muted-foreground'}`}><Clock className="w-3 h-3 shrink-0" /> Closes {job.closingDate}</span>}
        </div>

        <div className="flex-1" />
        <div className="border-t border-border" />

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tags.map(t => <span key={t.label} className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-md bg-muted text-muted-foreground border border-border">{t.icon} {t.label}</span>)}
            <span className="inline-flex items-center text-[10.5px] px-2 py-1 rounded-md bg-muted text-muted-foreground/50 font-mono border border-border tracking-wide">{job.jobRef}</span>
          </div>
        )}

        <div className="flex items-center gap-2">
          <a href={job.url} target="_blank" rel="noopener noreferrer"
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors">
            View <ExternalLink className="w-3 h-3" />
          </a>
          <button onClick={handleAnalyse}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-foreground text-background text-[12px] font-medium hover:opacity-85 transition-opacity">
            <Sparkles className="w-3.5 h-3.5" /> Analyse
          </button>
        </div>
      </div>
    </div>
  )
}

function CosPageContent({ isLoggedIn }: { isLoggedIn: boolean }) {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [keyword,     setKeyword]     = useState(searchParams.get('keyword') ?? '')
  const [location,    setLocation]    = useState(searchParams.get('location') ?? '')
  const [page,        setPage]        = useState(Number(searchParams.get('page') ?? '1'))
  const [jobs,        setJobs]        = useState<Job[]>([])
  const [total,       setTotal]       = useState(0)
  const [register,    setRegister]    = useState<RegisterInfo | null>(null)
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)

  const runSearch = async (k = keyword, l = location, p = page) => {
    setLoading(true); setError(null)
    try {
      const params = new URLSearchParams()
      if (k) params.set('keyword', k)
      if (l) params.set('location', l)
      if (p > 1) params.set('page', String(p))

      const res  = await fetch(`/api/jobs/cos-search?${params.toString()}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Search failed')

      setJobs(data.jobs ?? [])
      setTotal(data.total ?? 0)
      setRegister(data.register ?? null)
      setHasSearched(true)

      const urlParams = new URLSearchParams()
      if (k) urlParams.set('keyword', k)
      if (l) urlParams.set('location', l)
      if (p > 1) urlParams.set('page', String(p))
      router.push(`/job/cos?${urlParams.toString()}`, { scroll: false })
    } catch (e: any) { setError(e.message); setJobs([]) }
    finally { setLoading(false) }
  }

  useEffect(() => {
    // Auto-search on mount — even blank search is valid (returns all roles from verified sponsors)
    runSearch(searchParams.get('keyword') ?? '', searchParams.get('location') ?? '', Number(searchParams.get('page') ?? '1'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); setPage(1); runSearch(keyword, location, 1) }
  const changePage = (n: number) => { setPage(n); runSearch(keyword, location, n); window.scrollTo({ top: 0, behavior: 'smooth' }) }

  return (
    <div className="space-y-4">
      {/* Register status banner */}
      {register && (
        <div className={`rounded-xl border px-4 py-3 flex items-start gap-3 flex-wrap ${register.loaded ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30' : 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30'}`}>
          {register.loaded
            ? <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            : <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          }
          <div className="flex-1 min-w-0">
            {register.loaded ? (
              <p className="text-[12px] text-emerald-700 dark:text-emerald-300">
                <strong>UKVI Register loaded</strong> — {register.totalSponsors.toLocaleString()} verified Worker sponsors.
                {register.cachedAt && ` Data as of ${new Date(register.cachedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}.`}
                {' '}<a href="https://www.gov.uk/government/publications/register-of-licensed-sponsors-workers" target="_blank" rel="noopener noreferrer" className="underline hover:no-underline">View on GOV.UK</a>
              </p>
            ) : (
              <p className="text-[12px] text-amber-700 dark:text-amber-300">
                <strong>Could not load UKVI Register</strong> — showing all results unverified. {register.error}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Search form */}
      <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="relative">
            <Stethoscope className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="Job title (e.g. Nurse, Radiographer)"
              className="w-full bg-muted border border-border rounded-lg pl-9 pr-4 py-2 text-[13px] text-foreground placeholder-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Location (e.g. London)"
              className="w-full bg-muted border border-border rounded-lg pl-9 pr-4 py-2 text-[13px] text-foreground placeholder-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button type="submit" disabled={loading}
            className="px-5 py-2 rounded-lg bg-foreground text-background text-[13px] font-medium inline-flex items-center gap-2 disabled:opacity-50 hover:opacity-85 transition-opacity">
            {loading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Searching…</> : <><Search className="w-3.5 h-3.5" /> Search</>}
          </button>
          <div className="flex flex-wrap gap-2">
            {['Staff Nurse', 'Radiographer', 'Physiotherapist', 'Healthcare Assistant'].map(s => (
              <button key={s} type="button" onClick={() => { setKeyword(s); runSearch(s, location, 1) }}
                className="text-[12px] px-3 py-1.5 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-border/80 transition-colors">
                {s}
              </button>
            ))}
          </div>
        </div>
      </form>

      {/* Disclaimer */}
      <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 flex items-start gap-2.5">
        <Info className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
        <div className="text-[11px] text-muted-foreground leading-relaxed">
          <strong className="text-foreground">How this works:</strong> Jobs shown here are from NHS Jobs whose employer name matches an entry in the <a href="https://www.gov.uk/government/publications/register-of-licensed-sponsors-workers" target="_blank" rel="noopener noreferrer" className="underline">UKVI Register of Licensed Sponsors (Workers)</a>. A match means the employer holds an active Worker sponsor licence — but does not guarantee sponsorship for this specific role or your specific visa category. Always confirm sponsorship availability directly with the employer before applying.
        </div>
      </div>

      {/* Link back to all jobs and Scotland */}
      <div className="flex gap-2 flex-wrap">
        <Link href="/jobs" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-[12px] font-medium text-foreground hover:border-border/80 transition-colors">
          ← All NHS jobs
        </Link>
        <a href="https://jobs.scot.nhs.uk/" target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors">
          🏴󠁧󠁢󠁳󠁣󠁴󠁿 NHS Scotland jobs <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
          <p className="text-[13px] text-destructive">{error}</p>
        </div>
      )}

      {/* Results */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 space-y-3">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
          <p className="text-[12px] text-muted-foreground">Loading UKVI register and searching NHS Jobs…</p>
        </div>
      ) : hasSearched ? (
        jobs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card/50 p-12 text-center">
            <Globe className="w-7 h-7 text-muted-foreground mx-auto mb-3" />
            <p className="text-[13px] text-muted-foreground font-medium">No verified sponsoring employers found for this search.</p>
            <p className="text-[11px] text-muted-foreground mt-1">Try a different role or location — or check all NHS jobs without the sponsorship filter.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-[12px] text-muted-foreground">
              <strong className="text-foreground">{jobs.length}</strong> jobs from UKVI-verified sponsoring employers
              {keyword && <> matching "{keyword}"</>}
              {location && <> in {location}</>}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {jobs.map(job => <CosJobCard key={job.jobRef} job={job} isLoggedIn={isLoggedIn} />)}
            </div>
            {total > jobs.length && (
              <div className="flex items-center justify-center gap-3 pt-2">
                <button onClick={() => changePage(Math.max(1, page - 1))} disabled={page <= 1}
                  className="p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-[13px] text-muted-foreground">Page {page}</span>
                <button onClick={() => changePage(page + 1)}
                  className="p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )
      ) : null}
    </div>
  )
}

export function CosJobsClient({ isLoggedIn = false }: { isLoggedIn?: boolean }) {
  return (
    <div className="min-h-screen bg-background">
           <Navbar />

      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Globe className="w-6 h-6 text-emerald-600 dark:text-emerald-400" /> NHS Jobs with Visa Sponsorship
          </h1>
          <p className="text-[13px] text-muted-foreground mt-1 max-w-lg leading-relaxed">
            Jobs cross-referenced against the official <strong>UKVI Register of Licensed Sponsors</strong> — only showing employers that hold an active Worker sponsor licence.
          </p>
        </div>
        <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="w-5 h-5 text-primary animate-spin" /></div>}>
          <CosPageContent isLoggedIn={isLoggedIn} />
        </Suspense>
      </div>
    </div>
  )
}