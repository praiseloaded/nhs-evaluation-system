import { prisma } from "@/lib/prisma"
import { getDb }  from "@/lib/db-router"
import { auth }   from "@/auth"

export const runtime = 'nodejs'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const db = await getDb(session.user.id)

    const analyses = await db.analysis.findMany({
      where:   { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    })

    const scores = analyses.map(a => (a.result as any)?.totalScore || 0)
    const avg    = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0
    const strong = scores.filter(s => s >= 85).length
    const weak   = scores.filter(s => s < 65).length
    const trend  = analyses.slice(0, 10).map(a => ({
      date:  a.createdAt,
      score: (a.result as any)?.totalScore || 0,
    }))

    return Response.json({
      success: true,
      stats: { total: analyses.length, average: Math.round(avg), strong, weak, trend },
    })
  } catch (e: any) {
    return Response.json({ success: false, error: e.message }, { status: 500 })
  }
}
