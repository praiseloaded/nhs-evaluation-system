



// app/api/feature-flags/route.ts
// Public endpoint — no auth required. Returns only key/minTier/enabled
// (no descriptions or internal fields) so the sidebar and
// FeatureAccessProvider can render lock icons and gate access.
//
// Also auto-seeds the FeatureFlag table from FEATURE_CATALOG on first
// visit so the gates work immediately without admin having to manually
// open /admin/settings first.

import { prisma } from "@/lib/prisma"
import { FEATURE_CATALOG } from "@/lib/feature-access"

export const runtime = 'nodejs'

export async function GET() {
  try {
    // Seed any missing flags from the catalog so the table is never empty.
    // Uses skipDuplicates so this is safe to call on every request —
    // Prisma only inserts rows that don't exist yet.
    const existing = await prisma.featureFlag.findMany({
      select: { key: true },
    })
    const existingKeys = new Set(existing.map(f => f.key))
    const missing = FEATURE_CATALOG.filter(f => !existingKeys.has(f.key))

    if (missing.length > 0) {
      await prisma.featureFlag.createMany({
        data: missing.map(f => ({
          key:         f.key,
          label:       f.label,
          description: f.description,
          minTier:     f.defaultMinTier,
          enabled:     true,
        })),
        skipDuplicates: true,
      })
    }

    // Return the minimum data the client needs
    const flags = await prisma.featureFlag.findMany({
      select: { key: true, minTier: true, enabled: true },
    })

    return Response.json({ flags })
  } catch {
    // Table may not exist yet (before first migration run) — return empty
    // so the provider fails open rather than crashing the page.
    return Response.json({ flags: [] })
  }
}