// app/api/admin/mentorship/threads/[id]/messages/route.ts
// Admin reply — same as before, now also creates a notification for the user.

import { prisma } from "@/lib/prisma"
import { withAdminAuth } from "@/lib/admin-auth"
import { createNotification } from "@/lib/notifications"

export const POST = withAdminAuth(async (req: Request, admin, ctx: any) => {
  const { id } = await ctx.params
  const { body } = await req.json()
  if (!body?.trim()) return Response.json({ error: "Message body required" }, { status: 400 })

  const thread = await prisma.mentorshipThread.findUnique({ where: { id } })
  if (!thread) return Response.json({ error: "Not found" }, { status: 404 })

  const message = await prisma.mentorshipMessage.create({
    data: {
      threadId: id,
      senderType: 'admin',
      senderId: admin.id,
      senderName: admin.email,
      body: body.trim(),
    },
  })

  await prisma.mentorshipThread.update({
    where: { id },
    data: { lastMessageAt: new Date(), unreadByUser: true },
  })

  await createNotification({
    userId: thread.userId,
    type: 'mentorship_reply',
    title: `New reply: ${thread.subject}`,
    body: body.trim().slice(0, 120),
    linkUrl: '/dashboard/mentorship',
  })

  return Response.json({ success: true, message })
})