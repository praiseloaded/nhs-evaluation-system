// app/api/analysis/list/route.ts

import { getDb }               from '@/lib/db-router'
import { getEffectiveUserId }  from '@/lib/effective-user'
import { prisma }                from '@/lib/prisma'
import { auth }                  from '@/auth'
import { calculateNhsBandScore } from '@/lib/scoring/calculate-overall-score'
import { NextRequest }           from 'next/server'

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  // ── Auth guard ─────────────────────────────────────────────────────────────
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json(
      { success: false, error: 'Unauthorised', results: [] },
      { status: 401 },
    )
  }
  const userId = (await getEffectiveUserId()) ?? (session.user.id as string)
  const db     = await getDb(userId)

  // ── Pagination ─────────────────────────────────────────────────────────────
  const { searchParams } = req.nextUrl
  const page  = Math.max(1, parseInt(searchParams.get('page')  ?? '1',  10))
  const limit = Math.min(50, parseInt(searchParams.get('limit') ?? '20', 10))
  const skip  = (page - 1) * limit

  let analyses: { id: string; jobTitle: string; result: unknown; createdAt: Date; band?: string | null; location?: string | null }[]
  let total: number

  try {
    ;[analyses, total] = await db.$transaction([
      db.analysis.findMany({
        where:   { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id:        true,
          jobTitle:  true,
          result:    true,
          createdAt: true,
        
        },
      }),
      db.analysis.count({ where: { userId } }),
    ])
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Database error'
    console.error('[ANALYSES_GET] Database error:', message)
    return Response.json(
      { success: false, error: 'Failed to fetch analyses', results: [] },
      { status: 503 },
    )
  }

  // ── Format + recompute scores ──────────────────────────────────────────────
  const results = analyses.map(a => {
    const raw = (a.result && typeof a.result === 'object' ? a.result : {}) as Record<string, unknown>

    // Recompute scoredBreakdown if the stored result doesn't already have it.
    // This mirrors exactly what the [id] detail route does, so list and detail
    // always agree on scores.
    if (!raw.scoredBreakdown && raw.breakdown) {
      try {
        raw.scoredBreakdown = calculateNhsBandScore(raw as any)
      } catch (e) {
        console.warn(`[ANALYSES_GET] Failed to score analysis ${a.id}:`, e)
      }
    }

    // Derive the authoritative overall score
    const sb = raw.scoredBreakdown as Record<string, number> | undefined
    const overallScore =
      (typeof sb?.overallScore === 'number' ? sb.overallScore : 0) ||
      (typeof raw.overallScore === 'number' ? (raw.overallScore as number) : 0) ||
      (typeof raw.totalScore   === 'number' ? (raw.totalScore as number)   : 0) ||
      0

    return {
      id:                   a.id,
      jobTitle:             a.jobTitle,
      band:                 a.band     ?? (raw.band as string | undefined)     ?? null,
      location:             a.location ?? (raw.location as string | undefined) ?? null,
      overallScore,
      verdict:              (raw.verdict as string) ?? null,
      shortlistProbability: (raw.shortlistProbability as number) ?? 0,
      createdAt:            a.createdAt.toISOString(),
      result:               raw,  // full result so dashboard reads scoredBreakdown, nhsValues, etc.
    }
  })

  return Response.json({
    success: true,
    results,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasMore: skip + results.length < total,
    },
  })
}