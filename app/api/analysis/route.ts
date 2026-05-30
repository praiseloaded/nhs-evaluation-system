import { prisma } from "@/lib/prisma"
import { getValidatedAIResult } from "@/modules/ai/retry"
import { calculateScore } from "@/lib/scoring/scoring-engine"
import { calculateShortlistProbability } from "@/lib/scoring/probability"
import { getExplanation } from "@/modules/ai/run-explanation"

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

    // ─── 2. AI EXTRACTION (FACT LAYER ONLY) ───────────────────────────────────
    const aiResult = await getValidatedAIResult({
      jobTitle,
      jobSpec,
      cv,
      statement,
    })

    // ─── 3. BACKEND SCORING ENGINE (TRUTH LAYER) ─────────────────────────────
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

    // ─── 4. FINAL ANALYSIS OBJECT (SOURCE OF TRUTH) ──────────────────────────
    const analysis = {
      ...aiResult,
      totalScore,
      shortlistProbability,
      verdict,
    }

    // ─── 5. EXPLANATION ENGINE (SEPARATE LAYER) ──────────────────────────────
    const explanation = await getExplanation({
      jobTitle,
      jobSpec,
      cv,
      statement,
      analysis,
    })

    // ─── 6. DATABASE SAVE ─────────────────────────────────────────────────────
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

        // store ONLY factual analysis
        result: analysis,
      },
      select: {
        id: true,
      },
    })

    // ─── 7. RESPONSE (CLEAN SEPARATION) ───────────────────────────────────────
    return Response.json({
      success: true,
      id: saved.id,

      analysis,
      explanation,
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