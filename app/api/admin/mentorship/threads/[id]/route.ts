// app/api/admin/mentorship/threads/[id]/route.ts

import { prisma }        from '@/lib/prisma'
import { prisma2, getDb } from '@/lib/db-router'
import { withAdminAuth } from '@/lib/admin-auth'

export const runtime = 'nodejs'

async function findThread(id: string) {
  const t = await prisma.mentorshipThread.findUnique({
    where:   { id },
    include: {
      user:     { select: { id: true, name: true, email: true, tier: true } },
      messages: { orderBy: { createdAt: 'asc' } },
    },
  }).catch(() => null)

  if (t) return t

  return prisma2.mentorshipThread.findUnique({
    where:   { id },
    include: {
      user:     { select: { id: true, name: true, email: true, tier: true } },
      messages: { orderBy: { createdAt: 'asc' } },
    },
  }).catch(() => null)
}

export const GET = withAdminAuth(async (
  _req: Request,
  _admin: any,
  ctx: any
) => {
  try {
    const { id }  = await ctx.params
    const thread  = await findThread(id)
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

    // Find which DB the thread is in, then update there
    const inPrimary = await prisma.mentorshipThread.findUnique({
      where: { id }, select: { id: true },
    }).catch(() => null)

    const db     = inPrimary ? prisma : prisma2
    const thread = await db.mentorshipThread.update({ where: { id }, data: { status } })

    return Response.json({ success: true, thread })
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 })
  }
})