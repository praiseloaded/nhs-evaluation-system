// app/api/evolution/route.ts
import { auth }               from '@/auth'
import { getEffectiveUserId } from '@/lib/effective-user'
import { getDb }              from '@/lib/db-router'

export const runtime = 'nodejs'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (await getEffectiveUserId()) ?? (session.user.id as string)
  const db     = await getDb(userId)

  const records = await db.analysis.findMany({
    where:   { userId },
    orderBy: { createdAt: 'desc' },
    take:    50,
    select: {
      id: true, jobTitle: true, createdAt: true,
      result: true, statement: true,
    },
  })

  const entries = records.map((r: any) => {
    const res = (r.result as any) ?? {}
    const scored = res.scoredBreakdown ?? {}
    return {
      id:             r.id,
      jobTitle:       r.jobTitle ?? '',
      createdAt:      r.createdAt,
      statement:      r.statement ?? '',
      wordCount:      res.statementScan?.wordCount ?? 0,
      overallScore:   scored.overall   ?? res.overallScore   ?? 0,
      criteriaScore:  scored.criteria  ?? res.criteriaScore  ?? 0,
      valuesScore:    scored.values    ?? res.valuesScore     ?? 0,
      starScore:      scored.star      ?? res.starScore       ?? 0,
      languageScore:  scored.language  ?? res.languageScore   ?? 0,
    }
  })

  return Response.json({ success: true, entries })
}