// app/api/admin/users/[id]/analyses/[analysisId]/route.ts
//
// Returns the FULL, unsanitized analysis result — every field that
// sanitizeAnalysisForTier() would normally strip for free-tier users
// (criteriaAnalysis, nhsValues evidence, weaknesses, missingCriteria,
// recommendations, rejectionRisk, bandCoaching, etc). Admin always sees
// everything regardless of what tier the analysis was originally run under.

import { prisma } from "@/lib/prisma"
import { withAdminAuth } from "@/lib/admin-auth"

export const GET = withAdminAuth(async (req: Request, admin, ctx: any) => {
  const { id, analysisId } = await ctx.params

  const analysis = await prisma.analysis.findUnique({
    where: { id: analysisId },
  })

  if (!analysis || analysis.userId !== id) {
    return Response.json({ error: "Not found" }, { status: 404 })
  }

  // Deliberately returning the raw record — result is the full unsanitized
  // JSON blob exactly as stored, never passed through sanitizeAnalysisForTier.
  return Response.json({ success: true, analysis })
})