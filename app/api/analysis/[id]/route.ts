// app/api/analysis/[id]/route.ts

import { prisma }                  from '@/lib/prisma'
import { auth }                    from '@/auth'
import { getUserTier }             from '@/lib/billing/tier'
import { sanitizeAnalysisForTier } from '@/lib/billing/sanitize-analysis'
import { calculateNhsBandScore }   from '@/lib/scoring/calculate-overall-score'
import { NextRequest }             from 'next/server'
import { getDb }  from '@/lib/db-router'

export const runtime = 'nodejs'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params

    // ── Auth ─────────────────────────────────────────────────────────────────
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id as string
    const db      = await getDb(userId)

    // ── Fetch ─────────────────────────────────────────────────────────────────
    const record = await db.analysis.findUnique({ where: { id } })

    if (!record) {
      return Response.json({ success: false, error: 'Not found' }, { status: 404 })
    }

    if (record.userId !== userId) {
      return Response.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    // ── Recompute scoredBreakdown if missing ──────────────────────────────────
    const raw = (record.result as any) ?? {}

    if (!raw.scoredBreakdown && raw.breakdown) {
      try {
        raw.scoredBreakdown = calculateNhsBandScore(raw)
      } catch (e) {
        console.warn(`[GET_ANALYSIS] Failed to score analysis ${id}:`, e)
      }
    }

    // ── Sanitize for tier ─────────────────────────────────────────────────────
    const userTier       = await getUserTier(userId)
    const filteredResult = sanitizeAnalysisForTier(raw, userTier)

    // ── Return clean shape ────────────────────────────────────────────────────
    const analysis = {
      id:                 record.id,
      jobTitle:           record.jobTitle        ?? '',
      jobDescription:     record.jobDescription  ?? '',
      personSpec:         record.personSpec       ?? '',
      essentialCriteria:  record.essentialCriteria ?? '',
      desirableCriteria:  record.desirableCriteria ?? '',
      skills:             record.skills            ?? '',
      values:             record.values            ?? '',
      sourceUrl:          record.sourceUrl         ?? '',
      band:               (record as any).band     ?? null,
      location:           (record as any).location ?? null,
      createdAt:          record.createdAt,
      result:             filteredResult,
    }

    return Response.json({ success: true, analysis })

  } catch (error: any) {
    console.error('[GET_ANALYSIS_ERROR]', error)
    return Response.json(
      { success: false, error: error?.message ?? 'Failed to fetch analysis' },
      { status: 500 },
    )
  }
}