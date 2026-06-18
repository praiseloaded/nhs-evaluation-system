// app/api/admin/system-events/route.ts
// Raw system event feed — AI calls, AI errors, scrape failures, payment events.
// Backs the "Usage & AI Health" monitoring page.

import { prisma } from "@/lib/prisma"
import { withAdminAuth } from "@/lib/admin-auth"

export const GET = withAdminAuth(async (req: Request) => {
  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const limit = Math.min(100, parseInt(searchParams.get('limit') ?? '50', 10))
  const type = searchParams.get('type') ?? ''
  const provider = searchParams.get('provider') ?? ''

  const where: any = {}
  if (type) where.type = type
  if (provider) where.provider = provider

  const [events, total] = await Promise.all([
    prisma.systemEvent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.systemEvent.count({ where }),
  ])

  return Response.json({ success: true, events, total, page, totalPages: Math.ceil(total / limit) })
})