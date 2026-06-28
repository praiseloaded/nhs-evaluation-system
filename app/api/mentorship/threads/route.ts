// app/api/mentorship/threads/route.ts

import { auth }           from '@/auth'
import { getDb }          from '@/lib/db-router'
import { getUserTier }    from '@/lib/billing/tier'
import { hasFeatureAccess, getRequiredTier } from '@/lib/feature-access'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const tier    = await getUserTier(session.user.id)
    const allowed = await hasFeatureAccess(tier, 'mentorship')
    if (!allowed) {
      const requiredTier = await getRequiredTier('mentorship')
      return Response.json({ locked: true, requiredTier: requiredTier ?? 'pro' }, { status: 403 })
    }

    const db      = await getDb(session.user.id)
    const threads = await db.mentorshipThread.findMany({
      where:   { userId: session.user.id },
      orderBy: { lastMessageAt: 'desc' },
      select: {
        id: true, subject: true, status: true,
        lastMessageAt: true, unreadByUser: true, createdAt: true,
        messages: {
          orderBy: { createdAt: 'desc' },
          take:    1,
          select:  { body: true, senderType: true, createdAt: true },
        },
      },
    })

    return Response.json({ success: true, threads })
  } catch (err: any) {
    console.error('[mentorship threads GET]', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const tier    = await getUserTier(session.user.id)
    const allowed = await hasFeatureAccess(tier, 'mentorship')
    if (!allowed) {
      const requiredTier = await getRequiredTier('mentorship')
      return Response.json({ locked: true, requiredTier: requiredTier ?? 'pro' }, { status: 403 })
    }

    const { subject, body } = await req.json()
    if (!subject?.trim() || !body?.trim()) {
      return Response.json({ error: 'Subject and message required' }, { status: 400 })
    }

    const db     = await getDb(session.user.id)
    const thread = await db.mentorshipThread.create({
      data: {
        userId:  session.user.id,
        subject: subject.trim(),
        messages: {
          create: {
            senderType: 'user',
            body:       body.trim(),
          },
        },
      },
      include: { messages: true },
    })

    return Response.json({ success: true, thread })
  } catch (err: any) {
    console.error('[mentorship threads POST]', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}