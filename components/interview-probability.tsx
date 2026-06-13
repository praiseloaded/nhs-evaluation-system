// components/interview-probability.tsx
// MOAT 9 — Interview Probability Engine™ Tab Component
'use client'
import { useState, useEffect } from 'react'
import { Loader2, Sparkles, TrendingUp, TrendingDown, Minus, ArrowRight, AlertTriangle, Calculator, ChevronDown, ChevronUp } from 'lucide-react'

interface Factor {
  factor: string; score: number; weight: number; weightedScore: number; explanation: string
}
interface Action {
  action: string; impact: 'high' | 'medium' | 'low'; factor: string
}
interface ProbabilityResult {
  interviewProbability: number
  band: 'high' | 'moderate' | 'low'
  factors: Factor[]
  calculationLines?: string[]
  summary: string
  biggestBlocker: string
  actions: Action[]
  updatedAt?: string
}

const BAND_CONFIG = {
  high:     { label: 'High likelihood',     color: '#10b981', bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-200 dark:border-emerald-800', text: 'text-emerald-700 dark:text-emerald-300' },
  moderate: { label: 'Moderate likelihood', color: '#f59e0b', bg: 'bg-amber-50 dark:bg-amber-950/30',     border: 'border-amber-200 dark:border-amber-800',     text: 'text-amber-700 dark:text-amber-300' },
  low:      { label: 'Low likelihood',      color: '#ef4444', bg: 'bg-red-50 dark:bg-red-950/30',         border: 'border-red-200 dark:border-red-800',         text: 'text-red-700 dark:text-red-300' },
}

const IMPACT_CONFIG = {
  high:   { label: 'High impact',   color: 'text-red-600 dark:text-red-400',    bg: 'bg-red-50 dark:bg-red-950',    icon: TrendingUp },
  medium: { label: 'Medium impact', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950', icon: Minus },
  low:    { label: 'Low impact',    color: 'text-blue-600 dark:text-blue-400',   bg: 'bg-blue-50 dark:bg-blue-950',   icon: TrendingDown },
}

function ProbabilityGauge({ score, band }: { score: number; band: 'high' | 'moderate' | 'low' }) {
  const cfg = BAND_CONFIG[band]
  const r = 56
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - score / 100)
  return (
    <div className="relative w-32 h-32 flex items-center justify-center shrink-0">
      <svg className="-rotate-90 absolute" width="128" height="128">
        <circle cx="64" cy="64" r={r} fill="none" stroke="currentColor" strokeWidth="9" className="text-muted/20" />
        <circle cx="64" cy="64" r={r} fill="none" stroke={cfg.color} strokeWidth="9"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-1000" />
      </svg>
      <div className="text-center">
        <p className="text-3xl font-bold text-foreground">{score}%</p>
        <p className="text-[10px] text-muted-foreground">probability</p>
      </div>
    </div>
  )
}

function FactorBar({ factor }: { factor: Factor }) {
  const color = factor.score >= 70 ? '#10b981' : factor.score >= 45 ? '#f59e0b' : '#ef4444'
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground">{factor.factor}</p>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] text-muted-foreground">weight {Math.round(factor.weight * 100)}%</span>
          <span className="text-sm font-bold text-foreground">{factor.score}%</span>
        </div>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${factor.score}%`, backgroundColor: color }} />
      </div>
      <p className="text-[11px] text-muted-foreground">{factor.explanation}</p>
    </div>
  )
}

export function InterviewProbability({ analysisId }: { analysisId: string }) {
  const [result, setResult] = useState<ProbabilityResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingSaved, setLoadingSaved] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showMath, setShowMath] = useState(false)

  useEffect(() => {
    setResult(null)
    setError(null)
    setLoadingSaved(true)
    fetch(`/api/analysis/${analysisId}/interview-probability`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.data) setResult(d.data) })
      .catch(() => {})
      .finally(() => setLoadingSaved(false))
  }, [analysisId])

  const run = async () => {
    setLoading(true); setError(null)
    try {
      const res = await fetch(`/api/analysis/${analysisId}/interview-probability`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      setResult(data)
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  if (loadingSaved) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-5 h-5 text-primary animate-spin" />
    </div>
  )

  if (!result && !loading) return (
    <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center space-y-4">
      <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
        <TrendingUp className="w-7 h-7 text-primary" />
      </div>
      <div>
        <p className="text-base font-semibold text-foreground">Not analysed yet</p>
        <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
          This application doesn't have an Interview Probability score yet — calculate it from your essential criteria coverage, EvidenceVault™ strength, band fit, and application track record.
        </p>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <button onClick={run} className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
        <Sparkles className="w-4 h-4" /> Calculate Interview Probability
      </button>
    </div>
  )

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 space-y-3">
      <Loader2 className="w-8 h-8 text-primary animate-spin" />
      <p className="text-sm text-muted-foreground">Calculating from criteria coverage, evidence and track record...</p>
    </div>
  )

  if (!result) return null
  const bandCfg = BAND_CONFIG[result.band]

  return (
    <div className="space-y-6">
      {/* Score header */}
      <div className={`rounded-2xl border ${bandCfg.border} ${bandCfg.bg} p-6`}>
        <div className="flex items-center gap-6 flex-wrap">
          <ProbabilityGauge score={result.interviewProbability} band={result.band} />
          <div className="flex-1 space-y-2">
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${bandCfg.bg} ${bandCfg.text} border ${bandCfg.border}`}>
              {bandCfg.label}
            </span>
            <p className="text-sm text-foreground leading-relaxed">{result.summary}</p>
          </div>
        </div>
      </div>

      {/* Biggest blocker */}
      {result.biggestBlocker && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wide">Biggest blocker</p>
            <p className="text-sm text-amber-700 dark:text-amber-300 mt-0.5">{result.biggestBlocker}</p>
          </div>
        </div>
      )}

      {/* Factor breakdown */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-5">
        <p className="text-sm font-bold text-foreground">Score Breakdown</p>
        {result.factors.map(f => <FactorBar key={f.factor} factor={f} />)}
      </div>

      {/* Show the maths */}
      {result.calculationLines && result.calculationLines.length > 0 && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <button onClick={() => setShowMath(s => !s)} className="w-full flex items-center justify-between gap-2 p-4 text-left hover:bg-accent/50 transition-colors">
            <span className="text-sm font-bold text-foreground flex items-center gap-2">
              <Calculator className="w-4 h-4 text-muted-foreground" /> How is {result.interviewProbability}% calculated?
            </span>
            {showMath ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </button>
          {showMath && (
            <div className="px-4 pb-4 space-y-1.5 border-t border-border pt-3">
              <p className="text-[11px] text-muted-foreground mb-2">
                Each factor's score is multiplied by its weight, then all four are added together:
              </p>
              {result.calculationLines.map((line, i) => {
                const isTotal = line.startsWith('Total')
                return (
                  <p key={i} className={`text-xs font-mono ${isTotal ? 'font-bold text-foreground border-t border-border pt-2 mt-1' : 'text-muted-foreground'}`}>
                    {line}
                  </p>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Action plan */}
      {result.actions?.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-bold text-foreground">Improve Your Score</p>
          {result.actions.map((a, i) => {
            const impactCfg = IMPACT_CONFIG[a.impact] ?? IMPACT_CONFIG.medium
            const Icon = impactCfg.icon
            return (
              <div key={i} className="rounded-xl border border-border bg-card p-4 flex items-start gap-3">
                <div className={`w-7 h-7 rounded-lg ${impactCfg.bg} flex items-center justify-center shrink-0`}>
                  <Icon className={`w-3.5 h-3.5 ${impactCfg.color}`} />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-foreground">{a.action}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${impactCfg.bg} ${impactCfg.color}`}>{impactCfg.label}</span>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1"><ArrowRight className="w-2.5 h-2.5" /> {a.factor}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="flex items-center justify-between">
        <button onClick={run} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
          <Sparkles className="w-3 h-3" /> Recalculate
        </button>
        {result.updatedAt && (
          <p className="text-[10px] text-muted-foreground">
            Calculated {new Date(result.updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </div>
    </div>
  )
}