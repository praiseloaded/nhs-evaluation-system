// app/api/application/submit-star/route.ts

import { prisma } from "@/lib/prisma"
import { getDb }  from "@/lib/db-router"
import { auth } from "@/auth"
import { callGeminiJSON } from "@/lib/application/ai"
import { buildStarPrompt } from "@/lib/application/star-engine"

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 })
    const db      = await getDb(session.user.id)

    const body = await req.json()
    const { criterionId, situation, task, action, result, metrics, mdtContext, reflection, nhsValues } = body

    if (!criterionId) return Response.json({ error: "criterionId required" }, { status: 400 })

    const criterion = await db.applicationCriterion.findUnique({
      where: { id: criterionId },
      include: { application: true },
    })

    if (!criterion || criterion.application.userId !== session.user.id) {
      return Response.json({ error: "Not found" }, { status: 404 })
    }

    // Save STAR evidence
    await db.applicationCriterion.update({
      where: { id: criterionId },
      data: { situation, task, action, result, metrics, mdtContext, reflection, nhsValues, status: "drafted" },
    })

    // Generate NHS paragraph if enough evidence provided
    let generated = null
    if (situation && task && action && result) {
      const parsed = criterion.application.parsedSpec as any
      const keywords = parsed?.essentialCriteria?.find((c: any) => c.text === criterion.criterionText)?.keywords
        ?? parsed?.desirableCriteria?.find((c: any) => c.text === criterion.criterionText)?.keywords
        ?? []

      const prompt = buildStarPrompt({
        criterionText: criterion.criterionText,
        criterionType: criterion.type as "essential" | "desirable",
        category: criterion.category ?? "other",
        situation, task, action, result,
        metrics, mdtContext, reflection, nhsValues,
        keywords,
        bandLevel: parsed?.bandLevel ?? undefined,
        roleType: parsed?.roleType ?? undefined,
      })

      generated = await callGeminiJSON(prompt, 3000)

      // Save generated paragraph
      await db.applicationCriterion.update({
        where: { id: criterionId },
        data: {
          generatedParagraph: generated.paragraph,
          paragraphScore: generated.starElements
            ? Math.round(
                (Number(generated.starElements.situationClear) +
                 Number(generated.starElements.taskSpecific) +
                 Number(generated.starElements.actionPersonal) +
                 Number(generated.starElements.resultMeasurable)) / 4 * 100
              )
            : null,
        },
      })
    }

    // Update application completeness
    const allCriteria = await db.applicationCriterion.findMany({
      where: { applicationId: criterion.applicationId },
    })
    const total = allCriteria.length
    const done = allCriteria.filter(c => c.situation && c.task && c.action && c.result).length
    const completeness = total > 0 ? Math.round((done / total) * 100) : 0

    await db.application.update({
      where: { id: criterion.applicationId },
      data: { completeness, status: completeness > 0 ? "in_progress" : "draft" },
    })

    return Response.json({
      success: true,
      generated,
      completeness,
      criteriaCompleted: done,
      criteriaTotal: total,
    })
  } catch (error: any) {
    console.error("SUBMIT_STAR_ERROR:", error)
    return Response.json({ error: error?.message ?? "Failed" }, { status: 500 })
  }
}