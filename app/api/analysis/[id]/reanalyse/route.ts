import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getValidatedAIResult } from '@/modules/ai/retry'
import { calculateNhsBandScore } from '@/lib/scoring/calculate-overall-score'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const { id } = await params

  // 1. Load existing record — ownership check
  const record = await prisma.analysis.findUnique({ where: { id } })

  if (!record || record.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // 2. Rebuild the prompt input from stored fields
  const stored = (record.result as any) ?? {}

  const input = {
    jobTitle:          record.jobTitle          ?? '',
    jobSpec:           record.jobDescription    ?? '',
    personSpec:        stored.personSpec        ?? '',
    essentialCriteria: stored.essentialCriteria ?? '',
    desirableCriteria: stored.desirableCriteria ?? '',
    skills:            stored.skills            ?? '',
    values:            stored.values            ?? '',
    cv:                stored.cv               ?? '',
    statement:         stored.statement         ?? '',
  }

  // 3. Re-run AI
  let aiResult: any
  try {
    aiResult = await getValidatedAIResult(input)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 })
  }

  // 4. Recompute scored breakdown
  if (!aiResult.scoredBreakdown && aiResult.breakdown) {
    aiResult.scoredBreakdown = calculateNhsBandScore(aiResult)
  }

  // 5. Update the existing record in DB — same id, new result
  await prisma.analysis.update({
    where: { id },
    data:  { result: aiResult },
  })

  return NextResponse.json({ success: true })
}