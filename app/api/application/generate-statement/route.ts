// app/api/application/generate-statement/route.ts

import { getDb }                    from "@/lib/db-router"
import { auth }                     from "@/auth"
import { callGeminiJSON }           from "@/lib/application/ai"
import { scoreApplication }         from "@/lib/application/scoring"
import { NATION_CONFIGS }           from "@/lib/nhs-nations"
import { validateEvidence }         from "@/lib/application/anti-hallucination-guard"
import { sendEmail }                from "@/lib/email"
import { statementGeneratedEmail }  from "@/lib/email-templates"

// ─── Word limit helpers ────────────────────────────────────────────────────────

function getQ1WordLimit(nation: string, totalLimit: number): { hard: number; target: number } {
  if (nation === "scotland" || nation === "unknown") return { hard: 500, target: 480 }
  const hard = Math.round(totalLimit * 0.50)
  return { hard, target: Math.round(hard * 0.96) }
}

function trimToWordLimit(text: string, limit: number): string {
  const words = text.trim().split(/\s+/)
  if (words.length <= limit) return text
  const trimmed = words.slice(0, limit).join(" ")
  const lastStop = Math.max(
    trimmed.lastIndexOf(". "),
    trimmed.lastIndexOf("! "),
    trimmed.lastIndexOf("? "),
  )
  if (lastStop > trimmed.length * 0.7) return trimmed.slice(0, lastStop + 1).trim()
  return trimmed.trim()
}

// ─── Criterion selection (legacy path) ────────────────────────────────────────

const PRIORITY_CATEGORIES = ["clinical", "communication", "teamwork", "technical", "knowledge", "other"]

function selectCriteria(
  criteria: Array<{ criterionText: string; type: string; paragraph: string; order: number; category?: string }>,
  wordsAvailable: number,
  wordsPerCriterion: number,
): typeof criteria {
  const maxCriteria = Math.floor(wordsAvailable / wordsPerCriterion)
  if (criteria.length <= maxCriteria) return criteria
  const sorted = [...criteria].sort((a, b) => {
    const aPriority = PRIORITY_CATEGORIES.indexOf(a.category ?? "other")
    const bPriority = PRIORITY_CATEGORIES.indexOf(b.category ?? "other")
    if (aPriority !== bPriority) return aPriority - bPriority
    return a.order - b.order
  })
  return sorted.slice(0, maxCriteria)
}

// ─── LAYER 4: Competency-based prompt ─────────────────────────────────────────

function buildCompetencyPrompt(input: {
  jobTitle: string
  band: string | null
  employer: string | null
  nation: string
  hardLimit: number
  targetLimit: number
  currentRole: string | null
  yearsExperience: number | null
  qualifications: string | null
  systemsKnowledge: string | null
  careerMotivation: string | null
  nhsValuesText: string | null
  competencies: Array<{ label: string; description: string; evidence: string | null; noExperience: boolean }>
}): string {
  const nationLabel = NATION_CONFIGS[input.nation as keyof typeof NATION_CONFIGS]?.label ?? "NHS Scotland"
  const isScotland  = input.nation === "scotland" || input.nation === "unknown"

  const evidenceBlock = input.competencies
    .filter(c => !c.noExperience && c.evidence?.trim())
    .map(c => `COMPETENCY: ${c.label}\nEVIDENCE: ${c.evidence!.trim()}`)
    .join("\n\n")

  const developingBlock = input.competencies
    .filter(c => c.noExperience)
    .map(c => `DEVELOPING: ${c.label} — ${c.description}`)
    .join("\n")

  return `
You are an expert ${nationLabel} recruitment writer generating Q1 of a supporting statement.

QUESTION: "Why are you suitable for this role?"
JOB: ${input.jobTitle}${input.band ? `, ${input.band}` : ""}
EMPLOYER: ${input.employer ?? nationLabel}
APPLICANT CURRENT ROLE: ${input.currentRole ?? "not specified"}

══════════════════════════════════════════════
WORD COUNT: MINIMUM ${input.targetLimit - 30} · TARGET ${input.targetLimit} · MAXIMUM ${input.hardLimit}
Count your words before responding. Aim for exactly ${input.targetLimit} words.
══════════════════════════════════════════════

COMPETENCY EVIDENCE (write one cohesive paragraph per competency area — not per criterion):
${evidenceBlock}
${developingBlock ? `\nDEVELOPING AREAS (write one forward-looking sentence each — commitment to build):\n${developingBlock}` : ""}

ADDITIONAL CONTEXT:
- Qualifications: ${input.qualifications ?? "not specified"}
- Systems/clinical skills: ${input.systemsKnowledge ?? "not specified"}
- Why this role: ${input.careerMotivation ?? "not specified"}
${input.nhsValuesText ? `\nVALUES DOC (for tone only — do NOT reproduce):\n${input.nhsValuesText.slice(0, 500)}` : ""}

BANNED PHRASES — do NOT use any of these openers or fillers:
❌ "I am eager to", "I am committed to", "I am keen to", "I look forward to"
❌ "I hope to", "I aspire to", "I wish to", "I would like to", "I am passionate about"
❌ "I am applying for", "I believe I am", "I feel I am", "I am a dedicated"
Using any banned phrase will cause instant rejection — avoid them completely.

STAR STRUCTURE — every competency paragraph MUST follow this pattern:
Situation (what was happening) → Action (what YOU specifically did) → Result (measurable outcome)
- Write in PAST TENSE about things you have ACTUALLY DONE
- "I led...", "I identified...", "I implemented...", "I reduced...", "I supported..."
- Results must be specific: numbers, timeframes, names — not "improved outcomes"

WRITING RULES:
1. Write ONE flowing paragraph per competency in PAST TENSE — not per criterion.
2. Open with your single strongest clinical achievement. One sentence, past tense, specific.
3. Each paragraph: SITUATION → ACTION → RESULT compressed into 3–5 sentences.
4. Do NOT copy evidence verbatim — rewrite tightly in first person, professional NHS tone.
5. Developing areas: ONE sentence max. "I am currently..." is acceptable here only.
6. Qualifications and motivation: 1–2 sentences, woven in naturally.
7. Closing: one forward-looking sentence (only place future tense is allowed).
8. NO bullet points, NO headers — pure flowing prose throughout.
9. NHS values motivation belongs in Q2 NOT here.
10. Active voice. Every sentence earns its place.
11. STOP at ${input.hardLimit} words.

${isScotland ? "Jobtrain NHS Scotland — Q1 of 3 questions. NHS values (Q2) and personal circumstances (Q3) go in their own boxes, not here." : "Suitability only. Values motivation goes in Q2, other info in Q3."}

Respond ONLY with JSON (no markdown):
{"q1":"complete Q1 text","wordCount":<integer>}
`.trim()
}

// ─── LEGACY: Criterion paragraph prompt ──────────────────────────────────────

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
WORD COUNT: MINIMUM ${input.targetLimit - 30} · TARGET ${input.targetLimit} · MAXIMUM ${input.hardLimit}
══════════════════════════════════════════════

SECTION BUDGETS:
- Opening hook: ${openingBudget} words MAX
- Criteria evidence (${criteriaCount} × ~${wordsPerCriterion} words): ${criteriaBudget} words MAX
- Knowledge/qualifications: ${knowledgeBudget} words MAX
- Motivation/career goals: ${motivationBudget} words MAX
- Closing sentence: ${closingBudget} words MAX

EVIDENCE (${criteriaCount} criteria):
${criteriaBlock}
${input.omittedCount > 0 ? `\nNOTE: ${input.omittedCount} lower-priority criteria omitted to stay within word limit.` : ""}

ADDITIONAL CONTEXT:
- Qualifications: ${input.qualifications ?? "not specified"}
- Systems/clinical skills: ${input.systemsKnowledge ?? "not specified"}
- Why this role: ${input.careerMotivation ?? "not specified"}
${input.nhsValuesText ? `\nVALUES DOC (tone only):\n${input.nhsValuesText.slice(0, 500)}` : ""}

BANNED PHRASES — NEVER use these in any sentence:
❌ "I am eager to", "I am committed to", "I am keen to", "I look forward to"
❌ "I hope to", "I aspire to", "I wish to", "I am passionate about", "I am applying for"
❌ "I am dedicated to developing", "I am excited to", "I am motivated to"
These signal zero evidence and cause automatic rejection.

STAR REQUIREMENT — every criterion paragraph must follow Situation → Action → Result:
- Write in PAST TENSE: "I delivered...", "I identified...", "I led...", "I reduced..."
- Results must be concrete: numbers, names, timeframes — NOT "improved patient outcomes"
- If evidence is thin, write the best short STAR example possible — never write aspirational filler

WRITING RULES:
1. Open with the applicant's single strongest PAST achievement — one punchy sentence.
2. Each criterion: ~${wordsPerCriterion} words. One compressed STAR story. Do NOT copy verbatim.
3. Knowledge: 1–2 sentences naming specific quals/systems. Motivation: 1–2 sentences, past + future.
4. Closing: one forward-looking sentence (only future tense allowed in the whole statement).
5. NHS values motivation belongs in Q2 — do not include it here.
6. NO bullet points, NO headers — pure flowing prose.
7. Active voice throughout. Aim for ${input.targetLimit} words. STOP at ${input.hardLimit}.
${isScotland ? "\nJobtrain NHS Scotland Q1 — values (Q2) and personal circumstances (Q3) go in their own boxes." : ""}

Respond ONLY with JSON (no markdown):
{"q1":"complete Q1 text","wordCount":<integer>}
`.trim()
}

// ─── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const userId = session.user.id
    const db     = await getDb(userId)

    const body = await req.json()
    const {
      applicationId,
      qualifications,
      systemsKnowledge,
      careerMotivation,
      nation: bodyNation,
      wordLimit: bodyWordLimit,
    } = body

    if (!applicationId) return Response.json({ error: "applicationId required" }, { status: 400 })

    const application = await db.application.findUnique({
      where:   { id: applicationId },
      include: { criteria: { orderBy: { order: "asc" } } },
    })
    if (!application || application.userId !== userId) {
      return Response.json({ error: "Not found" }, { status: 404 })
    }

    const parsed     = application.parsedSpec as any
    const nation     = bodyNation ?? parsed?.detectedNation ?? "unknown"
    const totalLimit = bodyWordLimit ?? parsed?.statementWordLimit ?? (nation === "scotland" || nation === "unknown" ? 500 : 1500)
    const { hard, target } = getQ1WordLimit(nation, totalLimit)

    const competencyEvidence = parsed?.competencyEvidence as Record<string, any> | undefined
    const useLayer4 = competencyEvidence && Object.keys(competencyEvidence).length > 0

    let prompt: string
    let omittedCount = 0

    if (useLayer4) {
      console.log(`[Q1] Layer 4 path — ${Object.keys(competencyEvidence!).length} competencies`)

      const essentialCriterionIds = new Set(
        application.criteria.filter(c => c.type === "essential").map(c => c.id)
      )
      const essentialCompetencyIds = new Set(
        Object.entries(competencyEvidence!).filter(([, ce]: [string, any]) =>
          (ce.criteriaIds as string[])?.some((id: string) => essentialCriterionIds.has(id))
          || (ce.criteriaTexts as string[] | undefined)?.some((t: string) =>
            application.criteria.some(c => c.type === "essential" && c.criterionText.trim().toLowerCase() === t.trim().toLowerCase())
          )
        ).map(([id]) => id)
      )

      const guard = validateEvidence(
        competencyEvidence as Record<string, any>,
        essentialCompetencyIds
      )

      if (!guard.canGenerate) {
        return Response.json({
          error:         guard.blockedReason,
          canGenerate:   false,
          essentialGaps: guard.essentialGaps,
          checks:        guard.checks,
        }, { status: 422 })
      }

      if (guard.warnings.length > 0) {
        console.log(`[Q1] Evidence warnings: ${guard.warnings.join(" | ")}`)
      }

      const competencies = Object.values(competencyEvidence!).map((ce: any) => ({
        label:        ce.label        as string,
        description:  (ce.description as string) ?? "",
        evidence:     ce.evidence     as string | null,
        noExperience: (ce.noExperience as boolean) ?? false,
      }))

      prompt = buildCompetencyPrompt({
        jobTitle:         application.jobTitle,
        band:             application.band,
        employer:         application.employer,
        nation,
        hardLimit:        hard,
        targetLimit:      target,
        currentRole:      application.currentRole,
        yearsExperience:  application.yearsExperience,
        qualifications:   qualifications   ?? null,
        systemsKnowledge: systemsKnowledge ?? null,
        careerMotivation: careerMotivation ?? null,
        nhsValuesText:    (application as any).nhsValuesText ?? null,
        competencies,
      })
    } else {
      console.log("[Q1] Legacy path — criterion paragraphs")

      const allCriterionParagraphs = application.criteria
        .filter(c => c.type === "essential" && c.generatedParagraph)
        .map(c => ({
          criterionText: c.criterionText,
          type:          c.type as string,
          paragraph:     c.generatedParagraph!,
          order:         c.order,
          category:      (parsed?.essentialCriteria ?? []).find((p: any) => p.text === c.criterionText)?.category ?? "other",
        }))

      if (allCriterionParagraphs.length === 0) {
        return Response.json({ error: "No essential criteria paragraphs generated yet." }, { status: 400 })
      }

      const fixedOverhead      = 40 + 30 + Math.round(target * 0.17) + Math.round(target * 0.17)
      const criteriaWordBudget = target - fixedOverhead
      const wordsPerCriterion  = 55
      const selectedCriteria   = selectCriteria(allCriterionParagraphs, criteriaWordBudget, wordsPerCriterion)
      omittedCount = allCriterionParagraphs.length - selectedCriteria.length

      prompt = buildQ1Prompt({
        jobTitle:         application.jobTitle,
        band:             application.band,
        employer:         application.employer,
        nation,
        hardLimit:        hard,
        targetLimit:      target,
        currentRole:      application.currentRole,
        yearsExperience:  application.yearsExperience,
        criterionParagraphs: selectedCriteria,
        qualifications:   qualifications   ?? null,
        systemsKnowledge: systemsKnowledge ?? null,
        careerMotivation: careerMotivation ?? null,
        nhsValuesText:    (application as any).nhsValuesText ?? null,
        omittedCount,
      })
    }

    // ── Generate ──────────────────────────────────────────────────────────────
    const result = await callGeminiJSON(prompt, 3000)
    let q1Text   = result.q1 ?? ""

    // ── Retry if too short ────────────────────────────────────────────────────
    const rawCount = q1Text.split(/\s+/).filter(Boolean).length
    if (rawCount < target * 0.80) {
      console.log(`[Q1] Too short (${rawCount} words, target ${target}) — retrying`)
      const expansionPrompt = `
The following NHS supporting statement Q1 is only ${rawCount} words — too short.
It must be ${target}–${hard} words.

EXPAND to reach ${target} words by:
- Adding more specific clinical detail to each example
- Expanding the qualifications/systems section
- Strengthening the motivation paragraph
- Do NOT add new sections — develop what is already there
- Keep same structure and voice
- STOP at ${hard} words

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

    // ── Trim if over hard limit ───────────────────────────────────────────────
    const afterRetryCount = q1Text.split(/\s+/).filter(Boolean).length
    if (afterRetryCount > hard) {
      q1Text = trimToWordLimit(q1Text, hard)
      console.log(`[Q1] Trimmed from ${afterRetryCount} to ${q1Text.split(/\s+/).filter(Boolean).length} words`)
    }

    const wordCount = q1Text.split(/\s+/).filter(Boolean).length
    const overLimit = wordCount > hard

    // ── Score + persist ───────────────────────────────────────────────────────
    const criteriaInputs = application.criteria.map(c => ({
      type:               c.type as "essential" | "desirable",
      situation:          c.situation,
      task:               c.task,
      action:             c.action,
      result:             c.result,
      metrics:            c.metrics,
      reflection:         c.reflection,
      generatedParagraph: c.generatedParagraph,
      keywords:           (parsed?.essentialCriteria ?? []).concat(parsed?.desirableCriteria ?? [])
                            .find((p: any) => p.text === c.criterionText)?.keywords ?? [],
      criterionText:      c.criterionText,
    }))

    const liveScore = scoreApplication(criteriaInputs, q1Text, "", q1Text, parsed?.nhsValues ?? [])

    await db.application.update({
      where: { id: applicationId },
      data: {
        statementQ1:   q1Text,
        wordCountQ1:   wordCount,
        fullStatement: q1Text,
        wordCount,
        liveScore:     liveScore as any,
        status:        "in_progress",
      },
    })

    await db.applicationDraft.create({
      data: { applicationId, content: q1Text, wordCount, score: liveScore as any },
    })

    // ── Email — only when all three questions are complete ────────────────────
    const freshApp = await db.application.findUnique({
      where:  { id: applicationId },
      select: {
        statementQ1: true, wordCountQ1: true,
        statementQ2: true, wordCountQ2: true,
        statementQ3: true, wordCountQ3: true,
        jobTitle: true, employer: true,
      },
    })

    if (freshApp?.statementQ1 && freshApp?.statementQ2 && freshApp?.statementQ3) {
      const userRow = await db.user.findUnique({
        where:  { id: userId },
        select: { email: true, name: true },
      })
      if (userRow?.email) {
        sendEmail({
          to:      userRow.email,
          subject: `Your statement for ${freshApp.jobTitle} is ready — OmniJobReady AI™`,
          html:    statementGeneratedEmail({
            name:         userRow.name ?? "",
            jobTitle:     freshApp.jobTitle,
            employer:     freshApp.employer,
            nation,
            wordCountQ1:  freshApp.wordCountQ1 ?? 0,
            wordCountQ2:  freshApp.wordCountQ2 ?? 0,
            wordCountQ3:  freshApp.wordCountQ3 ?? 0,
            statementUrl: `${process.env.NEXTAUTH_URL}/dashboard/application/${applicationId}`,
          }),
        }).catch(err => console.error("[generate-q1] email failed:", err))
      }
    }

    return Response.json({
      success:         true,
      question:        "q1",
      statement:       q1Text,
      wordCount,
      overLimit,
      hardLimit:       hard,
      targetLimit:     target,
      nation,
      omittedCriteria: omittedCount,
      generationPath:  useLayer4 ? "layer4_competency" : "legacy_criterion",
      score:           liveScore,
      warning: overLimit
        ? `Q1 is ${wordCount} words — slightly over the ${hard}-word limit. Edit to trim.`
        : null,
    })
  } catch (error: any) {
    console.error("GENERATE_STATEMENT_Q1_ERROR:", error)
    return Response.json({ error: error?.message ?? "Failed" }, { status: 500 })
  }
}