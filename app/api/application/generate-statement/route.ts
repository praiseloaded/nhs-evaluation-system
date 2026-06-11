// app/api/application/generate-statement/route.ts
//
// Generates Q1 — "Why are you suitable for this role?"
//
// Scotland / unknown: hard 500w, target 480w
// England/Wales/NI:   proportional (~50% of total limit)
//
// KEY FIX: When there are many criteria (>6), we select the most important ones
// to fit within the word limit. Each criterion gets ~50-60 words. 
// Server-side trim enforces the hard limit if AI overshoots.

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { callGeminiJSON } from "@/lib/application/ai"
import { scoreApplication } from "@/lib/application/scoring"
import { NATION_CONFIGS } from "@/lib/nhs-nations"

// ─── Word limit helpers ────────────────────────────────────────────────────────

function getQ1WordLimit(nation: string, totalLimit: number): { hard: number; target: number } {
  if (nation === "scotland" || nation === "unknown") return { hard: 500, target: 480 }
  const hard = Math.round(totalLimit * 0.50)
  return { hard, target: Math.round(hard * 0.96) }
}

// ─── Trim to word limit at sentence boundary ──────────────────────────────────

function trimToWordLimit(text: string, limit: number): string {
  const words = text.trim().split(/\s+/)
  if (words.length <= limit) return text

  // Trim to limit then find the last sentence boundary
  const trimmed = words.slice(0, limit).join(" ")
  // Find last sentence-ending punctuation
  const lastStop = Math.max(
    trimmed.lastIndexOf(". "),
    trimmed.lastIndexOf("! "),
    trimmed.lastIndexOf("? "),
  )
  if (lastStop > trimmed.length * 0.7) {
    return trimmed.slice(0, lastStop + 1).trim()
  }
  // No clean sentence boundary found — trim at word boundary
  return trimmed.trim()
}

// ─── Select criteria to include ────────────────────────────────────────────────
// With 11 criteria × ~75 words each = 825 words — way over 480.
// We select the most important criteria that fit the word budget.
// Priority: clinical skills > communication > teamwork > other

const PRIORITY_CATEGORIES = ["clinical", "communication", "teamwork", "technical", "knowledge", "other"]

function selectCriteria(
  criteria: Array<{ criterionText: string; type: string; paragraph: string; order: number; category?: string }>,
  wordsAvailable: number,
  wordsPerCriterion: number,
): typeof criteria {
  const maxCriteria = Math.floor(wordsAvailable / wordsPerCriterion)

  if (criteria.length <= maxCriteria) return criteria

  // Sort by priority category then order
  const sorted = [...criteria].sort((a, b) => {
    const aPriority = PRIORITY_CATEGORIES.indexOf(a.category ?? "other")
    const bPriority = PRIORITY_CATEGORIES.indexOf(b.category ?? "other")
    if (aPriority !== bPriority) return aPriority - bPriority
    return a.order - b.order
  })

  return sorted.slice(0, maxCriteria)
}

// ─── Prompt builder ────────────────────────────────────────────────────────────

function buildQ1Prompt(input: {
  jobTitle: string
  band: string | null
  employer: string | null
  nation: string
  hardLimit: number
  targetLimit: number
  currentRole: string | null
  yearsExperience: number | null
  criterionParagraphs: Array<{ criterionText: string; paragraph: string }>
  qualifications: string | null
  systemsKnowledge: string | null
  careerMotivation: string | null
  nhsValuesText: string | null
  omittedCount: number
}): string {
  const nationLabel = NATION_CONFIGS[input.nation as keyof typeof NATION_CONFIGS]?.label ?? "NHS Scotland"
  const isScotland  = input.nation === "scotland" || input.nation === "unknown"
  const criteriaCount = input.criterionParagraphs.length

  // Calculate exact word budget per section
  const openingBudget    = 40
  const closingBudget    = 30
  const knowledgeBudget  = Math.round(input.targetLimit * 0.17)
  const motivationBudget = Math.round(input.targetLimit * 0.17)
  const criteriaBudget   = input.targetLimit - openingBudget - closingBudget - knowledgeBudget - motivationBudget
  const wordsPerCriterion = Math.floor(criteriaBudget / criteriaCount)

  const criteriaBlock = input.criterionParagraphs
    .map((c, i) => `[Criterion ${i + 1}] ${c.criterionText}\nEvidence: ${c.paragraph}`)
    .join("\n\n")

  return `
You are an expert ${nationLabel} recruitment writer generating Q1 of a supporting statement.

QUESTION: "Why are you suitable for this role?"
JOB: ${input.jobTitle}${input.band ? `, ${input.band}` : ""}
EMPLOYER: ${input.employer ?? nationLabel}
APPLICANT CURRENT ROLE: ${input.currentRole ?? "not specified"}

══════════════════════════════════════════════
WORD COUNT: MINIMUM ${input.targetLimit - 30} WORDS · TARGET ${input.targetLimit} WORDS · MAXIMUM ${input.hardLimit} WORDS
Your output MUST be between ${input.targetLimit - 30} and ${input.hardLimit} words.
Too short is as bad as too long. Aim for ${input.targetLimit} words.
Count your words before responding. If under ${input.targetLimit - 30}, expand. If over ${input.hardLimit}, trim.
══════════════════════════════════════════════

SECTION BUDGETS (must stay within these):
- Opening hook: ${openingBudget} words MAX
- Criteria evidence (${criteriaCount} criteria × ~${wordsPerCriterion} words each): ${criteriaBudget} words MAX
- Knowledge/qualifications: ${knowledgeBudget} words MAX  
- Motivation/career goals: ${motivationBudget} words MAX
- Closing sentence: ${closingBudget} words MAX
- TOTAL: ${input.targetLimit} words TARGET, ${input.hardLimit} words ABSOLUTE MAX

EVIDENCE TO WEAVE IN (${criteriaCount} criteria):
${criteriaBlock}
${input.omittedCount > 0 ? `\nNOTE: ${input.omittedCount} lower-priority criteria were omitted to stay within the word limit.` : ""}

ADDITIONAL CONTEXT:
- Qualifications: ${input.qualifications ?? "not specified"}
- Systems/clinical skills: ${input.systemsKnowledge ?? "not specified"}
- Why this role: ${input.careerMotivation ?? "not specified"}
${input.nhsValuesText ? `\nVALUES DOC CONTEXT (do NOT reproduce — use for tone only):\n${input.nhsValuesText.slice(0, 500)}` : ""}

WRITING RULES:
1. Opening: Start with the applicant's strongest clinical or professional skill directly. NOT "I am applying for..." or "I am a motivated..."
2. Evidence: Each criterion gets ~${wordsPerCriterion} words. Be concise. One STAR sentence per criterion, not a full paragraph.
3. Do NOT copy the evidence paragraphs verbatim — compress them into tight, flowing prose
4. Knowledge: 1–2 sentences only on qualifications/systems
5. Motivation: 1–2 sentences on why this specific role/band
6. Closing: One forward-looking sentence
7. NHS values motivation belongs in Q2, NOT here
8. NO bullet points, NO headers — pure prose
9. Active voice throughout
10. Write fully — aim for ${input.targetLimit} words. Every section must be properly developed, not truncated.
11. STOP at ${input.hardLimit} words maximum.

${isScotland ? "This is a Jobtrain NHS Scotland application — Q1 of 3 separate questions. Do not address NHS values (Q2) or personal circumstances (Q3) here." : "This is the suitability section — NHS values motivation goes in Q2, other info in Q3."}

Respond ONLY with this JSON (no markdown):
{
  "q1": "complete Q1 text",
  "wordCount": <integer — count carefully>
}
`.trim()
}

// ─── Route handler ─────────────────────────────────────────────────────────────

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
    const totalLimit   = bodyWordLimit ?? parsed?.statementWordLimit ?? (nation === "scotland" || nation === "unknown" ? 500 : 1500)
    const { hard, target } = getQ1WordLimit(nation, totalLimit)

    // Get all essential criteria with generated paragraphs
    const allCriterionParagraphs = application.criteria
      .filter(c => c.type === "essential" && c.generatedParagraph)
      .map(c => ({
        criterionText: c.criterionText,
        type: c.type as string,
        paragraph: c.generatedParagraph!,
        order: c.order,
        category: (parsed?.essentialCriteria ?? []).find((p: any) => p.text === c.criterionText)?.category ?? "other",
      }))

    if (allCriterionParagraphs.length === 0) {
      return Response.json({ error: "No essential criteria paragraphs generated yet." }, { status: 400 })
    }

    // Select criteria that fit the word budget
    // Opening (40) + Knowledge (85) + Motivation (85) + Closing (30) = 240 words used
    // Remaining for criteria: target - 240 = ~240 words at 480 target
    const fixedOverhead = 40 + 30 + Math.round(target * 0.17) + Math.round(target * 0.17)
    const criteriaWordBudget = target - fixedOverhead
    const wordsPerCriterion = 55  // concise STAR sentence per criterion

    const selectedCriteria = selectCriteria(allCriterionParagraphs, criteriaWordBudget, wordsPerCriterion)
    const omittedCount = allCriterionParagraphs.length - selectedCriteria.length

    const result = await callGeminiJSON(buildQ1Prompt({
      jobTitle: application.jobTitle,
      band: application.band,
      employer: application.employer,
      nation,
      hardLimit: hard,
      targetLimit: target,
      currentRole: application.currentRole,
      yearsExperience: application.yearsExperience,
      criterionParagraphs: selectedCriteria,
      qualifications: qualifications ?? null,
      systemsKnowledge: systemsKnowledge ?? null,
      careerMotivation: careerMotivation ?? null,
      nhsValuesText: (application as any).nhsValuesText ?? null,
      omittedCount,
    }), 3000)  // 3000 tokens ≈ ~2000 words — enough room to write 480 words properly

    let q1Text = result.q1 ?? ""

    // ── Server-side enforcement ───────────────────────────────────────────────
    const rawCount = q1Text.split(/\s+/).filter(Boolean).length

    // If too short (under 80% of target) — retry once with explicit expansion prompt
    if (rawCount < target * 0.80) {
      console.log(`[Q1] Too short (${rawCount} words, target ${target}) — retrying with expansion prompt`)
      const expansionPrompt = `
The following NHS supporting statement Q1 is only ${rawCount} words — too short. 
It must be ${target}–${hard} words (NHS Scotland Jobtrain Q1 limit).

EXPAND IT to reach ${target} words by:
- Adding more specific clinical detail to each STAR example
- Expanding the knowledge/qualifications section
- Strengthening the motivation/career goals paragraph
- Do NOT add a new section — develop what is already there
- Keep the same structure and voice
- STOP at ${hard} words maximum

CURRENT TEXT:
${q1Text}

Respond ONLY with JSON: {"q1":"expanded text","wordCount":0}
`.trim()
      const expanded = await callGeminiJSON(expansionPrompt, 3000)
      if (expanded?.q1 && expanded.q1.split(/\s+/).filter(Boolean).length > rawCount) {
        q1Text = expanded.q1
        console.log(`[Q1] Expanded to ${q1Text.split(/\s+/).filter(Boolean).length} words`)
      }
    }

    // If too long — trim at sentence boundary
    const afterRetryCount = q1Text.split(/\s+/).filter(Boolean).length
    if (afterRetryCount > hard) {
      q1Text = trimToWordLimit(q1Text, hard)
      console.log(`[Q1] Trimmed from ${afterRetryCount} to ${q1Text.split(/\s+/).filter(Boolean).length} words`)
    }

    const wordCount = q1Text.split(/\s+/).filter(Boolean).length
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
        fullStatement: q1Text,
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
      omittedCriteria: omittedCount,
      score: liveScore,
      warning: overLimit
        ? `Q1 is ${wordCount} words — slightly over the ${hard}-word limit. Edit to trim.`
        : null,
    })
  } catch (error: any) {
    console.error("GENERATE_STATEMENT_Q1_ERROR:", error)
    return Response.json({ error: error?.message ?? "Failed" }, { status: 500 })
  }
}