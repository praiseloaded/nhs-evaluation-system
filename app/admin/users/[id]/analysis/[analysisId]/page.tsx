// app/admin/users/[id]/analysis/[analysisId]/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useParams }           from 'next/navigation'
import Link                    from 'next/link'
import {
  ArrowLeft, Loader2, CheckCircle2, XCircle, MinusCircle,
  Award, Sparkles, AlertTriangle, Target, FileText,
  ChevronRight, Shield, ExternalLink, Zap, BarChart3,
  BookOpen, TrendingUp, Eye,
} from 'lucide-react'

// ── Safe string helper ─────────────────────────────────────────────────────────
function str(val: any): string {
  if (!val) return ''
  if (typeof val === 'string') return val
  if (typeof val === 'number' || typeof val === 'boolean') return String(val)
  if (typeof val === 'object') {
    if (val.gap && val.directive) return `${val.gap}: ${val.directive}`
    if (val.gap)        return val.gap
    if (val.directive)  return val.directive
    if (val.text)       return val.text
    if (val.label)      return val.label
    if (val.criterion)  return val.criterion
    return JSON.stringify(val)
  }
  return String(val)
}
function toStrArray(arr: any): string[] {
  return Array.isArray(arr) ? arr.map(str).filter(Boolean) : []
}

// ── Score ring ─────────────────────────────────────────────────────────────────
function ScoreRing({ score, size = 96 }: { score: number; size?: number }) {
  const r     = size * 0.38
  const circ  = 2 * Math.PI * r
  const off   = circ - (Math.min(score, 100) / 100) * circ
  const color = score >= 70 ? '#22c55e' : score >= 45 ? '#f59e0b' : '#ef4444'
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="currentColor"
        className="text-muted/30" strokeWidth={size*0.065} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color}
        strokeWidth={size*0.065} strokeDasharray={circ} strokeDashoffset={off}
        strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`} />
      <text x={size/2} y={size/2 - 4} textAnchor="middle" dominantBaseline="middle"
        className="fill-foreground font-black" fontSize={size*0.2}>{score}</text>
      <text x={size/2} y={size/2 + size*0.16} textAnchor="middle" dominantBaseline="middle"
        className="fill-muted-foreground" fontSize={size*0.1}>/100</text>
    </svg>
  )
}

// ── Dimension bar ──────────────────────────────────────────────────────────────
function DimBar({ label, score, icon: Icon }: { label: string; score: number; icon: React.ElementType }) {
  const color = score >= 70 ? 'bg-emerald-500' : score >= 45 ? 'bg-amber-400' : 'bg-red-400'
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
          <Icon className="w-3.5 h-3.5" /> {label}
        </div>
        <span className="text-[12px] font-bold tabular-nums text-foreground">{score}%</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${score}%` }} />
      </div>
    </div>
  )
}

// ── Criterion status icon ──────────────────────────────────────────────────────
function CriterionIcon({ status }: { status: string }) {
  if (status === 'met')           return <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
  if (status === 'partially met') return <MinusCircle  className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
  return <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
}

// ── Section wrapper ────────────────────────────────────────────────────────────
function Section({ label, badge, badgeColor = 'blue', children }: {
  label: string; badge?: string; badgeColor?: 'blue'|'green'|'purple'|'amber'; children: React.ReactNode
}) {
  const badgeStyles = {
    blue:   'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800',
    green:  'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800',
    purple: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/50 dark:text-violet-300 dark:border-violet-800',
    amber:  'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800',
  }
  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60">{label}</h2>
        {badge && (
          <span className={`text-[10px] font-semibold uppercase tracking-wider border px-2.5 py-1 rounded-full ${badgeStyles[badgeColor]}`}>
            {badge}
          </span>
        )}
      </div>
      {children}
    </section>
  )
}

// ── Verdict badge ──────────────────────────────────────────────────────────────
function VerdictBadge({ verdict }: { verdict: string }) {
  const map: Record<string, string> = {
    strong:      'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    competitive: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    needs_work:  'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    at_risk:     'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
  }
  const labels: Record<string, string> = { strong: 'Strong', competitive: 'Competitive', needs_work: 'Needs Work', at_risk: 'At Risk' }
  const key = verdict?.toLowerCase().replace(' ', '_') ?? ''
  return (
    <span className={`text-[11px] font-bold uppercase tracking-wider border px-3 py-1 rounded-full ${map[key] ?? map.needs_work}`}>
      {labels[key] ?? verdict}
    </span>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminAnalysisDetailPage() {
  const { id, analysisId } = useParams<{ id: string; analysisId: string }>()
  const [analysis, setAnalysis] = useState<any>(null)
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/admin/users/${id}/analyses/${analysisId}`)
      .then(r => r.json())
      .then(d => { if (d.error) throw new Error(d.error); setAnalysis(d.analysis) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [id, analysisId])

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  )
  if (error || !analysis) return (
    <div className="max-w-2xl mx-auto px-6 py-12 text-center">
      <XCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
      <p className="text-sm text-red-500">{error ?? 'Analysis not found'}</p>
      <Link href={`/admin/users/${id}`} className="text-xs text-muted-foreground hover:text-foreground mt-4 inline-block">
        ← Back to user
      </Link>
    </div>
  )

  const result          = analysis.result ?? {}
  const sb              = result.scoredBreakdown ?? {}
  const overallScore    = sb.overallScore ?? result.overallScore ?? 0
  const verdict         = sb.verdict ?? result.verdict ?? ''
  const essential       = (result.criteriaAnalysis ?? []).filter((c: any) => c.type === 'essential')
  const desirable       = (result.criteriaAnalysis ?? []).filter((c: any) => c.type === 'desirable')
  const nhsValues       = Array.isArray(result.nhsValues) ? result.nhsValues : []
  const strengths       = toStrArray(result.strengths)
  const weaknesses      = toStrArray(result.weaknesses)
  const missingCriteria = toStrArray(result.missingCriteria)
  const recommendations = toStrArray(result.recommendations)
  const keywords        = result.atsMatch?.keywordsFound ?? []
  const createdAt       = new Date(analysis.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  // Dimension scores
  const dims = [
    { label: 'Criteria Coverage', key: 'criteriaCoverage',  icon: Target      },
    { label: 'NHS Values',        key: 'valuesAlignment',   icon: Shield      },
    { label: 'STAR Completeness', key: 'starCompleteness',  icon: Sparkles    },
    { label: 'Language Mirroring',key: 'languageMirroring', icon: BookOpen    },
    { label: 'Specificity',       key: 'specificity',       icon: Eye         },
  ]

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link href="/admin/users" className="hover:text-foreground transition-colors">Users</Link>
          <ChevronRight className="w-3 h-3" />
          <Link href={`/admin/users/${id}`} className="hover:text-foreground transition-colors">User</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-foreground font-medium truncate max-w-xs">{analysis.jobTitle}</span>
        </div>

        {/* Admin banner */}
        <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-2.5">
          <Shield className="w-4 h-4 text-amber-500 shrink-0" />
          <p className="text-[12px] text-amber-700 dark:text-amber-300">
            Admin view — full unsanitized result, no tier gating applied.
          </p>
        </div>

        {/* Score header */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="p-6 sm:p-8">
            <div className="flex items-start gap-6 flex-wrap">
              <ScoreRing score={overallScore} size={104} />
              <div className="flex-1 min-w-0 space-y-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Analysis Report</p>
                  <h1 className="text-xl font-black text-foreground tracking-tight leading-snug">{analysis.jobTitle}</h1>
                  <p className="text-[12px] text-muted-foreground mt-1">Analysed {createdAt}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {verdict && <VerdictBadge verdict={verdict} />}
                  {analysis.band && (
                    <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground bg-muted border border-border rounded-full px-3 py-1">
                      <Award className="w-3 h-3" /> {analysis.band}
                    </span>
                  )}
                  {analysis.sourceUrl && (
                    <a href={analysis.sourceUrl} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-[11px] text-blue-600 dark:text-blue-400 hover:underline">
                      <ExternalLink className="w-3 h-3" /> View job posting
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Dimension bars */}
            {dims.some(d => sb[d.key] != null) && (
              <div className="mt-6 pt-6 border-t border-border grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {dims.map(({ label, key, icon }) =>
                  sb[key] != null ? (
                    <DimBar key={key} label={label} score={sb[key]} icon={icon} />
                  ) : null
                )}
              </div>
            )}
          </div>
        </div>

        {/* Criteria breakdown */}
        <Section label="Criteria Breakdown" badge="Essential & Desirable" badgeColor="blue">
          <div className="grid md:grid-cols-2 gap-5">
            {[
              { title: 'Essential', items: essential },
              { title: 'Desirable', items: desirable },
            ].map(({ title, items }) => (
              <div key={title} className="rounded-2xl border border-border bg-card overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/40">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{title}</span>
                  <span className="text-[11px] text-muted-foreground tabular-nums">
                    {items.filter((c: any) => c.status === 'met').length} / {items.length} met
                  </span>
                </div>
                <ul className="divide-y divide-border">
                  {items.length > 0 ? items.map((c: any, i: number) => (
                    <li key={i} className="flex items-start gap-3 px-4 py-3">
                      <CriterionIcon status={c.status} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] text-foreground/90 leading-snug">{str(c.criterion ?? c.text ?? c)}</p>
                        {c.evidence && <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{str(c.evidence)}</p>}
                      </div>
                    </li>
                  )) : (
                    <li className="px-4 py-4 text-[13px] text-muted-foreground">None recorded</li>
                  )}
                </ul>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-5 mt-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Met</span>
            <span className="flex items-center gap-1.5"><MinusCircle  className="w-3.5 h-3.5 text-amber-400" /> Partially met</span>
            <span className="flex items-center gap-1.5"><XCircle      className="w-3.5 h-3.5 text-red-400" /> Not met</span>
          </div>
        </Section>

        {/* Missing criteria */}
        {missingCriteria.length > 0 && (
          <Section label="Missing Criteria" badgeColor="amber" badge={`${missingCriteria.length} gaps`}>
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="flex flex-wrap gap-2">
                {missingCriteria.map((m, i) => (
                  <span key={i} className="flex items-center gap-1.5 text-[12px] bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 px-3 py-1.5 rounded-full">
                    <XCircle className="w-3 h-3" /> {m}
                  </span>
                ))}
              </div>
            </div>
          </Section>
        )}

        {/* NHS values + Keywords */}
        <Section label="NHS Values & Keywords" badgeColor="green">
          <div className="grid md:grid-cols-2 gap-5">
            <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">NHS Values Demonstrated</p>
              {nhsValues.length > 0 ? (
                <ul className="space-y-2.5 divide-y divide-border">
                  {nhsValues.map((v: any, i: number) => (
                    <li key={i} className="pt-2.5 first:pt-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[13px] font-semibold text-foreground">{str(v.name ?? v.value ?? v)}</p>
                        {v.classification && (
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                            v.classification === 'strong' ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300' :
                            'bg-muted text-muted-foreground'
                          }`}>{v.classification}</span>
                        )}
                      </div>
                      {v.evidence && <p className="text-[11.5px] text-muted-foreground mt-0.5">{str(v.evidence)}</p>}
                    </li>
                  ))}
                </ul>
              ) : <p className="text-[13px] text-muted-foreground">None detected</p>}
            </div>
            <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Keywords Found</p>
              {keywords.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {keywords.map((k: string, i: number) => (
                    <span key={i} className="text-[11px] bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 px-2.5 py-1 rounded-full">
                      {str(k)}
                    </span>
                  ))}
                </div>
              ) : <p className="text-[13px] text-muted-foreground">None detected</p>}
            </div>
          </div>
        </Section>

        {/* Strengths & Weaknesses */}
        {(strengths.length > 0 || weaknesses.length > 0) && (
          <Section label="Strengths & Weaknesses" badgeColor="purple">
            <div className="grid md:grid-cols-2 gap-5">
              {strengths.length > 0 && (
                <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20 p-5 space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-3">Strengths</p>
                  {strengths.map((s, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-[13px] text-foreground/80">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      {s}
                    </div>
                  ))}
                </div>
              )}
              {weaknesses.length > 0 && (
                <div className="rounded-2xl border border-red-200 dark:border-red-800 bg-red-50/40 dark:bg-red-950/20 p-5 space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400 mb-3">Weaknesses</p>
                  {weaknesses.map((w, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-[13px] text-foreground/80">
                      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      {w}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Section>
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <Section label="Recommendations" badge={`${recommendations.length} actions`} badgeColor="blue">
            <div className="rounded-2xl border border-border bg-card divide-y divide-border overflow-hidden">
              {recommendations.map((r, i) => (
                <div key={i} className="flex items-start gap-3 px-5 py-4">
                  <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">
                    {i + 1}
                  </div>
                  <p className="text-[13px] text-foreground/80 leading-relaxed">{r}</p>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Statement & CV submitted */}
        {(analysis.statement || analysis.cv) && (
          <Section label="Submitted Content" badgeColor="purple">
            <div className="space-y-4">
              {analysis.statement && (
                <div className="rounded-2xl border border-border bg-card p-5">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" /> Supporting Statement
                  </p>
                  <p className="text-[13px] text-foreground/80 whitespace-pre-wrap leading-relaxed">{analysis.statement}</p>
                </div>
              )}
              {analysis.cv && (
                <div className="rounded-2xl border border-border bg-card p-5">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" /> CV Submitted
                  </p>
                  <div className="max-h-64 overflow-y-auto">
                    <p className="text-[13px] text-foreground/80 whitespace-pre-wrap leading-relaxed">{analysis.cv}</p>
                  </div>
                </div>
              )}
            </div>
          </Section>
        )}

        {/* Raw JSON */}
        <details className="rounded-2xl border border-border bg-card p-5">
          <summary className="text-[13px] font-semibold text-foreground cursor-pointer hover:text-muted-foreground transition-colors">
            Raw result JSON
          </summary>
          <pre className="text-[10.5px] text-muted-foreground mt-4 overflow-x-auto whitespace-pre-wrap max-h-96 overflow-y-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </details>

      </main>
    </div>
  )
}