// app/api/interview/complete/route.ts

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id as string
    const body = await req.json()
    const { interviewId } = body

    if (!interviewId) {
      return Response.json({ success: false, error: "interviewId required" }, { status: 400 })
    }

    const interview = await prisma.interview.findUnique({
      where: { id: interviewId },
      include: { answers: true },
    })

    if (!interview || interview.userId !== userId) {
      return Response.json({ success: false, error: "Interview not found" }, { status: 404 })
    }

    // Compute total score from answers
    const scores = interview.answers
      .map(a => a.score ?? 0)
      .filter(s => s > 0)

    const totalScore = scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0

    // Build per-panellist summary
    const panellists = interview.panellists as any[]
    const panellistScores: Record<string, { scores: number[]; name: string; role: string }> = {}

    for (const p of panellists) {
      panellistScores[p.id] = { scores: [], name: p.name, role: p.role }
    }

    for (const answer of interview.answers) {
      if (answer.panellistId && panellistScores[answer.panellistId]) {
        panellistScores[answer.panellistId].scores.push(answer.score ?? 0)
      }
    }

    const panelSummary = Object.entries(panellistScores).map(([id, data]) => ({
      panellistId: id,
      name: data.name,
      role: data.role,
      averageScore: data.scores.length > 0
        ? Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length)
        : 0,
      questionsAnswered: data.scores.length,
    }))

    // Determine verdict
    let verdict = "not ready"
    if (totalScore >= 80) verdict = "appointable"
    else if (totalScore >= 65) verdict = "strong candidate"
    else if (totalScore >= 50) verdict = "developing"

    const feedback = {
      totalScore,
      verdict,
      panelSummary,
      answeredCount: interview.answers.length,
      totalQuestions: (interview.questions as any[]).length,
    }

    // Update interview
    await prisma.interview.update({
      where: { id: interviewId },
      data: {
        status: "completed",
        totalScore,
        feedback,
        completedAt: new Date(),
      },
    })

    return Response.json({ success: true, feedback })

  } catch (error: any) {
    console.error("INTERVIEW_COMPLETE_ERROR:", error)
    return Response.json(
      { success: false, error: error?.message ?? "Failed to complete interview" },
      { status: 500 },
    )
  }
}