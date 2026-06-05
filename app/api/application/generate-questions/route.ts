// app/api/application/generate-questions/route.ts

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { callGeminiJSON } from "@/lib/application/ai"
import { buildQuestionPrompt } from "@/lib/application/star-engine"

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const body = await req.json()
    const { criterionId } = body

    if (!criterionId) return Response.json({ error: "criterionId required" }, { status: 400 })

    const criterion = await prisma.applicationCriterion.findUnique({
      where: { id: criterionId },
      include: { application: true },
    })

    if (!criterion || criterion.application.userId !== session.user.id) {
      return Response.json({ error: "Not found" }, { status: 404 })
    }

    const parsed = criterion.application.parsedSpec as any
    const bandLevel = parsed?.bandLevel ?? criterion.application.currentBand ?? null

    const prompt = buildQuestionPrompt(criterion.criterionText, criterion.category ?? "other", bandLevel)
    const questions = await callGeminiJSON(prompt, 2000)

    return Response.json({ success: true, questions, criterionId })
  } catch (error: any) {
    console.error("GENERATE_QUESTIONS_ERROR:", error)
    return Response.json({ error: error?.message ?? "Failed" }, { status: 500 })
  }
}