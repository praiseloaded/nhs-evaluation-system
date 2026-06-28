// app/api/admin/users/[id]/analyses/[analysisId]/route.ts
// Returns full unsanitized analysis — no tier gating for admin

import { prisma }        from '@/lib/prisma'
import { prisma2 }       from '@/lib/db-router'
import { withAdminAuth } from '@/lib/admin-auth'

export const runtime = 'nodejs'

export const GET = withAdminAuth(async (
  _req: Request,
  _admin: any,
  ctx: any
) => {
  try {
    const { analysisId } = await ctx.params

    // Check both databases — analysis may be on either shard
    const analysis =
      await prisma.analysis.findUnique({ where: { id: analysisId } }).catch(() => null) ??
      await prisma2.analysis.findUnique({ where: { id: analysisId } }).catch(() => null)

    if (!analysis) {
      return Response.json({ error: 'Analysis not found' }, { status: 404 })
    }

    return Response.json({ success: true, analysis })
  } catch (err: any) {
    console.error('[admin analysis detail]', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
})