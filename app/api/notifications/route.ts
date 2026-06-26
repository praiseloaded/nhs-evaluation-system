// app/api/notifications/route.ts

import { getDb }  from '@/lib/db-router'
import { auth }   from '@/auth'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const db     = await getDb(userId)

    const [notifications, unreadCount] = await Promise.all([
      db.notification.findMany({
        where:   { userId },
        orderBy: { createdAt: 'desc' },
        take:    20,
        select: {
          id: true, type: true, title: true, body: true,
          linkUrl: true, read: true, createdAt: true,
        },
      }),
      db.notification.count({
        where: { userId, read: false },
      }),
    ])

    return Response.json({ success: true, notifications, unreadCount })
  } catch (err: any) {
    console.error('[notifications]', err)
    // Always return valid JSON — never empty body
    return Response.json({ success: false, notifications: [], unreadCount: 0 }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const db     = await getDb(userId)
    const body   = await req.json().catch(() => ({}))
    const { id } = body

    if (id) {
      // Mark single notification as read
      await db.notification.updateMany({
        where: { id, userId },
        data:  { read: true },
      })
    } else {
      // Mark all as read
      await db.notification.updateMany({
        where: { userId, read: false },
        data:  { read: true },
      })
    }

    return Response.json({ success: true })
  } catch (err: any) {
    console.error('[notifications PATCH]', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}