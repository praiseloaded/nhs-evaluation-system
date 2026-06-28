// app/api/analysis/route.ts

import { getValidatedAIResult }  from "@/modules/ai/retry"
import { getUserTier }           from "@/lib/billing/tier"
import { sanitizeAnalysisForTier } from "@/lib/billing/sanitize-analysis"
import { auth }                  from "@/auth"
import { calculateNhsBandScore } from "@/lib/scoring/calculate-overall-score"
import { detectEvidenceVault } from "@/lib/billing/detect-evidence-vault"
import { getDb }                 from "@/lib/db-router"

function normalize(value?: string) {
  return value?.trim() || ""
}

function buildJobSpec(parts: {
  jobSpec: string
  personSpec: string
  essentialCriteria: string
  desirableCriteria: string
  skills: string
  values: string
}): string {
  const sections: string[] = []

  if (parts.jobSpec)            sections.push(parts.jobSpec)
  if (parts.personSpec)         sections.push(`PERSON SPECIFICATION:\n${parts.personSpec}`)
  if (parts.essentialCriteria)  sections.push(`ESSENTIAL CRITERIA:\n${parts.essentialCriteria}`)
  if (parts.desirableCriteria)  sections.push(`DESIRABLE CRITERIA:\n${parts.desirableCriteria}`)
  if (parts.skills)             sections.push(`SKILLS REQUIRED:\n${parts.skills}`)
  if (parts.values)             sections.push(`VALUES REQUIRED:\n${parts.values}`)

  return sections.join("\n\n")
}

export async function POST(req: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return Response.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      )
    }

    const userId = session.user.id as string
    const db     = await getDb(userId)
    const body   = await req.json()
    const userTier = await getUserTier(userId)

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const usageToday = await db.analysis.count({
      where: {
        userId,
        createdAt: { gte: today },
      },
    })

    if (userTier === "free" && usageToday >= 1) {
      return Response.json(
        {
          success: false,
          blocked: true,
          reason:  "limit_reached",
          message: "Free tier limit reached",
        },
        { status: 402 },
      )
    }
    const jobTitle  = normalize(body.jobTitle)
    const jobSpec   = normalize(body.jobSpec)
    const cv        = normalize(body.cv)
    const statement = normalize(body.statement)

    const combinedJobSpec = buildJobSpec({
      jobSpec,
      personSpec:        normalize(body.personSpec),
      essentialCriteria: normalize(body.essentialCriteria),
      desirableCriteria: normalize(body.desirableCriteria),
      skills:            normalize(body.skills),
      values:            normalize(body.values),
    })
    const tier: "free" | "paid" = userTier === 'free' ? 'free' : 'paid'
    const aiResult = await getValidatedAIResult({
      jobTitle,
      jobSpec: combinedJobSpec,
      cv,
      statement,
      tier,
    })


    const evidenceVault = await detectEvidenceVault({
  cv,
  statement,
  jobDescription:    combinedJobSpec,
  essentialCriteria: normalize(body.essentialCriteria),
  desirableCriteria: normalize(body.desirableCriteria),
  personSpec:        normalize(body.personSpec),
})
    const scoredBreakdown = calculateNhsBandScore(aiResult)

    const result = {
      ...aiResult,
      scoredBreakdown,
        evidenceVault, 
    }

    const saved = await db.analysis.create({
      data: {
        userId,
        jobTitle,
        jobDescription:    combinedJobSpec,
        personSpec:        normalize(body.personSpec),
        essentialCriteria: normalize(body.essentialCriteria),
        desirableCriteria: normalize(body.desirableCriteria),
        skills:            normalize(body.skills),
        values:            normalize(body.values),
        sourceUrl:         normalize(body.sourceUrl),
        cv,
        statement,
        result,
      },
    })
    const filtered = sanitizeAnalysisForTier(result, userTier)

    return Response.json({
      success: true,
      id:      saved.id,
      result:  filtered,
      tier:    userTier,
    })

  } catch (error: any) {
    console.error("ANALYSIS_ERROR:", error)

    return Response.json(
      { success: false, error: error?.message || "Analysis failed" },
      { status: 500 },
    )
  }
}