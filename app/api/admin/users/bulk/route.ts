// app/api/admin/users/bulk/route.ts
//
// Bulk tier change or suspend/unsuspend across multiple users.
// Each user gets its own audit log entry. Admin accounts are always skipped.

import { prisma }                    from '@/lib/prisma'
import { prisma2, getDb }            from '@/lib/db-router'
import { withAdminAuth, logAdminAction } from '@/lib/admin-auth'

export const runtime = 'nodejs'

export const POST = withAdminAuth(async (req: Request, admin) => {
  const { userIds, action, value } = await req.json()

  if (!Array.isArray(userIds) || userIds.length === 0) {
    return Response.json({ error: 'userIds required' }, { status: 400 })
  }
  if (!['tier', 'suspend'].includes(action)) {
    return Response.json({ error: 'Unsupported bulk action' }, { status: 400 })
  }

  // Fetch from both databases in parallel
  const [primary, secondary] = await Promise.all([
    prisma.user.findMany({
      where:  { id: { in: userIds } },
      select: { id: true, email: true, tier: true, suspended: true, role: true },
    }).catch(() => []),
    prisma2.user.findMany({
      where:  { id: { in: userIds } },
      select: { id: true, email: true, tier: true, suspended: true, role: true },
    }).catch(() => []),
  ])

  // Merge — deduplicate by id, primary wins
  const seen  = new Set<string>()
  const users: any[] = []
  for (const u of [...primary, ...secondary]) {
    if (!seen.has(u.id)) { seen.add(u.id); users.push(u) }
  }

  // Never touch another admin account
  const targets = users.filter(u => u.role !== 'admin')
  const skipped = users.length - targets.length

  let updated = 0
  for (const target of targets) {
    const data = action === 'tier'
      ? { tier: value, analysisLimit: value === 'elite' ? -1 : value === 'pro' ? 50 : 3 }
      : { suspended: !!value, suspendedAt: value ? new Date() : null }

    // Route update to the correct shard
    const db = await getDb(target.id)
    await db.user.update({ where: { id: target.id }, data })

    await logAdminAction({
      adminId:    admin.id,
      adminEmail: admin.email,
      action:     action === 'tier' ? 'tier_change' : (value ? 'suspend' : 'unsuspend'),
      targetType: 'user',
      targetId:   target.id,
      targetEmail: target.email ?? undefined,
      before:     { tier: target.tier, suspended: target.suspended },
      after:      data,
      notes:      'Applied via bulk action',
    })
    updated++
  }

  return Response.json({ success: true, updated, skipped })
})