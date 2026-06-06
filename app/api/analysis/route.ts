import { NextResponse }          from 'next/server'
import { auth }                  from '@/auth'
import { prisma }                from '@/lib/prisma'
import { getValidatedAIResult }  from '@/modules/ai/retry'
import { calculateNhsBandScore } from '@/lib/scoring/calculate-overall-score'
import { getUserTier }           from '@/lib/billing/tier'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // ───────────────────────────────
  // 1. AUTH
  // ───────────────────────────────
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: 'Unauthorised' },
      { status: 401 }
    )
  }

  const userId = session.user.id as string
  const { id } = await params

  // ───────────────────────────────
  // 2. LOAD & OWNERSHIP CHECK
  // ───────────────────────────────
  let record: Awaited<ReturnType<typeof prisma.analysis.findUnique>>

  try {
    record = await prisma.analysis.findUnique({ where: { id } })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: 'Database error loading record' },
      { status: 500 }
    )
  }

  if (!record) {
    return NextResponse.json(
      { success: false, error: 'Analysis not found' },
      { status: 404 }
    )
  }

  if (record.userId !== userId) {
    return NextResponse.json(
      { success: false, error: 'Forbidden' },
      { status: 403 }
    )
  }

  // ───────────────────────────────
  // 3. REBUILD COMBINED JOB SPEC
  //    (mirrors buildJobSpec in the
  //     original analysis route)
  // ───────────────────────────────
  const sections: string[] = []

  if (record.jobDescription)    sections.push(record.jobDescription)
  if (record.personSpec)        sections.push(`PERSON SPECIFICATION:\n${record.personSpec}`)
  if (record.essentialCriteria) sections.push(`ESSENTIAL CRITERIA:\n${record.essentialCriteria}`)
  if (record.desirableCriteria) sections.push(`DESIRABLE CRITERIA:\n${record.desirableCriteria}`)
  if (record.skills)            sections.push(`SKILLS REQUIRED:\n${record.skills}`)
  if (record.values)            sections.push(`VALUES REQUIRED:\n${record.values}`)

  const combinedJobSpec = sections.join('\n\n')

  // ───────────────────────────────
  // 4. GET USER TIER
  // ───────────────────────────────
  let tier: 'free' | 'pro' = 'free'

  try {
    const userTier = await getUserTier(userId)
    tier = userTier === 'pro' ? 'pro' : 'free'
  } catch {
    // Default to free if tier lookup fails — don't block the re-analysis
    tier = 'free'
  }

  // ───────────────────────────────
  // 5. RE-RUN AI
  // ───────────────────────────────
  let aiResult: any

  try {
    aiResult = await getValidatedAIResult({
      jobTitle:  record.jobTitle  ?? '',
      jobSpec:   combinedJobSpec,
      cv:        record.cv        ?? '',   // top-level DB column
      statement: record.statement ?? '',   // top-level DB column
      tier,
    })
  } catch (err: any) {
    console.error('[reanalyse] AI error:', err?.message)
    return NextResponse.json(
      { success: false, error: err?.message ?? 'AI analysis failed' },
      { status: 502 }
    )
  }

  // ───────────────────────────────
  // 6. RECOMPUTE SCORED BREAKDOWN
  // ───────────────────────────────
  let scoredBreakdown: any

  try {
    scoredBreakdown = calculateNhsBandScore(aiResult)
  } catch (err: any) {
    console.error('[reanalyse] Scoring error:', err?.message)
    scoredBreakdown = null
  }

  const result = {
    ...aiResult,
    ...(scoredBreakdown ? { scoredBreakdown } : {}),
  }

  // ───────────────────────────────
  // 7. UPDATE EXISTING RECORD
  //    Only result is updated —
  //    all original job data, cv,
  //    and statement are preserved
  // ───────────────────────────────
  try {
    await prisma.analysis.update({
      where: { id },
      data:  { result },
    })
  } catch (err: any) {
    console.error('[reanalyse] DB update error:', err?.message)
    return NextResponse.json(
      { success: false, error: 'Failed to save updated result' },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
}