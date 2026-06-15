// app/dashboard/momentum/page.tsx
// MOAT 8 — Application Momentum Score™
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, TrendingUp, TrendingDown, Minus, Loader2,
  Sparkles, Target, CheckCircle2, XCircle, Award,
  BarChart3, Calendar, ChevronDown, RefreshCw,
} from 'lucide-react'

const OUTCOMES = [
  { value: 'pending',     label: 'Pending',      color: 'bg-muted text-muted-foreground' },
  { value: 'shortlisted', label: 'Shortlisted',  color: 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300' },
  { value: 'interview',   label: 'Interview',    color: 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300' },
  { value: 'offer',       label: 'Offer',        color: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300' },
  { value: 'rejected',    label: 'Rejected',     color: 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300' },
  { value: 'withdrawn',   label: 'Withdrawn',    color: 'bg-muted text-muted-foreground' },
]

interface MomentumData {
  momentumScore: number
  trend: 'increasing' | 'stable' | 'declining'
  trendReason: string
  insight: string
  scoreBreakdown: {
    outcomeQuality: number; interviewFactor: number; velocityFactor: number; bestOutcome: number
  }
  stats: {
    total: number; totalSubmitted: number; interviews: number
    shortlisted: number; offers: number; rejected: number
    interviewRate: number; successRate: number
  }
  velocity: { last30: number; previous30: number; previous60: number }
  monthlyCounts: { month: string; count: number }[]
  recent: { id: string; jobTitle: string; employer: string; status: string; outcome: string | null; submittedAt: string | null }[]
}

function MomentumRing({ score, trend }: { score: number; trend: string }) {
  const color = score >= 65 ? '#10b981' : score >= 35 ? '#f59e0b' : '#ef4444'
  const r = 52; const circ = 2 * Math.PI * r
  const offset = circ * (1 - score / 100)
  const TrendIcon = trend === 'increasing' ? TrendingUp : trend === 'declining' ? TrendingDown : Minus
  const trendColor = trend === 'increasing' ? 'text-emerald-500' : trend === 'declining' ? 'text-red-500' : 'text-muted-foreground'

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-32 h-32 flex items-center justify-center">
        <svg className="-rotate-90 absolute" width="128" height="128">
          <circle cx="64" cy="64" r={r} fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/20" />
          <circle cx="64" cy="64" r={r} fill="none" stroke={color} strokeWidth="8"
            strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
            className="transition-all duration-1000" />
        </svg>
        <div className="text-center">
          <p className="text-3xl font-black text-foreground">{score}</p>
          <p className="text-[10px] text-muted-foreground">momentum</p>
        </div>
      </div>
      <div className={`flex items-center gap-1 text-sm font-semibold ${trendColor}`}>
        <TrendIcon className="w-4 h-4" />
        {trend === 'increasing' ? 'Increasing' : trend === 'declining' ? 'Declining' : 'Stable'}
      </div>
    </div>
  )
}

function BarChart({ data }: { data: { month: string; count: number }[] }) {
  const max = Math.max(...data.map(d => d.count), 1)
  return (
    <div className="flex items-end gap-2 h-24">
      {data.map((d, i) => (
        <div key={i} className="flex flex-col items-center gap-1 flex-1">
          <span className="text-[10px] text-muted-foreground tabular-nums">{d.count || ''}</span>
          <div className="w-full rounded-t-md transition-all duration-700"
            style={{ height: `${(d.count / max) * 72}px`, minHeight: d.count > 0 ? 4 : 0, background: d.count > 0 ? '#3b82f6' : undefined }}
            className={d.count > 0 ? '' : 'bg-muted/30 rounded-t-md'} />
          <span className="text-[10px] text-muted-foreground">{d.month}</span>
        </div>
      ))}
    </div>
  )
}

function OutcomeUpdater({ appId, current, onUpdate }: { appId: string; current: string | null; onUpdate: () => void }) {
  const [open, setOpen]     = useState(false)
  const [saving, setSaving] = useState(false)

  const updateOutcome = async (outcome: string) => {
    setSaving(true)
    try {
      await fetch('/api/momentum', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: appId, outcome }),
      })
      setOpen(false)
      onUpdate()
    } catch {}
    finally { setSaving(false) }
  }

  const currentCfg = OUTCOMES.find(o => o.value === (current ?? 'pending')) ?? OUTCOMES[0]

  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)} disabled={saving}
        className={`text-[10px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 ${currentCfg.color}`}>
        {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : currentCfg.label}
        <ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <div className="absolute right-0 top-7 z-10 bg-card border border-border rounded-xl shadow-lg overflow-hidden min-w-[140px]">
          {OUTCOMES.map(o => (
            <button key={o.value} onClick={() => updateOutcome(o.value)}
              className="w-full text-left px-3 py-2 text-xs hover:bg-accent transition-colors">
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function MomentumPage() {
  const [data,    setData]    = useState<MomentumData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  const load = async () => {
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/momentum')
      const d   = await res.json()
      if (!res.ok) throw new Error(d.error ?? 'Failed')
      setData(d)
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-6">
      <div>
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-4 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-primary" /> Application Momentum™
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Track your application velocity, interview rate, and success trend over time.
            </p>
          </div>
          <button onClick={load} disabled={loading} className="p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loading && !data && (
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
      )}
      {error && <p className="text-sm text-red-500">{error}</p>}

      {data && (
        <div className="space-y-5">
          {/* Score + trend */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center gap-8 flex-wrap">
              <MomentumRing score={data.momentumScore} trend={data.trend} />
              <div className="flex-1 space-y-3">
                <p className="text-sm text-foreground leading-relaxed">{data.trendReason}</p>
                {/* Score breakdown — shows exactly what's driving the number */}
                <div className="space-y-1.5">
                  {[
                    { label: 'Outcome quality', value: data.scoreBreakdown.outcomeQuality, max: 40, note: data.scoreBreakdown.bestOutcome === 100 ? 'Offer received' : data.scoreBreakdown.bestOutcome === 80 ? 'Interview achieved' : data.scoreBreakdown.bestOutcome === 60 ? 'Shortlisted' : data.scoreBreakdown.bestOutcome === 10 ? 'Rejected (feedback received)' : 'Pending / no outcome yet' },
                    { label: 'Interview rate',   value: data.scoreBreakdown.interviewFactor, max: 30, note: `${data.stats.interviewRate}% of submissions led to interview` },
                    { label: 'Submission rate',  value: data.scoreBreakdown.velocityFactor,  max: 30, note: `${data.velocity.last30} submitted in last 30 days` },
                  ].map(f => (
                    <div key={f.label} className="space-y-0.5">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-muted-foreground">{f.label}</span>
                        <span className="font-mono font-bold text-foreground">{f.value}/{f.max}</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all duration-700" style={{ width: `${(f.value / f.max) * 100}%` }} />
                      </div>
                      <p className="text-[10px] text-muted-foreground">{f.note}</p>
                    </div>
                  ))}
                </div>
                <div className="rounded-xl bg-muted/50 p-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Coach insight
                  </p>
                  <p className="text-sm text-foreground">{data.insight}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total',          value: data.stats.total,          color: 'text-foreground'                          },
              { label: 'Submitted',      value: data.stats.totalSubmitted, color: 'text-blue-600 dark:text-blue-400'         },
              { label: 'Interviews',     value: data.stats.interviews,     color: 'text-purple-600 dark:text-purple-400'     },
              { label: 'Interview rate', value: `${data.stats.interviewRate}%`, color: 'text-emerald-600 dark:text-emerald-400' },
            ].map(s => (
              <div key={s.label} className="rounded-xl border border-border bg-card p-4 text-center">
                <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Velocity (last 30 vs previous) */}
          <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
            <p className="text-sm font-bold text-foreground">Submission Velocity</p>
            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                { label: 'Last 30 days',     count: data.velocity.last30     },
                { label: 'Previous 30 days', count: data.velocity.previous30 },
                { label: '60–90 days ago',   count: data.velocity.previous60 },
              ].map(v => (
                <div key={v.label} className="rounded-xl bg-muted/50 p-3">
                  <p className="text-xl font-black text-foreground">{v.count}</p>
                  <p className="text-[10px] text-muted-foreground">{v.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Monthly bar chart */}
          <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
            <p className="text-sm font-bold text-foreground">Submissions — Last 6 Months</p>
            <BarChart data={data.monthlyCounts} />
          </div>

          {/* Outcome breakdown */}
          {data.stats.totalSubmitted > 0 && (
            <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
              <p className="text-sm font-bold text-foreground">Outcomes</p>
              <div className="space-y-2">
                {[
                  { label: 'Shortlisted', count: data.stats.shortlisted, icon: CheckCircle2, color: 'text-blue-500' },
                  { label: 'Interview',   count: data.stats.interviews,  icon: Target,       color: 'text-purple-500' },
                  { label: 'Offer',       count: data.stats.offers,      icon: Award,        color: 'text-emerald-500' },
                  { label: 'Rejected',    count: data.stats.rejected,    icon: XCircle,      color: 'text-red-500' },
                ].map(o => (
                  <div key={o.label} className="flex items-center gap-3">
                    <o.icon className={`w-4 h-4 shrink-0 ${o.color}`} />
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${data.stats.totalSubmitted > 0 ? (o.count / data.stats.totalSubmitted) * 100 : 0}%`, background: 'currentColor' }}
                        className={o.color} />
                    </div>
                    <span className="text-xs font-bold text-foreground w-6 text-right">{o.count}</span>
                    <span className="text-xs text-muted-foreground w-12">{o.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent applications with outcome updater */}
          {data.recent.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
              <p className="text-sm font-bold text-foreground">Recent Applications — Update Outcomes</p>
              <p className="text-xs text-muted-foreground">Mark what happened after you submitted each application to improve your momentum tracking.</p>
              <div className="space-y-2">
                {data.recent.map(app => (
                  <div key={app.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card/50 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{app.jobTitle}</p>
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                        {app.employer && <span className="truncate">{app.employer}</span>}
                        {app.submittedAt && (
                          <span className="flex items-center gap-1 ml-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(app.submittedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                          </span>
                        )}
                      </p>
                    </div>
                    <OutcomeUpdater appId={app.id} current={app.outcome} onUpdate={load} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {data.stats.total === 0 && (
            <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center space-y-3">
              <BarChart3 className="w-8 h-8 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">No applications yet.</p>
              <Link href="/dashboard/application" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors">
                <Sparkles className="w-4 h-4" /> Start your first application
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}