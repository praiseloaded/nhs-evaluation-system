// app/api/application/generate-statement/route.ts

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { callGeminiJSON } from "@/lib/application/ai"
import {
  buildIntroductionPrompt,
  buildClosingPrompt,
  assembleStatementLocally,
} from "@/lib/application/statement-generator"
import { scoreApplication } from "@/lib/application/scoring"

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const body = await req.json()
    const { applicationId } = body

    if (!applicationId) return Response.json({ error: "applicationId required" }, { status: 400 })

    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: { criteria: { orderBy: { order: "asc" } } },
    })

    if (!application || application.userId !== session.user.id) {
      return Response.json({ error: "Not found" }, { status: 404 })
    }

    const parsed = application.parsedSpec as any
    const criteriaWithParagraphs = application.criteria
      .filter(c => c.generatedParagraph)
      .map(c => ({
        criterionText: c.criterionText,
        type: c.type as "essential" | "desirable",
        paragraph: c.generatedParagraph!,
        order: c.order,
      }))

    if (criteriaWithParagraphs.length === 0) {
      return Response.json({ error: "No criteria paragraphs generated yet. Complete at least one criterion first." }, { status: 400 })
    }

    const input = {
      jobTitle: application.jobTitle,
      band: application.band,
      employer: application.employer,
      criterionParagraphs: criteriaWithParagraphs,
      currentRole: application.currentRole,
      yearsExperience: application.yearsExperience,
      nhsValues: parsed?.nhsValues ?? [],
    }

    // Generate introduction
    const introResult = await callGeminiJSON(buildIntroductionPrompt(input), 1500)
    const introduction = introResult.introduction ?? ''

    // Generate closing
    const closingResult = await callGeminiJSON(buildClosingPrompt(input), 1500)
    const closing = closingResult.closing ?? ''

    // Assemble full statement
    const fullStatement = assembleStatementLocally(introduction, criteriaWithParagraphs, closing)
    const wordCount = fullStatement.split(/\s+/).filter(Boolean).length

    // Score the application
    const criteriaInputs = application.criteria.map(c => ({
      type: c.type as "essential" | "desirable",
      situation: c.situation,
      task: c.task,
      action: c.action,
      result: c.result,
      metrics: c.metrics,
      reflection: c.reflection,
      generatedParagraph: c.generatedParagraph,
      keywords: (parsed?.essentialCriteria ?? []).concat(parsed?.desirableCriteria ?? [])
        .find((p: any) => p.text === c.criterionText)?.keywords ?? [],
      criterionText: c.criterionText,
    }))

    const liveScore = scoreApplication(criteriaInputs, introduction, closing, fullStatement, parsed?.nhsValues ?? [])

    // Save
    await prisma.application.update({
      where: { id: applicationId },
      data: {
        introduction,
        closing,
        fullStatement,
        wordCount,
        liveScore,
        status: "complete",
      },
    })

    // Save draft version
    await prisma.applicationDraft.create({
      data: {
        applicationId,
        content: fullStatement,
        wordCount,
        score: liveScore,
      },
    })

    return Response.json({
      success: true,
      statement: fullStatement,
      wordCount,
      score: liveScore,
    })
  } catch (error: any) {
    console.error("GENERATE_STATEMENT_ERROR:", error)
    return Response.json({ error: error?.message ?? "Failed" }, { status: 500 })
  }
}