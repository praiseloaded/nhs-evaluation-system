// app/api/application/generate-q3/route.ts
//
// Generates Q3 — "Any other relevant information?"
// Works for all four UK nations.
// If nothing applies → returns "None." without calling AI.

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { callGeminiJSON } from "@/lib/application/ai"

interface Q3Context {
  hasCareerGap: boolean
  careerGapExplanation?: string
  applyingUnderGIS: boolean
  gisDisabilityType?: string
  preferPartTime: boolean
  preferredHours?: string
  isRelocating: boolean
  relocationDetails?: string
  hasQualificationsPending: boolean
  qualificationsPendingDetails?: string
  hasLongNoticePeriod: boolean
  noticePeriodDetails?: string
  additionalFreeText?: string
}

function hasAnyContent(context: Q3Context): boolean {
  return (
    context.hasCareerGap ||
    context.applyingUnderGIS ||
    context.preferPartTime ||
    context.isRelocating ||
    context.hasQualificationsPending ||
    context.hasLongNoticePeriod ||
    (context.additionalFreeText?.trim().length ?? 0) > 0
  )
}

function buildQ3Prompt(jobTitle: string, employer: string, nation: string, wordLimit: number, context: Q3Context): string {
  const isScotland = nation === "scotland"
  const target = isScotland ? "100–200 words" : `${Math.round(wordLimit * 0.15)} words`

  const lines: string[] = []
  if (context.hasCareerGap && context.careerGapExplanation)
    lines.push(`CAREER GAP: ${context.careerGapExplanation}`)
  if (context.applyingUnderGIS)
    lines.push(`GUARANTEED INTERVIEW SCHEME: Applicant has a disability and wishes to apply under the ${isScotland ? "NHS Scotland GIS" : "Guaranteed Interview Scheme"}. Disability type: ${context.gisDisabilityType ?? "not specified"}.`)
  if (context.preferPartTime && context.preferredHours)
    lines.push(`PART-TIME PREFERENCE: ${context.preferredHours}`)
  if (context.isRelocating && context.relocationDetails)
    lines.push(`RELOCATION: ${context.relocationDetails}`)
  if (context.hasQualificationsPending && context.qualificationsPendingDetails)
    lines.push(`QUALIFICATIONS PENDING: ${context.qualificationsPendingDetails}`)
  if (context.hasLongNoticePeriod && context.noticePeriodDetails)
    lines.push(`NOTICE PERIOD: ${context.noticePeriodDetails}`)
  if (context.additionalFreeText?.trim())
    lines.push(`ADDITIONAL INFO: ${context.additionalFreeText}`)

  return `
You are an expert NHS recruitment writer. Write the "Any other relevant information?" section of a supporting statement.

ROLE: ${jobTitle}
EMPLOYER: ${employer}
TARGET LENGTH: ${target}. Be concise — factual, not narrative.

INFORMATION TO ADDRESS:
${lines.join("\n")}

RULES:
- First person, professional but warm tone
- Career gaps: frame positively — skills maintained, learning gained
- GIS: use exact phrase "I am applying under the Guaranteed Interview Scheme" — recruiters look for this exact wording
- Part-time: state preferred WTE or hours clearly
- Relocation: confirm availability date and commitment
- Qualifications pending: name the qualification, awarding body, expected date
- Long notice: state period and whether negotiable
- No bullet points — flowing prose, 1–3 short paragraphs
- No padding or generic enthusiasm

Respond ONLY with this exact JSON (no markdown, no backticks):
{"q3":"your text here","wordCount":42,"flagsAddressed":["career_gap"]}
`.trim()
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const body = await req.json()
    const {
      applicationId,
      context,
      nation: bodyNation,
      wordLimit: bodyWordLimit,
    } = body as {
      applicationId: string
      context: Q3Context
      nation?: string
      wordLimit?: number
    }

    if (!applicationId) return Response.json({ error: "applicationId required" }, { status: 400 })
    if (!context)        return Response.json({ error: "context required" }, { status: 400 })

    const application = await prisma.application.findUnique({ where: { id: applicationId } })
    if (!application || application.userId !== session.user.id) {
      return Response.json({ error: "Not found" }, { status: 404 })
    }

    const parsed    = application.parsedSpec as any
    const nation    = bodyNation    ?? parsed?.detectedNation    ?? "unknown"
    const wordLimit = bodyWordLimit ?? parsed?.statementWordLimit ?? 1500

    // If nothing to declare — skip AI entirely
    if (!hasAnyContent(context)) {
      await prisma.application.update({
        where: { id: applicationId },
        data: {
          // @ts-expect-error — new schema fields
          statementQ3: "None.",
          wordCountQ3: 1,
          q3Context: context,
        },
      })
      return Response.json({
        success: true,
        question: "q3",
        statement: "None.",
        wordCount: 1,
        isNone: true,
        flagsAddressed: [],
      })
    }

    // Generate with AI
    const prompt = buildQ3Prompt(
      application.jobTitle,
      application.employer ?? "NHS",
      nation,
      wordLimit,
      context,
    )

    let q3Text = "None."
    let wordCount = 1
    let flagsAddressed: string[] = []

    try {
      const result = await callGeminiJSON(prompt, 1000)
      q3Text        = result?.q3        ?? "None."
      wordCount     = result?.wordCount ?? q3Text.split(/\s+/).filter(Boolean).length
      flagsAddressed = result?.flagsAddressed ?? []
    } catch (aiErr: any) {
      // AI failed — build a plain text fallback from the context flags
      const parts: string[] = []
      if (context.hasCareerGap && context.careerGapExplanation)
        parts.push(`I have a career gap: ${context.careerGapExplanation}.`)
      if (context.applyingUnderGIS)
        parts.push(`I am applying under the Guaranteed Interview Scheme.`)
      if (context.preferPartTime && context.preferredHours)
        parts.push(`I am seeking part-time hours: ${context.preferredHours}.`)
      if (context.isRelocating && context.relocationDetails)
        parts.push(`I am relocating: ${context.relocationDetails}.`)
      if (context.hasQualificationsPending && context.qualificationsPendingDetails)
        parts.push(`Qualification pending: ${context.qualificationsPendingDetails}.`)
      if (context.hasLongNoticePeriod && context.noticePeriodDetails)
        parts.push(`Notice period: ${context.noticePeriodDetails}.`)
      if (context.additionalFreeText?.trim())
        parts.push(context.additionalFreeText.trim())
      q3Text    = parts.join(" ") || "None."
      wordCount = q3Text.split(/\s+/).filter(Boolean).length
      console.warn("Q3 AI fallback used:", aiErr?.message)
    }

    await prisma.application.update({
      where: { id: applicationId },
      data: {
        // @ts-expect-error — new schema fields
        statementQ3: q3Text,
        wordCountQ3: wordCount,
        q3Context: context,
        status:
          (application as any).statementQ1 && (application as any).statementQ2
            ? "complete"
            : "in_progress",
      },
    })

    return Response.json({
      success: true,
      question: "q3",
      statement: q3Text,
      wordCount,
      isNone: false,
      flagsAddressed,
      gisNote: context.applyingUnderGIS
        ? "GIS declaration included using the exact phrase recruiters look for."
        : null,
    })
  } catch (error: any) {
    console.error("GENERATE_Q3_ERROR:", error)
    return Response.json({ error: error?.message ?? "Failed" }, { status: 500 })
  }
}