'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Plus, FileText, AlertCircle, RefreshCw,
  TrendingUp, Target, BarChart3, Lock,
  ShieldAlert, AlertTriangle, CheckCircle2,
  Users, Wifi, WifiOff,
} from 'lucide-react'
import { useSession } from 'next-auth/react'

// ─── Types ─────────────────────────────────────────────────────────────────────

type Verdict = 'strong' | 'competitive' | 'weak' | 'reject'

// Scored dimension numbers — computed in calculate-overall-score.ts
type ScoredBreakdown = {
  criteriaCoverage:  number
  starCompleteness:  number
  valuesAlignment:   number
  languageMirroring: number
  specificity:       number
  overallScore:      number
}

// Raw classification data returned by prompt — not scores
type RawBreakdown = {
  criteriaCoverage?: {
    essentialMet:     number
    essentialPartial: number
    essentialNotMet:  number
    desirableMet:     number
    desirablePartial: number
    desirableNotMet:  number
  }
  starCompleteness?: {
    examplesFound:             number
    resultsConsistentlyAbsent: boolean
  }
  specificity?: {
    totalClaims: number
    tier1Count:  number
    tier2Count:  number
    tier3Count:  number
  }
  languageMirroring?: {
    specPhrasesTotal: number
    present:          number
    paraphrased:      number
    absent:           number
  }
}

type NhsValue = {
  name:           string
  classification: 'behavioural_with_outcome' | 'behavioural' | 'referenced' | 'keyword' | 'absent'
  evidence?:      string
}

type AtsMatch = {
  totalKeywords:  number
  foundCount:     number
  missingCount:   number
  keywordsFound:  string[]
  keywordsMissing: string[]
  missingGrouped: { critical: string[]; recommended: string[] }
}

type StatementScan = {
  wordCount:        number
  hasExamples:      boolean
  exampleCount:     number
  resultsPresent:   boolean
  usesWeLanguage:   boolean
  openingIsGeneric: boolean
  closingIsGeneric: boolean
}

type Seniority = {
  demonstratedBand: number | null
  targetBand:       number | null
  bandGap:          number
}

type RejectionRisk = {
  overall: 'high' | 'medium' | 'low'
  gates:   { gate: string; riskLevel: string; reason: string; fix: string }[]
}

type Strength = { claim: string; evidence?: string }

type AnalysisResult = {
  confidence?:      number
  seniority?:       Seniority
  scoredBreakdown?: ScoredBreakdown   // computed scores — primary source
  breakdown?:       RawBreakdown      // raw classifications
  atsMatch?:        AtsMatch
  statementScan?:   StatementScan
  nhsValues?:       NhsValue[]
  strengths?:       Strength[]
  weaknesses?:      string[]
  missingCriteria?: string[]
  recommendations?: string[]
  rejectionRisk?:   RejectionRisk     // pro only
  bandCoaching?:    {                 // pro only
    targetBand:          number
    bandLabel:           string
    mostCriticalBandGap: string
  }
  // legacy
  overallScore?:    number
}

type Analysis = {
  id:                  string
  jobTitle:            string
  band?:               string
  location?:           string
  createdAt:           string
  verdict?:            Verdict | null
  shortlistProbability?: number
  result?:             AnalysisResult
  overallScore?:       number  // legacy flat field
}

type Pagination = {
  page:       number
  limit:      number
  total:      number
  totalPages: number
  hasMore:    boolean
}

// ─── Score helpers ─────────────────────────────────────────────────────────────

function deriveScore(a: Analysis): number {
  // 1. scoredBreakdown.overallScore — the authoritative computed score
  const sb = a.result?.scoredBreakdown
  if (typeof sb?.overallScore === 'number' && sb.overallScore > 0) return sb.overallScore
  // 2. Legacy flat overallScore
  if (typeof a.result?.overallScore === 'number' && a.result.overallScore > 0) return a.result.overallScore
  if (typeof a.overallScore         === 'number' && a.overallScore > 0)         return a.overallScore
  // 3. Average scoredBreakdown sub-scores
  if (sb) {
    const vals = [sb.criteriaCoverage, sb.starCompleteness, sb.valuesAlignment, sb.languageMirroring, sb.specificity]
      .filter((v): v is number => typeof v === 'number')
    if (vals.length > 0) return Math.round(vals.reduce((s, v) => s + v, 0) / vals.length)
  }
  return 0
}

function deriveAtsScore(a: Analysis): number | null {
  const m = a.result?.atsMatch
  if (!m || !m.totalKeywords) return null
  return Math.round((m.foundCount / m.totalKeywords) * 100)
}

const SCORE_CONFIG: Record<string, {
  label:     string
  badgeCls:  string
  accentCls: string
  barCls:    string
  dotCls:    string
}> = {
  strong:      { label: 'Strong',      badgeCls: 'bg-emerald-50 text-emerald-800', accentCls: 'bg-emerald-400', barCls: 'bg-emerald-400', dotCls: 'bg-emerald-400' },
  competitive: { label: 'Competitive', badgeCls: 'bg-blue-50 text-blue-800',       accentCls: 'bg-blue-400',    barCls: 'bg-blue-400',    dotCls: 'bg-blue-400'    },
  weak:        { label: 'Weak',        badgeCls: 'bg-amber-50 text-amber-800',     accentCls: 'bg-amber-400',   barCls: 'bg-amber-400',   dotCls: 'bg-amber-400'   },
  reject:      { label: 'Reject',      badgeCls: 'bg-red-50 text-red-800',         accentCls: 'bg-red-400',     barCls: 'bg-red-400',     dotCls: 'bg-red-400'     },
}

const RISK_CONFIG = {
  high:   { icon: ShieldAlert,    cls: 'text-red-500',    bg: 'bg-red-50',    label: 'High rejection risk'   },
  medium: { icon: AlertTriangle,  cls: 'text-amber-500',  bg: 'bg-amber-50',  label: 'Medium rejection risk' },
  low:    { icon: CheckCircle2,   cls: 'text-emerald-500',bg: 'bg-emerald-50',label: 'Low rejection risk'    },
}

const VALUE_CLASSIFICATION_LABEL: Record<string, { label: string; cls: string }> = {
  behavioural_with_outcome: { label: 'Evidenced',  cls: 'text-emerald-600' },
  behavioural:              { label: 'Shown',       cls: 'text-blue-600'    },
  referenced:               { label: 'Referenced',  cls: 'text-amber-600'   },
  keyword:                  { label: 'Keyword only',cls: 'text-orange-500'  },
  absent:                   { label: 'Missing',     cls: 'text-red-500'     },
}

function resolveVerdict(score: number, verdict?: Verdict | null): string {
  if (verdict) return verdict
  if (score >= 85) return 'strong'
  if (score >= 65) return 'competitive'
  if (score >= 45) return 'weak'
  return 'reject'
}

function getConfig(score: number, verdict?: Verdict | null) {
  return SCORE_CONFIG[resolveVerdict(score, verdict)] ?? SCORE_CONFIG.weak
}

function formatDate(value?: string): string {
  if (!value) return '—'
  try { return new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) }
  catch { return '—' }
}

// ─── Shared UI ─────────────────────────────────────────────────────────────────

function MiniBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between">
        <span className="text-[10px] text-gray-400 font-mono">{label}</span>
        <span className="text-[10px] font-mono font-medium text-gray-500">{value}%</span>
      </div>
      <div className="h-0.5 w-full bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${value}%` }} />
      </div>
    </div>
  )
}

function LockedMiniBar({ label }: { label: string }) {
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between items-center">
        <span className="text-[10px] text-gray-400 font-mono">{label}</span>
        <Lock className="w-2.5 h-2.5 text-gray-300" />
      </div>
      <div className="h-0.5 w-full bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full w-3/5 rounded-full bg-gray-200 blur-[1px]" />
      </div>
    </div>
  )
}

function KpiCard({ icon: Icon, label, value, sub }: {
  icon: React.ElementType; label: string; value: string | number; sub?: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-gray-200/80 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center">
          <Icon className="w-3.5 h-3.5 text-gray-500" />
        </div>
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">{label}</p>
      </div>
      <p className="text-3xl font-semibold text-gray-900 tracking-tight font-mono">{value}</p>
      {sub && <div className="mt-2">{sub}</div>}
    </div>
  )
}

function ScoreBar({ score }: { score: number }) {
  return (
    <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden mt-3">
      <div className="h-full rounded-full bg-gray-800 transition-all duration-700" style={{ width: `${score}%` }} />
    </div>
  )
}

function DistributionBar({ analyses }: { analyses: Analysis[] }) {
  const total = analyses.length
  if (total === 0) return null
  const counts = {
    strong:      analyses.filter(a => resolveVerdict(deriveScore(a), a.verdict) === 'strong').length,
    competitive: analyses.filter(a => resolveVerdict(deriveScore(a), a.verdict) === 'competitive').length,
    weak:        analyses.filter(a => resolveVerdict(deriveScore(a), a.verdict) === 'weak').length,
    reject:      analyses.filter(a => resolveVerdict(deriveScore(a), a.verdict) === 'reject').length,
  }
  return (
    <div className="rounded-xl border border-gray-200/80 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center">
          <BarChart3 className="w-3.5 h-3.5 text-gray-500" />
        </div>
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Score Distribution</p>
      </div>
      <div className="flex h-2 w-full rounded-full overflow-hidden gap-0.5">
        {(Object.entries(counts) as [string, number][]).map(([verdict, count]) => {
          if (count === 0) return null
          return <div key={verdict} className={`${SCORE_CONFIG[verdict].barCls} h-full transition-all`} style={{ width: `${(count / total) * 100}%` }} title={`${verdict}: ${count}`} />
        })}
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-3">
        {(Object.entries(counts) as [string, number][]).map(([verdict, count]) => (
          <span key={verdict} className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className={`w-2 h-2 rounded-full ${SCORE_CONFIG[verdict].dotCls}`} />
            <span className="font-medium text-gray-700">{SCORE_CONFIG[verdict].label}</span>
            <span className="font-mono text-gray-400">{count}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

// ─── Analysis Card ─────────────────────────────────────────────────────────────

function AnalysisCard({ a, isPro }: { a: Analysis; isPro: boolean }) {
  const score          = deriveScore(a)
  const atsScore       = deriveAtsScore(a)
  const config         = getConfig(score, a.verdict)
  const result         = a.result
  const sb             = result?.scoredBreakdown
  const scan           = result?.statementScan
  const seniority      = result?.seniority
  const rejectionRisk  = result?.rejectionRisk
  const bandCoaching   = result?.bandCoaching
  const nhsValues      = result?.nhsValues ?? []
  const strengths      = result?.strengths?.slice(0, 1) ?? []
  const weaknesses     = result?.weaknesses?.slice(0, 1) ?? []

  // Pro breakdown bars — read from scoredBreakdown, not raw breakdown
  const proBreakdownBars = [
    { label: 'Criteria', value: sb?.criteriaCoverage,  color: 'bg-blue-400'    },
    { label: 'STAR',     value: sb?.starCompleteness,  color: 'bg-purple-400'  },
    { label: 'Values',   value: sb?.valuesAlignment,   color: 'bg-emerald-400' },
    { label: 'Language', value: sb?.languageMirroring, color: 'bg-pink-400'    },
    { label: 'Detail',   value: sb?.specificity,       color: 'bg-amber-400'   },
  ].filter(s => typeof s.value === 'number') as { label: string; value: number; color: string }[]

  // Free breakdown bars — only criteria + values (always visible)
  const freeBreakdownBars = proBreakdownBars.filter(b =>
    b.label === 'Criteria' || b.label === 'Values'
  )

  // Locked bars for free tier
  const lockedLabels = ['STAR', 'Language', 'Detail']

  const riskConfig = rejectionRisk?.overall ? RISK_CONFIG[rejectionRisk.overall] : null

  return (
    <Link
      href={`/dashboard/analysis/${a.id}`}
      className="group relative bg-white border border-gray-200/80 rounded-xl p-5 hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col gap-3"
    >
      {/* Left accent stripe */}
      <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${config.accentCls}`} />

      <div className="pl-3 flex flex-col gap-3">

        {/* Title + verdict badge */}
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-medium text-gray-900 text-sm leading-snug group-hover:text-blue-600 transition-colors line-clamp-2">
            {a.jobTitle}
          </h3>
          <span className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold font-mono ${config.badgeCls}`}>
            {config.label}
          </span>
        </div>

        {/* Band / location meta */}
        {(a.band || a.location) && (
          <div className="flex items-center gap-3 text-xs text-gray-400 font-mono -mt-1">
            {a.band     && <span>{a.band}</span>}
            {a.location && <span>{a.location}</span>}
          </div>
        )}

        {/* Score row */}
        <div className="flex items-center gap-3">
          <span className="font-semibold font-mono text-gray-900 text-base">{score}%</span>

          {/* ATS match score — free */}
          {atsScore !== null && (
            <span className="text-xs font-mono text-gray-400 flex items-center gap-1">
              <Wifi className="w-3 h-3" />
              {atsScore}% ATS
            </span>
          )}

          {/* Confidence */}
          {typeof result?.confidence === 'number' && (
            <span className="text-xs text-gray-400 font-mono hidden sm:inline">
              {result.confidence}% conf.
            </span>
          )}

          <span className="ml-auto text-xs font-mono text-gray-400">{formatDate(a.createdAt)}</span>
        </div>

        {/* Overall score bar */}
        <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${config.barCls} transition-all duration-700`} style={{ width: `${score}%` }} />
        </div>

        {/* Statement health flags — free */}
        {scan && (
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <span className="text-[10px] font-mono text-gray-400">
              {scan.wordCount} words
            </span>
            {scan.usesWeLanguage && (
              <span className="text-[10px] font-mono text-amber-500 flex items-center gap-0.5">
                <WifiOff className="w-2.5 h-2.5" /> "We" language
              </span>
            )}
            {!scan.resultsPresent && (
              <span className="text-[10px] font-mono text-red-400">No results in examples</span>
            )}
            {!scan.hasExamples && (
              <span className="text-[10px] font-mono text-red-400">No examples found</span>
            )}
          </div>
        )}

        {/* Seniority band gap warning — free */}
        {seniority && seniority.bandGap > 0 && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-50 border border-amber-100">
            <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
            <span className="text-[10px] font-mono text-amber-700">
              Band gap: applying Band {seniority.targetBand} with Band {seniority.demonstratedBand} experience (−{seniority.bandGap * 10}pts)
            </span>
          </div>
        )}

        {/* Breakdown sub-scores */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-2 border-t border-gray-100">
          {isPro
            ? proBreakdownBars.map(s => <MiniBar key={s.label} {...s} />)
            : (
              <>
                {freeBreakdownBars.map(s => <MiniBar key={s.label} {...s} />)}
                {lockedLabels.map(l => <LockedMiniBar key={l} label={l} />)}
              </>
            )
          }
        </div>

        {/* NHS Values summary — free (classification labels only, no evidence) */}
        {nhsValues.length > 0 && (
          <div className="pt-2 border-t border-gray-100">
            <p className="text-[10px] font-mono font-semibold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <Users className="w-2.5 h-2.5" /> NHS Values
            </p>
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              {nhsValues.slice(0, isPro ? 5 : 3).map(v => {
                const vc = VALUE_CLASSIFICATION_LABEL[v.classification] ?? { label: v.classification, cls: 'text-gray-400' }
                return (
                  <span key={v.name} className="text-[10px] font-mono">
                    <span className="text-gray-400">{v.name.split(' ')[0]}</span>
                    <span className={`ml-1 ${vc.cls}`}>{vc.label}</span>
                  </span>
                )
              })}
              {!isPro && nhsValues.length > 3 && (
                <span className="text-[10px] font-mono text-gray-300 flex items-center gap-0.5">
                  <Lock className="w-2 h-2" /> +{nhsValues.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Rejection risk — pro only */}
        {isPro && riskConfig ? (
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md ${riskConfig.bg}`}>
            <riskConfig.icon className={`w-3 h-3 shrink-0 ${riskConfig.cls}`} />
            <span className={`text-[10px] font-mono ${riskConfig.cls}`}>{riskConfig.label}</span>
          </div>
        ) : !isPro && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-gray-50 border border-gray-100">
            <Lock className="w-3 h-3 text-gray-300 shrink-0" />
            <span className="text-[10px] font-mono text-gray-400">Rejection risk analysis</span>
            <button
              onClick={e => { e.preventDefault(); e.stopPropagation(); window.location.href = '/upgrade?reason=rejection_risk' }}
              className="ml-auto text-[10px] font-medium text-purple-600 hover:underline bg-transparent border-0 p-0 cursor-pointer"
            >
              Unlock Pro
            </button>
          </div>
        )}

        {/* Band coaching critical gap — pro only */}
        {isPro && bandCoaching?.mostCriticalBandGap && (
          <div className="pt-1">
            <p className="text-[10px] font-mono font-semibold text-gray-400 uppercase tracking-wider mb-1">
              Band {bandCoaching.targetBand} critical gap
            </p>
            <p className="text-xs text-gray-600 line-clamp-2">{bandCoaching.mostCriticalBandGap}</p>
          </div>
        )}

        {/* Top strength — free */}
        {strengths.length > 0 && (
          <div className="pt-2 border-t border-gray-100">
            <p className="text-[10px] font-mono font-semibold text-gray-400 uppercase tracking-wider mb-1">Top strength</p>
            <p className="text-xs text-gray-600 line-clamp-2">{strengths[0].claim}</p>
          </div>
        )}

        {/* Weakness — blurred for free */}
        {weaknesses.length > 0 && (
          <div className="pt-1">
            <p className="text-[10px] font-mono font-semibold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1">
              Gap {!isPro && <Lock className="w-2.5 h-2.5" />}
            </p>
            <p className={`text-xs text-gray-600 line-clamp-1 ${!isPro ? 'blur-[3px] select-none pointer-events-none' : ''}`}>
              {weaknesses[0]}
            </p>
            {!isPro && (
              <button
                onClick={e => { e.preventDefault(); e.stopPropagation(); window.location.href = '/upgrade?reason=weaknesses' }}
                className="inline-flex items-center gap-1 text-[10px] font-medium text-purple-600 hover:underline mt-0.5 bg-transparent border-0 p-0 cursor-pointer"
              >
                <Lock className="w-2.5 h-2.5" /> Unlock with Pro
              </button>
            )}
          </div>
        )}

      </div>
    </Link>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { data: session } = useSession()
  const isPro = session?.user?.tier === 'pro'

  const [analyses, setAnalyses]     = useState<Analysis[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)

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

  const total    = pagination?.total ?? analyses.length
  const avgScore = analyses.length > 0
    ? Math.round(analyses.reduce((acc, a) => acc + deriveScore(a), 0) / analyses.length)
    : 0
  const avgAts   = analyses.length > 0
    ? Math.round(
        analyses.reduce((acc, a) => acc + (deriveAtsScore(a) ?? 0), 0) / analyses.length
      )
    : 0
  const recent   = [...analyses]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6)

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh] gap-3 text-gray-400">
      <RefreshCw className="w-4 h-4 animate-spin" />
      <span className="text-sm font-mono">Loading dashboard…</span>
    </div>
  )

  if (error) return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-4 text-center px-4">
      <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
        <AlertCircle className="w-5 h-5 text-red-500" />
      </div>
      <div>
        <p className="font-semibold text-gray-900">Failed to load dashboard</p>
        <p className="text-sm text-gray-500 mt-1">{error}</p>
      </div>
      <button
        onClick={() => load()}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-700 transition-colors"
      >
        <RefreshCw className="w-4 h-4" /> Try again
      </button>
    </div>
  )

  if (total === 0) return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-center px-4">
      <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
        <FileText className="w-6 h-6 text-gray-400" />
      </div>
      <h2 className="text-xl font-semibold text-gray-900 mb-1">No analyses yet</h2>
      <p className="text-sm text-gray-500 mb-6 max-w-xs leading-relaxed">
        Create your first AI evaluation to start tracking your NHS application performance.
      </p>
      <Link
        href="/dashboard/new-analysis"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-700 transition-colors"
      >
        <Plus className="w-4 h-4" /> Start New Analysis
      </Link>
    </div>
  )

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">NHS Application Dashboard</h1>
          <p className="text-xs font-mono text-gray-400 mt-1 uppercase tracking-wider">
            {total} {total === 1 ? 'analysis' : 'analyses'} tracked
          </p>
        </div>
        <Link
          href="/dashboard/new-analysis"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-700 transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> New Analysis
        </Link>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <KpiCard icon={FileText}   label="Total Analyses"  value={total} />
        <KpiCard icon={TrendingUp} label="Average Score"   value={`${avgScore}%`}  sub={<ScoreBar score={avgScore} />} />
        <KpiCard icon={Target}     label="Avg. ATS Match"  value={`${avgAts}%`}    sub={<ScoreBar score={avgAts}   />} />
      </div>

      <DistributionBar analyses={analyses} />

      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">Recent Analyses</p>
        <div className="grid md:grid-cols-2 gap-3">
          {recent.map(a => <AnalysisCard key={a.id} a={a} isPro={isPro} />)}
        </div>
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => load(pagination.page - 1)}
            disabled={pagination.page <= 1}
            className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-mono text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            ← Previous
          </button>
          <span className="text-xs font-mono text-gray-400">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button
            onClick={() => load(pagination.page + 1)}
            disabled={!pagination.hasMore}
            className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-mono text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Next →
          </button>
        </div>
      )}

    </div>
  )
}