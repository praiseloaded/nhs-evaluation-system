'use client'

import { Analysis } from '@/lib/types'
import {
  Award, Lock, MapPin, Layers, Calendar,
  Wifi, AlertTriangle, ShieldAlert, CheckCircle2,
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface ScoreHeaderProps {
  analysis: Analysis
  isPro:    boolean
}

// ─── Pure helpers — defined before use ───────────────────────────────────────

function getVerdictColor(score: number) {
  if (score >= 85) return 'text-green-600 dark:text-green-400'
  if (score >= 70) return 'text-blue-600 dark:text-blue-400'
  if (score >= 50) return 'text-amber-600 dark:text-amber-400'
  return 'text-red-600 dark:text-red-400'
}

function getBarColor(score: number) {
  if (score >= 85) return 'bg-green-500'
  if (score >= 70) return 'bg-blue-500'
  if (score >= 50) return 'bg-amber-500'
  return 'bg-red-500'
}

function getVerdictBorder(score: number) {
  if (score >= 85) return 'border-green-200 dark:border-green-900 bg-green-50/50 dark:bg-green-950/30'
  if (score >= 70) return 'border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/30'
  if (score >= 50) return 'border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/30'
  return 'border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/30'
}

function getVerdictLabel(score: number) {
  if (score >= 85) return 'Excellent Fit'
  if (score >= 70) return 'Good Fit'
  if (score >= 50) return 'Needs Work'
  return 'Needs Review'
}

function formatDate(value: Date | string | undefined): string {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric',
    })
  } catch { return '—' }
}

const RISK_CONFIG = {
  high:   { icon: ShieldAlert,   cls: 'text-red-600 dark:text-red-400',     bg: 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800',         label: 'High rejection risk'   },
  medium: { icon: AlertTriangle, cls: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800', label: 'Medium rejection risk' },
  low:    { icon: CheckCircle2,  cls: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800', label: 'Low rejection risk'    },
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ScoreBar({ label, value, barColor }: { label: string; value: number; barColor: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-xs font-semibold text-foreground tabular-nums">{value}%</span>
      </div>
      <div className="h-1.5 w-full bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-700', barColor)}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  )
}

function LockedBar({ label }: { label: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-xs text-muted-foreground">{label}</span>
        <Link
          href="/upgrade?reason=limit_reached"
          className="flex items-center gap-1 text-[11px] font-medium text-purple-600 dark:text-purple-400 hover:underline"
        >
          <Lock className="w-2.5 h-2.5" /> Pro only
        </Link>
      </div>
      <div className="h-1.5 w-full bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
        <div className="h-full w-[60%] rounded-full bg-muted-foreground/20 blur-[1px]" />
      </div>
    </div>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function ScoreHeader({ analysis, isPro }: ScoreHeaderProps) {
  const result = analysis.result
  const sb     = result?.scoredBreakdown
  const scan   = result?.statementScan
  const sen    = result?.seniority
  const risk   = result?.rejectionRisk

  const score    = sb?.overallScore ?? analysis.overallScore ?? 0
  const atsMatch = result?.atsMatch
  const atsScore = atsMatch && atsMatch.totalKeywords > 0
    ? Math.round((atsMatch.foundCount / atsMatch.totalKeywords) * 100)
    : null

  return (
    <div className={cn('rounded-xl border p-6 mb-8', getVerdictBorder(score))}>
      <div className="flex flex-col lg:flex-row gap-8">

        {/* Left */}
        <div className="flex-1 min-w-0">

          {/* Meta badges */}
          <div className="flex flex-wrap gap-2 mb-3">
            {analysis.band && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-card border border-border rounded-full px-3 py-1">
                <Layers className="w-3 h-3 text-muted-foreground" /> {analysis.band}
              </span>
            )}
            {analysis.location && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-card border border-border rounded-full px-3 py-1">
                <MapPin className="w-3 h-3 text-muted-foreground" /> {analysis.location}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-card border border-border rounded-full px-3 py-1">
              <Calendar className="w-3 h-3 text-muted-foreground" /> {formatDate(analysis.createdAt)}
            </span>
            {atsScore !== null && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-card border border-border rounded-full px-3 py-1">
                <Wifi className="w-3 h-3 text-muted-foreground" /> {atsScore}% ATS match
              </span>
            )}
          </div>

          <h1 className="text-2xl font-bold text-foreground mb-4 leading-tight">
            {analysis.jobTitle}
          </h1>

          {/* Band gap warning */}
          {sen && sen.bandGap > 0 && (
            <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <p className="text-xs text-amber-700 dark:text-amber-300 font-mono">
                Applying Band {sen.targetBand} with Band {sen.demonstratedBand} experience — {sen.bandGap * 10}pt seniority deduction applied
              </p>
            </div>
          )}

          {/* Statement health flags */}
          {scan && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 mb-4">
              <span className="text-xs font-mono text-muted-foreground">{scan.wordCount} words</span>
              {scan.usesWeLanguage && (
                <span className="text-xs font-mono text-amber-600 dark:text-amber-400">⚠ "We" language detected</span>
              )}
              {!scan.resultsPresent && (
                <span className="text-xs font-mono text-red-500">✗ No STAR results found</span>
              )}
              {!scan.hasExamples && (
                <span className="text-xs font-mono text-red-500">✗ No examples detected</span>
              )}
              {scan.openingIsGeneric && (
                <span className="text-xs font-mono text-amber-600 dark:text-amber-400">⚠ Generic opening</span>
              )}
            </div>
          )}

          {/* Rejection risk badge — pro only */}
          {isPro && risk && (() => {
            const rc = RISK_CONFIG[risk.overall]
            return (
              <div className={cn('inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium mb-4', rc.bg)}>
                <rc.icon className={cn('w-3.5 h-3.5', rc.cls)} />
                <span className={rc.cls}>{rc.label}</span>
              </div>
            )
          })()}

          {/* Score bars */}
          <div className="grid sm:grid-cols-2 gap-3 max-w-md">
            <ScoreBar label="Criteria coverage"  value={sb?.criteriaCoverage  ?? 0} barColor="bg-blue-500"   />
            <ScoreBar label="NHS values"          value={sb?.valuesAlignment   ?? 0} barColor="bg-green-500" />
            {isPro ? (
              <>
                <ScoreBar label="STAR completeness"  value={sb?.starCompleteness  ?? 0} barColor="bg-purple-500" />
                <ScoreBar label="Language mirroring" value={sb?.languageMirroring ?? 0} barColor="bg-pink-500"   />
                <ScoreBar label="Specificity"        value={sb?.specificity       ?? 0} barColor="bg-amber-500"  />
              </>
            ) : (
              <>
                <LockedBar label="STAR completeness"  />
                <LockedBar label="Language mirroring" />
                <LockedBar label="Specificity"        />
              </>
            )}
          </div>
        </div>

        {/* Right — big score */}
        <div className="flex flex-col items-center justify-center shrink-0 bg-card border border-border rounded-xl px-8 py-6 min-w-[160px]">
          <span className={cn('text-6xl font-bold tabular-nums leading-none mb-1', getVerdictColor(score))}>
            {score}
          </span>
          <span className="text-xs text-muted-foreground font-medium mb-3">Overall Score</span>
          <div className="w-24 h-1.5 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden mb-3">
            <div
              className={cn('h-full rounded-full', getBarColor(score))}
              style={{ width: `${score}%` }}
            />
          </div>
          <div className="flex items-center gap-1.5 text-foreground">
            <Award className="w-4 h-4" />
            <span className="text-sm font-semibold">{getVerdictLabel(score)}</span>
          </div>
          {typeof result?.confidence === 'number' && (
            <p className="text-[11px] font-mono text-muted-foreground mt-2">
              {result.confidence}% confidence
            </p>
          )}
        </div>

      </div>
    </div>
  )
}