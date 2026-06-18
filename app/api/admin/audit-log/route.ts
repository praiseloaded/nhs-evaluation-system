// app/api/admin/audit-log/route.ts
// Full audit trail — every admin action, filterable by admin/action/target.

import { prisma } from "@/lib/prisma"
import { withAdminAuth } from "@/lib/admin-auth"

export const GET = withAdminAuth(async (req: Request) => {
  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const limit = Math.min(100, parseInt(searchParams.get('limit') ?? '50', 10))
  const action = searchParams.get('action') ?? ''
  const adminEmail = searchParams.get('adminEmail') ?? ''
  const targetEmail = searchParams.get('targetEmail') ?? ''

  const where: any = {}
  if (action) where.action = action
  if (adminEmail) where.adminEmail = { contains: adminEmail, mode: 'insensitive' }
  if (targetEmail) where.targetEmail = { contains: targetEmail, mode: 'insensitive' }

  const [logs, total] = await Promise.all([
    prisma.adminAuditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.adminAuditLog.count({ where }),
  ])

  return Response.json({ success: true, logs, total, page, totalPages: Math.ceil(total / limit) })
})