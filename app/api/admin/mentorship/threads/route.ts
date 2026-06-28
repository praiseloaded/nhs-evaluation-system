// app/api/admin/mentorship/threads/route.ts

import { prisma }        from '@/lib/prisma'
import { prisma2 }       from '@/lib/db-router'
import { withAdminAuth } from '@/lib/admin-auth'

export const runtime = 'nodejs'

export const GET = withAdminAuth(async (req: Request) => {
  try {
    const url    = new URL(req.url)
    const filter = url.searchParams.get('filter') ?? 'all'
    const user   = url.searchParams.get('user')   ?? undefined

    const where: any = {}
    if (user)                where.userId = user
    if (filter === 'open')   where.status = 'open'
    if (filter === 'closed') where.status = 'closed'

    const include = {
      user:     { select: { id: true, name: true, email: true, tier: true } },
      messages: { orderBy: { createdAt: 'desc' } as any, take: 1, select: { body: true, senderType: true, createdAt: true } },
    }

    // Fetch from both databases
    const [t1, t2] = await Promise.all([
      prisma.mentorshipThread.findMany({ where, orderBy: { lastMessageAt: 'desc' }, include }).catch(() => []),
      prisma2.mentorshipThread.findMany({ where, orderBy: { lastMessageAt: 'desc' }, include }).catch(() => []),
    ])

    // Merge and deduplicate
    const seen = new Set<string>()
    const merged = [...t1, ...t2].filter(t => seen.has(t.id) ? false : (seen.add(t.id), true))
      .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime())

    const enriched = merged.map((t: any) => ({
      ...t,
      unreadByAdmin: t.messages[0]?.senderType === 'user',
    }))

    const unreadCount = enriched.filter(t => t.unreadByAdmin).length

    return Response.json({ success: true, threads: enriched, unreadCount })
  } catch (err: any) {
    console.error('[admin mentorship threads]', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
})