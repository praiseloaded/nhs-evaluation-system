import { prisma } from "@/lib/prisma"
import { getValidatedAIResult } from "@/modules/ai/retry"
import { calculateScore } from "@/lib/scoring/scoring-engine"
import { calculateShortlistProbability } from "@/lib/scoring/probability"

function normalize(value?: string) {
  return value?.trim() || ""
}

export async function POST(req: Request) {
  try {
    const body = await req.json()

    // ─── 1. INPUT NORMALIZATION ───────────────────────────────────────────────
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

    // ─── 2. AI EXTRACTION (NO SCORING) ────────────────────────────────────────
    const aiResult = await getValidatedAIResult({
      jobTitle,
      jobSpec,
      cv,
      statement,
    })

    // ─── 3. BACKEND SCORING ENGINE (V4 CORE) ─────────────────────────────────
    const totalScore = calculateScore(aiResult.breakdown)

    const shortlistProbability = calculateShortlistProbability(totalScore)

    const verdict =
      totalScore >= 85
        ? "strong"
        : totalScore >= 70
        ? "competitive"
        : totalScore >= 55
        ? "moderate"
        : "weak"

    // ─── 4. FINAL RESULT COMPOSITION ──────────────────────────────────────────
    const finalResult = {
      ...aiResult,
      totalScore,
      shortlistProbability,
      verdict,
    }

    // ─── 5. DATABASE SAVE ─────────────────────────────────────────────────────
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
        result: finalResult,
      },
      select: {
        id: true,
      },
    })

    // ─── 6. RESPONSE ──────────────────────────────────────────────────────────
    return Response.json({
      success: true,
      id: saved.id,
      result: finalResult,
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