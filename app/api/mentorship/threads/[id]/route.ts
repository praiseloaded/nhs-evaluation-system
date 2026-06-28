// app/api/mentorship/threads/[id]/route.ts
// GET: fetch thread with all messages + mark as read

import { auth }  from '@/auth'
import { getDb } from '@/lib/db-router'

export const runtime = 'nodejs'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const db     = await getDb(session.user.id)

    const thread = await db.mentorshipThread.findUnique({
      where: { id },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
      },
    })

    if (!thread || thread.userId !== session.user.id) {
      return Response.json({ error: 'Not found' }, { status: 404 })
    }

    // Mark as read if there are unread admin messages
    if (thread.unreadByUser) {
      await db.mentorshipThread.update({
        where: { id },
        data:  { unreadByUser: false },
      })
    }

    return Response.json({ success: true, thread })
  } catch (err: any) {
    console.error('[mentorship thread GET]', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}