import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getDb }  from '@/lib/db-router'
import { getValidatedAIResult } from '@/modules/ai/retry'
import { calculateNhsBandScore } from '@/lib/scoring/calculate-overall-score'
import { detectEvidenceVault } from '@/lib/billing/detect-evidence-vault'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const db = await getDb(session.user.id)

  const { id } = await params

  // 1. Load existing record — ownership check
  const record = await db.analysis.findUnique({ where: { id } })

  if (!record || record.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // 2. Rebuild combined job spec exactly as the original route does
  const sections: string[] = []
  if (record.jobDescription)    sections.push(record.jobDescription)
  if (record.personSpec)        sections.push(`PERSON SPECIFICATION:\n${record.personSpec}`)
  if (record.essentialCriteria) sections.push(`ESSENTIAL CRITERIA:\n${record.essentialCriteria}`)
  if (record.desirableCriteria) sections.push(`DESIRABLE CRITERIA:\n${record.desirableCriteria}`)
  if (record.skills)            sections.push(`SKILLS REQUIRED:\n${record.skills}`)
  if (record.values)            sections.push(`VALUES REQUIRED:\n${record.values}`)
  const combinedJobSpec = sections.join('\n\n')

  const input = {
    jobTitle:  record.jobTitle  ?? '',
    jobSpec:   combinedJobSpec,
    cv:        record.cv        ?? '',   // ← top-level column
    statement: record.statement ?? '',   // ← top-level column
    tier:      await import('@/lib/billing/tier').then(m => m.getUserTier(record.userId)),
  }

  const evidenceVault = await detectEvidenceVault({
  cv:                record.cv                ?? "",
  statement:         record.statement         ?? "",
  jobDescription:    record.jobDescription    ?? "",
  essentialCriteria: record.essentialCriteria ?? "",
  desirableCriteria: record.desirableCriteria ?? "",
  personSpec:        record.personSpec        ?? "",
})

  // 3. Re-run AI
  let aiResult: any
  try {
    aiResult = await getValidatedAIResult(input)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 })
  }

  // 4. Recompute scored breakdown
  const scoredBreakdown = calculateNhsBandScore(aiResult)
  const result = { ...aiResult, scoredBreakdown, evidenceVault }

  // 5. Update the existing record — preserve all original fields, only update result
  await db.analysis.update({
    where: { id },
    data:  { result },
  })

  return NextResponse.json({ success: true })
}