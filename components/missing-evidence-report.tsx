// components/missing-evidence-report.tsx
// Layer 4 output: Shows which essential criteria are at risk because
// the competency that covers them has no evidence.

'use client'

import { useMemo } from 'react'
import { AlertTriangle, CheckCircle2, XCircle, Sparkles } from 'lucide-react'
import Link from 'next/link'

type CompetencyEvidence = {
  label:        string
  criteriaIds:  string[]
  evidence:     string | null
  noExperience: boolean
}

type Criterion = {
  id:            string
  criterionText: string
  type:          string
}

interface Props {
  applicationId:      string
  competencyEvidence: Record<string, CompetencyEvidence>
  criteria:           Criterion[]
}

export function MissingEvidenceReport({ applicationId, competencyEvidence, criteria }: Props) {

  const report = useMemo(() => {
    const essential = criteria.filter(c => c.type === 'essential')
    const covered:  Criterion[] = []
    const atRisk:   Criterion[] = []
    const missing:  Criterion[] = []

    for (const c of essential) {
      // Match by criterion text first (reliable across sessions since DB IDs
      // and wizard-generated IDs are different values).
      // Fall back to ID match for backward compatibility.
      const coveredBy = Object.values(competencyEvidence).find(ce =>
        (ce.criteriaTexts as string[] | undefined)?.some(
          (t: string) => t.trim().toLowerCase() === c.criterionText.trim().toLowerCase()
        ) || (ce.criteriaIds as string[] | undefined)?.includes(c.id)
      )
      if (!coveredBy) {
        missing.push(c)
      } else if (coveredBy.noExperience || !coveredBy.evidence?.trim()) {
        atRisk.push(c)
      } else {
        covered.push(c)
      }
    }

    const coverageScore = essential.length > 0
      ? Math.round((covered.length / essential.length) * 100)
      : 100

    return { essential, covered, atRisk, missing, coverageScore }
  }, [competencyEvidence, criteria])

  const { covered, atRisk, missing, coverageScore, essential } = report

  return (
    <div className="space-y-5">
      {/* Header summary */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-foreground">Missing Evidence Report</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Essential criteria coverage based on your competency evidence
            </p>
          </div>
          <div className="text-right">
            <p className={`text-3xl font-black tabular-nums ${
              coverageScore >= 80 ? 'text-emerald-600 dark:text-emerald-400'
              : coverageScore >= 60 ? 'text-amber-600 dark:text-amber-400'
              : 'text-red-600 dark:text-red-400'
            }`}>{coverageScore}%</p>
            <p className="text-[10px] text-muted-foreground">covered</p>
          </div>
        </div>

        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-700 ${
            coverageScore >= 80 ? 'bg-emerald-500'
            : coverageScore >= 60 ? 'bg-amber-500'
            : 'bg-red-500'
          }`} style={{ width: `${coverageScore}%` }} />
        </div>

        <div className="grid grid-cols-3 gap-3 mt-4">
          {[
            { label: 'Covered',   count: covered.length,  color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/30', icon: CheckCircle2 },
            { label: 'At risk',   count: atRisk.length,   color: 'text-amber-600 dark:text-amber-400',     bg: 'bg-amber-50 dark:bg-amber-950/30',     icon: AlertTriangle },
            { label: 'Not mapped',count: missing.length,  color: 'text-red-600 dark:text-red-400',         bg: 'bg-red-50 dark:bg-red-950/30',         icon: XCircle },
          ].map(({ label, count, color, bg, icon: Icon }) => (
            <div key={label} className={`rounded-xl ${bg} p-3 text-center`}>
              <Icon className={`w-4 h-4 mx-auto mb-1 ${color}`} />
              <p className={`text-xl font-black ${color}`}>{count}</p>
              <p className="text-[10px] text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* At risk criteria */}
      {atRisk.length > 0 && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30">
            <p className="text-xs font-bold text-amber-700 dark:text-amber-300 flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5" />
              At risk — competency marked "no experience" ({atRisk.length})
            </p>
            <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5">
              These essential criteria will be addressed with a development statement — weaker than direct evidence.
            </p>
          </div>
          <ul className="divide-y divide-amber-100 dark:divide-amber-900/30">
            {atRisk.map(c => (
              <li key={c.id} className="flex items-start gap-3 px-4 py-3">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-foreground leading-relaxed">{c.criterionText}</p>
              </li>
            ))}
          </ul>
          <div className="px-4 py-3 border-t border-amber-100 dark:border-amber-900/30">
            <Link href={`/dashboard/application?id=${applicationId}&step=4`}
              className="text-xs text-amber-700 dark:text-amber-300 font-semibold hover:underline flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> Go back and add evidence for these areas
            </Link>
          </div>
        </div>
      )}

      {/* Missing criteria — not mapped to any competency */}
      {missing.length > 0 && (
        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30">
            <p className="text-xs font-bold text-red-700 dark:text-red-300 flex items-center gap-2">
              <XCircle className="w-3.5 h-3.5" />
              Not covered — no competency mapped ({missing.length})
            </p>
            <p className="text-[11px] text-red-600 dark:text-red-400 mt-0.5">
              These criteria were not matched to any competency cluster — usually
              because they're from the job description body, not the person spec.
              If they're genuinely essential, go back to Step 4 and re-answer
              the relevant competency to include them.
            </p>
          </div>
          <ul className="divide-y divide-red-100 dark:divide-red-900/30">
            {missing.map(c => (
              <li key={c.id} className="flex items-start gap-3 px-4 py-3">
                <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                <p className="text-xs text-foreground leading-relaxed">{c.criterionText}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* All covered */}
      {atRisk.length === 0 && missing.length === 0 && essential.length > 0 && (
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/30 p-4 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
              All {essential.length} essential criteria covered
            </p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
              Every essential criterion maps to a competency with evidence. Strong position for shortlisting.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}