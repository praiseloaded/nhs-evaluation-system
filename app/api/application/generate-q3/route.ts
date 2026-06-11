// app/api/application/generate-q3/route.ts
//
// Generates Q3 — "Any other relevant information?"
// Scotland/unknown: target 100–200 words (no stated limit)
// England/Wales/NI: ~15% of total statement word limit
// Retry if too short. Trim if too long. Fallback if AI fails.

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

function hasAnyContent(ctx: Q3Context): boolean {
  return (
    ctx.hasCareerGap ||
    ctx.applyingUnderGIS ||
    ctx.preferPartTime ||
    ctx.isRelocating ||
    ctx.hasQualificationsPending ||
    ctx.hasLongNoticePeriod ||
    (ctx.additionalFreeText?.trim().length ?? 0) > 0
  )
}

function trimToWordLimit(text: string, limit: number): string {
  const words = text.trim().split(/\s+/)
  if (words.length <= limit) return text
  const trimmed = words.slice(0, limit).join(" ")
  const lastStop = Math.max(trimmed.lastIndexOf(". "), trimmed.lastIndexOf("! "), trimmed.lastIndexOf("? "))
  if (lastStop > trimmed.length * 0.7) return trimmed.slice(0, lastStop + 1).trim()
  return trimmed.trim()
}

function getQ3Limits(nation: string, totalLimit: number): { min: number; target: number; hard: number } {
  if (nation === "scotland" || nation === "unknown") return { min: 100, target: 150, hard: 200 }
  const hard = Math.round(totalLimit * 0.15)
  return { min: Math.round(hard * 0.6), target: Math.round(hard * 0.85), hard }
}

function buildContextLines(ctx: Q3Context, isScotland: boolean): string[] {
  const lines: string[] = []
  if (ctx.hasCareerGap && ctx.careerGapExplanation)
    lines.push(`CAREER GAP: ${ctx.careerGapExplanation}`)
  if (ctx.applyingUnderGIS)
    lines.push(`GUARANTEED INTERVIEW SCHEME: Applicant has a disability. Disability type: ${ctx.gisDisabilityType ?? "not specified"}. Use the exact phrase: "I am applying under the ${isScotland ? "NHS Scotland " : ""}Guaranteed Interview Scheme"`)
  if (ctx.preferPartTime && ctx.preferredHours)
    lines.push(`PART-TIME PREFERENCE: ${ctx.preferredHours}`)
  if (ctx.isRelocating && ctx.relocationDetails)
    lines.push(`RELOCATION: ${ctx.relocationDetails}`)
  if (ctx.hasQualificationsPending && ctx.qualificationsPendingDetails)
    lines.push(`QUALIFICATIONS PENDING: ${ctx.qualificationsPendingDetails}`)
  if (ctx.hasLongNoticePeriod && ctx.noticePeriodDetails)
    lines.push(`NOTICE PERIOD: ${ctx.noticePeriodDetails}`)
  if (ctx.additionalFreeText?.trim())
    lines.push(`ADDITIONAL INFO: ${ctx.additionalFreeText}`)
  return lines
}

function buildQ3Prompt(
  jobTitle: string,
  employer: string,
  nation: string,
  limits: { min: number; target: number; hard: number },
  ctx: Q3Context,
): string {
  const isScotland = nation === "scotland" || nation === "unknown"
  const lines = buildContextLines(ctx, isScotland)

  return `
You are an expert NHS recruitment writer. Write the "Any other relevant information?" section.

ROLE: ${jobTitle}
EMPLOYER: ${employer}

══════════════════════════════════════════════
WORD COUNT: MINIMUM ${limits.min} WORDS · TARGET ${limits.target} WORDS · MAXIMUM ${limits.hard} WORDS
Write between ${limits.min} and ${limits.hard} words. Aim for ${limits.target}.
Too short is as bad as too long.
══════════════════════════════════════════════

INFORMATION TO ADDRESS:
${lines.join("\n")}

RULES:
1. First person, professional but warm tone
2. Career gaps: frame positively — skills maintained, learning gained during the gap
3. GIS: use EXACT phrase "I am applying under the ${isScotland ? "NHS Scotland " : ""}Guaranteed Interview Scheme" — recruiters look for this exact wording
4. Part-time: state preferred WTE or hours clearly so there is no ambiguity at interview
5. Relocation: confirm the availability date and commitment to the area
6. Qualifications pending: name the qualification, awarding body and expected date
7. Long notice: state the period and whether negotiable
8. No bullet points — flowing prose, 1–3 short paragraphs
9. No padding or generic enthusiasm — factual and direct
10. STOP at ${limits.hard} words maximum

Respond ONLY with this JSON (no markdown, no backticks):
{"q3":"your text here","wordCount":0,"flagsAddressed":["career_gap"]}
`.trim()
}

function buildFallback(ctx: Q3Context): string {
  const parts: string[] = []
  if (ctx.hasCareerGap && ctx.careerGapExplanation)
    parts.push(`I have a career gap to declare: ${ctx.careerGapExplanation}.`)
  if (ctx.applyingUnderGIS)
    parts.push(`I am applying under the Guaranteed Interview Scheme.`)
  if (ctx.preferPartTime && ctx.preferredHours)
    parts.push(`I am seeking part-time hours: ${ctx.preferredHours}.`)
  if (ctx.isRelocating && ctx.relocationDetails)
    parts.push(`I am relocating: ${ctx.relocationDetails}.`)
  if (ctx.hasQualificationsPending && ctx.qualificationsPendingDetails)
    parts.push(`Qualification pending: ${ctx.qualificationsPendingDetails}.`)
  if (ctx.hasLongNoticePeriod && ctx.noticePeriodDetails)
    parts.push(`Notice period: ${ctx.noticePeriodDetails}.`)
  if (ctx.additionalFreeText?.trim())
    parts.push(ctx.additionalFreeText.trim())
  return parts.join(" ") || "None."
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const body = await req.json()
    const { applicationId, context, nation: bodyNation, wordLimit: bodyWordLimit } = body as {
      applicationId: string; context: Q3Context; nation?: string; wordLimit?: number
    }

    if (!applicationId) return Response.json({ error: "applicationId required" }, { status: 400 })
    if (!context)        return Response.json({ error: "context required" }, { status: 400 })

    const application = await prisma.application.findUnique({ where: { id: applicationId } })
    if (!application || application.userId !== session.user.id) {
      return Response.json({ error: "Not found" }, { status: 404 })
    }

    const parsed    = application.parsedSpec as any
    const nation    = bodyNation ?? parsed?.detectedNation ?? "unknown"
    const totalLimit = bodyWordLimit ?? parsed?.statementWordLimit ?? 1500
    const limits    = getQ3Limits(nation, totalLimit)

    // Nothing to declare — return "None." without calling AI
    if (!hasAnyContent(context)) {
      await prisma.application.update({
        where: { id: applicationId },
        data: {
          // @ts-expect-error
          statementQ3: "None.",
          wordCountQ3: 1,
          q3Context: context,
        },
      })
      return Response.json({ success: true, question: "q3", statement: "None.", wordCount: 1, isNone: true, flagsAddressed: [] })
    }

    const prompt = buildQ3Prompt(application.jobTitle, application.employer ?? "NHS", nation, limits, context)

    let q3Text = "None."
    let flagsAddressed: string[] = []

    try {
      const result = await callGeminiJSON(prompt, 1500)
      q3Text = result?.q3 ?? "None."
      flagsAddressed = result?.flagsAddressed ?? []

      const rawCount = q3Text.split(/\s+/).filter(Boolean).length

      // Too short — retry with expansion
      if (rawCount < limits.min && q3Text !== "None.") {
        console.log(`[Q3] Too short (${rawCount} words, min ${limits.min}) — retrying`)
        const expansionPrompt = `
The following NHS Q3 section is only ${rawCount} words — too short. It must be ${limits.min}–${limits.hard} words.

EXPAND to reach ${limits.target} words. Develop each point with more specific, factual detail.
Keep the same tone. STOP at ${limits.hard} words maximum.

CURRENT TEXT:
${q3Text}

Respond ONLY with JSON: {"q3":"expanded text","wordCount":0}
`.trim()
        const expanded = await callGeminiJSON(expansionPrompt, 1500)
        if (expanded?.q3 && expanded.q3.split(/\s+/).filter(Boolean).length > rawCount) {
          q3Text = expanded.q3
          console.log(`[Q3] Expanded to ${q3Text.split(/\s+/).filter(Boolean).length} words`)
        }
      }

      // Too long — trim at sentence boundary
      const afterRetry = q3Text.split(/\s+/).filter(Boolean).length
      if (afterRetry > limits.hard) {
        q3Text = trimToWordLimit(q3Text, limits.hard)
        console.log(`[Q3] Trimmed to ${q3Text.split(/\s+/).filter(Boolean).length} words`)
      }

    } catch (aiErr: any) {
      q3Text = buildFallback(context)
      console.warn("[Q3] AI failed — using fallback:", aiErr?.message)
    }

    const wordCount = q3Text.split(/\s+/).filter(Boolean).length

    await prisma.application.update({
      where: { id: applicationId },
      data: {
        // @ts-expect-error
        statementQ3: q3Text,
        wordCountQ3: wordCount,
        q3Context: context,
        status: (application as any).statementQ1 && (application as any).statementQ2 ? "complete" : "in_progress",
      },
    })

    return Response.json({
      success: true,
      question: "q3",
      statement: q3Text,
      wordCount,
      limits,
      isNone: false,
      flagsAddressed,
      gisNote: context.applyingUnderGIS ? "GIS declaration included using the exact phrase recruiters look for." : null,
    })
  } catch (error: any) {
    console.error("GENERATE_Q3_ERROR:", error)
    return Response.json({ error: error?.message ?? "Failed" }, { status: 500 })
  }
}