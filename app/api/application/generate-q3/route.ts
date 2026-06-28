// app/api/application/generate-q3/route.ts

import { getDb } from "@/lib/db-router"
import { auth }  from "@/auth"
import { callGeminiJSON } from "@/lib/application/ai"

export const runtime = 'nodejs'

interface Q3Context {
  hasCareerGap: boolean; careerGapExplanation?: string
  applyingUnderGIS: boolean; gisDisabilityType?: string
  preferPartTime: boolean; preferredHours?: string
  isRelocating: boolean; relocationDetails?: string
  hasQualificationsPending: boolean; qualificationsPendingDetails?: string
  hasLongNoticePeriod: boolean; noticePeriodDetails?: string
  additionalFreeText?: string
}

function hasAnyContent(ctx: Q3Context): boolean {
  return ctx.hasCareerGap || ctx.applyingUnderGIS || ctx.preferPartTime ||
    ctx.isRelocating || ctx.hasQualificationsPending || ctx.hasLongNoticePeriod ||
    (ctx.additionalFreeText?.trim().length ?? 0) > 0
}

function trimToWordLimit(text: string, limit: number): string {
  const words = text.trim().split(/\s+/)
  if (words.length <= limit) return text
  const trimmed = words.slice(0, limit).join(" ")
  const lastStop = Math.max(trimmed.lastIndexOf(". "), trimmed.lastIndexOf("! "), trimmed.lastIndexOf("? "))
  if (lastStop > trimmed.length * 0.7) return trimmed.slice(0, lastStop + 1).trim()
  return trimmed.trim()
}

function getQ3Limits(nation: string, totalLimit: number) {
  if (nation === "scotland" || nation === "unknown") return { min: 100, target: 150, hard: 200 }
  const hard = Math.round(totalLimit * 0.15)
  return { min: Math.round(hard * 0.6), target: Math.round(hard * 0.85), hard }
}

function buildContextLines(ctx: Q3Context, isScotland: boolean): string[] {
  const lines: string[] = []
  if (ctx.hasCareerGap && ctx.careerGapExplanation)           lines.push(`CAREER GAP: ${ctx.careerGapExplanation}`)
  if (ctx.applyingUnderGIS)                                    lines.push(`GUARANTEED INTERVIEW SCHEME: Applicant has a disability. Type: ${ctx.gisDisabilityType ?? "not specified"}. Use exact phrase: "I am applying under the ${isScotland ? "NHS Scotland " : ""}Guaranteed Interview Scheme"`)
  if (ctx.preferPartTime && ctx.preferredHours)                lines.push(`PART-TIME PREFERENCE: ${ctx.preferredHours}`)
  if (ctx.isRelocating && ctx.relocationDetails)               lines.push(`RELOCATION: ${ctx.relocationDetails}`)
  if (ctx.hasQualificationsPending && ctx.qualificationsPendingDetails) lines.push(`QUALIFICATIONS PENDING: ${ctx.qualificationsPendingDetails}`)
  if (ctx.hasLongNoticePeriod && ctx.noticePeriodDetails)      lines.push(`NOTICE PERIOD: ${ctx.noticePeriodDetails}`)
  if (ctx.additionalFreeText?.trim())                          lines.push(`ADDITIONAL INFO: ${ctx.additionalFreeText}`)
  return lines
}

function buildQ3Prompt(jobTitle: string, employer: string, nation: string, limits: { min: number; target: number; hard: number }, ctx: Q3Context): string {
  const isScotland = nation === "scotland" || nation === "unknown"
  const lines = buildContextLines(ctx, isScotland)
  return `You are an expert NHS recruitment writer. Write the "Any other relevant information?" section.
ROLE: ${jobTitle} | EMPLOYER: ${employer}
WORD COUNT: MINIMUM ${limits.min} · TARGET ${limits.target} · MAXIMUM ${limits.hard}
INFORMATION TO ADDRESS:\n${lines.join("\n")}
RULES: First person, professional tone. No bullet points. Flowing prose. STOP at ${limits.hard} words.
${isScotland ? "NHS Scotland Jobtrain format." : ""}
Respond ONLY with JSON: {"q3":"text","wordCount":0,"flagsAddressed":["career_gap"]}`.trim()
}

function buildFallback(ctx: Q3Context): string {
  const parts: string[] = []
  if (ctx.hasCareerGap && ctx.careerGapExplanation)      parts.push(`I have a career gap to declare: ${ctx.careerGapExplanation}.`)
  if (ctx.applyingUnderGIS)                               parts.push(`I am applying under the Guaranteed Interview Scheme.`)
  if (ctx.preferPartTime && ctx.preferredHours)           parts.push(`I am seeking part-time hours: ${ctx.preferredHours}.`)
  if (ctx.isRelocating && ctx.relocationDetails)          parts.push(`I am relocating: ${ctx.relocationDetails}.`)
  if (ctx.hasQualificationsPending && ctx.qualificationsPendingDetails) parts.push(`Qualification pending: ${ctx.qualificationsPendingDetails}.`)
  if (ctx.hasLongNoticePeriod && ctx.noticePeriodDetails) parts.push(`Notice period: ${ctx.noticePeriodDetails}.`)
  if (ctx.additionalFreeText?.trim())                     parts.push(ctx.additionalFreeText.trim())
  return parts.join(" ") || "None."
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 })
    const db = await getDb(session.user.id)

    const body = await req.json()
    const { applicationId, context, nation: bodyNation, wordLimit: bodyWordLimit } = body as {
      applicationId: string; context: Q3Context; nation?: string; wordLimit?: number
    }

    if (!applicationId) return Response.json({ error: "applicationId required" }, { status: 400 })
    if (!context)        return Response.json({ error: "context required" }, { status: 400 })

    const application = await db.application.findUnique({ where: { id: applicationId } })
    if (!application || application.userId !== session.user.id) {
      return Response.json({ error: "Not found" }, { status: 404 })
    }

    const parsed     = application.parsedSpec as any
    const nation     = bodyNation ?? parsed?.detectedNation ?? "unknown"
    const totalLimit = bodyWordLimit ?? parsed?.statementWordLimit ?? 1500
    const limits     = getQ3Limits(nation, totalLimit)

    if (!hasAnyContent(context)) {
      await db.application.update({
        where: { id: applicationId },
        data:  { statementQ3: "None.", wordCountQ3: 1, q3Context: context as any },
      })
      return Response.json({ success: true, question: "q3", statement: "None.", wordCount: 1, isNone: true, flagsAddressed: [] })
    }

    const prompt = buildQ3Prompt(application.jobTitle, application.employer ?? "NHS", nation, limits, context)
    let q3Text = "None.", flagsAddressed: string[] = []

    try {
      const result = await callGeminiJSON(prompt, 1500)
      q3Text = result?.q3 ?? "None."
      flagsAddressed = result?.flagsAddressed ?? []
      const rawCount = q3Text.split(/\s+/).filter(Boolean).length
      if (rawCount < limits.min && q3Text !== "None.") {
        const expanded = await callGeminiJSON(`Expand this to ${limits.target}–${limits.hard} words: ${q3Text}\nRespond ONLY with JSON: {"q3":"expanded","wordCount":0}`, 1500)
        if (expanded?.q3 && expanded.q3.split(/\s+/).filter(Boolean).length > rawCount) q3Text = expanded.q3
      }
      if (q3Text.split(/\s+/).filter(Boolean).length > limits.hard) q3Text = trimToWordLimit(q3Text, limits.hard)
    } catch (aiErr: any) {
      q3Text = buildFallback(context)
      console.warn("[Q3] AI failed — using fallback:", aiErr?.message)
    }

    const wordCount = q3Text.split(/\s+/).filter(Boolean).length
    await db.application.update({
      where: { id: applicationId },
      data: {
        statementQ3: q3Text, wordCountQ3: wordCount, q3Context: context as any,
        status: (application as any).statementQ1 && (application as any).statementQ2 ? "complete" : "in_progress",
      },
    })

    return Response.json({ success: true, question: "q3", statement: q3Text, wordCount, limits, isNone: false, flagsAddressed, gisNote: context.applyingUnderGIS ? "GIS declaration included." : null })
  } catch (error: any) {
    console.error("GENERATE_Q3_ERROR:", error)
    return Response.json({ error: error?.message ?? "Failed" }, { status: 500 })
  }
}