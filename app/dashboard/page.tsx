'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, FileText, AlertCircle, RefreshCw, TrendingUp, Target, BarChart3 } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type Verdict = 'strong' | 'competitive' | 'weak' | 'reject'

type Analysis = {
  id: string
  jobTitle: string
  overallScore: number
  verdict: Verdict | null
  shortlistProbability: number
  createdAt: string
}

type Pagination = {
  page: number
  limit: number
  total: number
  totalPages: number
  hasMore: boolean
}

// ─── Score helpers ────────────────────────────────────────────────────────────

const SCORE_CONFIG: Record<string, {
  label: string
  badgeCls: string
  borderCls: string
  barCls: string
  dotCls: string
}> = {
  strong:      { label: 'Strong',      badgeCls: 'bg-emerald-100 text-emerald-700',  borderCls: 'border-emerald-400', barCls: 'bg-emerald-400', dotCls: 'bg-emerald-400' },
  competitive: { label: 'Competitive', badgeCls: 'bg-blue-100 text-blue-700',        borderCls: 'border-blue-400',    barCls: 'bg-blue-400',    dotCls: 'bg-blue-400'    },
  weak:        { label: 'Weak',        badgeCls: 'bg-amber-100 text-amber-700',      borderCls: 'border-amber-400',   barCls: 'bg-amber-400',   dotCls: 'bg-amber-400'   },
  reject:      { label: 'Reject',      badgeCls: 'bg-red-100 text-red-700',          borderCls: 'border-red-400',     barCls: 'bg-red-400',     dotCls: 'bg-red-400'     },
}

function resolveVerdict(score: number, verdict: Verdict | null): string {
  if (verdict) return verdict
  if (score >= 85) return 'strong'
  if (score >= 65) return 'competitive'
  if (score >= 45) return 'weak'
  return 'reject'
}

function getConfig(score: number, verdict: Verdict | null) {
  return SCORE_CONFIG[resolveVerdict(score, verdict)] ?? SCORE_CONFIG.weak
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ElementType
  label: string
  value: string | number
  sub?: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
          <Icon className="w-4 h-4 text-gray-600" />
        </div>
        <p className="text-sm font-medium text-gray-500">{label}</p>
      </div>
      <p className="text-3xl font-bold text-gray-900 tracking-tight">{value}</p>
      {sub && <div className="mt-2 text-sm text-gray-500">{sub}</div>}
    </div>
  )
}

function ScoreBar({ score }: { score: number }) {
  return (
    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mt-3">
      <div
        className="h-full rounded-full bg-gray-800 transition-all duration-700"
        style={{ width: `${score}%` }}
      />
    </div>
  )
}

function DistributionBar({ analyses }: { analyses: Analysis[] }) {
  const total = analyses.length
  if (total === 0) return null

  const counts = {
    strong:      analyses.filter(a => resolveVerdict(a.overallScore, a.verdict) === 'strong').length,
    competitive: analyses.filter(a => resolveVerdict(a.overallScore, a.verdict) === 'competitive').length,
    weak:        analyses.filter(a => resolveVerdict(a.overallScore, a.verdict) === 'weak').length,
    reject:      analyses.filter(a => resolveVerdict(a.overallScore, a.verdict) === 'reject').length,
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
          <BarChart3 className="w-4 h-4 text-gray-600" />
        </div>
        <p className="text-sm font-medium text-gray-500">Score Distribution</p>
      </div>

      <div className="flex h-3 w-full rounded-full overflow-hidden gap-px">
        {(Object.entries(counts) as [string, number][]).map(([verdict, count]) => {
          if (count === 0) return null
          const pct = (count / total) * 100
          const { barCls } = SCORE_CONFIG[verdict]
          return (
            <div
              key={verdict}
              className={`${barCls} h-full transition-all`}
              style={{ width: `${pct}%` }}
              title={`${verdict}: ${count}`}
            />
          )
        })}
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
        {(Object.entries(counts) as [string, number][]).map(([verdict, count]) => (
          <span key={verdict} className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className={`w-2 h-2 rounded-full ${SCORE_CONFIG[verdict].dotCls}`} />
            {SCORE_CONFIG[verdict].label}: {count}
          </span>
        ))}
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [analyses, setAnalyses]   = useState<Analysis[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)

  const load = useCallback(async (page = 1) => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/analysis/list?page=${page}&limit=20`)

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `Request failed (${res.status})`)
      }

      const data = await res.json()
      setAnalyses(data.results ?? [])
      setPagination(data.pagination ?? null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // ── Derived stats ──────────────────────────────────────────────────────────
  const total    = pagination?.total ?? analyses.length
  const avgScore = analyses.length > 0
    ? Math.round(analyses.reduce((acc, a) => acc + (a.overallScore ?? 0), 0) / analyses.length)
    : 0
  const avgShortlist = analyses.length > 0
    ? Math.round(analyses.reduce((acc, a) => acc + (a.shortlistProbability ?? 0), 0) / analyses.length)
    : 0

  const recent = [...analyses]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6)

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh] gap-3 text-gray-400">
        <RefreshCw className="w-5 h-5 animate-spin" />
        <span className="text-sm">Loading dashboard…</span>
      </div>
    )
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4 text-center px-4">
        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
          <AlertCircle className="w-6 h-6 text-red-500" />
        </div>
        <div>
          <p className="font-semibold text-gray-900">Failed to load dashboard</p>
          <p className="text-sm text-gray-500 mt-1">{error}</p>
        </div>
        <button
          onClick={() => load()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Try again
        </button>
      </div>
    )
  }

  // ── Empty ──────────────────────────────────────────────────────────────────
  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center px-4">
        <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
          <FileText className="w-7 h-7 text-gray-400" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">No analyses yet</h2>
        <p className="text-sm text-gray-500 mb-6 max-w-xs">
          Create your first AI evaluation to start tracking your NHS application performance.
        </p>
        <Link
          href="/dashboard/new-analysis"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Start New Analysis
        </Link>
      </div>
    )
  }

  // ── Main ───────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-6xl mx-auto px-4 py-10 space-y-10">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            NHS Application Dashboard
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {total} {total === 1 ? 'analysis' : 'analyses'} tracked
          </p>
        </div>

        <Link
          href="/dashboard/new-analysis"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-700 transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          New Analysis
        </Link>
      </div>

      {/* KPI row */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard
          icon={FileText}
          label="Total Analyses"
          value={total}
        />
        <KpiCard
          icon={TrendingUp}
          label="Average Score"
          value={`${avgScore}%`}
          sub={<ScoreBar score={avgScore} />}
        />
        <KpiCard
          icon={Target}
          label="Avg. Shortlist Probability"
          value={`${avgShortlist}%`}
          sub={<ScoreBar score={avgShortlist} />}
        />
      </div>

      {/* Distribution */}
      <DistributionBar analyses={analyses} />

      {/* Analysis grid */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
          Recent Analyses
        </h2>

        <div className="grid md:grid-cols-2 gap-4">
          {recent.map((a) => {
            const score   = a.overallScore ?? 0
            const config  = getConfig(score, a.verdict)

            return (
              <Link
                key={a.id}
                href={`/dashboard/analysis/${a.id}`}
                className={`group border-l-4 ${config.borderCls} bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow`}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h3 className="font-semibold text-gray-900 leading-snug group-hover:text-blue-600 transition-colors line-clamp-2">
                    {a.jobTitle}
                  </h3>
                  <span className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold ${config.badgeCls}`}>
                    {config.label}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span className="font-semibold text-gray-900">{score}%</span>
                  {a.shortlistProbability > 0 && (
                    <span>{a.shortlistProbability}% shortlist</span>
                  )}
                  <span className="ml-auto text-xs">
                    {new Date(a.createdAt).toLocaleDateString('en-GB', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </span>
                </div>

                <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden mt-3">
                  <div
                    className={`h-full rounded-full ${config.barCls} transition-all duration-700`}
                    style={{ width: `${score}%` }}
                  />
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            onClick={() => load(pagination.page - 1)}
            disabled={pagination.page <= 1}
            className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          <span className="text-sm text-gray-500">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button
            onClick={() => load(pagination.page + 1)}
            disabled={!pagination.hasMore}
            className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}