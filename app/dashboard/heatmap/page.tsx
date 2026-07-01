// app/dashboard/heatmap/page.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Search, Loader2, ExternalLink, Sparkles, Flame } from 'lucide-react'

interface ScoredJob {
  title: string; employer: string; location: string; salary: string; url: string
  heatScore: number
  factors: { interview: number; salary: number; competition: number; sponsorship: number; progression: number }
}

function heatColor(score: number) {
  if (score >= 75) return { bg: 'bg-red-500',    text: 'text-red-600',    label: '🔥 Hot'    }
  if (score >= 55) return { bg: 'bg-amber-500',  text: 'text-amber-600',  label: '☀️ Warm'   }
  return                  { bg: 'bg-blue-400',   text: 'text-blue-600',   label: '❄️ Cool'   }
}

function FactorBar({ label, val }: { label: string; val: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[9px] text-muted-foreground w-16 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-primary rounded-full" style={{ width: `${val}%` }} />
      </div>
      <span className="text-[9px] text-muted-foreground w-7 text-right">{val}</span>
    </div>
  )
}

export default function HeatMapPage() {
  const [keyword, setKeyword] = useState('Staff Nurse')
  const [jobs,    setJobs]    = useState<ScoredJob[]>([])
  const [loading, setLoading] = useState(false)
  const [searched,setSearched]= useState(false)

  const search = async () => {
    setLoading(true); setSearched(true)
    try {
      const res  = await fetch(`/api/heatmap?keyword=${encodeURIComponent(keyword)}`)
      const data = await res.json()
      setJobs(data.jobs ?? [])
    } finally { setLoading(false) }
  }

  useEffect(() => { search() }, [])

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div>
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-3 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
        </Link>
        <h1 className="text-2xl font-black text-foreground flex items-center gap-2">🗺️ NHS Application Heat Map™</h1>
        <p className="text-sm text-muted-foreground mt-1">Ranked by interview probability, salary, competition, sponsorship & progression — not posting date.</p>
      </div>

      <form onSubmit={e => { e.preventDefault(); search() }} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={keyword} onChange={e => setKeyword(e.target.value)}
            placeholder="Job title or keyword…"
            className="w-full bg-card border border-border rounded-xl pl-10 pr-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <button type="submit" disabled={loading}
          className="px-5 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold disabled:opacity-50 flex items-center gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Flame className="w-4 h-4" />} Rank Jobs
        </button>
      </form>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : searched && jobs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
          <p className="text-sm text-muted-foreground">No jobs found for this search.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job, i) => {
            const heat = heatColor(job.heatScore)
            return (
              <div key={i} className="rounded-2xl border border-border bg-card p-4 flex items-start gap-4">
                <div className="relative w-14 h-14 shrink-0">
                  <svg viewBox="0 0 36 36" className="w-14 h-14 -rotate-90">
                    <circle cx="18" cy="18" r="15" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                    <circle cx="18" cy="18" r="15" fill="none" className={heat.bg.replace('bg-','stroke-')} strokeWidth="3"
                      strokeDasharray={2*Math.PI*15} strokeDashoffset={2*Math.PI*15*(1-job.heatScore/100)} strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center text-xs font-black text-foreground">{job.heatScore}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <p className="text-sm font-bold text-foreground">{job.title}</p>
                    <span className={`text-[10px] font-bold ${heat.text}`}>{heat.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{job.employer} · {job.location} {job.salary !== 'See advert' ? `· ${job.salary}` : ''}</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-3">
                    <FactorBar label="Interview"   val={job.factors.interview} />
                    <FactorBar label="Salary"      val={job.factors.salary} />
                    <FactorBar label="Low comp."   val={job.factors.competition} />
                    <FactorBar label="Sponsorship" val={job.factors.sponsorship} />
                    <FactorBar label="Progression" val={job.factors.progression} />
                  </div>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <a href={job.url} target="_blank" rel="noopener noreferrer"
                    className="p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <Link href={`/dashboard/job-ready?jobUrl=${encodeURIComponent(job.url)}`}
                    className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}