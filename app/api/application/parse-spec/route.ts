// app/api/application/parse-spec/route.ts

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { callGeminiJSON } from "@/lib/application/ai"
import { buildParserPrompt, postProcessParsedSpec } from "@/lib/application/parser"

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 })
    const userId = session.user.id as string

    const body = await req.json()
    const { jobTitle, jobDescription, personSpec, employer, band, sourceUrl, cvText } = body

    if (!jobTitle || !jobDescription) {
      return Response.json({ error: "jobTitle and jobDescription required" }, { status: 400 })
    }

    const combined = [jobDescription, personSpec].filter(Boolean).join('\n\n')
    const prompt = buildParserPrompt(jobTitle, combined)
    const raw = await callGeminiJSON(prompt, 6000)
    const parsed = postProcessParsedSpec(raw)

    // Create application with parsed criteria + CV
    const application = await prisma.application.create({
      data: {
        userId,
        jobTitle,
        band: band ?? null,
        employer: employer ?? null,
        sourceUrl: sourceUrl ?? null,
        jobDescription: combined,
        personSpec: personSpec ?? null,
        parsedSpec: parsed,
        cvText: cvText ?? null,
        status: "draft",
      },
    })

    // Create criterion records
    const allCriteria = [
      ...parsed.essentialCriteria.map((c: any, i: number) => ({ ...c, order: i })),
      ...parsed.desirableCriteria.map((c: any, i: number) => ({ ...c, order: i + 100 })),
    ]

    for (const c of allCriteria) {
      await prisma.applicationCriterion.create({
        data: {
          applicationId: application.id,
          criterionText: c.text,
          type: c.type,
          category: c.category,
          order: c.order,
        },
      })
    }

    return Response.json({
      success: true,
      applicationId: application.id,
      parsed,
      criteriaCount: allCriteria.length,
    })
  } catch (error: any) {
    console.error("PARSE_SPEC_ERROR:", error)
    return Response.json({ error: error?.message ?? "Parse failed" }, { status: 500 })
  }
}