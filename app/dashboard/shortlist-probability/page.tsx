'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useFeatureContext } from '@/components/providers/feature-access-provider'
import {
  ArrowLeft, Loader2, Target, FileText, Calendar,
  ChevronDown, Sparkles, TrendingUp, AlertTriangle,
  CheckCircle2, XCircle, Lock, RefreshCw,
} from 'lucide-react'

interface AnalysisSummary {
  id: string; jobTitle: string; band: string | null; createdAt: string; result: any
}

interface ScoreFactor {
  id: string; label: string; score: number; weight: number
  status: 'strong' | 'good' | 'weak' | 'missing'
  explanation: string; actions: string[]; proOnly?: boolean
}

function deriveShortlistData(result: any, isPro: boolean): {
  probability: number; verdict: string; factors: ScoreFactor[]
  missingEvidence: string[]; whyNot100: string[]
} {
  const sb = result?.scoredBreakdown ?? {}
  const criteria  = result?.criteriaAnalysis ?? []
  const atsMatch  = result?.atsMatch ?? {}
  const nhsValues = result?.nhsValues ?? []

  const essential     = criteria.filter((c: any) => c.type === 'essential')
  const essentialMet  = essential.filter((c: any) => c.status === 'met').length
  const essentialPct  = essential.length > 0 ? Math.round((essentialMet / essential.length) * 100) : 60
  const desirable     = criteria.filter((c: any) => c.type === 'desirable')
  const desirableMet  = desirable.filter((c: any) => c.status === 'met').length
  const desirablePct  = desirable.length > 0 ? Math.round((desirableMet / desirable.length) * 100) : 50
  const valuesPct = typeof sb.valuesAlignment === 'number' ? sb.valuesAlignment
    : nhsValues.length > 0 ? Math.round((nhsValues.filter((v: any) => v.classification !== 'absent').length / nhsValues.length) * 100) : 60
  const clinicalPct   = typeof sb.specificity       === 'number' ? sb.specificity       : 70
  const atsPct        = atsMatch.totalKeywords > 0 ? Math.round((atsMatch.foundCount / atsMatch.totalKeywords) * 100) : typeof sb.languageMirroring === 'number' ? sb.languageMirroring : 70
  const statementPct  = typeof sb.starCompleteness  === 'number' ? sb.starCompleteness  : typeof sb.criteriaCoverage === 'number' ? sb.criteriaCoverage : 65
  const evidencePct   = typeof sb.overallScore      === 'number' ? sb.overallScore      : 60

  const probability = Math.round(
    essentialPct * 0.25 + desirablePct * 0.15 + valuesPct * 0.15 +
    clinicalPct  * 0.15 + atsPct       * 0.12 + statementPct * 0.10 + evidencePct * 0.08
  )

  const getStatus = (pct: number): ScoreFactor['status'] =>
    pct >= 80 ? 'strong' : pct >= 60 ? 'good' : pct >= 40 ? 'weak' : 'missing'

  const factors: ScoreFactor[] = [
    { id: 'essential', label: 'Essential Criteria Match', score: essentialPct, weight: 25, status: getStatus(essentialPct),
      explanation: essential.length > 0 ? `${essentialMet} of ${essential.length} essential criteria fully met.` : 'No criteria data — paste the person specification to enable this.',
      actions: essentialPct < 80 ? ['Review each unmet criterion and add a specific STAR example', 'Use the Evidence Gaps™ tab to see exactly which criteria need attention'] : [] },
    { id: 'desirable', label: 'Desirable Criteria Match', score: desirablePct, weight: 15, status: getStatus(desirablePct),
      explanation: desirable.length > 0 ? `${desirableMet} of ${desirable.length} desirable criteria addressed.` : 'No desirable criteria found in the person specification.',
      actions: desirablePct < 60 ? ['Even partially addressing desirable criteria improves your score', 'Add a brief mention of any desirable skills you have'] : [] },
    { id: 'values', label: 'NHS Values Evidence', score: valuesPct, weight: 15, status: getStatus(valuesPct), proOnly: false,
      explanation: `${Math.round(valuesPct / 100 * 6)} of 6 NHS values evidenced in your statement.`,
      actions: valuesPct < 80 ? ['Reference specific NHS values by name with a behavioural example', 'Use the Keyword Intelligence™ tab to see which values are missing'] : [] },
    { id: 'clinical', label: 'Clinical Competencies', score: clinicalPct, weight: 15, status: getStatus(clinicalPct), proOnly: true,
      explanation: 'How specifically your clinical skills and competencies are evidenced.',
      actions: clinicalPct < 70 ? ['Add specific clinical procedures performed with quantities where possible', 'Reference competency sign-offs (e.g. venepuncture, ILS, manual handling)'] : [] },
    { id: 'ats', label: 'ATS Compatibility', score: atsPct, weight: 12, status: getStatus(atsPct), proOnly: true,
      explanation: atsMatch.totalKeywords > 0 ? `${atsMatch.foundCount} of ${atsMatch.totalKeywords} job keywords found in your application.` : 'Language mirroring score — how closely your language matches the job spec.',
      actions: atsPct < 75 ? ['Mirror the exact terminology from the job description', 'Use the Keyword Intelligence™ tab for the full NHS keyword analysis'] : [] },
    { id: 'statement', label: 'Supporting Statement Strength', score: statementPct, weight: 10, status: getStatus(statementPct), proOnly: true,
      explanation: 'STAR structure completeness and quality of your supporting statement.',
      actions: statementPct < 70 ? ['Ensure every example follows Situation → Task → Action → Result', 'Include quantified results where possible (e.g. "reduced errors by 30%")'] : [] },
    { id: 'evidence', label: 'Evidence Depth', score: evidencePct, weight: 8, status: getStatus(evidencePct), proOnly: true,
      explanation: 'Overall depth and specificity of evidence throughout the application.',
      actions: evidencePct < 70 ? ['Add more specific examples — avoid vague claims like "I am hardworking"', 'Build your EvidenceVault™ with detailed STAR examples to power future applications'] : [] },
  ]

  const whyNot100 = factors.filter(f => f.score < 80)
    .sort((a, b) => (b.weight * (80 - b.score)) - (a.weight * (80 - a.score)))
    .slice(0, 4).map(f => `${f.label}: ${f.score}%`)

  const missingEvidence: string[] = []
  if (essential.filter((c: any) => c.status === 'not met').length > 0) {
    essential.filter((c: any) => c.status === 'not met').slice(0, 3).forEach((c: any) => missingEvidence.push(c.criterion))
  }
  if (atsMatch.keywordsMissing?.length > 0) {
    atsMatch.keywordsMissing.slice(0, 3).forEach((k: string) => missingEvidence.push(k))
  }

  const verdicts = [
    { min: 80, label: 'Strong application' }, { min: 65, label: 'Competitive' },
    { min: 45, label: 'Needs improvement' },  { min: 0,  label: 'At risk of rejection' },
  ]
  const verdict = verdicts.find(v => probability >= v.min)?.label ?? 'At risk of rejection'
  return { probability, verdict, factors, missingEvidence, whyNot100 }
}

function ProbabilityRing({ probability }: { probability: number }) {
  const color = probability >= 70 ? '#10b981' : probability >= 50 ? '#f59e0b' : '#ef4444'
  const r = 56; const circ = 2 * Math.PI * r; const offset = circ * (1 - probability / 100)
  return (
    <div className="relative w-36 h-36 flex items-center justify-center shrink-0">
      <svg className="-rotate-90 absolute" width="144" height="144">
        <circle cx="72" cy="72" r={r} fill="none" stroke="currentColor" strokeWidth="9" className="text-muted/20" />
        <circle cx="72" cy="72" r={r} fill="none" stroke={color} strokeWidth="9"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-1000" />
      </svg>
      <div className="text-center">
        <p className="text-4xl font-black text-foreground">{probability}%</p>
        <p className="text-[10px] text-muted-foreground">shortlist</p>
      </div>
    </div>
  )
}

function FactorRow({ factor, isPro, expanded, onToggle }: {
  factor: ScoreFactor; isPro: boolean; expanded: boolean; onToggle: () => void
}) {
  const color  = factor.score >= 80 ? '#10b981' : factor.score >= 60 ? '#f59e0b' : '#ef4444'
  const locked = factor.proOnly && !isPro
  return (
    <div className={`rounded-xl border overflow-hidden ${locked ? 'border-border opacity-60' : 'border-border'}`}>
      <button onClick={onToggle} className="w-full px-4 py-3 text-left hover:bg-accent/40 transition-colors">
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                {locked && <Lock className="w-3 h-3 text-muted-foreground" />}
                {factor.label}
                <span className="text-[10px] text-muted-foreground">({factor.weight}%)</span>
              </p>
              <span className="text-sm font-black tabular-nums shrink-0" style={{ color: locked ? undefined : color }}>
                {locked ? '—' : `${factor.score}%`}
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              {locked ? <div className="h-full w-1/2 bg-muted-foreground/20 rounded-full" />
                      : <div className="h-full rounded-full transition-all duration-700" style={{ width: `${factor.score}%`, backgroundColor: color }} />}
            </div>
          </div>
        </div>
      </button>
      {expanded && !locked && (
        <div className="px-4 pb-4 space-y-2 border-t border-border">
          <p className="text-xs text-muted-foreground mt-2">{factor.explanation}</p>
          {factor.actions.length > 0 && (
            <div className="space-y-1">
              {factor.actions.map((a, i) => (
                <p key={i} className="text-xs text-foreground flex items-start gap-1.5">
                  <span className="text-primary font-bold shrink-0">→</span> {a}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
      {expanded && locked && (
        <div className="px-4 pb-4 border-t border-border">
          <div className="mt-2 flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Available on Pro</p>
            <Link href="/upgrade" className="text-xs text-primary font-semibold hover:underline ml-auto">Upgrade →</Link>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ShortlistProbabilityPage() {
  // Use feature context hook — respects admin Settings page configuration
  const { hasAccess } = useFeatureContext()
  const isPro = hasAccess('shortlist_factors_pro')

  const [analyses,   setAnalyses]   = useState<AnalysisSummary[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/analysis/list?page=1&limit=50')
      .then(r => r.ok ? r.json() : { results: [] })
      .then(d => {
        const list = d.results ?? []
        setAnalyses(list)
        if (list.length > 0) setSelectedId(list[0].id)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const selected = analyses.find(a => a.id === selectedId)
  const data = selected?.result ? deriveShortlistData(selected.result, isPro) : null

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-6">
      <div>
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-4 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
        </Link>
        <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
          <Target className="w-6 h-6 text-primary" /> Shortlist Probability™
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Predict your Likelihood of being Shortlisted for an NHS or Healthcare role. The AI identify your strongest and Weakest Areas and provide recommendations to improve your chances before you submit your Application.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-5 h-5 text-primary animate-spin" /></div>
      ) : analyses.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center space-y-3">
          <FileText className="w-8 h-8 text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">No saved analyses yet.</p>
          <Link href="/dashboard/new-analysis" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold">
            <Sparkles className="w-4 h-4" /> Start a new analysis
          </Link>
        </div>
      ) : (
        <>
          <div className="relative">
            <button onClick={() => setPickerOpen(o => !o)}
              className="w-full flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left hover:border-primary/40 transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{selected?.jobTitle ?? 'Select an analysis'}</p>
                  {selected && (
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                      {selected.band && <span>{selected.band}</span>}
                      <Calendar className="w-3 h-3" />
                      {new Date(selected.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  )}
                </div>
              </div>
              <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${pickerOpen ? 'rotate-180' : ''}`} />
            </button>
            {pickerOpen && (
              <div className="absolute z-10 mt-1 w-full rounded-xl border border-border bg-card shadow-lg max-h-64 overflow-y-auto">
                {analyses.map(a => (
                  <button key={a.id} onClick={() => { setSelectedId(a.id); setPickerOpen(false); setExpandedId(null) }}
                    className={`w-full text-left px-4 py-2.5 hover:bg-accent transition-colors ${a.id === selectedId ? 'bg-primary/5' : ''}`}>
                    <p className="text-sm font-medium text-foreground truncate">{a.jobTitle}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {a.band && <span className="mr-1">{a.band}</span>}
                      {new Date(a.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {data && (
            <div className="space-y-5">
              <div className="rounded-2xl border border-border bg-card p-6">
                <div className="flex items-center gap-6 flex-wrap">
                  <ProbabilityRing probability={data.probability} />
                  <div className="flex-1 space-y-3">
                    <div>
                      <p className="text-lg font-bold text-foreground">{data.verdict}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        Based on 7 weighted factors for <strong>{selected?.jobTitle}</strong>
                      </p>
                    </div>
                    {data.whyNot100.length > 0 && (
                      <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3 space-y-1.5">
                        <p className="text-xs font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5" /> Why not higher?
                        </p>
                        {data.whyNot100.map((w, i) => (
                          <p key={i} className="text-xs text-amber-700 dark:text-amber-300 flex items-start gap-1.5">
                            <span className="shrink-0">→</span> {w}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {data.missingEvidence.length > 0 && (
                <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-4 space-y-2">
                  <p className="text-xs font-bold text-red-700 dark:text-red-300 flex items-center gap-1.5">
                    <XCircle className="w-3.5 h-3.5" /> Missing evidence — likely to affect shortlisting
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {data.missingEvidence.map((e, i) => (
                      <span key={i} className="text-[11px] bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 px-2.5 py-1 rounded-full">{e}</span>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <p className="text-sm font-bold text-foreground">Score Breakdown — 7 Factors</p>
                {data.factors.map(f => (
                  <FactorRow key={f.id} factor={f} isPro={isPro}
                    expanded={expandedId === f.id}
                    onToggle={() => setExpandedId(expandedId === f.id ? null : f.id)} />
                ))}
              </div>

              {!isPro && (
                <div className="rounded-xl border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/30 p-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-violet-700 dark:text-violet-300">Unlock all 7 factors</p>
                    <p className="text-xs text-violet-600 dark:text-violet-400 mt-0.5">5 factors are Pro-only — upgrade to see your full breakdown and fix actions.</p>
                  </div>
                  <Link href="/upgrade" className="shrink-0 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold transition-colors">
                    Upgrade
                  </Link>
                </div>
              )}

              {selected && (
                <Link href={`/dashboard/analysis/${selected.id}`}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-border text-sm font-semibold text-foreground hover:bg-accent transition-colors">
                  <TrendingUp className="w-4 h-4" /> View full analysis for {selected.jobTitle}
                </Link>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}