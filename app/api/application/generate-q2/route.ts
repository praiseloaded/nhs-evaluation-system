// app/api/application/generate-q2/route.ts
//
// Generates Q2 — "Why do you want to work for this organisation?"
// Scotland/unknown: hard 500w, target 450w
// England/Wales/NI: ~35% of total statement word limit
// Server-side trim enforces the hard limit if AI overshoots.

import { prisma } from "@/lib/prisma"
import { getDb }  from "@/lib/db-router"
import { auth } from "@/auth"
import { callGeminiJSON } from "@/lib/application/ai"
import { resolveEmployer, NATION_CONFIGS } from "@/lib/nhs-nations"

export const runtime = 'nodejs'

function getQ2WordLimit(nation: string, totalLimit: number): { hard: number; target: number } {
  if (nation === "scotland" || nation === "unknown") return { hard: 500, target: 450 }
  const hard = Math.round(totalLimit * 0.35)
  return { hard, target: Math.round(hard * 0.96) }
}

function trimToWordLimit(text: string, limit: number): string {
  const words = text.trim().split(/\s+/)
  if (words.length <= limit) return text
  const trimmed = words.slice(0, limit).join(" ")
  const lastStop = Math.max(trimmed.lastIndexOf(". "), trimmed.lastIndexOf("! "), trimmed.lastIndexOf("? "))
  if (lastStop > trimmed.length * 0.7) return trimmed.slice(0, lastStop + 1).trim()
  return trimmed.trim()
}

function buildQ2Prompt(input: {
  jobTitle: string; band: string | null; employer: string
  nation: string; nationLabel: string; hardLimit: number; targetLimit: number
  coreValues: string[]; employerPriorities: string[]
  uploadedValuesDoc: string | null
  personalMotivation: string | null; valuesExample: string | null; careerGoals: string | null
}): string {
  const isScotland = input.nation === "scotland" || input.nation === "unknown"

  const valuesBlock = input.uploadedValuesDoc
    ? `EMPLOYER VALUES DOCUMENT (use these exact values and language):\n${input.uploadedValuesDoc.slice(0, 1200)}`
    : input.employerPriorities.length > 0
      ? `${input.employer.toUpperCase()} STRATEGIC PRIORITIES (reference at least one by name):\n${input.employerPriorities.map((p, i) => `${i + 1}. ${p}`).join("\n")}`
      : `${input.nationLabel.toUpperCase()} CORE VALUES:\n${input.coreValues.join(", ")}`

  return `
You are an expert ${input.nationLabel} recruitment writer generating Q2 of a supporting statement.

QUESTION: "Why do you want to work for ${input.employer}?"
JOB: ${input.jobTitle}${input.band ? `, ${input.band}` : ""}

══════════════════════════════════════════════
WORD COUNT: MINIMUM ${input.targetLimit - 30} WORDS · TARGET ${input.targetLimit} WORDS · MAXIMUM ${input.hardLimit} WORDS
Your output MUST be between ${input.targetLimit - 30} and ${input.hardLimit} words.
Too short is as bad as too long. Aim for ${input.targetLimit} words.
Count your words before responding. If under ${input.targetLimit - 30}, expand. If over ${input.hardLimit}, trim.
══════════════════════════════════════════════

SECTION BUDGETS (stay within these):
- Personal values hook: 50–60 words
- Values alignment (2–3 values with evidence): ${Math.round(input.targetLimit * 0.44)} words MAX
- Employer-specific (name the employer + one priority): ${Math.round(input.targetLimit * 0.20)} words MAX
- Career goals within this org: ${Math.round(input.targetLimit * 0.18)} words MAX
- Closing sentence: 30–40 words MAX
- TOTAL: ${input.targetLimit} words TARGET · ${input.hardLimit} words ABSOLUTE MAXIMUM

${valuesBlock}

APPLICANT INPUTS:
- Personal motivation: ${input.personalMotivation ?? "not provided — write from the values document context"}
- Values example: ${input.valuesExample ?? "not provided"}
- Career goals: ${input.careerGoals ?? "not provided"}

RULES:
1. Open with ONE concrete personal experience connected to patient care or values — not a generic statement
2. Reference ${input.employer} explicitly by name at least once
3. Use values language from the document/priorities provided — not generic NHS Constitution phrases
4. Be specific about the employer's priorities — not "the NHS" generically
5. NO bullet points or headers — pure flowing prose
6. Do NOT repeat STAR evidence from Q1
7. Write fully — aim for ${input.targetLimit} words. Every section must be properly developed, not truncated.
8. STOP at ${input.hardLimit} words maximum.

${isScotland ? "This is Q2 of 3 separate Jobtrain questions — values and motivation ONLY. STAR evidence belongs in Q1 not here." : "Values/motivation section of a single supporting statement."}

Respond ONLY with this JSON (no markdown, no backticks):
{"q2":"complete Q2 text","wordCount":0,"employerReferenced":"","valuesAddressed":[]}
`.trim()
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 })
    const db      = await getDb(session.user.id)

    const body = await req.json()
    const { applicationId, personalMotivation, valuesExample, careerGoals, nation: bodyNation, wordLimit: bodyWordLimit } = body

    if (!applicationId) return Response.json({ error: "applicationId required" }, { status: 400 })

    const application = await db.application.findUnique({ where: { id: applicationId } })
    if (!application || application.userId !== session.user.id) {
      return Response.json({ error: "Not found" }, { status: 404 })
    }

    const parsed     = application.parsedSpec as any
    const nation     = bodyNation ?? parsed?.detectedNation ?? "unknown"
    const totalLimit = bodyWordLimit ?? parsed?.statementWordLimit ?? (nation === "scotland" || nation === "unknown" ? 500 : 1500)
    const { hard, target } = getQ2WordLimit(nation, totalLimit)

    const employer         = application.employer ?? "NHS"
    const employerInfo     = resolveEmployer(employer)
    const nationConfig     = NATION_CONFIGS[nation as keyof typeof NATION_CONFIGS] ?? NATION_CONFIGS.unknown
    const uploadedValuesDoc = (application as any).nhsValuesText ?? null

    const result = await callGeminiJSON(buildQ2Prompt({
      jobTitle: application.jobTitle,
      band: application.band,
      employer,
      nation,
      nationLabel: nationConfig.label,
      hardLimit: hard,
      targetLimit: target,
      coreValues: nationConfig.coreValues,
      employerPriorities: employerInfo?.priorities ?? [],
      uploadedValuesDoc,
      personalMotivation: personalMotivation ?? null,
      valuesExample: valuesExample ?? null,
      careerGoals: careerGoals ?? null,
    }), 3000)

    let q2Text = result.q2 ?? ""

    // Retry if too short
    const rawCount = q2Text.split(/\s+/).filter(Boolean).length
    if (rawCount < target * 0.80) {
      console.log(`[Q2] Too short (${rawCount} words, target ${target}) — retrying with expansion`)
      const expansionPrompt = `
The following NHS supporting statement Q2 is only ${rawCount} words — too short.
It must be ${target}–${hard} words.

EXPAND to reach ${target} words by developing each section more fully.
Keep the same structure, voice and employer references.
STOP at ${hard} words maximum.

CURRENT TEXT:
${q2Text}

Respond ONLY with JSON: {"q2":"expanded text","wordCount":0}
`.trim()
      const expanded = await callGeminiJSON(expansionPrompt, 3000)
      if (expanded?.q2 && expanded.q2.split(/\s+/).filter(Boolean).length > rawCount) {
        q2Text = expanded.q2
      }
    }

    // Trim if over hard limit
    const afterRetry = q2Text.split(/\s+/).filter(Boolean).length
    if (afterRetry > hard) {
      q2Text = trimToWordLimit(q2Text, hard)
    }

    const wordCount = q2Text.split(/\s+/).filter(Boolean).length
    const overLimit = wordCount > hard

    await db.application.update({
      where: { id: applicationId },
      data: {
        // @ts-expect-error
        statementQ2: q2Text,
        wordCountQ2: wordCount,
      },
    })

    return Response.json({
      success: true,
      question: "q2",
      statement: q2Text,
      wordCount,
      overLimit,
      hardLimit: hard,
      targetLimit: target,
      nation,
      employerReferenced: result.employerReferenced ?? null,
      valuesAddressed: result.valuesAddressed ?? [],
      usedUploadedDoc: !!(uploadedValuesDoc),
      warning: overLimit ? `Q2 is ${wordCount} words — over the ${hard}-word limit.` : null,
    })
  } catch (error: any) {
    console.error("GENERATE_Q2_ERROR:", error)
    return Response.json({ error: error?.message ?? "Failed" }, { status: 500 })
  }
}