// app/api/admin/overview/route.ts

import { prisma }        from '@/lib/prisma'
import { prisma2 }       from '@/lib/db-router'
import { withAdminAuth } from '@/lib/admin-auth'

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
  const d7  = daysAgo(7)
  const d30 = daysAgo(30)

  // ── Users — query BOTH databases and sum ──────────────────────────────────
  const [
    [p_total, p_s7, p_s30, p_tiers, p_susp, p_recent],
    [s_total, s_s7, s_s30, s_tiers, s_susp, s_recent],
  ] = await Promise.all([
    Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: d7 } } }),
      prisma.user.count({ where: { createdAt: { gte: d30 } } }),
      prisma.user.groupBy({ by: ['tier'], _count: { _all: true } }),
      prisma.user.count({ where: { suspended: true } }),
      prisma.user.findMany({ orderBy: { createdAt: 'desc' }, take: 8, select: { id: true, name: true, email: true, tier: true, createdAt: true, image: true } }),
    ]).catch(() => [0, 0, 0, [], 0, []]),
    Promise.all([
      prisma2.user.count(),
      prisma2.user.count({ where: { createdAt: { gte: d7 } } }),
      prisma2.user.count({ where: { createdAt: { gte: d30 } } }),
      prisma2.user.groupBy({ by: ['tier'], _count: { _all: true } }),
      prisma2.user.count({ where: { suspended: true } }),
      prisma2.user.findMany({ orderBy: { createdAt: 'desc' }, take: 8, select: { id: true, name: true, email: true, tier: true, createdAt: true, image: true } }),
    ]).catch(() => [0, 0, 0, [], 0, []]),
  ])

  const totalUsers  = (p_total  as number) + (s_total  as number)
  const signups7d   = (p_s7     as number) + (s_s7     as number)
  const signups30d  = (p_s30    as number) + (s_s30    as number)
  const suspended   = (p_susp   as number) + (s_susp   as number)

  // Merge tier breakdown
  const tierBreakdown: Record<string, number> = { free: 0, pro: 0, elite: 0 }
  for (const row of [...(p_tiers as any[]), ...(s_tiers as any[])]) {
    const t = row.tier ?? 'free'
    tierBreakdown[t] = (tierBreakdown[t] ?? 0) + row._count._all
  }

  const estimatedMrr = Object.entries(tierBreakdown).reduce(
    (sum, [tier, count]) => sum + (TIER_PRICE[tier] ?? 0) * count, 0
  )

  // Merge recent signups from both DBs, sort, take top 8
  const allRecent = [...(p_recent as any[]), ...(s_recent as any[])]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8)

  // Signups by day (last 30) — merge both DBs
  const [p_recentUsers, s_recentUsers] = await Promise.all([
    prisma.user.findMany({ where: { createdAt: { gte: d30 } }, select: { createdAt: true } }).catch(() => []),
    prisma2.user.findMany({ where: { createdAt: { gte: d30 } }, select: { createdAt: true } }).catch(() => []),
  ])
  const signupsByDay: Record<string, number> = {}
  for (let i = 0; i < 30; i++) {
    const d = daysAgo(29 - i)
    signupsByDay[d.toISOString().slice(0, 10)] = 0
  }
  for (const u of [...p_recentUsers, ...s_recentUsers]) {
    const key = new Date(u.createdAt).toISOString().slice(0, 10)
    if (key in signupsByDay) signupsByDay[key]++
  }

  // ── Usage — query both databases ──────────────────────────────────────────
  const [
    [p_analyses, p_a7, p_a30, p_cvs, p_apps, p_cvs30],
    [s_analyses, s_a7, s_a30, s_cvs, s_apps, s_cvs30],
  ] = await Promise.all([
    Promise.all([
      prisma.analysis.count(),
      prisma.analysis.count({ where: { createdAt: { gte: d7 } } }),
      prisma.analysis.count({ where: { createdAt: { gte: d30 } } }),
      prisma.cvProfile.count().catch(() => 0),
      prisma.application.count().catch(() => 0),
      prisma.cvProfile.count({ where: { createdAt: { gte: d30 } } }).catch(() => 0),
    ]).catch(() => [0,0,0,0,0,0]),
    Promise.all([
      prisma2.analysis.count(),
      prisma2.analysis.count({ where: { createdAt: { gte: d7 } } }),
      prisma2.analysis.count({ where: { createdAt: { gte: d30 } } }),
      prisma2.cvProfile.count().catch(() => 0),
      prisma2.application.count().catch(() => 0),
      prisma2.cvProfile.count({ where: { createdAt: { gte: d30 } } }).catch(() => 0),
    ]).catch(() => [0,0,0,0,0,0]),
  ])

  // ── AI health — primary DB only (SystemEvent is not sharded) ─────────────
  const [aiCalls24h, aiErrors24h, aiCalls7d, aiErrors7d, eventsByProvider, recentErrors] =
    await Promise.all([
      prisma.systemEvent.count({ where: { type: 'ai_call',  createdAt: { gte: daysAgo(1) } } }).catch(() => 0),
      prisma.systemEvent.count({ where: { type: 'ai_error', createdAt: { gte: daysAgo(1) } } }).catch(() => 0),
      prisma.systemEvent.count({ where: { type: 'ai_call',  createdAt: { gte: d7 } } }).catch(() => 0),
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
  const errorRate7d  = aiCalls7d  > 0 ? Math.round((aiErrors7d  / aiCalls7d)  * 1000) / 10 : 0

  return Response.json({
    success:     true,
    generatedAt: now.toISOString(),
    users: {
      total:       totalUsers,
      signups7d,
      signups30d,
      suspended,
      tierBreakdown,
      signupsByDay,
      recentSignups: allRecent,
    },
    revenue: { estimatedMrr, tierPrices: TIER_PRICE },
    usage: {
      totalAnalyses:   (p_analyses as number) + (s_analyses as number),
      analyses7d:      (p_a7       as number) + (s_a7       as number),
      analyses30d:     (p_a30      as number) + (s_a30      as number),
      totalCvProfiles: (p_cvs      as number) + (s_cvs      as number),
      cvProfiles30d:   (p_cvs30    as number) + (s_cvs30    as number),
      totalApplications: (p_apps   as number) + (s_apps     as number),
    },
    systemHealth: {
      aiCalls24h, aiErrors24h, errorRate24h,
      aiCalls7d,  aiErrors7d,  errorRate7d,
      byProvider:   (eventsByProvider as any[]).map(e => ({ provider: e.provider, count: e._count._all })),
      recentErrors,
    },
  })
})