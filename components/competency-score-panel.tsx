// components/competency-score-panel.tsx
// Layer 3: per-competency evidence score breakdown.
// Shows Communication 87%, Teamwork 92% etc. after evidence is collected,
// before statement generation. Helps candidates see which area needs work.

'use client'

import { useMemo } from 'react'
import { CheckCircle2, AlertTriangle, XCircle, TrendingUp, Lightbulb } from 'lucide-react'
import Link from 'next/link'

type CompetencyEvidence = {
  label:         string
  description?:  string
  criteriaIds:   string[]
  criteriaTexts?: string[]
  evidence:      string | null
  noExperience:  boolean
}

interface Props {
  applicationId:      string
  competencyEvidence: Record<string, CompetencyEvidence>
  totalEssential:     number
}

// Score a single competency's evidence on 0–100
function scoreEvidence(ce: CompetencyEvidence): number {
  if (ce.noExperience) return 20   // development statement — weak but not zero
  if (!ce.evidence?.trim()) return 0

  const text  = ce.evidence.trim()
  const words = text.split(/\s+/).filter(Boolean).length

  let score = 0

  // Base word count score (0–50 points)
  if      (words >= 150) score += 50
  else if (words >= 100) score += 40
  else if (words >= 60)  score += 30
  else if (words >= 30)  score += 20
  else if (words >= 10)  score += 10

  // STAR signals (+30 points)
  const lower = text.toLowerCase()
  const starSignals = [
    ['situation','context','when i','whilst i','during','at the time','i was working'],
    ['task','responsible','required to','i needed to','my role was','i had to'],
    ['action','i decided','i did','i implemented','i ensured','i arranged','i contacted','i escalated'],
    ['result','outcome','as a result','this meant','which led','improved','reduced','achieved','feedback'],
  ]
  const starFound = starSignals.filter(group => group.some(kw => lower.includes(kw))).length
  score += starFound * 7.5

  // Specificity signals — numbers, names, procedures (+20 points)
  const hasNumbers  = /\d+/.test(text)
  const hasSpecific = /patient|ward|department|procedure|protocol|team|colleague|manager|sister/.test(lower)
  if (hasNumbers)  score += 10
  if (hasSpecific) score += 10

  return Math.min(Math.round(score), 100)
}

function getQualityLabel(score: number, noExp: boolean): { label: string; color: string; bg: string; icon: any } {
  if (noExp)       return { label: 'Development only',  color: '#854F0B', bg: '#FAEEDA', icon: Lightbulb }
  if (score >= 80) return { label: 'Strong evidence',   color: '#065f46', bg: '#d1fae5', icon: CheckCircle2 }
  if (score >= 55) return { label: 'Good evidence',     color: '#1e40af', bg: '#dbeafe', icon: TrendingUp }
  if (score >= 30) return { label: 'Add more detail',   color: '#92400e', bg: '#fef3c7', icon: AlertTriangle }
  return              { label: 'Needs evidence',        color: '#991b1b', bg: '#fee2e2', icon: XCircle }
}

export function CompetencyScorePanel({ applicationId, competencyEvidence, totalEssential }: Props) {
  const entries = useMemo(() => {
    return Object.entries(competencyEvidence).map(([id, ce]) => ({
      id,
      ce,
      score: scoreEvidence(ce),
    })).sort((a, b) => a.score - b.score) // worst first so candidates see what needs fixing
  }, [competencyEvidence])

  const overallScore = useMemo(() => {
    if (!entries.length) return 0
    return Math.round(entries.reduce((s, e) => s + e.score, 0) / entries.length)
  }, [entries])

  const strongCount   = entries.filter(e => e.score >= 80).length
  const weakCount     = entries.filter(e => e.score < 30 || e.ce.noExperience).length
  const coverageColor = overallScore >= 75 ? '#065f46' : overallScore >= 50 ? '#1e40af' : '#991b1b'

  if (!entries.length) return null

  return (
    <div className="space-y-5">
      {/* Summary row */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-bold text-foreground">Evidence Quality Score</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Across {entries.length} competency areas — lowest scores first
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-black tabular-nums" style={{ color: coverageColor }}>{overallScore}%</p>
            <p className="text-[10px] text-muted-foreground">overall</p>
          </div>
        </div>
        <div className="h-2.5 bg-muted rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700"
            style={{ width: `${overallScore}%`, background: coverageColor }} />
        </div>
        <div className="grid grid-cols-3 gap-3 mt-4">
          {[
            { label: 'Strong', count: strongCount,               color: '#065f46', bg: '#d1fae5' },
            { label: 'Needs work', count: weakCount,             color: '#991b1b', bg: '#fee2e2' },
            { label: 'Development only', count: entries.filter(e => e.ce.noExperience).length, color: '#854F0B', bg: '#fef3c7' },
          ].map(({ label, count, color, bg }) => (
            <div key={label} className="rounded-xl p-3 text-center" style={{ background: bg }}>
              <p className="text-xl font-black tabular-nums" style={{ color }}>{count}</p>
              <p className="text-[10px] font-medium" style={{ color }}>{label}</p>
            </div>
          ))}
        </div>
        {weakCount > 0 && (
          <div className="mt-4 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-3 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                {weakCount} competenc{weakCount === 1 ? 'y needs' : 'ies need'} stronger evidence
              </p>
              <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5">
                Go back to Step 4, click the dot for the weak competency, and add a more detailed example before generating.
              </p>
              <Link href={`/dashboard/application?id=${applicationId}&step=4`}
                className="inline-block mt-2 text-[11px] font-semibold text-amber-700 dark:text-amber-300 hover:underline">
                → Go back and improve evidence
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Per-competency breakdown */}
      <div className="space-y-2">
        {entries.map(({ id, ce, score }) => {
          const { label, color, bg, icon: Icon } = getQualityLabel(score, ce.noExperience)
          const wc = ce.evidence?.trim().split(/\s+/).filter(Boolean).length ?? 0
          const criteriaCount = ce.criteriaIds?.length ?? 0

          return (
            <div key={id} className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3">
                {/* Score ring mini */}
                <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-sm font-black"
                  style={{ background: bg, color }}>
                  {ce.noExperience ? '~' : score}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-foreground">{ce.label}</p>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: bg, color }}>
                      {label}
                    </span>
                    {criteriaCount > 0 && (
                      <span className="text-[10px] text-muted-foreground">{criteriaCount} criteria</span>
                    )}
                  </div>
                  {/* Evidence bar */}
                  <div className="mt-1.5 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${score}%`, background: color }} />
                  </div>
                  {/* Evidence preview */}
                  {ce.evidence && !ce.noExperience && (
                    <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1">{wc} words · {ce.evidence.slice(0, 80)}…</p>
                  )}
                  {ce.noExperience && (
                    <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
                      Marked as no experience — AI will write a development statement
                    </p>
                  )}
                  {!ce.evidence && !ce.noExperience && (
                    <p className="text-[11px] text-red-500 mt-1">No evidence provided — go back and answer this competency</p>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}