// app/dashboard/radar/page.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2, Sparkles, Clock, Flame, Star, ExternalLink, RefreshCw } from 'lucide-react'

interface Job {
  title: string; employer: string; location: string; salary: string
  url: string; matchScore: number; closingSoon: boolean; daysToClose: number | null; isNew: boolean
}

export default function RadarPage() {
  const [data,    setData]    = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [tab,     setTab]     = useState<'recommended'|'highMatch'|'closingSoon'|'newToday'>('recommended')

  const load = () => {
    setLoading(true)
    fetch('/api/radar').then(r => r.json()).then(setData).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const TABS = [
    { id: 'recommended', label: 'For You Today', icon: Star,    count: data?.summary?.totalScanned ? 5 : 0 },
    { id: 'highMatch',   label: 'High Match',     icon: Sparkles,count: data?.summary?.highMatchCount },
    { id: 'closingSoon', label: 'Closing Soon',   icon: Clock,   count: data?.summary?.closingSoonCount },
    { id: 'newToday',    label: 'New Today',      icon: Flame,   count: data?.summary?.newTodayCount },
  ] as const

  const jobs: Job[] = data?.[tab] ?? []

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-3 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
          </Link>
          <h1 className="text-2xl font-black text-foreground flex items-center gap-2">📡 NHS Opportunity Radar™</h1>
          <p className="text-sm text-muted-foreground mt-1">Your personalised job matches, refreshed daily.</p>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {TABS.map(t => {
              const Icon = t.icon
              return (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`rounded-2xl border p-4 text-left transition-all ${tab === t.id ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/30'}`}>
                  <Icon className={`w-4 h-4 mb-2 ${tab === t.id ? 'text-primary' : 'text-muted-foreground'}`} />
                  <p className="text-2xl font-black text-foreground">{t.count ?? 0}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{t.label}</p>
                </button>
              )
            })}
          </div>

          {/* Job list */}
          <div className="space-y-3">
            {jobs.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
                <p className="text-sm text-muted-foreground">No jobs in this category right now. Check back tomorrow.</p>
              </div>
            ) : jobs.map((job, i) => (
              <div key={i} className="rounded-2xl border border-border bg-card p-4 flex items-start gap-4">
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 font-black text-sm ${
                  job.matchScore >= 80 ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300' :
                  job.matchScore >= 60 ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300' :
                                          'bg-muted text-muted-foreground'
                }`}>
                  {job.matchScore}%
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground">{job.title}</p>
                  <p className="text-xs text-muted-foreground">{job.employer} · {job.location}</p>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {job.isNew && <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">NEW</span>}
                    {job.closingSoon && <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">Closes in {job.daysToClose}d</span>}
                    {job.salary && job.salary !== 'See advert' && <span className="text-[9px] text-muted-foreground">{job.salary}</span>}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <a href={job.url} target="_blank" rel="noopener noreferrer"
                    className="p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <Link href={`/dashboard/job-ready?jobUrl=${encodeURIComponent(job.url)}`}
                    className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3" /> Apply
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}