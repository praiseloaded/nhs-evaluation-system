// app/api/application/generate-q2/route.ts
//
// Generates Q2 — "Why do you want to work for this organisation?"
//
// Works identically for all four nations:
//   Scotland:         target 450 words (Q2 of 3 separate questions)
//   England/Wales/NI: proportional — ~35% of total statement word limit
//
// Priority order for values content:
//   1. Uploaded NHS values document (nhsValuesText on the application)
//   2. Employer registry (lib/nhs-nations.ts)
//   3. Nation-level core values fallback

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { callGeminiJSON } from "@/lib/application/ai"
import { resolveEmployer, NATION_CONFIGS } from "@/lib/nhs-nations"

function getQ2WordLimit(nation: string, totalLimit: number): { hard: number; target: number } {
  if (nation === "scotland") return { hard: 500, target: 450 }
  const hard   = Math.round(totalLimit * 0.35)
  const target = Math.round(hard * 0.96)
  return { hard, target }
}

function buildQ2Prompt(input: {
  jobTitle: string
  band: string | null
  employer: string
  nation: string
  nationLabel: string
  hardLimit: number
  targetLimit: number
  currentRole: string | null
  coreValues: string[]
  employerPriorities: string[]
  uploadedValuesDoc: string | null
  personalMotivation: string | null
  valuesExample: string | null
  careerGoals: string | null
}): string {
  const isScotland = input.nation === "scotland"

  // Build values block — uploaded doc takes priority
  const valuesBlock = input.uploadedValuesDoc
    ? `EMPLOYER VALUES DOCUMENT (uploaded by applicant — use these exact values and language):
${input.uploadedValuesDoc.slice(0, 2000)}`
    : input.employerPriorities.length > 0
      ? `${input.employer.toUpperCase()} STRATEGIC PRIORITIES (reference at least one by name):
${input.employerPriorities.map((p, i) => `${i + 1}. ${p}`).join("\n")}`
      : `${input.nationLabel.toUpperCase()} CORE VALUES (no employer-specific data available — use these):
${input.coreValues.join(", ")}`

  return `
You are an expert ${input.nationLabel} recruitment writer generating Q2 of a supporting statement.

QUESTION: "Why do you want to work for ${input.employer}?"
HARD WORD LIMIT: ${input.hardLimit} words. Do not exceed this.
TARGET: ${input.targetLimit} words.

ROLE DETAILS:
- Job Title: ${input.jobTitle}
- Band: ${input.band ?? "not specified"}
- Employer: ${input.employer}
- Nation / System: ${input.nationLabel}${isScotland ? " (Jobtrain — Q2 of 3 separate questions)" : " (supporting statement — Q2 section, combined with Q1 and Q3 into one final statement)"}
- Applicant's current role: ${input.currentRole ?? "not specified"}

${valuesBlock}

APPLICANT PERSONAL INPUTS:
- Personal values connection to patient care: ${input.personalMotivation ?? "not provided"}
- Example of values in action: ${input.valuesExample ?? "not provided"}
- Long-term career goals: ${input.careerGoals ?? "not provided"}

STRUCTURE (word targets):
1. Personal values hook (50–60 words): One real, specific experience. NOT "I have always wanted to help people." Make it concrete.
2. Values alignment (${Math.round(input.hardLimit * 0.44)}–${Math.round(input.hardLimit * 0.48)} words): Discuss 2–3 values with personal evidence. Reference the uploaded doc or employer priorities — NOT generic NHS Constitution text.
3. Employer-specific alignment (${Math.round(input.hardLimit * 0.20)}–${Math.round(input.hardLimit * 0.22)} words): Reference this specific employer by name. Mention at least one named priority, programme or strategic direction from the values block above.
4. Long-term commitment (${Math.round(input.hardLimit * 0.18)}–${Math.round(input.hardLimit * 0.20)} words): Career goals within this organisation. How does this role fit the next 3–5 years?
5. Closing (30–40 words): Confident, references the specific employer and role.

CRITICAL RULES:
- Total output must be ${input.hardLimit} words or fewer
- Must NOT copy NHS Constitution text verbatim or list values without evidence
- Must reference the employer explicitly by name at least once
- If a values document was uploaded, use that document's exact values language — not generic alternatives
- No bullet points or headers — flowing prose paragraphs only
- Do not repeat STAR evidence from Q1

Respond with JSON:
{
  "q2": "full Q2 text as flowing prose",
  "wordCount": <integer>,
  "employerReferenced": "<name explicitly mentioned>",
  "valuesAddressed": ["<value 1>", "<value 2>"],
  "usedUploadedDoc": <true|false>
}
`.trim()
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const body = await req.json()
    const { applicationId, personalMotivation, valuesExample, careerGoals, nation: bodyNation, wordLimit: bodyWordLimit } = body

    if (!applicationId) return Response.json({ error: "applicationId required" }, { status: 400 })

    const application = await prisma.application.findUnique({ where: { id: applicationId } })
    if (!application || application.userId !== session.user.id) {
      return Response.json({ error: "Not found" }, { status: 404 })
    }

    const parsed     = application.parsedSpec as any
    const nation     = bodyNation ?? parsed?.detectedNation ?? "unknown"
    const totalLimit = bodyWordLimit ?? parsed?.statementWordLimit ?? (nation === "scotland" ? 500 : 1500)
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
      currentRole: application.currentRole,
      coreValues: nationConfig.coreValues,
      employerPriorities: employerInfo?.priorities ?? [],
      uploadedValuesDoc,
      personalMotivation: personalMotivation ?? null,
      valuesExample: valuesExample ?? null,
      careerGoals: careerGoals ?? null,
    }), 3000)

    const q2Text   = result.q2 ?? ""
    const wordCount = result.wordCount ?? q2Text.split(/\s+/).filter(Boolean).length
    const overLimit = wordCount > hard

    await prisma.application.update({
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
      usedUploadedDoc: result.usedUploadedDoc ?? !!uploadedValuesDoc,
      warning: overLimit ? `Q2 is ${wordCount} words — ${wordCount - hard} over the ${hard}-word limit.` : null,
    })
  } catch (error: any) {
    console.error("GENERATE_Q2_ERROR:", error)
    return Response.json({ error: error?.message ?? "Failed" }, { status: 500 })
  }
}