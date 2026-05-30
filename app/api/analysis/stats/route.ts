import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const analyses = await prisma.analysis.findMany({
      orderBy: { createdAt: "desc" },
    })

    const scores = analyses.map(
      a => a.result?.totalScore || 0
    )

    const avg =
      scores.length > 0
        ? scores.reduce((a, b) => a + b, 0) / scores.length
        : 0

    const strong = scores.filter(s => s >= 85).length
    const weak = scores.filter(s => s < 65).length

    const trend = analyses.slice(0, 10).map(a => ({
      date: a.createdAt,
      score: a.result?.totalScore || 0,
    }))

    return Response.json({
      success: true,
      stats: {
        total: analyses.length,
        average: Math.round(avg),
        strong,
        weak,
        trend,
      },
    })
  } catch (e: any) {
    return Response.json(
      { success: false, error: e.message },
      { status: 500 }
    )
  }
}