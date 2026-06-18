// app/admin/page.tsx
//
// Signature element retained: a 24h "pulse strip" heartbeat waveform.
// All colors now use Tailwind semantic tokens (bg-card, text-foreground,
// border-border, etc.) with explicit dark: variants where a fixed accent
// is needed, so the page correctly follows the ThemeSwitcher instead of
// being locked to dark mode.
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Users, TrendingUp, FileText, Activity, AlertCircle,
  ArrowRight, Loader2, ArrowUpRight, ShieldAlert, Zap, Clock,
} from 'lucide-react'

interface Overview {
  generatedAt: string
  users: {
    total: number; signups7d: number; signups30d: number; suspended: number
    tierBreakdown: Record<string, number>
    signupsByDay: Record<string, number>
    recentSignups: { id: string; name: string | null; email: string; tier: string; createdAt: string; image: string | null }[]
  }
  revenue: { estimatedMrr: number; tierPrices: Record<string, number> }
  usage: { totalAnalyses: number; analyses7d: number; analyses30d: number; totalCvProfiles: number; cvProfiles30d: number; totalApplications: number }
  systemHealth: {
    aiCalls24h: number; aiErrors24h: number; errorRate24h: number
    aiCalls7d: number; aiErrors7d: number; errorRate7d: number
    byProvider: { provider: string; count: number }[]
    recentErrors: { id: string; type: string; provider: string | null; endpoint: string | null; errorMessage: string | null; createdAt: string }[]
  }
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-border bg-card p-5 ${className}`}>
      {children}
    </div>
  )
}

function StatCard({ icon: Icon, label, value, sub, accent }: { icon: React.ElementType; label: string; value: string | number; sub?: string; accent?: string }) {
  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <Icon className={`w-4 h-4 ${accent ?? 'text-muted-foreground'}`} />
      </div>
      <p className="text-2xl font-bold tabular-nums font-mono text-foreground">{value}</p>
      <p className="text-[12px] mt-0.5 text-muted-foreground">{label}</p>
      {sub && <p className="text-[11px] mt-1 text-muted-foreground/70">{sub}</p>}
    </Card>
  )
}

// The signature: a pulse strip built from the last 14 days of signup
// volume, rendered as a heartbeat waveform rather than a generic chart.
function PulseStrip({ signupsByDay, errorRate }: { signupsByDay: Record<string, number>; errorRate: number }) {
  const entries = Object.entries(signupsByDay).slice(-14)
  const max = Math.max(...entries.map(([, v]) => v), 1)
  const isHealthy = errorRate < 3
  const pulseColorClass = errorRate >= 8 ? 'stroke-red-500 dark:stroke-red-400' : errorRate >= 3 ? 'stroke-amber-500 dark:stroke-amber-400' : 'stroke-emerald-500 dark:stroke-emerald-400'
  const dotColorClass = errorRate >= 8 ? 'bg-red-500' : errorRate >= 3 ? 'bg-amber-500' : 'bg-emerald-500'

  const w = 100 / Math.max(entries.length - 1, 1)
  const points = entries.map(([, v], i) => {
    const x = i * w
    const y = 50 - (v / max) * 40
    return `${x},${y}`
  })
  const path = `M ${points.join(' L ')}`

  return (
    <Card className="relative overflow-hidden">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-60 ${dotColorClass}`} />
            <span className={`relative inline-flex rounded-full h-2 w-2 ${dotColorClass}`} />
          </span>
          <p className="text-[13px] font-semibold text-foreground">System pulse</p>
        </div>
        <p className="text-[11px] font-mono text-muted-foreground">{isHealthy ? 'Nominal' : 'Elevated errors'} · {errorRate}% (24h)</p>
      </div>
      <svg viewBox="0 0 100 50" preserveAspectRatio="none" className="w-full h-16 mt-2">
        <path d={path} fill="none" strokeWidth="1.2" vectorEffect="non-scaling-stroke" opacity="0.85" className={pulseColorClass} />
      </svg>
      <p className="text-[10.5px] font-mono mt-1 text-muted-foreground/70">Signups, last 14 days · shape only — see Usage & AI Health for exact figures</p>
    </Card>
  )
}

export default function AdminOverviewPage() {
  const [data, setData] = useState<Overview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/overview')
      .then(r => r.json())
      .then(d => { if (d.error) throw new Error(d.error); setData(d) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex justify-center py-24"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
  if (error) return <div className="p-8 text-sm text-red-500">{error}</div>
  if (!data) return null

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-500" /> Overview
          </h1>
          <p className="text-[12.5px] mt-1 text-muted-foreground">Platform-wide stats, live.</p>
        </div>
        <p className="text-[11px] font-mono text-muted-foreground/70">
          <Clock className="w-3 h-3 inline mr-1 -mt-0.5" />
          Updated {new Date(data.generatedAt).toLocaleTimeString('en-GB')}
        </p>
      </div>

      <PulseStrip signupsByDay={data.users.signupsByDay} errorRate={data.systemHealth.errorRate24h} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total users" value={data.users.total} sub={`+${data.users.signups7d} this week`} accent="text-blue-500" />
        <StatCard icon={TrendingUp} label="Estimated MRR" value={`£${data.revenue.estimatedMrr.toLocaleString()}`} sub={`${data.users.tierBreakdown.pro ?? 0} Pro · ${data.users.tierBreakdown.elite ?? 0} Elite`} accent="text-emerald-500" />
        <StatCard icon={FileText} label="Analyses (30d)" value={data.usage.analyses30d} sub={`${data.usage.totalAnalyses} all-time`} accent="text-violet-500" />
        <StatCard icon={Activity} label="AI error rate (24h)" value={`${data.systemHealth.errorRate24h}%`} sub={`${data.systemHealth.aiCalls24h} calls, ${data.systemHealth.aiErrors24h} errors`} accent={data.systemHealth.errorRate24h > 5 ? 'text-red-500' : 'text-emerald-500'} />
      </div>

      <div className="grid lg:grid-cols-[1fr_280px] gap-5">
        <Card>
          <p className="text-[13px] font-semibold mb-4 text-foreground">Tier breakdown</p>
          <div className="space-y-3">
            {Object.entries(data.users.tierBreakdown).map(([tier, count]) => {
              const pct = data.users.total > 0 ? Math.round((count / data.users.total) * 100) : 0
              return (
                <div key={tier} className="space-y-1.5">
                  <div className="flex justify-between text-[12px]">
                    <span className="capitalize font-medium text-foreground">{tier}</span>
                    <span className="font-mono text-muted-foreground">{count} ({pct}%)</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden bg-muted">
                    <div className="h-full rounded-full bg-blue-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
          {data.users.suspended > 0 && (
            <p className="text-[11px] flex items-center gap-1.5 pt-3 mt-3 border-t border-border text-amber-600 dark:text-amber-400">
              <AlertCircle className="w-3 h-3" /> {data.users.suspended} suspended account{data.users.suspended !== 1 ? 's' : ''}
            </p>
          )}
        </Card>

        <Card className="flex flex-col gap-2">
          <p className="text-[13px] font-semibold mb-1 text-foreground">Quick actions</p>
          <Link href="/admin/users?suspended=true" className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12.5px] text-muted-foreground bg-muted/50 hover:bg-muted transition-colors">
            <AlertCircle className="w-3.5 h-3.5" /> Review suspended accounts
          </Link>
          <Link href="/admin/system-health" className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12.5px] text-muted-foreground bg-muted/50 hover:bg-muted transition-colors">
            <Zap className="w-3.5 h-3.5" /> Investigate recent errors
          </Link>
          <Link href="/admin/audit-log" className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12.5px] text-muted-foreground bg-muted/50 hover:bg-muted transition-colors">
            <ArrowUpRight className="w-3.5 h-3.5" /> View full audit trail
          </Link>
        </Card>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <StatCard icon={FileText} label="CV profiles created (30d)" value={data.usage.cvProfiles30d} sub={`${data.usage.totalCvProfiles} all-time`} />
        <StatCard icon={FileText} label="Total applications tracked" value={data.usage.totalApplications} />
        <StatCard icon={Activity} label="AI calls (7d)" value={data.systemHealth.aiCalls7d} sub={`${data.systemHealth.errorRate7d}% error rate`} />
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <Card>
          <p className="text-[13px] font-semibold mb-3 text-foreground">AI calls by provider (7d)</p>
          {data.systemHealth.byProvider.length === 0 ? (
            <p className="text-[12px] text-muted-foreground">No events logged yet.</p>
          ) : (
            <div className="space-y-2">
              {data.systemHealth.byProvider.map(p => (
                <div key={p.provider} className="flex items-center justify-between text-[12.5px]">
                  <span className="capitalize text-foreground">{p.provider}</span>
                  <span className="font-mono text-muted-foreground">{p.count}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[13px] font-semibold text-foreground">Recent errors</p>
            <Link href="/admin/system-health" className="text-[11px] font-medium flex items-center gap-1 hover:underline text-blue-600 dark:text-blue-400">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {data.systemHealth.recentErrors.length === 0 ? (
            <p className="text-[12px] text-emerald-600 dark:text-emerald-400">No errors in the last 7 days.</p>
          ) : (
            <div className="space-y-2">
              {data.systemHealth.recentErrors.slice(0, 5).map(e => (
                <div key={e.id} className="text-[11.5px] pl-2.5 py-0.5 border-l-2 border-amber-400 dark:border-amber-600">
                  <p className="font-medium text-foreground">{e.endpoint ?? e.type} {e.provider && `· ${e.provider}`}</p>
                  <p className="truncate text-muted-foreground">{e.errorMessage ?? '—'}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[13px] font-semibold text-foreground">Recent signups</p>
          <Link href="/admin/users" className="text-[11px] font-medium flex items-center gap-1 hover:underline text-blue-600 dark:text-blue-400">
            View all users <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="divide-y divide-border">
          {data.users.recentSignups.map(u => (
            <Link key={u.id} href={`/admin/users/${u.id}`} className="flex items-center justify-between py-2.5 -mx-2 px-2 rounded-lg transition-colors group hover:bg-accent/40">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full flex items-center justify-center text-[11px] font-semibold font-mono bg-muted text-blue-600 dark:text-blue-400 border border-border">
                  {(u.name ?? u.email)[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="text-[13px] font-medium text-foreground">{u.name ?? 'Unnamed'}</p>
                  <p className="text-[11px] font-mono text-muted-foreground">{u.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-muted ${u.tier === 'pro' ? 'text-blue-600 dark:text-blue-400' : u.tier === 'elite' ? 'text-violet-600 dark:text-violet-400' : 'text-muted-foreground'}`}>
                  {u.tier}
                </span>
                <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground" />
              </div>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  )
}