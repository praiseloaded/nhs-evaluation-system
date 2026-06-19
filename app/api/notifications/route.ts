// app/api/notifications/route.ts
// Optimised — takes at most 20 rows and uses the compound index on
// (userId, read) that's now in the schema for the unread count query.

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const userId = session.user.id

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20, // reduced from 30 — fewer rows to deserialise
      select: {
        id: true, type: true, title: true, body: true,
        linkUrl: true, read: true, createdAt: true,
      },
    }),
    prisma.notification.count({
      where: { userId, read: false }, // hits the (userId, read) index
    }),
  ])

  return Response.json({ success: true, notifications, unreadCount })
}