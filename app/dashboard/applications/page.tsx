// app/dashboard/applications/page.tsx
'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  FileText, Plus, Loader2, Target, TrendingUp, Clock,
  ChevronDown, BarChart3, Calendar, AlertTriangle,
  CheckCircle2, Send, Users, Award, XCircle, Sparkles,
} from 'lucide-react'

type Application = {
  id: string; jobTitle: string; band: string | null; employer: string | null
  status: string; completeness: number; wordCount: number | null
  liveScore: any; cvScore: any; notes: string | null
  deadlineDate: string | null; interviewDate: string | null
  submittedAt: string | null; createdAt: string; updatedAt: string
  _count: { criteria: number }
}

type Stats = {
  total: number; statusCounts: Record<string, number>
  avgScore: number; upcomingDeadlines: number
}

const STATUS_CONFIG: Record<string, { label: string; icon: any; cls: string; bg: string }> = {
  draft:       { label: 'Draft',       icon: FileText,      cls: 'text-gray-500',    bg: 'bg-gray-100 dark:bg-gray-800' },
  in_progress: { label: 'Building',    icon: Sparkles,      cls: 'text-blue-500',    bg: 'bg-blue-50 dark:bg-blue-950' },
  complete:    { label: 'Ready',       icon: CheckCircle2,  cls: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950' },
  submitted:   { label: 'Submitted',   icon: Send,          cls: 'text-indigo-500',  bg: 'bg-indigo-50 dark:bg-indigo-950' },
  shortlisted: { label: 'Shortlisted', icon: Target,        cls: 'text-purple-500',  bg: 'bg-purple-50 dark:bg-purple-950' },
  interview:   { label: 'Interview',   icon: Users,         cls: 'text-amber-500',   bg: 'bg-amber-50 dark:bg-amber-950' },
  offer:       { label: 'Offer',       icon: Award,         cls: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950' },
  rejected:    { label: 'Rejected',    icon: XCircle,       cls: 'text-red-500',     bg: 'bg-red-50 dark:bg-red-950' },
}

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft
  const Icon = config.icon
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${config.bg} ${config.cls}`}>
      <Icon className="w-3 h-3" /> {config.label}
    </span>
  )
}

function ScoreBar({ score, color = 'bg-primary' }: { score: number; color?: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-mono text-muted-foreground w-8 text-right">{score}%</span>
    </div>
  )
}

function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function daysUntil(d: string | null) {
  if (!d) return null
  const diff = Math.ceil((new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  return diff
}

export default function ApplicationsDashboard() {
  const [applications, setApplications] = useState<Application[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/application/dashboard')
      .then(r => r.json())
      .then(data => {
        setApplications(data.applications ?? [])
        setStats(data.stats ?? null)
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const filtered = filter === 'all'
    ? applications
    : applications.filter(a => a.status === filter)

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh] gap-3 text-muted-foreground">
      <Loader2 className="w-5 h-5 animate-spin" /> Loading applications...
    </div>
  )

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Applications</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{stats?.total ?? 0} applications tracked</p>
        </div>
        <Link href="/dashboard/application"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors self-start">
          <Plus className="w-4 h-4" /> New Application
        </Link>
      </div>

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center"><FileText className="w-4 h-4 text-muted-foreground" /></div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Total</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.total}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center"><TrendingUp className="w-4 h-4 text-muted-foreground" /></div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Avg Score</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.avgScore}%</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center"><Send className="w-4 h-4 text-muted-foreground" /></div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Submitted</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{(stats.statusCounts.submitted ?? 0) + (stats.statusCounts.shortlisted ?? 0) + (stats.statusCounts.interview ?? 0)}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center"><Calendar className="w-4 h-4 text-muted-foreground" /></div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Deadlines</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.upcomingDeadlines}</p>
          </div>
        </div>
      )}

      {/* Status pipeline */}
      {stats && stats.total > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
            <BarChart3 className="w-3 h-3" /> Pipeline
          </p>
          <div className="flex h-3 w-full rounded-full overflow-hidden gap-0.5">
            {Object.entries(STATUS_CONFIG).map(([key, config]) => {
              const count = stats.statusCounts[key] ?? 0
              if (count === 0) return null
              const pct = (count / stats.total) * 100
              return <div key={key} className={`h-full ${config.bg} transition-all`} style={{ width: `${pct}%` }} title={`${config.label}: ${count}`} />
            })}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3">
            {Object.entries(STATUS_CONFIG).map(([key, config]) => {
              const count = stats.statusCounts[key] ?? 0
              if (count === 0) return null
              return (
                <button key={key} onClick={() => setFilter(filter === key ? 'all' : key)}
                  className={`flex items-center gap-1.5 text-xs transition-colors ${filter === key ? 'font-bold' : 'text-muted-foreground hover:text-foreground'}`}>
                  <span className={`w-2 h-2 rounded-full ${config.cls.replace('text-', 'bg-')}`} />
                  <span>{config.label}</span>
                  <span className="font-mono text-muted-foreground">{count}</span>
                </button>
              )
            })}
            {filter !== 'all' && (
              <button onClick={() => setFilter('all')} className="text-xs text-primary hover:underline ml-2">
                Show all
              </button>
            )}
          </div>
        </div>
      )}

      {/* Application list */}
      {filtered.length > 0 ? (
        <div className="space-y-2">
          {filtered.map(app => {
            const score = (app.liveScore as any)?.overall ?? 0
            const cvScore = (app.cvScore as any)?.overall ?? null
            const deadline = daysUntil(app.deadlineDate)
            const isLocked = ['submitted', 'shortlisted', 'interview', 'offer', 'rejected'].includes(app.status)

            return (
              <Link key={app.id} href={`/dashboard/application/${app.id}`}
                className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 hover:shadow-sm hover:border-primary/20 transition-all group">

                {/* Left: score ring */}
                <div className="w-12 h-12 shrink-0 relative">
                  <svg width="48" height="48" className="-rotate-90">
                    <circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" strokeWidth="3" className="text-muted/30" />
                    <circle cx="24" cy="24" r="20" fill="none"
                      stroke={score >= 70 ? '#10b981' : score >= 50 ? '#3b82f6' : score >= 30 ? '#f59e0b' : '#ef4444'}
                      strokeWidth="3" strokeDasharray={`${2*Math.PI*20}`} strokeDashoffset={`${2*Math.PI*20*(1-score/100)}`} strokeLinecap="round" />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-foreground">{score}</span>
                </div>

                {/* Center: details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">{app.jobTitle}</h3>
                    <StatusBadge status={app.status} />
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {app.band && <span>{app.band}</span>}
                    {app.employer && <span>{app.employer}</span>}
                    <span>{app._count.criteria} criteria</span>
                    {app.wordCount && <span>{app.wordCount} words</span>}
                  </div>

                  {/* Progress bar */}
                  <div className="mt-2 max-w-xs">
                    <ScoreBar score={app.completeness} color={app.completeness >= 80 ? 'bg-emerald-500' : app.completeness >= 50 ? 'bg-blue-500' : 'bg-amber-500'} />
                  </div>
                </div>

                {/* Right: meta */}
                <div className="hidden md:flex flex-col items-end gap-1.5 shrink-0">
                  <span className="text-xs text-muted-foreground">{formatDate(app.updatedAt)}</span>

                  {deadline !== null && deadline >= 0 && deadline <= 7 && (
                    <span className="text-[10px] font-semibold text-red-500 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> {deadline === 0 ? 'Today!' : `${deadline}d left`}
                    </span>
                  )}

                  {app.status === 'interview' && app.interviewDate && (
                    <span className="text-[10px] font-semibold text-amber-500 flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Interview {formatDate(app.interviewDate)}
                    </span>
                  )}

                  {cvScore !== null && (
                    <span className="text-[10px] text-muted-foreground">CV: {cvScore}%</span>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-16">
          <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-foreground font-semibold mb-1">
            {filter !== 'all' ? `No ${STATUS_CONFIG[filter]?.label ?? filter} applications` : 'No applications yet'}
          </p>
          <p className="text-sm text-muted-foreground mb-4">Start building your first NHS application</p>
          <Link href="/dashboard/application"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold">
            <Plus className="w-4 h-4" /> New Application
          </Link>
        </div>
      )}
    </div>
  )
}