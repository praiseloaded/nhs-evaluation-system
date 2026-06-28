// app/api/admin/users/[id]/interviews/[interviewId]/route.ts

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
    const { interviewId } = await ctx.params

    // Check both databases
    const interview =
      await prisma.interview.findUnique({
        where:   { id: interviewId },
        include: { answers: { orderBy: { answeredAt: 'asc' } } },
      }).catch(() => null) ??
      await prisma2.interview.findUnique({
        where:   { id: interviewId },
        include: { answers: { orderBy: { answeredAt: 'asc' } } },
      }).catch(() => null)

    if (!interview) {
      return Response.json({ error: 'Interview not found' }, { status: 404 })
    }

    return Response.json({ success: true, interview })
  } catch (err: any) {
    console.error('[admin interview detail]', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
})