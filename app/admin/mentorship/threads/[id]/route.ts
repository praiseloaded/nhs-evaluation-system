// app/api/admin/mentorship/threads/[id]/route.ts
// Admin: get single thread with all messages + toggle close/open

import { prisma }        from '@/lib/prisma'
import { withAdminAuth } from '@/lib/admin-auth'

export const runtime = 'nodejs'

export const GET = withAdminAuth(async (
  _req: Request,
  _admin: any,
  ctx: any
) => {
  try {
    const { id } = await ctx.params
    const thread = await prisma.mentorshipThread.findUnique({
      where:   { id },
      include: {
        user:     { select: { id: true, name: true, email: true, tier: true } },
        messages: { orderBy: { createdAt: 'asc' } },
      },
    })
    if (!thread) return Response.json({ error: 'Not found' }, { status: 404 })
    return Response.json({ success: true, thread })
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 })
  }
})

export const PATCH = withAdminAuth(async (
  req: Request,
  _admin: any,
  ctx: any
) => {
  try {
    const { id }     = await ctx.params
    const { status } = await req.json()
    if (!['open', 'closed'].includes(status)) {
      return Response.json({ error: 'status must be open or closed' }, { status: 400 })
    }
    const thread = await prisma.mentorshipThread.update({
      where: { id },
      data:  { status },
    })
    return Response.json({ success: true, thread })
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 })
  }
})