// app/api/admin/overview/route.ts
// Single endpoint powering the admin dashboard home page.
// Aggregates: user/signup stats, tier breakdown, revenue estimate,
// usage volume (analyses, CVs, momentum, jobs searches), and AI/error health.

import { prisma } from "@/lib/prisma"
import { withAdminAuth } from "@/lib/admin-auth"

export const runtime = 'nodejs'

function daysAgo(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(0, 0, 0, 0)
  return d
}

const TIER_PRICE: Record<string, number> = { free: 0, pro: 19, elite: 79 }

export const GET = withAdminAuth(async () => {
  const now = new Date()
  const d7 = daysAgo(7)
  const d30 = daysAgo(30)
  const d90 = daysAgo(90)

  // ── Users & signups ──
  const [totalUsers, signups7d, signups30d, allUsersByTier, suspendedCount] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: d7 } } }),
    prisma.user.count({ where: { createdAt: { gte: d30 } } }),
    prisma.user.groupBy({ by: ['tier'], _count: { _all: true } }),
    prisma.user.count({ where: { suspended: true } }),
  ])

  const tierBreakdown: Record<string, number> = { free: 0, pro: 0, elite: 0 }
  for (const row of allUsersByTier) {
    tierBreakdown[row.tier ?? 'free'] = row._count._all
  }

  // Simple MRR estimate from tier counts — not a substitute for real Stripe data,
  // but useful for a quick at-a-glance figure until Stripe webhooks are wired in here.
  const estimatedMrr = Object.entries(tierBreakdown).reduce(
    (sum, [tier, count]) => sum + (TIER_PRICE[tier] ?? 0) * count,
    0
  )

  // Daily signups for the last 30 days, for a sparkline/bar chart
  const recentUsers = await prisma.user.findMany({
    where: { createdAt: { gte: d30 } },
    select: { createdAt: true },
  })
  const signupsByDay: Record<string, number> = {}
  for (let i = 0; i < 30; i++) {
    const d = daysAgo(29 - i)
    signupsByDay[d.toISOString().slice(0, 10)] = 0
  }
  for (const u of recentUsers) {
    const key = u.createdAt.toISOString().slice(0, 10)
    if (key in signupsByDay) signupsByDay[key]++
  }

  // ── Usage volume ──
  const [
    totalAnalyses, analyses7d, analyses30d,
    totalCvProfiles, totalApplications,
    totalCvProfilesRecent,
  ] = await Promise.all([
    prisma.analysis.count(),
    prisma.analysis.count({ where: { createdAt: { gte: d7 } } }),
    prisma.analysis.count({ where: { createdAt: { gte: d30 } } }),
    prisma.cvProfile.count().catch(() => 0),
    prisma.application.count().catch(() => 0),
    prisma.cvProfile.count({ where: { createdAt: { gte: d30 } } }).catch(() => 0),
  ])

  // ── AI / system health ──
  const [
    aiCalls24h, aiErrors24h, aiCalls7d, aiErrors7d,
    eventsByProvider, recentErrors,
  ] = await Promise.all([
    prisma.systemEvent.count({ where: { type: 'ai_call', createdAt: { gte: daysAgo(1) } } }).catch(() => 0),
    prisma.systemEvent.count({ where: { type: 'ai_error', createdAt: { gte: daysAgo(1) } } }).catch(() => 0),
    prisma.systemEvent.count({ where: { type: 'ai_call', createdAt: { gte: d7 } } }).catch(() => 0),
    prisma.systemEvent.count({ where: { type: 'ai_error', createdAt: { gte: d7 } } }).catch(() => 0),
    prisma.systemEvent.groupBy({
      by: ['provider'],
      where: { createdAt: { gte: d7 }, provider: { not: null } },
      _count: { _all: true },
    }).catch(() => [] as any[]),
    prisma.systemEvent.findMany({
      where: { type: { in: ['ai_error', 'api_error', 'scrape_failure'] }, createdAt: { gte: d7 } },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { id: true, type: true, provider: true, endpoint: true, errorMessage: true, createdAt: true, userId: true },
    }).catch(() => []),
  ])

  const errorRate24h = aiCalls24h > 0 ? Math.round((aiErrors24h / aiCalls24h) * 1000) / 10 : 0
  const errorRate7d = aiCalls7d > 0 ? Math.round((aiErrors7d / aiCalls7d) * 1000) / 10 : 0

  // ── Recent signups list (for quick glance / link to user detail) ──
  const recentSignups = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    take: 8,
    select: { id: true, name: true, email: true, tier: true, createdAt: true, image: true },
  })

  return Response.json({
    success: true,
    generatedAt: now.toISOString(),
    users: {
      total: totalUsers,
      signups7d,
      signups30d,
      suspended: suspendedCount,
      tierBreakdown,
      signupsByDay,
      recentSignups,
    },
    revenue: {
      estimatedMrr,
      tierPrices: TIER_PRICE,
    },
    usage: {
      totalAnalyses,
      analyses7d,
      analyses30d,
      totalCvProfiles,
      cvProfiles30d: totalCvProfilesRecent,
      totalApplications,
    },
    systemHealth: {
      aiCalls24h,
      aiErrors24h,
      errorRate24h,
      aiCalls7d,
      aiErrors7d,
      errorRate7d,
      byProvider: eventsByProvider.map((e: any) => ({ provider: e.provider, count: e._count._all })),
      recentErrors,
    },
  })
})