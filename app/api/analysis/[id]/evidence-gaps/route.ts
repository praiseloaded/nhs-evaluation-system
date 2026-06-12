// app/api/analysis/[id]/evidence-gaps/route.ts
// MOAT 4 — Missing Evidence Detector™
// Analyses every essential and desirable criterion from the job spec,
// shows which have zero/weak evidence, severity, and exact action to fix.

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { callGeminiJSON } from "@/lib/application/ai"

function buildGapsPrompt(
  statement: string,
  cv: string,
  jobDescription: string,
  essentialCriteria: string,
  desirableCriteria: string,
): string {
  return `
You are an expert NHS shortlisting assessor. Your job is to identify evidence gaps in a candidate's application.

ESSENTIAL CRITERIA:
${essentialCriteria}

DESIRABLE CRITERIA:
${desirableCriteria}

JOB DESCRIPTION:
${jobDescription.slice(0, 1000)}

CANDIDATE'S SUPPORTING STATEMENT:
${statement.slice(0, 3000)}

CANDIDATE'S CV:
${cv.slice(0, 2000)}

For EVERY criterion listed above, assess:
1. evidence_status: "strong" | "moderate" | "weak" | "missing"
2. severity (for missing/weak): "critical" | "moderate" | "low"
3. what_was_found: brief description of evidence found (or "Nothing found")
4. gap_description: exactly what is missing
5. how_to_fix: specific, actionable instruction (1-2 sentences)
6. example_language: a short example sentence the candidate could add

SEVERITY GUIDE:
- critical: essential criterion with no evidence — will likely cause rejection
- moderate: essential criterion with weak evidence, or desirable with none
- low: desirable criterion partially addressed

IMPORTANT — output format:
- Respond ONLY with JSON, no markdown, no commentary.
- Keep every text field SHORT: criterion max 12 words, what_was_found max 15 words,
  gap_description max 15 words, how_to_fix max 20 words, example_language max 20 words.
- Be concise so the full response fits well within the token limit.

{
  "gaps": [
    {
      "criterion": "exact criterion text",
      "type": "essential" | "desirable",
      "evidenceStatus": "strong" | "moderate" | "weak" | "missing",
      "severity": "critical" | "moderate" | "low" | "none",
      "whatWasFound": "description or Nothing found",
      "gapDescription": "what is missing",
      "howToFix": "specific action",
      "exampleLanguage": "example sentence to add"
    }
  ],
  "overallGapScore": 72,
  "criticalGapCount": 3,
  "summary": "one sentence summary of the main gaps"
}
`.trim()
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const session = await auth()
    if (!session?.user?.id)
      return Response.json({ error: "Unauthorized" }, { status: 401 })

    const analysis = await prisma.analysis.findUnique({
      where: { id },
    })

    if (!analysis || analysis.userId !== session.user.id) {
      return Response.json({ error: "Not found" }, { status: 404 })
    }

    const result = await callGeminiJSON(
      buildGapsPrompt(
        analysis.statement ?? "",
        analysis.cv ?? "",
        analysis.jobDescription ?? "",
        analysis.essentialCriteria ?? "",
        analysis.desirableCriteria ?? ""
      ),
      8000
    )

    const gaps = Array.isArray(result?.gaps) ? result.gaps : []

    const responseData = {
      success: true,
      overallGapScore: result?.overallGapScore ?? 0,
      summary: result?.summary ?? "",
      gaps,
      updatedAt: new Date().toISOString(),
    }

    try {
      await prisma.analysis.update({
        where: { id },
        data: { evidenceGaps: responseData },
      })
    } catch (e) {
      console.warn("Save skipped:", (e as any)?.message)
    }

    return Response.json(responseData)
  } catch (error: any) {
    return Response.json(
      { error: error?.message ?? "Failed" },
      { status: 500 }
    )
  }
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const session = await auth()
    if (!session?.user?.id)
      return Response.json({ error: "Unauthorized" }, { status: 401 })

    const analysis = await prisma.analysis.findUnique({
      where: { id },
    })

    if (!analysis || analysis.userId !== session.user.id) {
      return Response.json({ error: "Not found" }, { status: 404 })
    }

    return Response.json({
      success: true,
      data: analysis.evidenceGaps ?? null,
    })
  } catch (error: any) {
    return Response.json(
      { error: error?.message ?? "Failed" },
      { status: 500 }
    )
  }
}