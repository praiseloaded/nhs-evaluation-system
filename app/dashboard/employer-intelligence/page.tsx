// app/dashboard/employer-intelligence/page.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Search, Loader2, Building2, Heart, MessageSquare, ListChecks, Briefcase, Stethoscope, Lightbulb } from 'lucide-react'

interface Profile {
  employerName: string; overview: string; values: string[]
  commonInterviewThemes: string[]; typicalEssentialCriteria: string[]
  workingEnvironment: string; serviceSpecialties: string[]
  applicationTips: string[]; confidence: string
}

const POPULAR = [
  'NHS Greater Glasgow and Clyde', 'Guy\'s and St Thomas\' NHS Foundation Trust',
  'Manchester University NHS Foundation Trust', 'NHS Lothian', 'Imperial College Healthcare NHS Trust',
  'Cardiff and Vale University Health Board',
]

export default function EmployerIntelligencePage() {
  const [query,   setQuery]   = useState('')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [cached,  setCached]  = useState(false)

  const search = async (employer?: string) => {
    const name = (employer ?? query).trim()
    if (!name) return
    setLoading(true); setError(null); setProfile(null)
    try {
      const res  = await fetch(`/api/employer-intelligence?employer=${encodeURIComponent(name)}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setProfile(data.profile)
      setCached(data.cached)
      setQuery(name)
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div>
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-3 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
        </Link>
        <h1 className="text-2xl font-black text-foreground flex items-center gap-2">🏥 Employer Intelligence™</h1>
        <p className="text-sm text-muted-foreground mt-1">Research any NHS Trust or Health Board before you apply.</p>
      </div>

      <form onSubmit={e => { e.preventDefault(); search() }} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Enter NHS Trust or Health Board name…"
            className="w-full bg-card border border-border rounded-xl pl-10 pr-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <button type="submit" disabled={loading || !query.trim()}
          className="px-5 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold disabled:opacity-50 flex items-center gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Research
        </button>
      </form>

      {!profile && !loading && (
        <div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Popular searches</p>
          <div className="flex flex-wrap gap-2">
            {POPULAR.map(p => (
              <button key={p} onClick={() => search(p)}
                className="text-xs px-3 py-1.5 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors">
                {p}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</div>}

      {loading && (
        <div className="rounded-2xl border border-border bg-card p-12 text-center space-y-2">
          <Loader2 className="w-6 h-6 text-primary animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Researching employer…</p>
        </div>
      )}

      {profile && (
        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-950/50 flex items-center justify-center shrink-0">
                  <Building2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-foreground">{profile.employerName}</h2>
                  {cached && <span className="text-[10px] text-muted-foreground">Cached profile · refreshes every 30 days</span>}
                </div>
              </div>
              {profile.confidence === 'general' && (
                <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 shrink-0">
                  General NHS pattern
                </span>
              )}
            </div>
            <p className="text-sm text-foreground/80 leading-relaxed">{profile.overview}</p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="text-xs font-bold text-foreground/70 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5 text-rose-500" /> Trust Values
              </p>
              <div className="flex flex-wrap gap-2">
                {profile.values.map((v, i) => (
                  <span key={i} className="text-xs px-2.5 py-1 rounded-md bg-rose-50 dark:bg-rose-950 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-medium">{v}</span>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="text-xs font-bold text-foreground/70 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Stethoscope className="w-3.5 h-3.5 text-blue-500" /> Service Specialties
              </p>
              <div className="flex flex-wrap gap-2">
                {profile.serviceSpecialties.map((s, i) => (
                  <span key={i} className="text-xs px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 font-medium">{s}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-xs font-bold text-foreground/70 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-purple-500" /> Common Interview Themes
            </p>
            <ul className="space-y-2">
              {profile.commonInterviewThemes.map((t, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                  <span className="text-purple-500 font-bold mt-0.5">{i+1}.</span> {t}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-xs font-bold text-foreground/70 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <ListChecks className="w-3.5 h-3.5 text-emerald-500" /> Typical Essential Criteria
            </p>
            <ul className="space-y-1.5">
              {profile.typicalEssentialCriteria.map((c, i) => (
                <li key={i} className="text-sm text-foreground/80 flex items-start gap-2">
                  <span className="text-emerald-500 mt-1">•</span> {c}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-xs font-bold text-foreground/70 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-amber-500" /> Working Environment
            </p>
            <p className="text-sm text-foreground/80 leading-relaxed">{profile.workingEnvironment}</p>
          </div>

          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
            <p className="text-xs font-bold text-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Lightbulb className="w-3.5 h-3.5 text-primary" /> Application Tips
            </p>
            <ul className="space-y-1.5">
              {profile.applicationTips.map((t, i) => (
                <li key={i} className="text-sm text-foreground flex items-start gap-2">
                  <span className="text-primary mt-1">→</span> {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}