// app/api/admin/users/[id]/grant-elite/route.ts
// Admin grants/revokes unlimited elite access to any user

import { prisma }        from '@/lib/prisma'
import { prisma2 }       from '@/lib/db-router'
import { withAdminAuth } from '@/lib/admin-auth'

export const runtime = 'nodejs'

export const POST = withAdminAuth(async (
  req: Request,
  admin: any,
  ctx: any
) => {
  try {
    const { id }    = await ctx.params
    const { tier, reason } = await req.json()

    if (!['free', 'pro', 'elite'].includes(tier)) {
      return Response.json({ error: 'Invalid tier' }, { status: 400 })
    }

    // Find user in primary or secondary DB
    let user = await prisma.user.findUnique({ where: { id } })
    const db = user ? prisma : prisma2

    if (!user) {
      user = await prisma2.user.findUnique({ where: { id } })
      if (!user) return Response.json({ error: 'User not found' }, { status: 404 })
    }

    const previousTier = user.tier

    // Update tier — sets analysisLimit to -1 (unlimited) for elite
    await (db as any).user.update({
      where: { id },
      data: {
        tier:          tier,
        analysisLimit: tier === 'elite' ? -1 : tier === 'pro' ? 50 : 3,
        analysisUsed:  0, // reset usage counter
      },
    })

    // Audit log
    await prisma.adminAuditLog.create({
      data: {
        adminId:     admin.id,
        adminEmail:  admin.email,
        action:      'tier_change',
        targetType:  'user',
        targetId:    id,
        targetEmail: user.email ?? undefined,
        before:      { tier: previousTier },
        after:       { tier },
        notes:       reason ?? `Manual tier change to ${tier} by admin`,
      },
    })

    return Response.json({ success: true, userId: id, tier, previousTier })
  } catch (err: any) {
    console.error('[grant-elite]', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
})