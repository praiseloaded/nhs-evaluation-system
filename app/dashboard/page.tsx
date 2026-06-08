'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Plus, FileText, AlertCircle, RefreshCw,
  TrendingUp, Target, BarChart3, Lock,
  ShieldAlert, AlertTriangle, CheckCircle2,
  Users, Wifi, WifiOff, Sparkles,
  ChevronRight, Activity, ArrowUpRight,
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
  scoreGradientStart: string
  scoreGradientEnd: string
  accentBorder: string
  badgeBg: string
  badgeText: string
  dot: string
  bar: string
}> = {
  strong: {
    label: 'Strong',
    pill: 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700',
    ringColor: '#10b981',
    ringTrack: '#d1fae5',
    glowColor: 'rgba(16,185,129,0.12)',
    scoreGradientStart: '#10b981',
    scoreGradientEnd: '#059669',
    accentBorder: 'border-t-4 border-t-emerald-400',
    badgeBg: 'bg-emerald-500',
    badgeText: 'text-white',
    dot: 'bg-emerald-400',
    bar: 'bg-emerald-400',
  },
  competitive: {
    label: 'Competitive',
    pill: 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700',
    ringColor: '#3b82f6',
    ringTrack: '#dbeafe',
    glowColor: 'rgba(59,130,246,0.12)',
    scoreGradientStart: '#3b82f6',
    scoreGradientEnd: '#2563eb',
    accentBorder: 'border-t-4 border-t-blue-400',
    badgeBg: 'bg-blue-500',
    badgeText: 'text-white',
    dot: 'bg-blue-400',
    bar: 'bg-blue-400',
  },
  weak: {
    label: 'Needs Work',
    pill: 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700',
    ringColor: '#f59e0b',
    ringTrack: '#fef3c7',
    glowColor: 'rgba(245,158,11,0.12)',
    scoreGradientStart: '#f59e0b',
    scoreGradientEnd: '#d97706',
    accentBorder: 'border-t-4 border-t-amber-400',
    badgeBg: 'bg-amber-500',
    badgeText: 'text-white',
    dot: 'bg-amber-400',
    bar: 'bg-amber-400',
  },
  reject: {
    label: 'At Risk',
    pill: 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700',
    ringColor: '#ef4444',
    ringTrack: '#fee2e2',
    glowColor: 'rgba(239,68,68,0.12)',
    scoreGradientStart: '#ef4444',
    scoreGradientEnd: '#dc2626',
    accentBorder: 'border-t-4 border-t-red-400',
    badgeBg: 'bg-red-500',
    badgeText: 'text-white',
    dot: 'bg-red-400',
    bar: 'bg-red-400',
  },
}

const RISK_CONFIG = {
  high:   { icon: ShieldAlert,   cls: 'text-red-500',     bg: 'bg-red-50 dark:bg-red-950/50',       label: 'High rejection risk',   border: 'border-red-200 dark:border-red-800'   },
  medium: { icon: AlertTriangle, cls: 'text-amber-500',   bg: 'bg-amber-50 dark:bg-amber-950/50',   label: 'Medium rejection risk', border: 'border-amber-200 dark:border-amber-800' },
  low:    { icon: CheckCircle2,  cls: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/50', label: 'Low rejection risk',  border: 'border-emerald-200 dark:border-emerald-800' },
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

// ─── Large Score Ring (TubeBuddy-style) ───────────────────────────────────────

function LargeScoreRing({
  score,
  config,
  size = 120,
  label,
}: {
  score: number
  config: typeof VERDICT_CONFIG[string]
  size?: number
  label?: string
}) {
  const strokeWidth = 10
  const r = (size - strokeWidth * 2) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  const cx = size / 2
  const cy = size / 2

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        {/* Glow behind ring */}
        <div
          className="absolute inset-0 rounded-full blur-xl opacity-60"
          style={{ background: config.glowColor }}
        />
        <svg
          width={size}
          height={size}
          className="relative -rotate-90 drop-shadow-sm"
          viewBox={`0 0 ${size} ${size}`}
        >
          {/* Track */}
          <circle
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={config.ringTrack}
            strokeWidth={strokeWidth}
            className="dark:opacity-20"
          />
          {/* Progress arc */}
          <circle
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={config.ringColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circ}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)' }}
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="font-black tabular-nums leading-none"
            style={{
              fontSize: size * 0.22,
              color: config.ringColor,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {score}
          </span>
          <span
            className="font-semibold tracking-wider text-muted-foreground uppercase"
            style={{ fontSize: size * 0.085 }}
          >
            / 100
          </span>
        </div>
      </div>
      {label && (
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</span>
      )}
    </div>
  )
}

// ─── Sub-score bar ─────────────────────────────────────────────────────────────

function SubScoreBar({
  label,
  value,
  color,
  locked = false,
}: {
  label: string
  value?: number
  color: string
  locked?: boolean
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
        {locked ? (
          <Lock className="w-3 h-3 text-muted-foreground/30" />
        ) : (
          <span className="text-[11px] font-mono font-bold" style={{ color }}>{value}%</span>
        )}
      </div>
      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
        {locked ? (
          <div className="h-full w-3/5 rounded-full bg-muted-foreground/15" />
        ) : (
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${value}%`, background: color }}
          />
        )}
      </div>
    </div>
  )
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  accent = false,
  trend,
}: {
  icon: React.ElementType
  label: string
  value: string | number
  sub?: React.ReactNode
  accent?: boolean
  trend?: string
}) {
  return (
    <div className={`rounded-2xl border p-6 shadow-sm transition-all duration-200 hover:shadow-md ${
      accent
        ? 'bg-foreground text-background border-foreground'
        : 'bg-card border-border'
    }`}>
      <div className="flex items-start justify-between mb-5">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${accent ? 'bg-background/10' : 'bg-muted'}`}>
          <Icon className={`w-5 h-5 ${accent ? 'text-background/80' : 'text-muted-foreground'}`} />
        </div>
        {trend && (
          <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded-full border border-emerald-200 dark:border-emerald-700">
            <ArrowUpRight className="w-3 h-3" />{trend}
          </span>
        )}
      </div>
      <p className={`text-4xl font-black tracking-tight tabular-nums mb-1 ${accent ? 'text-background' : 'text-foreground'}`}>
        {value}
      </p>
      <p className={`text-xs font-semibold uppercase tracking-widest ${accent ? 'text-background/50' : 'text-muted-foreground'}`}>
        {label}
      </p>
      {sub && <div className="mt-4">{sub}</div>}
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
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
            <Activity className="w-5 h-5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">Score Distribution</p>
            <p className="text-xs text-muted-foreground">{total} analyses tracked</p>
          </div>
        </div>
        <BarChart3 className="w-4 h-4 text-muted-foreground/40" />
      </div>
      <div className="flex h-3 w-full rounded-full overflow-hidden gap-0.5">
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5">
        {(Object.entries(counts) as [string, number][]).map(([verdict, count]) => (
          <div key={verdict} className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${VERDICT_CONFIG[verdict].dot} shrink-0`} />
            <div>
              <p className="text-xs text-muted-foreground">{VERDICT_CONFIG[verdict].label}</p>
              <p className="text-sm font-bold text-foreground tabular-nums">{count}</p>
            </div>
          </div>
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

  const riskConfig = rejectionRisk?.overall ? RISK_CONFIG[rejectionRisk.overall] : null

  const subScores = [
    { label: 'Criteria',   value: sb?.criteriaCoverage,  color: '#3b82f6', free: true  },
    { label: 'STAR',       value: sb?.starCompleteness,  color: '#8b5cf6', free: false },
    { label: 'Values',     value: sb?.valuesAlignment,   color: '#10b981', free: true  },
    { label: 'Language',   value: sb?.languageMirroring, color: '#ec4899', free: false },
    { label: 'Specificity',value: sb?.specificity,       color: '#f59e0b', free: false },
  ].filter(s => isPro ? typeof s.value === 'number' : (typeof s.value === 'number' || !s.free))

  return (
    <Link
      href={`/dashboard/analysis/${a.id}`}
      className={`group relative bg-card border border-border rounded-2xl overflow-hidden hover:shadow-xl hover:border-foreground/20 transition-all duration-300 flex flex-col ${config.accentBorder}`}
    >
      <div className="p-6 flex flex-col gap-5">

        {/* ── Header: Large ring + title ── */}
        <div className="flex items-start gap-5">
          {/* Large ring — the hero element */}
          <div className="shrink-0">
            <LargeScoreRing score={score} config={config} size={100} />
          </div>

          {/* Title block */}
          <div className="flex-1 min-w-0 pt-1">
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="font-bold text-foreground text-sm leading-snug group-hover:text-primary transition-colors line-clamp-3">
                {a.jobTitle}
              </h3>
            </div>
            <span className={`inline-flex items-center text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full ${config.pill}`}>
              {config.label}
            </span>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {a.band && (
                <span className="text-[10px] font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded-md border border-border">
                  {a.band}
                </span>
              )}
              {a.location && (
                <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">{a.location}</span>
              )}
            </div>
          </div>
        </div>

        {/* ── ATS + confidence quick stats ── */}
        {(atsScore !== null || result?.confidence || scan?.wordCount) && (
          <div className="grid grid-cols-3 gap-3 p-3 bg-muted/50 rounded-xl border border-border">
            {atsScore !== null && (
              <div className="text-center">
                <p className="text-base font-black tabular-nums" style={{ color: config.ringColor }}>{atsScore}%</p>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mt-0.5">ATS Match</p>
              </div>
            )}
            {typeof result?.confidence === 'number' && (
              <div className="text-center">
                <p className="text-base font-black tabular-nums text-foreground">{result.confidence}%</p>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mt-0.5">Confidence</p>
              </div>
            )}
            {scan?.wordCount > 0 && (
              <div className="text-center">
                <p className="text-base font-black tabular-nums text-foreground">{scan.wordCount}</p>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mt-0.5">Words</p>
              </div>
            )}
          </div>
        )}

        {/* ── Statement flags ── */}
        {scan && (scan.usesWeLanguage || !scan.resultsPresent || !scan.hasExamples) && (
          <div className="flex flex-wrap gap-1.5">
            {scan.usesWeLanguage && (
              <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-700 px-2 py-1 rounded-lg flex items-center gap-1">
                <WifiOff className="w-3 h-3" /> "We" language
              </span>
            )}
            {!scan.resultsPresent && (
              <span className="text-[10px] font-semibold text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-700 px-2 py-1 rounded-lg">
                No results stated
              </span>
            )}
            {!scan.hasExamples && (
              <span className="text-[10px] font-semibold text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-700 px-2 py-1 rounded-lg">
                No examples
              </span>
            )}
          </div>
        )}

        {/* ── Band gap warning ── */}
        {seniority && seniority.bandGap > 0 && (
          <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span className="text-[11px] font-semibold text-amber-800 dark:text-amber-300">
              Band gap: B{seniority.demonstratedBand} → B{seniority.targetBand} (−{seniority.bandGap * 10} pts)
            </span>
          </div>
        )}

        {/* ── Sub-score breakdown ── */}
        {(sb || !isPro) && (
          <div className="pt-4 border-t border-border space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Score Breakdown</p>
            <div className="space-y-2.5">
              {isPro ? (
                [
                  { label: 'Criteria',    value: sb?.criteriaCoverage,  color: '#3b82f6' },
                  { label: 'STAR',        value: sb?.starCompleteness,  color: '#8b5cf6' },
                  { label: 'Values',      value: sb?.valuesAlignment,   color: '#10b981' },
                  { label: 'Language',    value: sb?.languageMirroring, color: '#ec4899' },
                  { label: 'Specificity', value: sb?.specificity,       color: '#f59e0b' },
                ].filter(s => typeof s.value === 'number').map(s => (
                  <SubScoreBar key={s.label} label={s.label} value={s.value} color={s.color} />
                ))
              ) : (
                <>
                  {typeof sb?.criteriaCoverage === 'number' && (
                    <SubScoreBar label="Criteria" value={sb.criteriaCoverage} color="#3b82f6" />
                  )}
                  {typeof sb?.valuesAlignment === 'number' && (
                    <SubScoreBar label="Values" value={sb.valuesAlignment} color="#10b981" />
                  )}
                  <SubScoreBar label="STAR" locked color="#8b5cf6" />
                  <SubScoreBar label="Language" locked color="#ec4899" />
                  <SubScoreBar label="Specificity" locked color="#f59e0b" />
                </>
              )}
            </div>
          </div>
        )}

        {/* ── NHS Values ── */}
        {nhsValues.length > 0 && (
          <div className="pt-4 border-t border-border">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2.5 flex items-center gap-1.5">
              <Users className="w-3 h-3" /> NHS Values
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
              {nhsValues.slice(0, isPro ? 6 : 3).map(v => {
                const vc = VALUE_LABEL[v.classification] ?? { label: v.classification, cls: 'text-muted-foreground' }
                return (
                  <div key={v.name} className="flex items-center justify-between gap-1">
                    <span className="text-[11px] text-foreground/60 truncate">{v.name.split(' ')[0]}</span>
                    <span className={`text-[10px] font-semibold shrink-0 ${vc.cls}`}>{vc.label}</span>
                  </div>
                )
              })}
            </div>
            {!isPro && nhsValues.length > 3 && (
              <p className="text-[10px] font-semibold text-muted-foreground/50 flex items-center gap-1 mt-1.5">
                <Lock className="w-2.5 h-2.5" /> +{nhsValues.length - 3} more values hidden
              </p>
            )}
          </div>
        )}

        {/* ── Rejection risk ── */}
        {isPro && riskConfig ? (
          <div className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border ${riskConfig.bg} ${riskConfig.border}`}>
            <riskConfig.icon className={`w-4 h-4 shrink-0 ${riskConfig.cls}`} />
            <span className={`text-[11px] font-bold ${riskConfig.cls}`}>{riskConfig.label}</span>
          </div>
        ) : !isPro ? (
          <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-muted border border-border">
            <Lock className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
            <span className="text-[11px] font-semibold text-muted-foreground/60 flex-1">Rejection risk analysis</span>
            <button
              onClick={e => { e.preventDefault(); e.stopPropagation(); window.location.href = '/upgrade?reason=rejection_risk' }}
              className="text-[10px] font-bold text-primary hover:underline bg-transparent border-0 p-0 cursor-pointer"
            >
              Unlock Pro →
            </button>
          </div>
        ) : null}

        {/* ── Band coaching ── */}
        {isPro && bandCoaching?.mostCriticalBandGap && (
          <div className="pt-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">
              Band {bandCoaching.targetBand} critical gap
            </p>
            <p className="text-xs text-foreground/70 line-clamp-2 leading-relaxed">{bandCoaching.mostCriticalBandGap}</p>
          </div>
        )}

        {/* ── Strength / Weakness ── */}
        {(strengths.length > 0 || weaknesses.length > 0) && (
          <div className="pt-4 border-t border-border space-y-3">
            {strengths.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-1">↑ Top Strength</p>
                <p className="text-xs text-foreground/70 line-clamp-2 leading-relaxed">{strengths[0].claim}</p>
              </div>
            )}
            {weaknesses.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1 flex items-center gap-1">
                  ↓ Key Gap {!isPro && <Lock className="w-2.5 h-2.5" />}
                </p>
                <p className={`text-xs text-foreground/70 line-clamp-2 leading-relaxed ${!isPro ? 'blur-sm select-none pointer-events-none' : ''}`}>
                  {weaknesses[0]}
                </p>
                {!isPro && (
                  <button
                    onClick={e => { e.preventDefault(); e.stopPropagation(); window.location.href = '/upgrade?reason=weaknesses' }}
                    className="inline-flex items-center gap-1 text-[10px] font-bold text-primary hover:underline mt-1.5 bg-transparent border-0 p-0 cursor-pointer"
                  >
                    <Lock className="w-2.5 h-2.5" /> Unlock with Pro
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Footer ── */}
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <span className="text-[10px] font-mono text-muted-foreground">{formatDate(a.createdAt)}</span>
          <span className="text-[11px] font-bold text-muted-foreground group-hover:text-primary transition-colors flex items-center gap-1">
            View full report <ChevronRight className="w-3.5 h-3.5" />
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

  useEffect(() => {
  const url = new URL(window.location.href)
  if (url.searchParams.get("login") === "success") {
    toast.success("Signed in successfully 🎉")
  }
}, [])
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

      {/* ── Analyses grid ── */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
            Recent Analyses
          </p>
          {pagination && pagination.total > 6 && (
            <p className="text-xs text-muted-foreground font-medium">
              Showing 6 of {pagination.total}
            </p>
          )}
        </div>
        <div className="grid md:grid-cols-2 gap-5">
          {recent.map(a => <AnalysisCard key={a.id} a={a} isPro={isPro} />)}
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