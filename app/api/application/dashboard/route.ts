// app/api/application/dashboard/route.ts

import { prisma } from "@/lib/prisma"
import { getDb }  from "@/lib/db-router"
import { auth } from "@/auth"

export const runtime = 'nodejs'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const userId = session.user.id as string
    const db      = await getDb(userId)

    const applications = await db.application.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        jobTitle: true,
        band: true,
        employer: true,
        status: true,
        completeness: true,
        wordCount: true,
        liveScore: true,
        cvScore: true,
        notes: true,
        deadlineDate: true,
        interviewDate: true,
        submittedAt: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { criteria: true } },
      },
    })

    // Aggregate stats
    const statusCounts: Record<string, number> = {}
    let totalScore = 0
    let scoredCount = 0

    for (const app of applications) {
      const s = app.status ?? "draft"
      statusCounts[s] = (statusCounts[s] ?? 0) + 1

      const score = (app.liveScore as any)?.overall
      if (typeof score === "number" && score > 0) {
        totalScore += score
        scoredCount++
      }
    }

    const avgScore = scoredCount > 0 ? Math.round(totalScore / scoredCount) : 0

    // Upcoming deadlines (next 14 days)
    const now = new Date()
    const twoWeeks = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
    const upcoming = applications
      .filter(a => a.deadlineDate && new Date(a.deadlineDate) > now && new Date(a.deadlineDate) <= twoWeeks)
      .sort((a, b) => new Date(a.deadlineDate!).getTime() - new Date(b.deadlineDate!).getTime())

    return Response.json({
      success: true,
      applications,
      stats: {
        total: applications.length,
        statusCounts,
        avgScore,
        upcomingDeadlines: upcoming.length,
      },
    })
  } catch (error: any) {
    console.error("DASHBOARD_ERROR:", error)
    return Response.json({ error: error?.message ?? "Failed" }, { status: 500 })
  }
}