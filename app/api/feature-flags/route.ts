// app/api/feature-flags/route.ts
// PUBLIC endpoint — returns only the minimum data the sidebar needs to
// render lock icons. No auth required since this is not sensitive data
// (it's just which features require which tier, same info on the pricing page).

import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const flags = await prisma.featureFlag.findMany({
      select: { key: true, minTier: true, enabled: true },
    })
    return Response.json({ flags })
  } catch {
    // Table may not exist yet if migration hasn't run — return empty
    return Response.json({ flags: [] })
  }
}