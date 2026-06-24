// app/api/analysis/[id]/interview-probability/route.ts
// MOAT 9 — Interview Probability Engine™

import { prisma }         from "@/lib/prisma"
import { getDb }          from "@/lib/db-router"
import { auth }           from "@/auth"
import { callGeminiJSON } from "@/lib/application/ai"

export const runtime = 'nodejs'

interface FactorScore {
  factor: string
  score: number
  weight: number
  weightedScore: number
  explanation: string
}

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n))
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id }  = await params
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }
    const db = await getDb(session.user.id)

    const analysis = await db.analysis.findUnique({ where: { id } })
    if (!analysis || analysis.userId !== session.user.id) {
      return Response.json({ error: "Not found" }, { status: 404 })
    }

    const result = (analysis.result as any) ?? {}

    // ─── FACTOR 1: Essential Criteria Coverage ──────────────────────────────
    const criteriaAnalysis  = result.criteriaAnalysis ?? []
    const essential         = criteriaAnalysis.filter((c: any) => c.type === "essential")
    const essentialMet      = essential.filter((c: any) => c.status === "met").length
    const essentialPartial  = essential.filter((c: any) => c.status === "partially met").length
    const criteriaCoverageScore = essential.length > 0
      ? clamp(((essentialMet * 1 + essentialPartial * 0.5) / essential.length) * 100)
      : 50

    // ─── FACTOR 2: Evidence Strength ────────────────────────────────────────
    const evidenceEntries = await db.evidenceEntry.findMany({ where: { userId: session.user.id } })
    const competencies    = await db.competency.findMany({ where: { userId: session.user.id } })

    const competentCount      = competencies.filter(c => c.status === "competent").length
    const totalTrackedSkills  = competencies.length || 1
    const competencyRatio     = competentCount / totalTrackedSkills
    const substantialEvidence = evidenceEntries.filter(e =>
      e.situation.length > 50 && e.action.length > 50 && e.result.length > 30
    ).length

    let evidenceStrengthScore: number
    if (substantialEvidence === 0) {
      evidenceStrengthScore = clamp(competencyRatio * 25)
    } else {
      evidenceStrengthScore = clamp(
        (competencyRatio * 40) +
        (Math.min(substantialEvidence, 10) / 10 * 60)
      )
    }

    // ─── FACTOR 3: Band Level Fit ───────────────────────────────────────────
    const scored      = result.scoredBreakdown ?? {}
    const overallScore = result.overallScore ?? scored.overallScore ?? 60
    const bandFitScore = clamp(overallScore)

    // ─── FACTOR 4: Historical Shortlist Performance ─────────────────────────
    const pastApplications = await db.application.findMany({
      where:  { userId: session.user.id },
      select: { status: true, createdAt: true },
    })

    let historicalScore = 40
    let historicalNote  = "Not enough application history yet — scored conservatively."
    const total = pastApplications.length

    if (total >= 2) {
      const completed     = pastApplications.filter(a => a.status === "complete").length
      const completionRate = completed / total
      historicalScore     = clamp(40 + completionRate * 40)
      historicalNote      = `Based on ${total} application${total === 1 ? '' : 's'}, ${completed} completed.`
    } else if (total === 1) {
      historicalScore = 45
      historicalNote  = "Only one application on record — not enough history yet."
    }

    // ─── Weighted combination ────────────────────────────────────────────────
    const factors: FactorScore[] = [
      {
        factor:       "Essential Criteria Coverage",
        score:        Math.round(criteriaCoverageScore),
        weight:       0.35,
        weightedScore: Math.round(criteriaCoverageScore * 0.35),
        explanation:  `${essentialMet} of ${essential.length} essential criteria fully met${essentialPartial > 0 ? `, ${essentialPartial} partially met` : ''}.`,
      },
      {
        factor:       "Evidence Strength",
        score:        Math.round(evidenceStrengthScore),
        weight:       0.30,
        weightedScore: Math.round(evidenceStrengthScore * 0.30),
        explanation:  substantialEvidence === 0
          ? `${competentCount}/${totalTrackedSkills} skills marked competent but 0 STAR examples to support claims.`
          : `${competentCount}/${totalTrackedSkills} skills competent, ${substantialEvidence} STAR examples in EvidenceVault™.`,
      },
      {
        factor:       "Band Level Fit",
        score:        Math.round(bandFitScore),
        weight:       0.20,
        weightedScore: Math.round(bandFitScore * 0.20),
        explanation:  `Overall application score of ${Math.round(overallScore)}%.`,
      },
      {
        factor:       "Application Track Record",
        score:        Math.round(historicalScore),
        weight:       0.15,
        weightedScore: Math.round(historicalScore * 0.15),
        explanation:  historicalNote,
      },
    ]

    const interviewProbability = clamp(Math.round(factors.reduce((sum, f) => sum + f.weightedScore, 0)))

    const calculationLines = [
      ...factors.map(f => `${f.factor}: ${f.score} × ${Math.round(f.weight * 100)}% = ${f.weightedScore}`),
      `Total: ${factors.map(f => f.weightedScore).join(' + ')} = ${interviewProbability}`,
    ]

    // ─── AI interpretation ───────────────────────────────────────────────────
    const prompt = `
You are an NHS recruitment analyst. A candidate has an Interview Probability score of ${interviewProbability}%.

Factors:
${factors.map(f => `- ${f.factor}: ${f.score}/100 (weight ${Math.round(f.weight * 100)}%) — ${f.explanation}`).join("\n")}

Job: ${analysis.jobTitle}
Band: ${(analysis as any).band ?? "Not specified"}

Respond ONLY with JSON:
{
  "summary": "one sentence plain-English summary",
  "biggestBlocker": "the factor and why",
  "actions": [
    { "action": "specific action", "impact": "high|medium|low", "factor": "which factor this improves" }
  ]
}
`.trim()

    let interpretation: any = {}
    try {
      interpretation = await callGeminiJSON(prompt, 1000)
    } catch {
      interpretation = {
        summary:        `Interview probability of ${interviewProbability}% based on current evidence.`,
        biggestBlocker: factors.sort((a, b) => a.score - b.score)[0]?.factor ?? "Evidence Strength",
        actions:        [],
      }
    }

    const responseData = {
      success:             true,
      interviewProbability,
      band:                interviewProbability >= 70 ? "high" : interviewProbability >= 45 ? "moderate" : "low",
      factors,
      calculationLines,
      summary:             interpretation.summary        ?? "",
      biggestBlocker:      interpretation.biggestBlocker ?? "",
      actions:             interpretation.actions        ?? [],
      updatedAt:           new Date().toISOString(),
    }

    try {
      // @ts-expect-error — requires interviewProbability Json? on Analysis model
      await db.analysis.update({ where: { id }, data: { interviewProbability: responseData } })
    } catch (saveErr) {
      console.warn("[Interview Probability] Save skipped:", (saveErr as any)?.message)
    }

    return Response.json(responseData)
  } catch (error: any) {
    console.error("INTERVIEW_PROBABILITY_ERROR:", error)
    return Response.json({ error: error?.message ?? "Failed" }, { status: 500 })
  }
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id }  = await params
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }
    const db = await getDb(session.user.id)

    const analysis = await db.analysis.findUnique({ where: { id } })
    if (!analysis || analysis.userId !== session.user.id) {
      return Response.json({ error: "Not found" }, { status: 404 })
    }

    return Response.json({ success: true, data: (analysis as any).interviewProbability ?? null })
  } catch (error: any) {
    return Response.json({ error: error?.message ?? "Failed" }, { status: 500 })
  }
}