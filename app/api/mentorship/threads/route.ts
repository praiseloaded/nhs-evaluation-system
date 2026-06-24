// app/api/mentorship/threads/route.ts
// Gated to Pro/Elite (configurable via FeatureFlag 'mentorship', default minTier 'pro').

import { prisma } from "@/lib/prisma"
import { getDb }  from "@/lib/db-router"
import { auth } from "@/auth"
import { getUserTier } from "@/lib/billing/tier"
import { hasFeatureAccess, getRequiredTier } from "@/lib/feature-access"

export const runtime = 'nodejs'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 })
  const db      = await getDb(session.user.id)

  const tier = await getUserTier(session.user.id)
  const allowed = await hasFeatureAccess(tier, 'mentorship')
  if (!allowed) {
    const requiredTier = await getRequiredTier('mentorship')
    return Response.json({ error: "Upgrade required", requiredTier: requiredTier ?? 'pro', locked: true }, { status: 403 })
  }

  const threads = await db.mentorshipThread.findMany({
    where: { userId: session.user.id },
    orderBy: { lastMessageAt: 'desc' },
    select: {
      id: true, subject: true, status: true, lastMessageAt: true, unreadByUser: true, createdAt: true,
      messages: { orderBy: { createdAt: 'desc' }, take: 1, select: { body: true, senderType: true, createdAt: true } },
    },
  })

  return Response.json({ success: true, threads })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 })
  const db      = await getDb(session.user.id)

  const tier = await getUserTier(session.user.id)
  const allowed = await hasFeatureAccess(tier, 'mentorship')
  if (!allowed) {
    const requiredTier = await getRequiredTier('mentorship')
    return Response.json({ error: "Upgrade required", requiredTier: requiredTier ?? 'pro', locked: true }, { status: 403 })
  }

  const { subject, body } = await req.json()
  if (!subject?.trim() || !body?.trim()) {
    return Response.json({ error: "Subject and message required" }, { status: 400 })
  }

  const thread = await db.mentorshipThread.create({
    data: {
      userId: session.user.id,
      subject: subject.trim(),
      unreadByAdmin: true,
      messages: {
        create: {
          senderType: 'user',
          senderId: session.user.id,
          senderName: session.user.name ?? null,
          body: body.trim(),
        },
      },
    },
    include: { messages: true },
  })

  return Response.json({ success: true, thread })
}