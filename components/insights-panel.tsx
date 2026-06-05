'use client'

import { useState } from 'react'
import { Analysis } from '@/lib/types'
import {
  Lightbulb, CheckCircle2, XCircle, ChevronDown, ChevronUp,
  ShieldAlert, AlertTriangle, CheckCircle, Brain, Target,
} from 'lucide-react'
import Link from 'next/link'
import { PremiumGate } from '@/components/premium-gate'
import { cn } from '@/lib/utils'

interface InsightsPanelProps {
  analysis: Analysis
  isPro:    boolean
}

const RISK_CONFIG = {
  high:   { icon: ShieldAlert,   cls: 'text-red-600 dark:text-red-400',     bg: 'bg-red-50/60 dark:bg-red-950/40 border-red-200 dark:border-red-800'         },
  medium: { icon: AlertTriangle, cls: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50/60 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800' },
  low:    { icon: CheckCircle,   cls: 'text-green-600 dark:text-green-400', bg: 'bg-green-50/60 dark:bg-green-950/40 border-green-200 dark:border-green-800' },
}

const OP_CLS: Record<string, string> = {
  demonstrated: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300',
  implied:      'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  absent:       'bg-red-100   text-red-700   dark:bg-red-950   dark:text-red-300',
}

export function InsightsPanel({ analysis, isPro }: InsightsPanelProps) {
  const [strengthsExpanded, setStrengthsExpanded] = useState(false)
  const [weaknessesExpanded, setWeaknessesExpanded] = useState(false)

  const result          = analysis.result
  const strengths       = result?.strengths       ?? []
  const weaknesses      = result?.weaknesses      ?? []
  const recommendations = result?.recommendations ?? []
  const rejectionRisk   = result?.rejectionRisk
  const opRealism       = result?.operationalRealism
  const bandCoaching    = result?.bandCoaching

  const visibleStrengths  = strengthsExpanded  ? strengths  : strengths.slice(0, 3)
  const visibleWeaknesses = weaknessesExpanded ? weaknesses : weaknesses.slice(0, 3)

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-foreground">Insights</h2>

      {/* ── Row 1: Strengths + Recommendations ─────────────────────────────── */}
      <div className="grid md:grid-cols-2 gap-4">

        {/* Strengths — FREE */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center gap-2.5 p-5 border-b border-border">
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950 flex items-center justify-center">
              <Lightbulb className="h-4 w-4 text-amber-500" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-foreground">Strengths</h3>
              <p className="text-xs text-muted-foreground">What your statement does well</p>
            </div>
            <span className="ml-auto text-xs font-medium bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800 px-2 py-0.5 rounded-full">
              Free
            </span>
          </div>
          <div className="p-5">
            {strengths.length > 0 ? (
              <>
                <ul className="space-y-3">
                  {visibleStrengths.map((s, idx) => (
                    <li key={idx} className="flex gap-3 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-foreground/90 font-medium leading-snug">{s.claim}</p>
                        {s.evidence && (
                          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed border-l-2 border-muted pl-2">
                            {s.evidence}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
                {strengths.length > 3 && (
                  <button
                    onClick={() => setStrengthsExpanded(e => !e)}
                    className="mt-4 w-full flex items-center justify-center gap-1.5 text-xs font-medium
                               text-muted-foreground hover:text-foreground py-2 border border-dashed
                               border-border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    {strengthsExpanded
                      ? (<>Show less <ChevronUp className="w-3.5 h-3.5" /></>)
                      : (<>Show {strengths.length - 3} more <ChevronDown className="w-3.5 h-3.5" /></>)}
                  </button>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No strengths identified.</p>
            )}
          </div>
        </div>

        {/* Recommendations — PRO */}
        <PremiumGate
          label="Personalised improvement directives"
          reason="recommendations"
          isPro={isPro}
          preview={[
            'Strengthen your safeguarding evidence with a specific patient example.',
            'Mirror the phrase "holistic assessment" from the person spec.',
            'Add a quantified outcome to your MDT scenario.',
            'Remove generic phrases — recruiters score these as low-effort.',
          ].map((r, i) => (
            <li key={i} className="flex gap-3 text-sm">
              <span className="text-green-500 font-bold mt-0.5 shrink-0">✓</span>
              <span className="text-foreground/80 dark:text-slate-300">{r}</span>
            </li>
          ))}
        >
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="flex items-center gap-2.5 p-5 border-b border-border">
              <div className="w-8 h-8 rounded-lg bg-green-50 dark:bg-green-950 flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-foreground">Recommendations</h3>
                <p className="text-xs text-muted-foreground">Specific directives to improve your score</p>
              </div>
              <span className="ml-auto text-xs font-medium bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 px-2 py-0.5 rounded-full">Pro</span>
            </div>
            <div className="p-5">
              {recommendations.length > 0 ? (
                <ul className="space-y-3">
                  {recommendations.map((rec, idx) => (
                    <li key={idx} className="flex gap-3 text-sm">
                      <span className="text-green-500 font-bold mt-0.5 shrink-0">✓</span>
                      <span className="text-foreground/80 dark:text-slate-300 leading-relaxed">{rec}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No recommendations available.</p>
              )}
            </div>
          </div>
        </PremiumGate>
      </div>

      {/* ── Row 2: Weaknesses + Missing criteria ────────────────────────────── */}
      <div className="grid md:grid-cols-2 gap-4">

        {/* Weaknesses — PRO */}
        <PremiumGate
          label="Full gap analysis — every unmet criterion"
          reason="weaknesses"
          isPro={isPro}
          preview={['Lack of evidence for district nursing caseload management.', 'No explicit SPQ qualification stated.'].map((w, i) => (
            <li key={i} className="flex gap-3 text-sm">
              <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span className="text-foreground/80 leading-relaxed blur-sm">{w}</span>
            </li>
          ))}
        >
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="flex items-center gap-2.5 p-5 border-b border-border">
              <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-950 flex items-center justify-center">
                <XCircle className="h-4 w-4 text-red-500" />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-foreground">Weaknesses</h3>
                <p className="text-xs text-muted-foreground">Every gap a panel would flag</p>
              </div>
              <span className="ml-auto text-xs font-medium bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 px-2 py-0.5 rounded-full">Pro</span>
            </div>
            <div className="p-5">
              {weaknesses.length > 0 ? (
                <>
                  <ul className="space-y-2">
                    {visibleWeaknesses.map((w, idx) => (
                      <li key={idx} className="flex gap-3 text-sm">
                        <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                        <span className="text-foreground/80 dark:text-slate-300 leading-relaxed">{w}</span>
                      </li>
                    ))}
                  </ul>
                  {weaknesses.length > 3 && (
                    <button
                      onClick={() => setWeaknessesExpanded(e => !e)}
                      className="mt-4 w-full flex items-center justify-center gap-1.5 text-xs font-medium
                                 text-muted-foreground hover:text-foreground py-2 border border-dashed
                                 border-border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      {weaknessesExpanded
                        ? (<>Show less <ChevronUp className="w-3.5 h-3.5" /></>)
                        : (<>Show {weaknesses.length - 3} more <ChevronDown className="w-3.5 h-3.5" /></>)}
                    </button>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No weaknesses identified.</p>
              )}
            </div>
          </div>
        </PremiumGate>

        {/* Missing criteria — PRO */}
        <PremiumGate
          label="Missing criteria list"
          reason="missing_criteria"
          isPro={isPro}
        >
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="flex items-center gap-2.5 p-5 border-b border-border">
              <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950 flex items-center justify-center">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-foreground">Missing Criteria</h3>
                <p className="text-xs text-muted-foreground">Criteria not evidenced in your application</p>
              </div>
              <span className="ml-auto text-xs font-medium bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 px-2 py-0.5 rounded-full">Pro</span>
            </div>
            <div className="p-5">
              {(result?.missingCriteria ?? []).length > 0 ? (
                <ul className="space-y-2">
                  {result!.missingCriteria!.map((c, idx) => (
                    <li key={idx} className="flex gap-2 text-sm text-muted-foreground">
                      <span className="text-amber-500 shrink-0 mt-0.5">→</span>
                      <span className="leading-relaxed">{c}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">All criteria evidenced.</p>
              )}
            </div>
          </div>
        </PremiumGate>
      </div>

      {/* ── Row 3: Rejection risk + Operational realism ─────────────────────── */}
      <div className="grid md:grid-cols-2 gap-4">

        {/* Rejection risk — PRO */}
        <PremiumGate
          label="Rejection risk analysis across all four sift gates"
          reason="rejection_risk"
          isPro={isPro}
        >
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="flex items-center gap-2.5 p-5 border-b border-border">
              <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-950 flex items-center justify-center">
                <ShieldAlert className="h-4 w-4 text-red-500" />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-foreground">Rejection Risk</h3>
                <p className="text-xs text-muted-foreground">ATS, shortlisting, values, interview gates</p>
              </div>
              <span className="ml-auto text-xs font-medium bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 px-2 py-0.5 rounded-full">Pro</span>
            </div>
            <div className="p-5 space-y-3">
              {rejectionRisk?.gates.map((gate, idx) => {
                const rc = RISK_CONFIG[gate.riskLevel as keyof typeof RISK_CONFIG]
                return (
                  <div key={idx} className={cn('rounded-lg border p-3 space-y-1', rc.bg)}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <rc.icon className={cn('w-3.5 h-3.5 shrink-0', rc.cls)} />
                        <p className={cn('text-xs font-semibold', rc.cls)}>{gate.gate}</p>
                      </div>
                      <span className={cn('text-[10px] font-mono font-semibold capitalize px-1.5 py-0.5 rounded', rc.cls)}>
                        {gate.riskLevel}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{gate.reason}</p>
                    <p className="text-xs font-medium text-foreground leading-relaxed">→ {gate.fix}</p>
                  </div>
                )
              })}
              {!rejectionRisk && (
                <p className="text-sm text-muted-foreground">No rejection risk data available.</p>
              )}
            </div>
          </div>
        </PremiumGate>

        {/* Operational realism — PRO */}
        <PremiumGate
          label="Operational realism — NHS environment awareness"
          reason="operational_realism"
          isPro={isPro}
        >
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="flex items-center gap-2.5 p-5 border-b border-border">
              <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950 flex items-center justify-center">
                <Brain className="h-4 w-4 text-blue-500" />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-foreground">Operational Realism</h3>
                <p className="text-xs text-muted-foreground">Does your statement reflect NHS reality?</p>
              </div>
              <span className="ml-auto text-xs font-medium bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 px-2 py-0.5 rounded-full">Pro</span>
            </div>
            <div className="p-5 space-y-2">
              {opRealism ? (
                <>
                  <div className="flex items-center gap-2 mb-3">
                    <span className={cn(
                      'text-xs font-semibold px-2 py-0.5 rounded-full capitalize',
                      opRealism.level === 'strong'   ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300' :
                      opRealism.level === 'adequate' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' :
                                                       'bg-red-100   text-red-700   dark:bg-red-950   dark:text-red-300'
                    )}>
                      {opRealism.level}
                    </span>
                    <span className="text-xs text-muted-foreground">overall realism level</span>
                  </div>
                  {opRealism.dimensions.map((dim, idx) => (
                    <div key={idx} className="rounded-lg border border-border bg-muted/30 p-3 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-medium text-foreground">{dim.name}</p>
                        <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded capitalize', OP_CLS[dim.classification])}>
                          {dim.classification}
                        </span>
                      </div>
                      {dim.gap && (
                        <p className="text-[11px] text-amber-600 dark:text-amber-400">→ {dim.gap}</p>
                      )}
                    </div>
                  ))}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No operational realism data available.</p>
              )}
            </div>
          </div>
        </PremiumGate>
      </div>

      {/* ── Row 4: Band coaching ─────────────────────────────────────────────── */}
      <PremiumGate
        label="Band-specific coaching tailored to your target role"
        reason="band_coaching"
        isPro={isPro}
      >
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center gap-2.5 p-5 border-b border-border">
            <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950 flex items-center justify-center">
              <Target className="h-4 w-4 text-purple-500" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-foreground">
                Band {bandCoaching?.targetBand} Coaching
                {bandCoaching?.bandLabel && <span className="font-normal text-muted-foreground"> — {bandCoaching.bandLabel}</span>}
              </h3>
              <p className="text-xs text-muted-foreground">Tailored advice for this band level</p>
            </div>
            <span className="ml-auto text-xs font-medium bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 px-2 py-0.5 rounded-full">Pro</span>
          </div>

          {bandCoaching ? (
            <div className="p-5 grid md:grid-cols-3 gap-5">

              {/* What panels look for */}
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">What panels look for</p>
                <ul className="space-y-1.5">
                  {bandCoaching.whatPanelsLookFor.map((item, idx) => (
                    <li key={idx} className="flex gap-2 text-xs text-muted-foreground">
                      <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Candidate gaps */}
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Your gaps</p>
                <ul className="space-y-1.5">
                  {bandCoaching.candidateGaps.map((item, idx) => (
                    <li key={idx} className="flex gap-2 text-xs text-muted-foreground">
                      <XCircle className="w-3 h-3 text-red-500 shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Tips + critical gap */}
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Band tips</p>
                <ul className="space-y-1.5 mb-3">
                  {bandCoaching.bandSpecificTips.map((tip, idx) => (
                    <li key={idx} className="flex gap-2 text-xs text-muted-foreground">
                      <span className="text-purple-500 shrink-0">→</span>
                      {tip}
                    </li>
                  ))}
                </ul>
                <div className="rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 px-3 py-2">
                  <p className="text-[11px] font-semibold text-red-700 dark:text-red-300 mb-0.5">Most critical gap</p>
                  <p className="text-xs text-red-600 dark:text-red-400">{bandCoaching.mostCriticalBandGap}</p>
                </div>
              </div>

            </div>
          ) : (
            <div className="p-5">
              <p className="text-sm text-muted-foreground">No band coaching data available.</p>
            </div>
          )}
        </div>
      </PremiumGate>

    </div>
  )
}