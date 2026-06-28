// app/api/mentorship/threads/[id]/messages/route.ts
// User reply to a thread

import { auth }  from '@/auth'
import { getDb } from '@/lib/db-router'

export const runtime = 'nodejs'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { id }  = await params
    const { body } = await req.json()
    if (!body?.trim()) return Response.json({ error: 'Message body required' }, { status: 400 })

    const db     = await getDb(session.user.id)
    const thread = await db.mentorshipThread.findUnique({ where: { id } })

    if (!thread || thread.userId !== session.user.id) {
      return Response.json({ error: 'Not found' }, { status: 404 })
    }

    if (thread.status === 'closed') {
      return Response.json({ error: 'This conversation is closed' }, { status: 400 })
    }

    const message = await db.mentorshipMessage.create({
      data: {
        threadId:   id,
        senderType: 'user',
        body:       body.trim(),
      },
    })

    await db.mentorshipThread.update({
      where: { id },
      data:  { lastMessageAt: new Date() },
    })

    return Response.json({ success: true, message })
  } catch (err: any) {
    console.error('[mentorship user message POST]', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}