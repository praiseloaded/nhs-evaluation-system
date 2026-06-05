'use client'

import { useState } from 'react'
import { DimensionScore, StarElementStatus, NhsValueClassification } from '@/lib/types'
import { CheckCircle, TrendingUp, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DimensionPanelProps {
  dimension: DimensionScore
  icon?:     React.ReactNode
}

function getScoreColor(score: number) {
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

function getVerdictBadge(verdict: DimensionScore['verdict']) {
  switch (verdict) {
    case 'excellent':  return 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300 border-green-200 dark:border-green-800'
    case 'good':       return 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border-blue-200 dark:border-blue-800'
    case 'acceptable': return 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800'
    case 'poor':       return 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 border-red-200 dark:border-red-800'
  }
}

function getRingColor(score: number) {
  if (score >= 85) return 'ring-green-200 dark:ring-green-900'
  if (score >= 70) return 'ring-blue-200 dark:ring-blue-900'
  if (score >= 50) return 'ring-amber-200 dark:ring-amber-900'
  return 'ring-red-200 dark:ring-red-900'
}

// ─── Element pill (STAR) ──────────────────────────────────────────────────────

function ElementPill({ label, status }: { label: string; status: StarElementStatus }) {
  const cls =
    status === 'present' ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300' :
    status === 'weak'    ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' :
                           'bg-red-100   text-red-700   dark:bg-red-950   dark:text-red-300'
  return (
    <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-semibold', cls)}>
      {label} {status === 'present' ? '✓' : status === 'weak' ? '~' : '✗'}
    </span>
  )
}

// ─── Value classification pill ────────────────────────────────────────────────

const VALUE_CLS: Record<NhsValueClassification, string> = {
  behavioural_with_outcome: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300',
  behavioural:              'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  referenced:               'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  keyword:                  'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
  absent:                   'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
}

const VALUE_LABEL: Record<NhsValueClassification, string> = {
  behavioural_with_outcome: 'Evidenced + outcome',
  behavioural:              'Behavioural',
  referenced:               'Referenced',
  keyword:                  'Keyword only',
  absent:                   'Missing',
}

// ─── Status badge (criteria) ──────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === 'met'           ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300' :
    status === 'partially met' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' :
                                 'bg-red-100   text-red-700   dark:bg-red-950   dark:text-red-300'
  return (
    <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-semibold capitalize whitespace-nowrap', cls)}>
      {status}
    </span>
  )
}

// ─── Dimension-specific detail sections ──────────────────────────────────────

function CriteriaDetail({ detail }: { detail: Extract<DimensionScore['detail'], { type: 'criteria' }> }) {
  return (
    <div className="space-y-3">
      <div className="flex gap-4 text-xs text-muted-foreground font-mono">
        <span>Essential: <strong className="text-foreground">{detail.essentialMet}/{detail.essentialTotal}</strong></span>
        <span>Desirable: <strong className="text-foreground">{detail.desirableMet}/{detail.desirableTotal}</strong></span>
      </div>
      <div className="space-y-2">
        {detail.items.map((item, idx) => (
          <div key={idx} className="rounded-lg border border-border bg-muted/30 p-3 space-y-1.5">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs text-foreground leading-snug">{item.criterion}</p>
              <StatusBadge status={item.status} />
            </div>
            {item.evidence && item.evidence !== 'No evidence found' && (
              <p className="text-[11px] text-muted-foreground leading-relaxed border-l-2 border-muted pl-2">
                {item.evidence}
              </p>
            )}
            {item.improvement && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 leading-relaxed">
                → {item.improvement}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function StarDetail({ detail }: { detail: Extract<DimensionScore['detail'], { type: 'star' }> }) {
  return (
    <div className="space-y-3">
      <div className="flex gap-4 text-xs text-muted-foreground font-mono">
        <span>Examples found: <strong className="text-foreground">{detail.examplesFound}</strong></span>
        {detail.resultsConsistentlyAbsent && (
          <span className="text-red-500 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Results consistently absent
          </span>
        )}
      </div>
      <div className="space-y-2">
        {detail.examples.map((ex, idx) => (
          <div key={idx} className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-foreground">{ex.summary}</p>
              {ex.weLanguageDetected && (
                <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 px-1.5 py-0.5 rounded">
                  "we" language
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              <ElementPill label="S" status={ex.situation} />
              <ElementPill label="T" status={ex.task} />
              <ElementPill label="A" status={ex.weLanguageDetected ? 'absent' : ex.action} />
              <ElementPill label="R" status={ex.result} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ValuesDetail({ detail }: { detail: Extract<DimensionScore['detail'], { type: 'values' }> }) {
  return (
    <div className="space-y-2">
      {detail.values.map((v, idx) => (
        <div key={idx} className="rounded-lg border border-border bg-muted/30 p-3 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-foreground">{v.name}</p>
            <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-semibold', VALUE_CLS[v.classification])}>
              {VALUE_LABEL[v.classification]}
            </span>
          </div>
          {v.evidence && (
            <p className="text-[11px] text-muted-foreground leading-relaxed border-l-2 border-muted pl-2">
              {v.evidence}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}

function LanguageDetail({ detail }: { detail: Extract<DimensionScore['detail'], { type: 'language' }> }) {
  const matchPct = detail.specPhrasesTotal > 0
    ? Math.round(((detail.present + detail.paraphrased * 0.7) / detail.specPhrasesTotal) * 100)
    : 0
  return (
    <div className="space-y-3">
      <div className="flex gap-4 text-xs text-muted-foreground font-mono">
        <span>Match: <strong className="text-foreground">{matchPct}%</strong></span>
        <span className="text-green-600 dark:text-green-400">Found: {detail.present + detail.paraphrased}</span>
        <span className="text-red-500">Missing: {detail.absent}</span>
      </div>
      {detail.phrasesFound.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Matched phrases</p>
          <div className="flex flex-wrap gap-1.5">
            {detail.phrasesFound.map((p, i) => (
              <span key={i} className="text-[11px] bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800 px-2 py-0.5 rounded-full">
                {p}
              </span>
            ))}
          </div>
        </div>
      )}
      {detail.phrasesMissing.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Missing phrases</p>
          <div className="flex flex-wrap gap-1.5">
            {detail.phrasesMissing.map((p, i) => (
              <span key={i} className="text-[11px] bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 px-2 py-0.5 rounded-full">
                {p}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function SpecificityDetail({ detail }: { detail: Extract<DimensionScore['detail'], { type: 'specificity' }> }) {
  const t = detail.totalClaims || 1
  return (
    <div className="space-y-2">
      {[
        { label: 'Tier 1 — Measurable & named', count: detail.tier1Count, pct: Math.round(detail.tier1Count / t * 100), color: 'bg-green-500' },
        { label: 'Tier 2 — Named, not measured', count: detail.tier2Count, pct: Math.round(detail.tier2Count / t * 100), color: 'bg-amber-500' },
        { label: 'Tier 3 — Generic & vague',     count: detail.tier3Count, pct: Math.round(detail.tier3Count / t * 100), color: 'bg-red-500' },
      ].map(row => (
        <div key={row.label} className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">{row.label}</span>
            <span className="font-mono font-medium text-foreground">{row.count} ({row.pct}%)</span>
          </div>
          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
            <div className={cn('h-full rounded-full transition-all duration-700', row.color)} style={{ width: `${row.pct}%` }} />
          </div>
        </div>
      ))}
      <p className="text-[11px] text-muted-foreground pt-1">
        Total claims assessed: {detail.totalClaims}
      </p>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function DimensionPanel({ dimension, icon }: DimensionPanelProps) {
  const [expanded, setExpanded] = useState(false)
  const score      = dimension.score ?? 0
  const hasDetails = !!dimension.detail || dimension.improvements.length > 0

  return (
    <div className={cn(
      'rounded-xl border bg-card transition-all duration-200 hover:shadow-md ring-1',
      getRingColor(score)
    )}>

      {/* Top summary — always visible */}
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground shrink-0">
              {icon}
            </div>
            <div>
              <h3 className="font-semibold text-sm text-foreground leading-tight">{dimension.name}</h3>
              <p className="text-[11px] text-muted-foreground font-mono">{dimension.weight}% weight</p>
            </div>
          </div>
          <span className={cn('px-2 py-0.5 rounded-full text-[11px] font-semibold border capitalize shrink-0 ml-2', getVerdictBadge(dimension.verdict))}>
            {dimension.verdict}
          </span>
        </div>

        <div className="flex items-end gap-3 mb-3">
          <span className={cn('text-3xl font-bold tabular-nums leading-none', getScoreColor(score))}>
            {score}
          </span>
          <span className="text-sm text-muted-foreground mb-0.5">/100</span>
        </div>

        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
          <div className={cn('h-full rounded-full transition-all duration-700', getBarColor(score))} style={{ width: `${score}%` }} />
        </div>
      </div>

      {/* Expand toggle */}
      {hasDetails && (
        <button
          onClick={() => setExpanded(e => !e)}
          className="w-full flex items-center justify-center gap-1.5 py-2.5 border-t border-border
                     text-xs font-medium text-muted-foreground hover:text-foreground
                     hover:bg-muted/50 transition-colors rounded-b-xl"
        >
          {expanded ? (<>Hide details <ChevronUp className="w-3.5 h-3.5" /></>) : (<>Show details <ChevronDown className="w-3.5 h-3.5" /></>)}
        </button>
      )}

      {/* Expanded detail */}
      {expanded && hasDetails && (
        <div className="px-5 pb-5 border-t border-border pt-4 space-y-4">

          {/* Dimension-specific rich detail */}
          {dimension.detail && (
            <>
              {dimension.detail.type === 'criteria'    && <CriteriaDetail    detail={dimension.detail} />}
              {dimension.detail.type === 'star'        && <StarDetail        detail={dimension.detail} />}
              {dimension.detail.type === 'values'      && <ValuesDetail      detail={dimension.detail} />}
              {dimension.detail.type === 'language'    && <LanguageDetail    detail={dimension.detail} />}
              {dimension.detail.type === 'specificity' && <SpecificityDetail detail={dimension.detail} />}
            </>
          )}

          {/* Improvements */}
          {dimension.improvements.length > 0 && (
            <div>
              <h4 className="text-[11px] font-semibold uppercase tracking-wider text-foreground mb-2 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-amber-500" />
                How to improve
              </h4>
              <ul className="space-y-1.5">
                {dimension.improvements.map((item, idx) => (
                  <li key={idx} className="flex gap-2 text-xs text-muted-foreground leading-relaxed">
                    <span className="text-amber-500 shrink-0 mt-0.5">→</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

        </div>
      )}
    </div>
  )
}