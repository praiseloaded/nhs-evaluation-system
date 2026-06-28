// app/api/admin/mentorship/threads/[id]/messages/route.ts

import { prisma }             from '@/lib/prisma'
import { prisma2, getDb }     from '@/lib/db-router'
import { withAdminAuth }      from '@/lib/admin-auth'
import { createNotification } from '@/lib/notifications'

export const runtime = 'nodejs'

export const POST = withAdminAuth(async (req: Request, admin: any, ctx: any) => {
  const { id }   = await ctx.params
  const { body } = await req.json()
  if (!body?.trim()) return Response.json({ error: 'Message body required' }, { status: 400 })

  // Find thread — no userId yet, must check both DBs
  const thread =
    await prisma.mentorshipThread.findUnique({ where: { id } }).catch(() => null) ??
    await prisma2.mentorshipThread.findUnique({ where: { id } }).catch(() => null)

  if (!thread) return Response.json({ error: 'Not found' }, { status: 404 })

  // Now we have thread.userId — use getDb for all subsequent writes
  const db = await getDb(thread.userId)

  const message = await db.mentorshipMessage.create({
    data: {
      threadId:   id,
      senderType: 'admin',
      body:       body.trim(),
    },
  })

  await db.mentorshipThread.update({
    where: { id },
    data:  { lastMessageAt: new Date(), unreadByUser: true },
  })

  // Notification table is on primary — createNotification handles this
  await createNotification({
    userId:  thread.userId,
    type:    'mentorship_reply',
    title:   `New reply: ${thread.subject}`,
    body:    body.trim().slice(0, 120),
    linkUrl: '/dashboard/mentorship',
  })

  return Response.json({ success: true, message })
})