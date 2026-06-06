'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Plus, FileText, AlertCircle, RefreshCw,
  TrendingUp, Target, BarChart3, Lock,
  ShieldAlert, AlertTriangle, CheckCircle2,
  Users, Wifi, WifiOff, Sparkles,
  ChevronRight, Activity,
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

const VERDICT_CONFIG: Record<string, {
  label: string
  pill: string
  accent: string
  bar: string
  dot: string
  ring: string
  scoreColor: string
}> = {
  strong:      { label: 'Strong',      pill: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300', accent: 'bg-emerald-400', bar: 'bg-emerald-400', dot: 'bg-emerald-400', ring: 'ring-emerald-200',  scoreColor: 'text-emerald-600' },
  competitive: { label: 'Competitive', pill: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',             accent: 'bg-blue-400',    bar: 'bg-blue-400',    dot: 'bg-blue-400',    ring: 'ring-blue-200',     scoreColor: 'text-blue-600'    },
  weak:        { label: 'Needs Work',  pill: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',         accent: 'bg-amber-400',   bar: 'bg-amber-400',   dot: 'bg-amber-400',   ring: 'ring-amber-200',    scoreColor: 'text-amber-600'   },
  reject:      { label: 'At Risk',     pill: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',                 accent: 'bg-red-400',     bar: 'bg-red-400',     dot: 'bg-red-400',     ring: 'ring-red-200',      scoreColor: 'text-red-600'     },
}

const RISK_CONFIG = {
  high:   { icon: ShieldAlert,   cls: 'text-red-500',     bg: 'bg-red-50 dark:bg-red-950',       label: 'High rejection risk'   },
  medium: { icon: AlertTriangle, cls: 'text-amber-500',   bg: 'bg-amber-50 dark:bg-amber-950',   label: 'Medium rejection risk' },
  low:    { icon: CheckCircle2,  cls: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950', label: 'Low rejection risk'  },
}

const VALUE_LABEL: Record<string, { label: string; cls: string }> = {
  behavioural_with_outcome: { label: 'Evidenced',     cls: 'text-emerald-600 dark:text-emerald-400' },
  behavioural:              { label: 'Shown',          cls: 'text-blue-600 dark:text-blue-400'       },
  referenced:               { label: 'Referenced',     cls: 'text-amber-600 dark:text-amber-400'     },
  keyword:                  { label: 'Keyword only',   cls: 'text-orange-500 dark:text-orange-400'   },
  absent:                   { label: 'Missing',        cls: 'text-red-500 dark:text-red-400'         },
}

function getConfig(score: number, verdict?: Verdict | null) {
  return VERDICT_CONFIG[resolveVerdict(score, verdict)] ?? VERDICT_CONFIG.weak
}

function formatDate(value?: string): string {
  if (!value) return '—'
  try { return new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) }
  catch { return '—' }
}

// ─── Shared UI ─────────────────────────────────────────────────────────────────

function MiniBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-[10px] text-muted-foreground font-medium tracking-wide">{label}</span>
        <span className="text-[10px] font-mono font-semibold text-foreground/60">{value}%</span>
      </div>
      <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${value}%` }} />
      </div>
    </div>
  )
}

function LockedMiniBar({ label }: { label: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-[10px] text-muted-foreground/50 font-medium tracking-wide">{label}</span>
        <Lock className="w-2.5 h-2.5 text-muted-foreground/30" />
      </div>
      <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
        <div className="h-full w-3/5 rounded-full bg-muted-foreground/20" />
      </div>
    </div>
  )
}

function ScoreRing({ score, config }: { score: number; config: typeof VERDICT_CONFIG[string] }) {
  const r = 20
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ

  return (
    <svg width="56" height="56" className="shrink-0 -rotate-90">
      <circle cx="28" cy="28" r={r} fill="none" stroke="currentColor" strokeWidth="3.5" className="text-muted" />
      <circle
        cx="28" cy="28" r={r} fill="none" strokeWidth="3.5"
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        className={`transition-all duration-700 ${
          config.label === 'Strong' ? 'stroke-emerald-400' :
          config.label === 'Competitive' ? 'stroke-blue-400' :
          config.label === 'Needs Work' ? 'stroke-amber-400' : 'stroke-red-400'
        }`}
      />
      <text x="28" y="28" dominantBaseline="middle" textAnchor="middle"
        className="text-[10px] font-mono font-bold fill-current rotate-90 origin-center"
        style={{ fontSize: 10, transform: 'rotate(90deg)', transformOrigin: '28px 28px' }}
      >
        {score}
      </text>
    </svg>
  )
}

function KpiCard({ icon: Icon, label, value, sub, accent = false }: {
  icon: React.ElementType; label: string; value: string | number; sub?: React.ReactNode; accent?: boolean
}) {
  return (
    <div className={`rounded-2xl border p-5 shadow-sm transition-all ${
      accent
        ? 'bg-foreground text-background border-foreground'
        : 'bg-card border-border'
    }`}>
      <div className="flex items-center justify-between mb-4">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${accent ? 'bg-background/10' : 'bg-muted'}`}>
          <Icon className={`w-4 h-4 ${accent ? 'text-background/80' : 'text-muted-foreground'}`} />
        </div>
        <span className={`text-[10px] font-bold uppercase tracking-widest ${accent ? 'text-background/50' : 'text-muted-foreground'}`}>
          {label}
        </span>
      </div>
      <p className={`text-4xl font-mono font-bold tracking-tight ${accent ? 'text-background' : 'text-foreground'}`}>
        {value}
      </p>
      {sub && <div className="mt-3">{sub}</div>}
    </div>
  )
}

function ScoreBar({ score }: { score: number }) {
  return (
    <div className="w-full h-1 bg-muted-foreground/20 rounded-full overflow-hidden">
      <div className="h-full rounded-full bg-current opacity-60 transition-all duration-700" style={{ width: `${score}%` }} />
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
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center">
          <Activity className="w-4 h-4 text-muted-foreground" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Score Distribution</p>
          <p className="text-xs text-muted-foreground">{total} analyses tracked</p>
        </div>
      </div>
      <div className="flex h-2.5 w-full rounded-full overflow-hidden gap-0.5">
        {(Object.entries(counts) as [string, number][]).map(([verdict, count]) => {
          if (count === 0) return null
          return (
            <div key={verdict} className={`${VERDICT_CONFIG[verdict].bar} h-full transition-all rounded-sm`}
              style={{ width: `${(count / total) * 100}%` }} title={`${verdict}: ${count}`} />
          )
        })}
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-2 mt-4">
        {(Object.entries(counts) as [string, number][]).map(([verdict, count]) => (
          <span key={verdict} className="flex items-center gap-2 text-xs">
            <span className={`w-2 h-2 rounded-full ${VERDICT_CONFIG[verdict].dot}`} />
            <span className="text-muted-foreground">{VERDICT_CONFIG[verdict].label}</span>
            <span className="font-mono font-semibold text-foreground">{count}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

// ─── Analysis Card ─────────────────────────────────────────────────────────────

function AnalysisCard({ a, isPro }: { a: Analysis; isPro: boolean }) {
  const score         = deriveScore(a)
  const atsScore      = deriveAtsScore(a)
  const config        = getConfig(score, a.verdict)
  const result        = a.result
  const sb            = result?.scoredBreakdown
  const scan          = result?.statementScan
  const seniority     = result?.seniority
  const rejectionRisk = result?.rejectionRisk
  const bandCoaching  = result?.bandCoaching
  const nhsValues     = result?.nhsValues ?? []
  const strengths     = result?.strengths?.slice(0, 1) ?? []
  const weaknesses    = result?.weaknesses?.slice(0, 1) ?? []

  const proBreakdownBars = [
    { label: 'Criteria', value: sb?.criteriaCoverage,  color: 'bg-blue-400'    },
    { label: 'STAR',     value: sb?.starCompleteness,  color: 'bg-violet-400'  },
    { label: 'Values',   value: sb?.valuesAlignment,   color: 'bg-emerald-400' },
    { label: 'Language', value: sb?.languageMirroring, color: 'bg-pink-400'    },
    { label: 'Detail',   value: sb?.specificity,       color: 'bg-amber-400'   },
  ].filter(s => typeof s.value === 'number') as { label: string; value: number; color: string }[]

  const freeBreakdownBars = proBreakdownBars.filter(b => b.label === 'Criteria' || b.label === 'Values')
  const lockedLabels = ['STAR', 'Language', 'Detail']
  const riskConfig = rejectionRisk?.overall ? RISK_CONFIG[rejectionRisk.overall] : null

  return (
    <Link
      href={`/dashboard/analysis/${a.id}`}
      className="group relative bg-card border border-border rounded-2xl overflow-hidden hover:shadow-lg hover:border-foreground/20 transition-all duration-200 flex flex-col"
    >
      {/* Top accent bar */}
      <div className={`h-1 w-full ${config.accent}`} />

      <div className="p-5 flex flex-col gap-4">

        {/* Header: score ring + title */}
        <div className="flex items-start gap-4">
          <ScoreRing score={score} config={config} />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h3 className="font-semibold text-foreground text-sm leading-snug group-hover:text-primary transition-colors line-clamp-2">
                {a.jobTitle}
              </h3>
              <span className={`shrink-0 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${config.pill}`}>
                {config.label}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {a.band && (
                <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                  {a.band}
                </span>
              )}
              {a.location && (
                <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">{a.location}</span>
              )}
              <span className="text-[10px] font-mono text-muted-foreground ml-auto">{formatDate(a.createdAt)}</span>
            </div>
          </div>
        </div>

        {/* Quick stats row */}
        <div className="flex items-center gap-4 text-xs border-t border-border pt-3">
          <span className={`font-mono font-bold text-base ${config.scoreColor}`}>{score}%</span>
          {atsScore !== null && (
            <span className="flex items-center gap-1 text-muted-foreground font-mono">
              <Wifi className="w-3 h-3" />{atsScore}% ATS
            </span>
          )}
          {typeof result?.confidence === 'number' && (
            <span className="text-muted-foreground font-mono hidden sm:inline">{result.confidence}% conf.</span>
          )}
          {scan?.wordCount > 0 && (
            <span className="text-muted-foreground font-mono ml-auto">{scan.wordCount}w</span>
          )}
        </div>

        {/* Statement flags */}
        {scan && (scan.usesWeLanguage || !scan.resultsPresent || !scan.hasExamples) && (
          <div className="flex flex-wrap gap-2">
            {scan.usesWeLanguage && (
              <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 px-1.5 py-0.5 rounded flex items-center gap-1">
                <WifiOff className="w-2.5 h-2.5" /> "We" language
              </span>
            )}
            {!scan.resultsPresent && (
              <span className="text-[10px] font-mono text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 px-1.5 py-0.5 rounded">
                No results
              </span>
            )}
            {!scan.hasExamples && (
              <span className="text-[10px] font-mono text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 px-1.5 py-0.5 rounded">
                No examples
              </span>
            )}
          </div>
        )}

        {/* Band gap warning */}
        {seniority && seniority.bandGap > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800">
            <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
            <span className="text-[10px] font-mono text-amber-700 dark:text-amber-300">
              Band gap: B{seniority.demonstratedBand} → B{seniority.targetBand} (−{seniority.bandGap * 10}pts)
            </span>
          </div>
        )}

        {/* Breakdown sub-scores */}
        {(proBreakdownBars.length > 0 || !isPro) && (
          <div className="grid grid-cols-2 gap-x-5 gap-y-2.5 pt-3 border-t border-border">
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
        )}

        {/* NHS Values */}
        {nhsValues.length > 0 && (
          <div className="pt-3 border-t border-border">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1">
              <Users className="w-3 h-3" /> NHS Values
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {nhsValues.slice(0, isPro ? 6 : 3).map(v => {
                const vc = VALUE_LABEL[v.classification] ?? { label: v.classification, cls: 'text-muted-foreground' }
                return (
                  <span key={v.name} className="text-[10px] font-mono">
                    <span className="text-foreground/60">{v.name.split(' ')[0]}</span>
                    <span className={`ml-1 ${vc.cls}`}>{vc.label}</span>
                  </span>
                )
              })}
              {!isPro && nhsValues.length > 3 && (
                <span className="text-[10px] font-mono text-muted-foreground/40 flex items-center gap-0.5">
                  <Lock className="w-2 h-2" /> +{nhsValues.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Rejection risk */}
        {isPro && riskConfig ? (
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${riskConfig.bg} border border-transparent`}>
            <riskConfig.icon className={`w-3.5 h-3.5 shrink-0 ${riskConfig.cls}`} />
            <span className={`text-[10px] font-mono font-medium ${riskConfig.cls}`}>{riskConfig.label}</span>
          </div>
        ) : !isPro && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted border border-border">
            <Lock className="w-3 h-3 text-muted-foreground/50 shrink-0" />
            <span className="text-[10px] font-mono text-muted-foreground/60 flex-1">Rejection risk analysis</span>
            <button
              onClick={e => { e.preventDefault(); e.stopPropagation(); window.location.href = '/upgrade?reason=rejection_risk' }}
              className="text-[10px] font-semibold text-primary hover:underline bg-transparent border-0 p-0 cursor-pointer"
            >
              Unlock Pro →
            </button>
          </div>
        )}

        {/* Band coaching */}
        {isPro && bandCoaching?.mostCriticalBandGap && (
          <div className="pt-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
              Band {bandCoaching.targetBand} critical gap
            </p>
            <p className="text-xs text-foreground/70 line-clamp-2">{bandCoaching.mostCriticalBandGap}</p>
          </div>
        )}

        {/* Strength */}
        {strengths.length > 0 && (
          <div className="pt-3 border-t border-border">
            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-1">↑ Top strength</p>
            <p className="text-xs text-foreground/70 line-clamp-2">{strengths[0].claim}</p>
          </div>
        )}

        {/* Weakness */}
        {weaknesses.length > 0 && (
          <div className="pt-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1 flex items-center gap-1">
              ↓ Key gap {!isPro && <Lock className="w-2.5 h-2.5" />}
            </p>
            <p className={`text-xs text-foreground/70 line-clamp-1 ${!isPro ? 'blur-[3px] select-none pointer-events-none' : ''}`}>
              {weaknesses[0]}
            </p>
            {!isPro && (
              <button
                onClick={e => { e.preventDefault(); e.stopPropagation(); window.location.href = '/upgrade?reason=weaknesses' }}
                className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary hover:underline mt-1 bg-transparent border-0 p-0 cursor-pointer"
              >
                <Lock className="w-2.5 h-2.5" /> Unlock with Pro
              </button>
            )}
          </div>
        )}

        {/* Footer CTA */}
        <div className="flex items-center justify-end pt-2 border-t border-border">
          <span className="text-[10px] font-semibold text-muted-foreground group-hover:text-primary transition-colors flex items-center gap-1">
            View full report <ChevronRight className="w-3 h-3" />
          </span>
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
      <span className="text-sm font-mono">Loading dashboard…</span>
    </div>
  )

  // ── Error ──
  if (error) return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-4 text-center px-4">
      <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center">
        <AlertCircle className="w-6 h-6 text-destructive" />
      </div>
      <div>
        <p className="font-semibold text-foreground">Failed to load dashboard</p>
        <p className="text-sm text-muted-foreground mt-1">{error}</p>
      </div>
      <button
        onClick={() => load()}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity"
      >
        <RefreshCw className="w-4 h-4" /> Try again
      </button>
    </div>
  )

  // ── Empty ──
  if (total === 0) return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-center px-4">
      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-5">
        <Sparkles className="w-7 h-7 text-muted-foreground" />
      </div>
      <h2 className="text-xl font-bold text-foreground mb-2">No analyses yet</h2>
      <p className="text-sm text-muted-foreground mb-8 max-w-xs leading-relaxed">
        Run your first AI evaluation to start tracking your NHS application performance.
      </p>
      <Link
        href="/dashboard/new-analysis"
        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-foreground text-background text-sm font-semibold hover:opacity-90 transition-opacity"
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
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Application Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track and improve your NHS job applications
          </p>
        </div>
        <Link
          href="/dashboard/new-analysis"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-foreground text-background text-sm font-semibold hover:opacity-90 transition-opacity self-start"
        >
          <Plus className="w-4 h-4" /> New Analysis
        </Link>
      </div>

      {/* ── KPI cards ── */}
      <div className="grid sm:grid-cols-3 gap-4">
        <KpiCard icon={FileText}   label="Total"       value={total}        accent />
        <KpiCard icon={TrendingUp} label="Avg Score"   value={`${avgScore}%`} sub={<ScoreBar score={avgScore} />} />
        <KpiCard icon={Target}     label="Avg ATS"     value={`${avgAts}%`}   sub={<ScoreBar score={avgAts} />} />
      </div>

      {/* ── Distribution ── */}
      <DistributionBar analyses={analyses} />

      {/* ── Analyses grid ── */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">
          Recent Analyses
        </p>
        <div className="grid md:grid-cols-2 gap-4">
          {recent.map(a => <AnalysisCard key={a.id} a={a} isPro={isPro} />)}
        </div>
      </div>

      {/* ── Pagination ── */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-4">
          <button
            onClick={() => load(pagination.page - 1)}
            disabled={pagination.page <= 1}
            className="px-4 py-2 rounded-xl border border-border text-sm font-mono text-muted-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            ← Previous
          </button>
          <span className="text-xs font-mono text-muted-foreground">
            {pagination.page} / {pagination.totalPages}
          </span>
          <button
            onClick={() => load(pagination.page + 1)}
            disabled={!pagination.hasMore}
            className="px-4 py-2 rounded-xl border border-border text-sm font-mono text-muted-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Next →
          </button>
        </div>
      )}

    </div>
  )
}