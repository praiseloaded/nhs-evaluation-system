// app/api/admin/users/[id]/analyses/route.ts
// List view — enough per-row detail to show a score and verdict without
// pulling the full JSON blob for every row.

import { prisma } from "@/lib/prisma"
import { withAdminAuth } from "@/lib/admin-auth"

export const GET = withAdminAuth(async (req: Request, admin, ctx: any) => {
  const { id } = await ctx.params

  const analyses = await prisma.analysis.findMany({
    where: { userId: id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, jobTitle: true, createdAt: true, sourceUrl: true, result: true,
    },
  })

  // Pull just the overall score out of the JSON blob for the list view
  const summarised = analyses.map(a => {
    const result = a.result as any
    return {
      id: a.id,
      jobTitle: a.jobTitle,
      createdAt: a.createdAt,
      sourceUrl: a.sourceUrl,
      overallScore: result?.scoredBreakdown?.overallScore ?? null,
      verdict: result?.scoredBreakdown?.verdict ?? null,
    }
  })

  return Response.json({ success: true, analyses: summarised })
})