// components/shortlist-intelligence.tsx
'use client'

import { useCallback, useState } from 'react'
import {
  Loader2, Shield, AlertTriangle, CheckCircle2, XCircle,
  ChevronDown, ChevronUp, Target, TrendingUp, MessageSquare,
  Zap, Lock, Users, Stethoscope, BarChart3,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface DimensionScore {
  score: number
  status: "strong" | "moderate" | "weak"
  rationale: string
}

interface Risk {
  title: string
  severity: "high" | "medium" | "low"
  explanation: string
}

interface Recommendation {
  priority: number
  title: string
  action: string
  expectedImpact: "high" | "medium" | "low"
  dimension: string
}

interface Assessment {
  dimensions: Record<string, DimensionScore>
  risks: Risk[]
  competitiveness: {
    overallScore: number
    shortlistLikelihood: number
    competitivenessBand: string
  }
  recruiterView: { summary: string }
  recommendations: Recommendation[]
  assessedAt: string
}

interface Props {
  applicationId: string
  existingAssessment?: Assessment | null
}

// ─── Dimension Config ─────────────────────────────────────────────────────────

const DIMENSION_META: Record<string, { label: string; icon: any; description: string }> = {
  essentialCriteriaCoverage: { label: 'Essential Criteria', icon: CheckCircle2, description: 'Coverage of mandatory requirements' },
  desirableCriteriaCoverage: { label: 'Desirable Criteria', icon: Target, description: 'Coverage of preferred requirements' },
  nhsValuesAlignment:       { label: 'NHS Values', icon: Shield, description: 'Alignment with NHS Constitution values' },
  clinicalRealism:           { label: 'Clinical Realism', icon: Stethoscope, description: 'Authenticity of clinical examples' },
  operationalAwareness:      { label: 'Operational Awareness', icon: BarChart3, description: 'Understanding of NHS pressures' },
  leadershipEvidence:        { label: 'Leadership', icon: TrendingUp, description: 'Evidence of leading teams or change' },
  mdtCollaboration:          { label: 'MDT Collaboration', icon: Users, description: 'Multidisciplinary team working' },
  safeguardingEvidence:      { label: 'Safeguarding', icon: Shield, description: 'Patient safety and safeguarding examples' },
  measurableOutcomes:        { label: 'Measurable Outcomes', icon: BarChart3, description: 'Quantified results and impact' },
  communicationQuality:      { label: 'Communication', icon: MessageSquare, description: 'Clarity and professional tone' },
  bandAppropriateness:       { label: 'Band Fit', icon: Target, description: 'Experience appropriate to target band' },
  atsAlignment:              { label: 'ATS Alignment', icon: Zap, description: 'Keyword matching for automated screening' },
}

// ─── Score Bar ────────────────────────────────────────────────────────────────

function DimensionBar({ dimKey, dim }: { dimKey: string; dim: DimensionScore }) {
  const [expanded, setExpanded] = useState(false)
  const meta = DIMENSION_META[dimKey] ?? { label: dimKey, icon: Target, description: '' }
  const Icon = meta.icon
  const barColor = dim.status === 'strong' ? 'bg-emerald-500' : dim.status === 'moderate' ? 'bg-amber-500' : 'bg-red-500'
  const statusColor = dim.status === 'strong' ? 'text-emerald-600 dark:text-emerald-400' : dim.status === 'moderate' ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button onClick={() => setExpanded(e => !e)} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-accent/30 transition-colors">
        <Icon className={`w-4 h-4 shrink-0 ${statusColor}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-foreground">{meta.label}</span>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold ${statusColor} capitalize`}>{dim.status}</span>
              <span className="text-xs font-mono text-muted-foreground">{dim.score}%</span>
            </div>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div className={`h-full ${barColor} rounded-full transition-all duration-500`} style={{ width: `${dim.score}%` }} />
          </div>
        </div>
        {expanded ? <ChevronUp className="w-3 h-3 text-muted-foreground shrink-0" /> : <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" />}
      </button>
      {expanded && (
        <div className="px-4 pb-3 border-t border-border pt-2">
          <p className="text-[10px] text-muted-foreground mb-1">{meta.description}</p>
          <p className="text-xs text-foreground/80 leading-relaxed">{dim.rationale}</p>
        </div>
      )}
    </div>
  )
}

// ─── Risk Card ────────────────────────────────────────────────────────────────

function RiskCard({ risk }: { risk: Risk }) {
  const severityStyle = {
    high: 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/30 text-red-700 dark:text-red-300',
    medium: 'border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300',
    low: 'border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300',
  }
  const dotColor = { high: 'bg-red-500', medium: 'bg-amber-500', low: 'bg-blue-500' }

  return (
    <div className={`rounded-xl border p-4 ${severityStyle[risk.severity]}`}>
      <div className="flex items-start gap-2.5">
        <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${dotColor[risk.severity]}`} />
        <div>
          <div className="flex items-center gap-2 mb-1">
            <p className="text-xs font-bold">{risk.title}</p>
            <span className="text-[9px] font-semibold uppercase tracking-wider opacity-70">{risk.severity}</span>
          </div>
          <p className="text-xs opacity-80 leading-relaxed">{risk.explanation}</p>
        </div>
      </div>
    </div>
  )
}

// ─── Likelihood Gauge ─────────────────────────────────────────────────────────

function LikelihoodGauge({ score, likelihood, band }: { score: number; likelihood: number; band: string }) {
  const bandColor =
    band === 'Highly Competitive' ? 'text-emerald-600 dark:text-emerald-400' :
    band === 'Strong' ? 'text-blue-600 dark:text-blue-400' :
    band === 'Competitive' ? 'text-amber-600 dark:text-amber-400' :
    band === 'Weak' ? 'text-orange-600 dark:text-orange-400' :
    'text-red-600 dark:text-red-400'

  const ringColor =
    score >= 75 ? '#10b981' : score >= 60 ? '#3b82f6' : score >= 40 ? '#f59e0b' : '#ef4444'

  const r = 52; const circ = 2 * Math.PI * r; const offset = circ * (1 - score / 100)

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <svg width="120" height="120" className="-rotate-90">
          <circle cx="60" cy="60" r={r} fill="none" stroke="currentColor" strokeWidth="6" className="text-muted/20" />
          <circle cx="60" cy="60" r={r} fill="none" stroke={ringColor} strokeWidth="6"
            strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-1000" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-foreground">{score}%</span>
        </div>
      </div>
      <p className={`text-sm font-bold mt-2 ${bandColor}`}>{band}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{likelihood}% shortlist probability</p>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function ShortlistIntelligence({ applicationId, existingAssessment }: Props) {
  const [assessment, setAssessment] = useState<Assessment | null>(existingAssessment ?? null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const runAssessment = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res = await fetch(`/api/application/${applicationId}/shortlist-assessment`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        if (data.blocked) { setError('Pro plan required for Shortlisting Intelligence'); return }
        throw new Error(data.error ?? 'Assessment failed')
      }
      setAssessment(data.assessment)
    } catch (err: any) { setError(err.message) }
    finally { setLoading(false) }
  }, [applicationId])

  // ── No assessment yet ──────────────────────────────────────────────────
  if (!assessment && !loading) {
    return (
      <div className="space-y-4">
        <div className="text-center py-12 rounded-2xl border border-border bg-card">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-7 h-7 text-primary" />
          </div>
          <h2 className="text-lg font-bold text-foreground mb-2">Shortlisting Intelligence</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
            Simulate how an NHS shortlisting panel would assess your application.
            Get a 12-dimension analysis with risk detection and recruiter reasoning.
          </p>
          {error && <p className="text-xs text-red-500 mb-4">{error}</p>}
          <button onClick={runAssessment} disabled={loading}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold transition-colors">
            <Shield className="w-4 h-4" /> Run Panel Assessment
          </button>
        </div>
      </div>
    )
  }

  // ── Loading ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="text-center py-16">
        <div className="flex justify-center gap-3 mb-4">
          <span className="text-2xl animate-bounce" style={{ animationDelay: '0s' }}>👩🏾‍⚕️</span>
          <span className="text-2xl animate-bounce" style={{ animationDelay: '0.2s' }}>👨🏻‍💼</span>
          <span className="text-2xl animate-bounce" style={{ animationDelay: '0.4s' }}>👩🏽‍💻</span>
        </div>
        <Loader2 className="w-6 h-6 text-primary animate-spin mx-auto mb-3" />
        <p className="text-foreground font-semibold">Panel is reviewing your application...</p>
        <p className="text-xs text-muted-foreground mt-1">Assessing 12 dimensions of shortlisting criteria</p>
      </div>
    )
  }

  if (!assessment) return null

  const dims = assessment.dimensions
  const comp = assessment.competitiveness
  const highRisks = assessment.risks.filter(r => r.severity === 'high')
  const medRisks = assessment.risks.filter(r => r.severity === 'medium')
  const lowRisks = assessment.risks.filter(r => r.severity === 'low')

  // Sort dimensions by score (weakest first)
  const sortedDims = Object.entries(dims).sort(([, a], [, b]) => a.score - b.score)

  return (
    <div className="space-y-6">

      {/* Top: Competitiveness + Recruiter View */}
      <div className="grid md:grid-cols-2 gap-4">

        {/* Competitiveness gauge */}
        <div className="rounded-2xl border border-border bg-card p-6 text-center">
          <LikelihoodGauge score={comp.overallScore} likelihood={comp.shortlistLikelihood} band={comp.competitivenessBand} />
        </div>

        {/* Recruiter view */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
            <MessageSquare className="w-3 h-3" /> Panel Chair Summary
          </h3>
          <p className="text-sm text-foreground leading-relaxed italic">
            &ldquo;{assessment.recruiterView.summary}&rdquo;
          </p>
          <p className="text-[10px] text-muted-foreground mt-3">
            Assessed {new Date(assessment.assessedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>

      {/* Risks */}
      {assessment.risks.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
            <AlertTriangle className="w-3 h-3" /> Risk Areas ({highRisks.length} high, {medRisks.length} medium, {lowRisks.length} low)
          </h3>
          <div className="grid md:grid-cols-2 gap-2">
            {assessment.risks.sort((a, b) => {
              const order = { high: 0, medium: 1, low: 2 }
              return order[a.severity] - order[b.severity]
            }).map((risk, i) => <RiskCard key={i} risk={risk} />)}
          </div>
        </div>
      )}

      {/* 12 Dimensions */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
          <BarChart3 className="w-3 h-3" /> 12-Dimension Assessment (weakest first)
        </h3>
        <div className="space-y-1.5">
          {sortedDims.map(([key, dim]) => (
            <DimensionBar key={key} dimKey={key} dim={dim} />
          ))}
        </div>
      </div>

      {/* Recommendations */}
      {assessment.recommendations.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
            <TrendingUp className="w-3 h-3" /> Improvement Priorities
          </h3>
          <div className="space-y-2">
            {assessment.recommendations.sort((a, b) => a.priority - b.priority).map((rec, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-start gap-3">
                  <span className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                    {rec.priority}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-semibold text-foreground">{rec.title}</p>
                      <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                        rec.expectedImpact === 'high' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' :
                        rec.expectedImpact === 'medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400' :
                        'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400'
                      }`}>{rec.expectedImpact} impact</span>
                    </div>
                    <p className="text-xs text-foreground/70 leading-relaxed">{rec.action}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">Improves: {DIMENSION_META[rec.dimension]?.label ?? rec.dimension}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Re-run button */}
      <div className="text-center pt-2">
        <button onClick={runAssessment} disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-muted hover:bg-accent text-foreground text-xs font-medium transition-colors">
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Shield className="w-3 h-3" />} Re-run Assessment
        </button>
      </div>
    </div>
  )
}