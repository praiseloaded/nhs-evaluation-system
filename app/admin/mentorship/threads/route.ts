// app/api/admin/mentorship/threads/route.ts
// Admin: list all mentorship threads with filtering

import { prisma }         from '@/lib/prisma'
import { withAdminAuth }  from '@/lib/admin-auth'

export const runtime = 'nodejs'

export const GET = withAdminAuth(async (req: Request) => {
  try {
    const url    = new URL(req.url)
    const filter = url.searchParams.get('filter') ?? 'all'
    const user   = url.searchParams.get('user')   ?? undefined

    const where: any = {}
    if (user)             where.userId = user
    if (filter === 'open')   where.status = 'open'
    if (filter === 'closed') where.status = 'closed'
    // unreadByAdmin — check messages with senderType='user' after last admin message
    // simpler: flag on thread not in schema, so filter by lastMessageAt from user
    // We use a workaround: load all and filter client-side in the admin page

    const threads = await prisma.mentorshipThread.findMany({
      where,
      orderBy: { lastMessageAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true, tier: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take:    1,
          select:  { body: true, senderType: true, createdAt: true },
        },
      },
    })

    // Derive unreadByAdmin from whether last message is from user
    const enriched = threads.map(t => ({
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