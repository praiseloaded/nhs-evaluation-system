// app/api/admin/tier-limits/route.ts
//
// GET returns every tier×key limit row, auto-seeding from LIMIT_CATALOG
// defaults. PATCH updates one (tier, key) value. -1 means unlimited.

import { prisma } from "@/lib/prisma"
import { withAdminAuth, logAdminAction } from "@/lib/admin-auth"
import { LIMIT_CATALOG } from "@/lib/feature-access"

const TIERS = ['free', 'pro', 'elite']

export const GET = withAdminAuth(async () => {
  const existing = await prisma.tierLimit.findMany()
  const existingKeys = new Set(existing.map(l => `${l.tier}:${l.key}`))

  const toCreate: { tier: string; key: string; value: number }[] = []
  for (const limit of LIMIT_CATALOG) {
    for (const tier of TIERS) {
      const compositeKey = `${tier}:${limit.key}`
      if (!existingKeys.has(compositeKey)) {
        toCreate.push({ tier, key: limit.key, value: limit.defaults[tier] ?? 0 })
      }
    }
  }
  if (toCreate.length > 0) {
    await prisma.tierLimit.createMany({ data: toCreate, skipDuplicates: true })
  }

  const limits = await prisma.tierLimit.findMany({ orderBy: [{ key: 'asc' }, { tier: 'asc' }] })
  return Response.json({ success: true, limits })
})

export const PATCH = withAdminAuth(async (req: Request, admin) => {
  const { tier, key, value } = await req.json()
  if (!tier || !key || value === undefined) {
    return Response.json({ error: "tier, key, value required" }, { status: 400 })
  }

  const before = await prisma.tierLimit.findUnique({ where: { tier_key: { tier, key } } })

  const updated = await prisma.tierLimit.upsert({
    where: { tier_key: { tier, key } },
    update: { value },
    create: { tier, key, value },
  })

  await logAdminAction({
    adminId: admin.id, adminEmail: admin.email, action: 'tier_limit_change',
    targetType: 'tierLimit', targetId: `${tier}:${key}`,
    before: before ? { value: before.value } : undefined,
    after: { value }, notes: `${tier} tier "${key}" set to ${value === -1 ? 'unlimited' : value}`,
  })

  return Response.json({ success: true, limit: updated })
})