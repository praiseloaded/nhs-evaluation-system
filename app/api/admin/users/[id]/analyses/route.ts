// app/api/admin/users/[id]/analyses/route.ts

import { prisma }        from '@/lib/prisma'
import { prisma2 }       from '@/lib/db-router'
import { withAdminAuth } from '@/lib/admin-auth'

export const runtime = 'nodejs'

export const GET = withAdminAuth(async (_req: Request, _admin: any, ctx: any) => {
  const { id } = await ctx.params

  // Check both databases — analyses may be in either shard
  const [a1, a2] = await Promise.all([
    prisma.analysis.findMany({
      where: { userId: id }, orderBy: { createdAt: 'desc' },
      select: { id: true, jobTitle: true, createdAt: true, sourceUrl: true, result: true },
    }).catch(() => []),
    prisma2.analysis.findMany({
      where: { userId: id }, orderBy: { createdAt: 'desc' },
      select: { id: true, jobTitle: true, createdAt: true, sourceUrl: true, result: true },
    }).catch(() => []),
  ])

  // Merge and deduplicate
  const seen = new Set<string>()
  const merged = [...a1, ...a2].filter(a => seen.has(a.id) ? false : (seen.add(a.id), true))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const summarised = merged.map((a: any) => {
    const result = a.result as any
    return {
      id:           a.id,
      jobTitle:     a.jobTitle,
      createdAt:    a.createdAt,
      sourceUrl:    a.sourceUrl,
      overallScore: result?.scoredBreakdown?.overallScore ?? result?.overallScore ?? null,
      verdict:      result?.scoredBreakdown?.verdict      ?? result?.verdict      ?? null,
    }
  })

  return Response.json({ success: true, analyses: summarised })
})