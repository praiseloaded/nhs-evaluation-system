// app/api/application/generate-statement/route.ts
//
// Generates Q1 — "Why are you suitable for this role?"
// Works identically for all four UK nations.
//
// Scotland:         hard limit 480 words (Q1 of 3 separate questions)
// England/Wales/NI: proportional limit = ~50% of the total statement word limit
//                   (Q1 section of a combined statement, generated separately
//                    then merged on the frontend)
//
// The frontend always generates Q1, Q2, Q3 as separate calls regardless of nation.
// For Scotland: three separate copy buttons.
// For England/Wales/NI: three panels combine into one block for copying.

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { callGeminiJSON } from "@/lib/application/ai"
import { scoreApplication } from "@/lib/application/scoring"
import { resolveEmployer, NATION_CONFIGS } from "@/lib/nhs-nations"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getQ1WordLimit(nation: string, totalLimit: number): { hard: number; target: number } {
  if (nation === "scotland") return { hard: 500, target: 480 }
  // For single-statement nations Q1 gets ~50% of total allocation
  const hard   = Math.round(totalLimit * 0.50)
  const target = Math.round(hard * 0.96)
  return { hard, target }
}

function buildQ1Prompt(input: {
  jobTitle: string
  band: string | null
  employer: string | null
  nation: string
  hardLimit: number
  targetLimit: number
  currentRole: string | null
  yearsExperience: number | null
  criterionParagraphs: Array<{ criterionText: string; type: string; paragraph: string; order: number }>
  nhsValues: string[]
  qualifications: string | null
  systemsKnowledge: string | null
  careerMotivation: string | null
  nhsValuesText: string | null    // uploaded values doc
}): string {
  const essentialCriteria = input.criterionParagraphs
    .filter(c => c.type === "essential")
    .sort((a, b) => a.order - b.order)

  const criteriaBlock = essentialCriteria
    .map(c => `CRITERION: ${c.criterionText}\nEVIDENCE PARAGRAPH: ${c.paragraph}`)
    .join("\n\n")

  const nationLabel = NATION_CONFIGS[input.nation as keyof typeof NATION_CONFIGS]?.label ?? "NHS"
  const isScotland  = input.nation === "scotland"

  return `
You are an expert ${nationLabel} recruitment writer generating Q1 of a supporting statement.

QUESTION: "Why are you suitable for this role?"
HARD WORD LIMIT: ${input.hardLimit} words. Do not exceed this.
TARGET: ${input.targetLimit} words.

ROLE DETAILS:
- Job Title: ${input.jobTitle}
- Band: ${input.band ?? "not specified"}
- Employer: ${input.employer ?? nationLabel}
- Nation / System: ${nationLabel}${isScotland ? " (Jobtrain — Q1 of 3 separate questions)" : " (supporting statement — Q1 section, will be combined with Q2 and Q3 into one final statement)"}
- Applicant's current role: ${input.currentRole ?? "not specified"}
- Years of experience: ${input.yearsExperience ?? "not specified"}

ESSENTIAL CRITERIA EVIDENCE TO INCORPORATE:
${criteriaBlock || "No paragraphs provided — use the job title and role context to infer relevant competencies."}

ADDITIONAL CONTEXT:
- Qualifications / training: ${input.qualifications ?? "not specified"}
- Systems / clinical knowledge: ${input.systemsKnowledge ?? "not specified"}
- Career motivation for this role: ${input.careerMotivation ?? "not specified"}
- NHS values demonstrated: ${input.nhsValues.join(", ") || "not specified"}
${input.nhsValuesText ? `\nEMPLOYER VALUES DOCUMENT (use these exact values in the statement):\n${input.nhsValuesText.slice(0, 1500)}` : ""}

STRUCTURE (word targets):
1. Opening hook (30–40 words): One specific clinical or professional statement. Do NOT start with "I am applying for..." or "I am a motivated...". Open with the applicant's strongest relevant skill or experience directly.
2. Essential criteria evidence (${Math.round(input.hardLimit * 0.46)}–${Math.round(input.hardLimit * 0.50)} words): Weave the evidence paragraphs into concise STAR-format prose. Every essential criterion must be addressed. 50–70 words per criterion.
3. Knowledge match (${Math.round(input.hardLimit * 0.17)}–${Math.round(input.hardLimit * 0.20)} words): Specific qualifications, systems, clinical procedures, training.
4. Motivation / goals (${Math.round(input.hardLimit * 0.17)}–${Math.round(input.hardLimit * 0.20)} words): Why this specific role and band — not generic NHS passion.
5. Closing sentence (20–30 words): Forward-looking, confident, specific to this employer.

RULES:
- Total output must be ${input.hardLimit} words or fewer
- Do not invent experience not present in the evidence paragraphs
- Rewrite paragraphs into flowing prose — do not copy them verbatim
- ${isScotland ? "Do not mention NHS values motivation (goes in Q2) or career gaps (Q3)" : "This is the skills/suitability section — NHS values motivation goes in Q2, career gaps/other info in Q3"}
- Active voice throughout. No bullet points or headers — pure prose paragraphs.

Respond with JSON:
{
  "q1": "full Q1 text as flowing prose",
  "wordCount": <integer>,
  "sectionsWordCount": { "opening": <int>, "criteria": <int>, "knowledge": <int>, "motivation": <int>, "closing": <int> }
}
`.trim()
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const body = await req.json()
    const { applicationId, qualifications, systemsKnowledge, careerMotivation, nation: bodyNation, wordLimit: bodyWordLimit } = body

    if (!applicationId) return Response.json({ error: "applicationId required" }, { status: 400 })

    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: { criteria: { orderBy: { order: "asc" } } },
    })
    if (!application || application.userId !== session.user.id) {
      return Response.json({ error: "Not found" }, { status: 404 })
    }

    const parsed       = application.parsedSpec as any
    const nation       = bodyNation ?? parsed?.detectedNation ?? "unknown"
    const totalLimit   = bodyWordLimit ?? parsed?.statementWordLimit ?? (nation === "scotland" ? 500 : 1500)
    const { hard, target } = getQ1WordLimit(nation, totalLimit)

    const criterionParagraphs = application.criteria
      .filter(c => c.type === "essential" && c.generatedParagraph)
      .map(c => ({ criterionText: c.criterionText, type: c.type as string, paragraph: c.generatedParagraph!, order: c.order }))

    if (criterionParagraphs.length === 0) {
      return Response.json({ error: "No essential criteria paragraphs generated yet. Complete at least one essential criterion first." }, { status: 400 })
    }

    const result = await callGeminiJSON(buildQ1Prompt({
      jobTitle: application.jobTitle,
      band: application.band,
      employer: application.employer,
      nation,
      hardLimit: hard,
      targetLimit: target,
      currentRole: application.currentRole,
      yearsExperience: application.yearsExperience,
      criterionParagraphs,
      nhsValues: parsed?.nhsValues ?? [],
      qualifications: qualifications ?? null,
      systemsKnowledge: systemsKnowledge ?? null,
      careerMotivation: careerMotivation ?? null,
      nhsValuesText: (application as any).nhsValuesText ?? null,
    }), 3000)

    const q1Text   = result.q1 ?? ""
    const wordCount = result.wordCount ?? q1Text.split(/\s+/).filter(Boolean).length
    const overLimit = wordCount > hard

    const criteriaInputs = application.criteria.map(c => ({
      type: c.type as "essential" | "desirable",
      situation: c.situation, task: c.task, action: c.action, result: c.result,
      metrics: c.metrics, reflection: c.reflection, generatedParagraph: c.generatedParagraph,
      keywords: (parsed?.essentialCriteria ?? []).concat(parsed?.desirableCriteria ?? []).find((p: any) => p.text === c.criterionText)?.keywords ?? [],
      criterionText: c.criterionText,
    }))
    const liveScore = scoreApplication(criteriaInputs, q1Text, "", q1Text, parsed?.nhsValues ?? [])

    await prisma.application.update({
      where: { id: applicationId },
      data: {
        // @ts-expect-error — new fields
        statementQ1: q1Text,
        wordCountQ1: wordCount,
        fullStatement: q1Text,   // keep legacy field in sync
        wordCount,
        liveScore,
        status: "in_progress",
      },
    })

    await prisma.applicationDraft.create({
      data: { applicationId, content: q1Text, wordCount, score: liveScore },
    })

    return Response.json({
      success: true,
      question: "q1",
      statement: q1Text,
      wordCount,
      overLimit,
      hardLimit: hard,
      targetLimit: target,
      nation,
      score: liveScore,
      sectionsWordCount: result.sectionsWordCount ?? null,
      warning: overLimit ? `Q1 is ${wordCount} words — ${wordCount - hard} over the ${hard}-word limit. Review and trim.` : null,
    })
  } catch (error: any) {
    console.error("GENERATE_STATEMENT_Q1_ERROR:", error)
    return Response.json({ error: error?.message ?? "Failed" }, { status: 500 })
  }
}