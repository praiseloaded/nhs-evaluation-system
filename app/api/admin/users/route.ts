// app/api/admin/users/route.ts
// Paginated, searchable, filterable user list for the admin users table.

import { prisma } from "@/lib/prisma"
import { withAdminAuth } from "@/lib/admin-auth"

export const runtime = 'nodejs'

export const GET = withAdminAuth(async (req: Request) => {
  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const limit = Math.min(100, parseInt(searchParams.get('limit') ?? '25', 10))
  const search = searchParams.get('search')?.trim() ?? ''
  const tier = searchParams.get('tier') ?? ''
  const suspended = searchParams.get('suspended')

  const where: any = {}
  if (search) {
    where.OR = [
      { email: { contains: search, mode: 'insensitive' } },
      { name: { contains: search, mode: 'insensitive' } },
    ]
  }
  if (tier) where.tier = tier
  if (suspended === 'true') where.suspended = true
  if (suspended === 'false') where.suspended = false

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true, name: true, email: true, image: true, tier: true, role: true,
        suspended: true, analysisUsed: true, analysisLimit: true, createdAt: true,
        _count: { select: { analyses: true } },
      },
    }),
    prisma.user.count({ where }),
  ])

  return Response.json({
    success: true,
    users,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  })
})