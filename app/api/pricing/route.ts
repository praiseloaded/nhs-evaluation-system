// app/api/pricing/route.ts — public, no auth required
// Returns current tier prices from the TierLimit table
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

const DEFAULTS: Record<string, number> = {
  free: 0, pro: 9, elite: 29, premium: 49,
}

export async function GET() {
  try {
    const rows = await prisma.tierLimit.findMany({
      where: { key: 'monthlyPrice' },
      select: { tier: true, value: true },
    })

    const prices: Record<string, number> = { ...DEFAULTS }
    for (const r of rows) {
      // stored in pence (×100), convert to £
      prices[r.tier] = r.value > 100 ? r.value / 100 : r.value
    }

    return Response.json({ success: true, prices })
  } catch {
    return Response.json({ success: true, prices: DEFAULTS })
  }
}