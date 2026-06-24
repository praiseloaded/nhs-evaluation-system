// app/api/admin/feature-flags/route.ts
//
// GET returns every flag, auto-seeding any missing rows from
// FEATURE_CATALOG so the Settings grid always has a complete set of
// rows to render even on first visit. PATCH updates one flag's minTier
// or enabled state.

import { prisma } from "@/lib/prisma"
import { withAdminAuth, logAdminAction } from "@/lib/admin-auth"
import { FEATURE_CATALOG } from "@/lib/feature-access"

export const runtime = 'nodejs'

export const GET = withAdminAuth(async () => {
  const existing = await prisma.featureFlag.findMany()
  const existingKeys = new Set(existing.map(f => f.key))

  const missing = FEATURE_CATALOG.filter(f => !existingKeys.has(f.key))
  if (missing.length > 0) {
    await prisma.featureFlag.createMany({
      data: missing.map(f => ({
        key: f.key, label: f.label, description: f.description, minTier: f.defaultMinTier,
      })),
      skipDuplicates: true,
    })
  }

  const flags = await prisma.featureFlag.findMany({ orderBy: { label: 'asc' } })
  return Response.json({ success: true, flags })
})

export const PATCH = withAdminAuth(async (req: Request, admin) => {
  const { key, minTier, enabled } = await req.json()
  if (!key) return Response.json({ error: "key required" }, { status: 400 })

  const before = await prisma.featureFlag.findUnique({ where: { key } })

  const data: Record<string, any> = {}
  if (minTier !== undefined) data.minTier = minTier
  if (enabled !== undefined) data.enabled = enabled

  const updated = await prisma.featureFlag.update({ where: { key }, data })

  await logAdminAction({
    adminId: admin.id, adminEmail: admin.email, action: 'feature_flag_change',
    targetType: 'featureFlag', targetId: key,
    before: before ? { minTier: before.minTier, enabled: before.enabled } : undefined,
    after: data, notes: `Feature "${updated.label}" updated`,
  })

  return Response.json({ success: true, flag: updated })
})