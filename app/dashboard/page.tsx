'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Plus, FileText, AlertCircle, RefreshCw,
  TrendingUp, Target, BarChart3, Lock,
  ShieldAlert, AlertTriangle, CheckCircle2,
  Users, WifiOff, Sparkles,
  ChevronRight, Activity, ArrowUpRight, Award, MapPin,
} from 'lucide-react'
import { useSession } from 'next-auth/react'

// ─── Types ─────────────────────────────────────────────────────────────────────

type Verdict = 'strong' | 'competitive' | 'weak' | 'reject'

type ScoredBreakdown = {
  criteriaCoverage:  number
  starCompleteness:  number
  valuesAlignment:   number
  languageMirroring: number
  specificity:       number
  overallScore:      number
}

type RawBreakdown = {
  criteriaCoverage?: {
    essentialMet: number; essentialPartial: number; essentialNotMet: number
    desirableMet: number; desirablePartial: number; desirableNotMet: number
  }
  starCompleteness?: { examplesFound: number; resultsConsistentlyAbsent: boolean }
  specificity?: { totalClaims: number; tier1Count: number; tier2Count: number; tier3Count: number }
  languageMirroring?: { specPhrasesTotal: number; present: number; paraphrased: number; absent: number }
}

type NhsValue = {
  name: string
  classification: 'behavioural_with_outcome' | 'behavioural' | 'referenced' | 'keyword' | 'absent'
  evidence?: string
}

type AtsMatch = {
  totalKeywords: number; foundCount: number; missingCount: number
  keywordsFound: string[]; keywordsMissing: string[]
  missingGrouped: { critical: string[]; recommended: string[] }
}

type StatementScan = {
  wordCount: number; hasExamples: boolean; exampleCount: number
  resultsPresent: boolean; usesWeLanguage: boolean
  openingIsGeneric: boolean; closingIsGeneric: boolean
}

type Seniority = { demonstratedBand: number | null; targetBand: number | null; bandGap: number }

type RejectionRisk = {
  overall: 'high' | 'medium' | 'low'
  gates: { gate: string; riskLevel: string; reason: string; fix: string }[]
}

type Strength = { claim: string; evidence?: string }

type AnalysisResult = {
  confidence?: number
  seniority?: Seniority
  scoredBreakdown?: ScoredBreakdown
  breakdown?: RawBreakdown
  atsMatch?: AtsMatch
  statementScan?: StatementScan
  nhsValues?: NhsValue[]
  strengths?: Strength[]
  weaknesses?: string[]
  missingCriteria?: string[]
  recommendations?: string[]
  rejectionRisk?: RejectionRisk
  bandCoaching?: { targetBand: number; bandLabel: string; mostCriticalBandGap: string }
  overallScore?: number
}

type Analysis = {
  id: string
  jobTitle: string
  band?: string
  location?: string
  createdAt: string
  verdict?: Verdict | null
  shortlistProbability?: number
  result?: AnalysisResult
  overallScore?: number
}

type Pagination = {
  page: number; limit: number; total: number; totalPages: number; hasMore: boolean
}

// ─── Score helpers ─────────────────────────────────────────────────────────────

function deriveScore(a: Analysis): number {
  const sb = a.result?.scoredBreakdown
  if (typeof sb?.overallScore === 'number' && sb.overallScore > 0) return sb.overallScore
  if (typeof a.result?.overallScore === 'number' && a.result.overallScore > 0) return a.result.overallScore
  if (typeof a.overallScore === 'number' && a.overallScore > 0) return a.overallScore
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

function resolveVerdict(score: number, verdict?: Verdict | null): string {
  if (verdict) return verdict
  if (score >= 85) return 'strong'
  if (score >= 65) return 'competitive'
  if (score >= 45) return 'weak'
  return 'reject'
}

// ─── Verdict configuration ─────────────────────────────────────────────────────

const VERDICT_CONFIG: Record<string, {
  label: string
  pill: string
  ringColor: string
  ringTrack: string
  glowColor: string
  dot: string
  bar: string
}> = {
  strong: {
    label: 'Strong',
    pill: 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700',
    ringColor: '#10b981',
    ringTrack: '#d1fae5',
    glowColor: 'rgba(16,185,129,0.10)',
    dot: 'bg-emerald-400',
    bar: 'bg-emerald-400',
  },
  competitive: {
    label: 'Competitive',
    pill: 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700',
    ringColor: '#3b82f6',
    ringTrack: '#dbeafe',
    glowColor: 'rgba(59,130,246,0.10)',
    dot: 'bg-blue-400',
    bar: 'bg-blue-400',
  },
  weak: {
    label: 'Needs Work',
    pill: 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700',
    ringColor: '#f59e0b',
    ringTrack: '#fef3c7',
    glowColor: 'rgba(245,158,11,0.10)',
    dot: 'bg-amber-400',
    bar: 'bg-amber-400',
  },
  reject: {
    label: 'At Risk',
    pill: 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700',
    ringColor: '#ef4444',
    ringTrack: '#fee2e2',
    glowColor: 'rgba(239,68,68,0.10)',
    dot: 'bg-red-400',
    bar: 'bg-red-400',
  },
}

const RISK_CONFIG = {
  high:   { icon: ShieldAlert,   cls: 'text-red-600 dark:text-red-400',     bg: 'bg-red-50 dark:bg-red-950/40',      label: 'High risk'   },
  medium: { icon: AlertTriangle, cls: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/40',  label: 'Medium risk' },
  low:    { icon: CheckCircle2,  cls: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/40', label: 'Low risk' },
}

const VALUE_LABEL: Record<string, { label: string; cls: string }> = {
  behavioural_with_outcome: { label: 'Evidenced',   cls: 'text-emerald-600 dark:text-emerald-400' },
  behavioural:              { label: 'Shown',        cls: 'text-blue-600 dark:text-blue-400'       },
  referenced:               { label: 'Referenced',   cls: 'text-amber-600 dark:text-amber-400'     },
  keyword:                  { label: 'Keyword only', cls: 'text-orange-500 dark:text-orange-400'   },
  absent:                   { label: 'Missing',      cls: 'text-red-500 dark:text-red-400'         },
}

function getConfig(score: number, verdict?: Verdict | null) {
  return VERDICT_CONFIG[resolveVerdict(score, verdict)] ?? VERDICT_CONFIG.weak
}

function formatDate(value?: string): string {
  if (!value) return '—'
  try { return new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) }
  catch { return '—' }
}

// ─── Compact Score Ring ────────────────────────────────────────────────────────

function ScoreRing({
  score,
  config,
  size = 72,
}: {
  score: number
  config: typeof VERDICT_CONFIG[string]
  size?: number
}) {
  const strokeWidth = 6
  const r = (size - strokeWidth * 2) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  const cx = size / 2
  const cy = size / 2

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={config.ringTrack} strokeWidth={strokeWidth} className="dark:opacity-20" />
        <circle
          cx={cx} cy={cy} r={r} fill="none"
          stroke={config.ringColor} strokeWidth={strokeWidth}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-black tabular-nums leading-none" style={{ fontSize: size * 0.28, color: config.ringColor }}>
          {score}
        </span>
      </div>
    </div>
  )
}

// ─── Sub-score pill (compact) ───────────────────────────────────────────────────

function SubScorePill({ label, value, color, locked = false }: { label: string; value?: number; color: string; locked?: boolean }) {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/60 border border-border/60">
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: locked ? undefined : color }} />
      <span className="text-[10px] font-semibold text-muted-foreground">{label}</span>
      {locked ? (
        <Lock className="w-2.5 h-2.5 text-muted-foreground/30" />
      ) : (
        <span className="text-[10px] font-bold tabular-nums" style={{ color }}>{value}%</span>
      )}
    </div>
  )
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  icon: Icon,
  label,
  value,
  accent = false,
  trend,
}: {
  icon: React.ElementType
  label: string
  value: string | number
  accent?: boolean
  trend?: string
}) {
  return (
    <div className={`rounded-2xl border p-5 shadow-sm transition-all duration-200 hover:shadow-md ${
      accent ? 'bg-foreground text-background border-foreground' : 'bg-card border-border'
    }`}>
      <div className="flex items-center justify-between mb-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${accent ? 'bg-background/10' : 'bg-muted'}`}>
          <Icon className={`w-4 h-4 ${accent ? 'text-background/80' : 'text-muted-foreground'}`} />
        </div>
        {trend && (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-700">
            <ArrowUpRight className="w-2.5 h-2.5" />{trend}
          </span>
        )}
      </div>
      <p className={`text-3xl font-black tracking-tight tabular-nums mb-0.5 ${accent ? 'text-background' : 'text-foreground'}`}>
        {value}
      </p>
      <p className={`text-[11px] font-semibold uppercase tracking-widest ${accent ? 'text-background/50' : 'text-muted-foreground'}`}>
        {label}
      </p>
    </div>
  )
}

// ─── Distribution Bar ─────────────────────────────────────────────────────────

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
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
            <Activity className="w-4 h-4 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">Score Distribution</p>
            <p className="text-xs text-muted-foreground">{total} analyses tracked</p>
          </div>
        </div>
        <BarChart3 className="w-4 h-4 text-muted-foreground/40" />
      </div>
      <div className="flex h-2.5 w-full rounded-full overflow-hidden gap-0.5">
        {(Object.entries(counts) as [string, number][]).map(([verdict, count]) => {
          if (count === 0) return null
          return (
            <div
              key={verdict}
              className={`${VERDICT_CONFIG[verdict].bar} h-full transition-all first:rounded-l-full last:rounded-r-full`}
              style={{ width: `${(count / total) * 100}%` }}
              title={`${verdict}: ${count}`}
            />
          )
        })}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
        {(Object.entries(counts) as [string, number][]).map(([verdict, count]) => (
          <div key={verdict} className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${VERDICT_CONFIG[verdict].dot} shrink-0`} />
            <div>
              <p className="text-[11px] text-muted-foreground">{VERDICT_CONFIG[verdict].label}</p>
              <p className="text-sm font-bold text-foreground tabular-nums">{count}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Analysis Row ───────────────────────────────────────────────────────────────
// Horizontal, scannable list-row design — replaces the dense card grid.

function AnalysisRow({ a, isPro }: { a: Analysis; isPro: boolean }) {
  const score         = deriveScore(a)
  const atsScore      = deriveAtsScore(a)
  const config        = getConfig(score, a.verdict)
  const result        = a.result
  const sb            = result?.scoredBreakdown
  const scan          = result?.statementScan
  const seniority     = result?.seniority
  const rejectionRisk = result?.rejectionRisk
  const strengths     = result?.strengths?.slice(0, 1) ?? []
  const weaknesses    = result?.weaknesses?.slice(0, 1) ?? []
  const riskConfig    = rejectionRisk?.overall ? RISK_CONFIG[rejectionRisk.overall] : null

  const subScores = [
    { label: 'Criteria',    value: sb?.criteriaCoverage,  color: '#3b82f6', free: true  },
    { label: 'Values',      value: sb?.valuesAlignment,   color: '#10b981', free: true  },
    { label: 'STAR',        value: sb?.starCompleteness,  color: '#8b5cf6', free: false },
    { label: 'Language',    value: sb?.languageMirroring, color: '#ec4899', free: false },
    { label: 'Specificity', value: sb?.specificity,       color: '#f59e0b', free: false },
  ]

  const flags: string[] = []
  if (scan?.usesWeLanguage) flags.push('"We" language')
  if (scan && !scan.resultsPresent) flags.push('No results stated')
  if (scan && !scan.hasExamples) flags.push('No examples')

  return (
    <Link
      href={`/dashboard/analysis/${a.id}`}
      className="group block rounded-2xl border border-border bg-card hover:border-foreground/15 hover:shadow-md transition-all duration-200 overflow-hidden"
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5 p-4 sm:p-5">

        {/* Score ring */}
        <ScoreRing score={score} config={config} size={64} />

        {/* Main info */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Title row */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-bold text-foreground text-sm leading-snug group-hover:text-primary transition-colors line-clamp-1">
                {a.jobTitle}
              </h3>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className={`inline-flex items-center text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${config.pill}`}>
                  {config.label}
                </span>
                {a.band && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Award className="w-3 h-3" /> {a.band}
                  </span>
                )}
                {a.location && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground truncate max-w-[140px]">
                    <MapPin className="w-3 h-3 shrink-0" /> {a.location}
                  </span>
                )}
                <span className="text-[11px] font-mono text-muted-foreground/70">{formatDate(a.createdAt)}</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
          </div>

          {/* Sub-score pills */}
          <div className="flex flex-wrap gap-1.5">
            {subScores.map(s => {
              const hasValue = typeof s.value === 'number'
              const locked = !isPro && !s.free
              if (!hasValue && !locked) return null
              return <SubScorePill key={s.label} label={s.label} value={s.value} color={s.color} locked={locked || !hasValue} />
            })}
            {atsScore !== null && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/60 border border-border/60">
                <Target className="w-2.5 h-2.5 text-muted-foreground" />
                <span className="text-[10px] font-semibold text-muted-foreground">ATS</span>
                <span className="text-[10px] font-bold tabular-nums" style={{ color: config.ringColor }}>{atsScore}%</span>
              </div>
            )}
            {riskConfig && isPro && (
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${riskConfig.bg}`}>
                <riskConfig.icon className={`w-2.5 h-2.5 ${riskConfig.cls}`} />
                <span className={`text-[10px] font-bold ${riskConfig.cls}`}>{riskConfig.label}</span>
              </div>
            )}
          </div>

          {/* Flags + band gap */}
          {(flags.length > 0 || (seniority && seniority.bandGap > 0)) && (
            <div className="flex flex-wrap gap-1.5">
              {seniority && seniority.bandGap > 0 && (
                <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <AlertTriangle className="w-2.5 h-2.5" /> Band gap B{seniority.demonstratedBand}→B{seniority.targetBand}
                </span>
              )}
              {flags.map(f => (
                <span key={f} className="text-[10px] font-semibold text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <WifiOff className="w-2.5 h-2.5" /> {f}
                </span>
              ))}
            </div>
          )}

          {/* Strength / weakness one-liners */}
          {(strengths.length > 0 || weaknesses.length > 0) && (
            <div className="grid sm:grid-cols-2 gap-2 pt-1">
              {strengths.length > 0 && (
                <p className="text-[11px] text-foreground/70 leading-relaxed line-clamp-1">
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">↑ </span>{strengths[0].claim}
                </p>
              )}
              {weaknesses.length > 0 && (
                <p className={`text-[11px] text-foreground/70 leading-relaxed line-clamp-1 ${!isPro ? 'blur-[3px] select-none' : ''}`}>
                  <span className="font-bold text-muted-foreground">↓ </span>{weaknesses[0]}
                </p>
              )}
            </div>
          )}
        </div>
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
    ? Math.round(analyses.reduce((acc, a) => acc + (deriveAtsScore(a) ?? 0), 0) / analyses.length)
    : 0
  const recent   = [...analyses]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6)

  // ── Loading ──
  if (loading) return (
    <div className="flex items-center justify-center h-[60vh] gap-3 text-muted-foreground">
      <RefreshCw className="w-4 h-4 animate-spin" />
      <span className="text-sm font-semibold">Loading dashboard…</span>
    </div>
  )

  // ── Error ──
  if (error) return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-5 text-center px-4">
      <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
        <AlertCircle className="w-7 h-7 text-destructive" />
      </div>
      <div>
        <p className="font-bold text-foreground text-lg">Failed to load dashboard</p>
        <p className="text-sm text-muted-foreground mt-1">{error}</p>
      </div>
      <button
        onClick={() => load()}
        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-foreground text-background text-sm font-bold hover:opacity-90 transition-opacity"
      >
        <RefreshCw className="w-4 h-4" /> Try again
      </button>
    </div>
  )

  // ── Empty ──
  if (total === 0) return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-center px-4">
      <div className="w-20 h-20 rounded-3xl bg-muted flex items-center justify-center mb-6">
        <Sparkles className="w-9 h-9 text-muted-foreground" />
      </div>
      <h2 className="text-2xl font-black text-foreground mb-2">No analyses yet</h2>
      <p className="text-sm text-muted-foreground mb-8 max-w-xs leading-relaxed">
        Run your first AI evaluation to start tracking your NHS application performance.
      </p>
      <Link
        href="/dashboard/new-analysis"
        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-foreground text-background text-sm font-bold hover:opacity-90 transition-opacity"
      >
        <Plus className="w-4 h-4" /> Start First Analysis
      </Link>
    </div>
  )

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tight">Application Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1.5 font-medium">
            Track and improve your NHS job applications
          </p>
        </div>
        <Link
          href="/dashboard/new-analysis"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-foreground text-background text-sm font-bold hover:opacity-90 transition-opacity self-start shadow-sm"
        >
          <Plus className="w-4 h-4" /> New Analysis
        </Link>
      </div>

      {/* ── KPI cards ── */}
      <div className="grid sm:grid-cols-3 gap-4">
        <KpiCard icon={FileText}   label="Total Analyses" value={total}          accent />
        <KpiCard icon={TrendingUp} label="Average Score"  value={`${avgScore}%`} trend="+2.4%" />
        <KpiCard icon={Target}     label="Average ATS"    value={`${avgAts}%`} />
      </div>

      {/* ── Distribution ── */}
      <DistributionBar analyses={analyses} />

      {/* ── Analyses list ── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
            Recent Analyses
          </p>
          {pagination && pagination.total > 6 && (
            <p className="text-xs text-muted-foreground font-medium">
              Showing 6 of {pagination.total}
            </p>
          )}
        </div>
        <div className="space-y-3">
          {recent.map(a => <AnalysisRow key={a.id} a={a} isPro={isPro} />)}
        </div>
      </div>

      {/* ── Pagination ── */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-4">
          <button
            onClick={() => load(pagination.page - 1)}
            disabled={pagination.page <= 1}
            className="px-5 py-2.5 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            ← Previous
          </button>
          <span className="text-xs font-mono font-semibold text-muted-foreground bg-muted px-3 py-2 rounded-lg">
            {pagination.page} / {pagination.totalPages}
          </span>
          <button
            onClick={() => load(pagination.page + 1)}
            disabled={!pagination.hasMore}
            className="px-5 py-2.5 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Next →
          </button>
        </div>
      )}

    </div>
  )
}