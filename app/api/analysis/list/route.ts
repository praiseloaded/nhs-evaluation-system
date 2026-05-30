import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AnalysisResult {
  totalScore?: number
  verdict?: 'strong' | 'competitive' | 'weak' | 'reject'
  shortlistProbability?: number
}

interface FormattedAnalysis {
  id: string
  jobTitle: string
  overallScore: number
  verdict: AnalysisResult['verdict'] | null
  shortlistProbability: number
  createdAt: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseResult(raw: unknown): AnalysisResult {
  if (!raw || typeof raw !== 'object') return {}
  return raw as AnalysisResult
}

function formatAnalysis(a: {
  id: string
  jobTitle: string
  result: unknown
  createdAt: Date
}): FormattedAnalysis {
  const result = parseResult(a.result)

  return {
    id:                  a.id,
    jobTitle:            a.jobTitle,
    overallScore:        result.totalScore         ?? 0,
    verdict:             result.verdict            ?? null,
    shortlistProbability: result.shortlistProbability ?? 0,
    createdAt:           a.createdAt.toISOString(),
  }
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  // ── Pagination params ──────────────────────────────────────────────────────
  const { searchParams } = req.nextUrl
  const page  = Math.max(1, parseInt(searchParams.get('page')  ?? '1',  10))
  const limit = Math.min(50, parseInt(searchParams.get('limit') ?? '20', 10))
  const skip  = (page - 1) * limit

  // ── Query ──────────────────────────────────────────────────────────────────
  let analyses: { id: string; jobTitle: string; result: unknown; createdAt: Date }[]
  let total: number

  try {
    ;[analyses, total] = await prisma.$transaction([
      prisma.analysis.findMany({
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
      prisma.analysis.count(),
    ])
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Database error'
    console.error('[ANALYSES_GET] Database error:', message)

    return Response.json(
      { success: false, error: 'Failed to fetch analyses', results: [] },
      { status: 503 }
    )
  }

  // ── Format & return ────────────────────────────────────────────────────────
  const results = analyses.map(formatAnalysis)

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