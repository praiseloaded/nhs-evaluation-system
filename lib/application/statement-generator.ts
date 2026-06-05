// lib/application/statement-generator.ts
//
// Merges individual criterion paragraphs into a cohesive supporting statement
// Structure: Introduction → Essential → Desirable → Closing

export interface StatementInput {
  jobTitle: string
  band: string | null
  employer: string | null
  criterionParagraphs: Array<{
    criterionText: string
    type: "essential" | "desirable"
    paragraph: string
    order: number
  }>
  currentRole: string | null
  yearsExperience: number | null
  nhsValues: string[]
  targetWordCount?: number // default 1500
}

// ─── Introduction Generator ───────────────────────────────────────────────────

export function buildIntroductionPrompt(input: StatementInput): string {
  return `
You are an expert NHS supporting statement writer. Write an opening paragraph for this application.

JOB: ${input.jobTitle}
${input.band ? `BAND: ${input.band}` : ''}
${input.employer ? `EMPLOYER: ${input.employer}` : ''}
${input.currentRole ? `CURRENT ROLE: ${input.currentRole}` : ''}
${input.yearsExperience ? `EXPERIENCE: ${input.yearsExperience} years` : ''}

RULES:
1. 80-120 words
2. First person, professional NHS tone
3. State who you are, your current role, and why you're applying
4. Reference the specific role and employer
5. Briefly signal your key strengths relevant to this role
6. Do NOT start with "I am writing to apply" — that's generic
7. Do NOT list criteria — just set the scene
8. Show enthusiasm that feels genuine, not forced

Return ONLY valid JSON:
{
  "introduction": "The paragraph text",
  "wordCount": <number>
}
`.trim()
}

// ─── Closing Generator ────────────────────────────────────────────────────────

export function buildClosingPrompt(input: StatementInput): string {
  return `
Write a closing paragraph for an NHS supporting statement.

JOB: ${input.jobTitle}
${input.band ? `BAND: ${input.band}` : ''}
NHS VALUES DEMONSTRATED: ${input.nhsValues.join(', ')}

RULES:
1. 60-100 words
2. Summarise key fit — don't repeat evidence
3. Reference NHS values naturally
4. Express genuine commitment to the role and organisation
5. Forward-looking — what you'll bring, not what you want
6. Do NOT say "I would welcome the opportunity to discuss"
7. End confidently, not humbly

Return ONLY valid JSON:
{
  "closing": "The paragraph text",
  "wordCount": <number>
}
`.trim()
}

// ─── Full Statement Assembly ──────────────────────────────────────────────────

export function buildStatementAssemblyPrompt(input: StatementInput): string {
  const essentialParas = input.criterionParagraphs
    .filter(p => p.type === 'essential')
    .sort((a, b) => a.order - b.order)
    .map(p => p.paragraph)
    .join('\n\n')

  const desirableParas = input.criterionParagraphs
    .filter(p => p.type === 'desirable')
    .sort((a, b) => a.order - b.order)
    .map(p => p.paragraph)
    .join('\n\n')

  const target = input.targetWordCount ?? 1500

  return `
You are an expert NHS supporting statement editor. Assemble these individual paragraphs into a cohesive, flowing supporting statement.

JOB: ${input.jobTitle}
TARGET WORD COUNT: ${target} (±10%)

ESSENTIAL CRITERIA PARAGRAPHS:
${essentialParas}

DESIRABLE CRITERIA PARAGRAPHS:
${desirableParas}

EDITING RULES:
1. Add smooth transitions between paragraphs — no abrupt jumps
2. Remove any repetition across paragraphs
3. Ensure consistent tone throughout
4. Check that NHS values appear at least 3 times naturally
5. Verify first person throughout — no "we" for personal actions
6. Ensure word count is within range
7. Do NOT add new evidence — only edit for flow
8. Keep each criterion's evidence intact — do not merge or remove
9. Essential criteria come before desirable
10. Add a brief introduction if one isn't included
11. Add a brief closing if one isn't included

Return ONLY valid JSON:
{
  "statement": "The complete assembled statement",
  "wordCount": <number>,
  "sectionsCount": <number>,
  "transitionsAdded": <number>,
  "repetitionsRemoved": ["list of phrases removed"]
}
`.trim()
}

// ─── Local assembly (no AI needed for simple merge) ──────────────────────────

export function assembleStatementLocally(
  introduction: string,
  criterionParagraphs: Array<{ type: string; paragraph: string; order: number }>,
  closing: string
): string {
  const essential = criterionParagraphs
    .filter(p => p.type === 'essential')
    .sort((a, b) => a.order - b.order)
    .map(p => p.paragraph)

  const desirable = criterionParagraphs
    .filter(p => p.type === 'desirable')
    .sort((a, b) => a.order - b.order)
    .map(p => p.paragraph)

  const sections = [
    introduction,
    ...essential,
    ...desirable,
    closing,
  ].filter(Boolean)

  return sections.join('\n\n')
}