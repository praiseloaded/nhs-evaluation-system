// app/api/admin/users/bulk/route.ts
//
// New feature: apply tier change or suspend/unsuspend to multiple users
// at once from the Users list page's checkbox selection. Every affected
// user gets its own AdminAuditLog entry — bulk action is logged per-user,
// not as one opaque "bulk" entry, so the audit trail stays granular.

import { prisma } from "@/lib/prisma"
import { withAdminAuth, logAdminAction } from "@/lib/admin-auth"

export const runtime = 'nodejs'

export const POST = withAdminAuth(async (req: Request, admin) => {
  const { userIds, action, value } = await req.json()
  if (!Array.isArray(userIds) || userIds.length === 0) {
    return Response.json({ error: "userIds required" }, { status: 400 })
  }
  if (!['tier', 'suspend'].includes(action)) {
    return Response.json({ error: "Unsupported bulk action" }, { status: 400 })
  }

  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, email: true, tier: true, suspended: true, role: true },
  })

  // Never let a bulk action touch another admin's account by accident
  const targets = users.filter(u => u.role !== 'admin')
  const skipped = users.length - targets.length

  let updated = 0
  for (const target of targets) {
    const data = action === 'tier' ? { tier: value } : { suspended: !!value, suspendedAt: value ? new Date() : null }
    await prisma.user.update({ where: { id: target.id }, data })
    await logAdminAction({
      adminId: admin.id,
      adminEmail: admin.email,
      action: action === 'tier' ? 'tier_change' : (value ? 'suspend' : 'unsuspend'),
      targetType: 'user',
      targetId: target.id,
      targetEmail: target.email ?? undefined,
      before: { tier: target.tier, suspended: target.suspended },
      after: data,
      notes: 'Applied via bulk action',
    })
    updated++
  }

  return Response.json({ success: true, updated, skipped })
})