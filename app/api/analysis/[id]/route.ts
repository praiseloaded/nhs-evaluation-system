import { prisma } from "@/lib/prisma"
import { getValidatedAIResult } from "@/modules/ai/retry"

function normalize(value?: string) {
  return value?.trim() || ""
}

export async function POST(req: Request) {
  try {
    const body = await req.json()

    // 1. Normalize input (prevents undefined Prisma crashes)
    const jobTitle = normalize(body.jobTitle)
    const jobSpec = normalize(body.jobSpec)
    const cv = normalize(body.cv)
    const statement = normalize(body.statement)

    const personSpec = normalize(body.personSpec)
    const essentialCriteria = normalize(body.essentialCriteria)
    const desirableCriteria = normalize(body.desirableCriteria)
    const skills = normalize(body.skills)
    const values = normalize(body.values)
    const sourceUrl = normalize(body.sourceUrl)

    // 2. AI analysis (uses ONLY core inputs)
    const result = await getValidatedAIResult({
      jobTitle,
      jobSpec,
      cv,
      statement,
    })

    // 3. Save to DB (Prisma-safe)
    const saved = await prisma.analysis.create({
      data: {
        jobTitle,
        jobDescription: jobSpec,

        personSpec,
        essentialCriteria,
        desirableCriteria,
        skills,
        values,
        sourceUrl,

        cv,
        statement,

        result, // MUST be Json type in Prisma schema
      },
    })

    // 4. Response
    return Response.json({
      success: true,
      id: saved.id,
      result,
    })
  } catch (error: any) {
    console.error("ANALYSIS_ERROR:", error)

    return Response.json(
      {
        success: false,
        error: error?.message || "Analysis failed",
      },
      { status: 500 }
    )
  }
}