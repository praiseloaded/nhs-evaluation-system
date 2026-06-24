// app/admin/users/[id]/analysis/[analysisId]/page.tsx
//
// Full, unsanitized analysis report for admin viewing — every field that
// would normally be tier-gated for the user (criteria detail, NHS values
// evidence, weaknesses, missing criteria, recommendations, rejection risk,
// band coaching) is shown here regardless of what tier the user is on.
'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Loader2, FileText, CheckCircle2, XCircle, AlertTriangle,
  Target, Sparkles, Award, ExternalLink,
} from 'lucide-react'

function ScoreRing({ score }: { score: number }) {
  const color = score >= 70 ? '#10b981' : score >= 45 ? '#f59e0b' : '#ef4444'
  const r = 40; const circ = 2 * Math.PI * r
  const offset = circ * (1 - (score ?? 0) / 100)
  return (
    <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
      <svg className="-rotate-90 absolute" width="96" height="96">
        <circle cx="48" cy="48" r={r} fill="none" stroke="currentColor" strokeWidth="7" className="text-muted/20" />
        <circle cx="48" cy="48" r={r} fill="none" stroke={color} strokeWidth="7" strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
      </svg>
      <span className="text-xl font-black text-foreground">{score ?? '—'}%</span>
    </div>
  )
}

function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
      <p className="text-sm font-bold text-foreground flex items-center gap-2"><Icon className="w-4 h-4 text-primary" /> {title}</p>
      {children}
    </div>
  )
}

export default function AdminAnalysisDetailPage() {
  const { id, analysisId } = useParams<{ id: string; analysisId: string }>()
  const [analysis, setAnalysis] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/admin/users/${id}/analyses/${analysisId}`)
      .then(r => r.json())
      .then(d => { if (d.error) throw new Error(d.error); setAnalysis(d.analysis) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [id, analysisId])

  if (loading) return <div className="flex justify-center py-24"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
  if (error || !analysis) return <div className="p-8 text-sm text-red-500">{error ?? 'Not found'}</div>

  const result = analysis.result ?? {}
  const sb = result.scoredBreakdown ?? {}
  const criteria = result.criteriaAnalysis ?? []
  const nhsValues = result.nhsValues ?? []
  const weaknesses = result.weaknesses ?? []
  const missingCriteria = result.missingCriteria ?? []
  const recommendations = result.recommendations ?? []
  const atsMatch = result.atsMatch ?? {}

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
      <Link href={`/admin/users/${id}`} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to user
      </Link>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{analysis.jobTitle}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Analysed {new Date(analysis.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
          {analysis.sourceUrl && (
            <a href={analysis.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-[12px] text-primary hover:underline flex items-center gap-1 mt-1">
              View original job posting <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
        <div className="flex items-center gap-3">
          <ScoreRing score={sb.overallScore ?? 0} />
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase">Verdict</p>
            <p className="text-sm font-bold text-foreground">{sb.verdict ?? '—'}</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 px-4 py-2.5 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
        <p className="text-[12px] text-amber-700 dark:text-amber-300">Admin view — shows the full unsanitized result regardless of the user's tier.</p>
      </div>

      {/* Score breakdown */}
      {sb && Object.keys(sb).length > 0 && (
        <Section title="Scored Breakdown" icon={Award}>
          <div className="grid sm:grid-cols-2 gap-3">
            {Object.entries(sb).filter(([k]) => k !== 'overallScore' && k !== 'verdict').map(([key, value]) => (
              <div key={key} className="flex justify-between text-[12.5px] border-b border-border/50 pb-1.5">
                <span className="text-muted-foreground capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                <span className="font-mono font-semibold text-foreground">{typeof value === 'number' ? `${value}%` : String(value)}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Criteria analysis */}
      {criteria.length > 0 && (
        <Section title={`Criteria Analysis (${criteria.length})`} icon={Target}>
          <div className="space-y-2">
            {criteria.map((c: any, i: number) => (
              <div key={i} className="flex items-start gap-2.5 text-[12.5px] py-1.5 border-b border-border/40 last:border-0">
                {c.status === 'met' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" /> : <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />}
                <div className="flex-1">
                  <p className="text-foreground">{c.criterion}</p>
                  <p className="text-[10.5px] text-muted-foreground uppercase">{c.type} · {c.status}</p>
                  {c.evidence && <p className="text-[11.5px] text-muted-foreground mt-0.5">{c.evidence}</p>}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* NHS values evidence */}
      {nhsValues.length > 0 && (
        <Section title="NHS Values Evidence" icon={CheckCircle2}>
          <div className="space-y-2">
            {nhsValues.map((v: any, i: number) => (
              <div key={i} className="text-[12.5px] py-1.5 border-b border-border/40 last:border-0">
                <p className="font-medium text-foreground">{v.value} <span className="text-[10.5px] text-muted-foreground uppercase ml-1">{v.classification}</span></p>
                {v.evidence && <p className="text-muted-foreground mt-0.5">{v.evidence}</p>}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Missing criteria */}
      {missingCriteria.length > 0 && (
        <Section title="Missing Criteria" icon={XCircle}>
          <div className="flex flex-wrap gap-1.5">
            {missingCriteria.map((m: string, i: number) => (
              <span key={i} className="text-[11px] bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 px-2.5 py-1 rounded-full">{m}</span>
            ))}
          </div>
        </Section>
      )}

      {/* Weaknesses */}
      {weaknesses.length > 0 && (
        <Section title="Weaknesses Identified" icon={AlertTriangle}>
          <ul className="space-y-1.5">
            {weaknesses.map((w: string, i: number) => (
              <li key={i} className="text-[12.5px] text-foreground flex items-start gap-2"><span className="text-amber-500 shrink-0">•</span> {w}</li>
            ))}
          </ul>
        </Section>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <Section title="Recommendations" icon={Sparkles}>
          <ul className="space-y-1.5">
            {recommendations.map((r: string, i: number) => (
              <li key={i} className="text-[12.5px] text-foreground flex items-start gap-2"><span className="text-primary shrink-0">→</span> {r}</li>
            ))}
          </ul>
        </Section>
      )}

      {/* Raw CV & statement text the user submitted */}
      <Section title="Submitted Statement" icon={FileText}>
        <p className="text-[12.5px] text-foreground whitespace-pre-wrap leading-relaxed">{analysis.statement || 'No statement submitted.'}</p>
      </Section>

      <Section title="Submitted CV" icon={FileText}>
        <p className="text-[12.5px] text-foreground whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">{analysis.cv || 'No CV submitted.'}</p>
      </Section>

      {/* Raw JSON fallback — for any fields not explicitly rendered above */}
      <details className="rounded-2xl border border-border bg-card p-5">
        <summary className="text-sm font-bold text-foreground cursor-pointer">Raw result JSON</summary>
        <pre className="text-[10.5px] text-muted-foreground mt-3 overflow-x-auto whitespace-pre-wrap">{JSON.stringify(result, null, 2)}</pre>
      </details>
    </div>
  )
}