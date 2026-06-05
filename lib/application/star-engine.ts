// lib/application/star-engine.ts
//
// Converts STAR evidence for each criterion into NHS-optimised paragraphs
// Rules: first person, no "we" for actions, measurable results, clinical framing

export interface StarInput {
  criterionText: string
  criterionType: "essential" | "desirable"
  category: string
  situation: string
  task: string
  action: string
  result: string
  metrics?: string
  mdtContext?: string
  reflection?: string
  nhsValues?: string
  keywords: string[]
  bandLevel?: number
  roleType?: string
}

// ─── STAR → NHS Paragraph Prompt ──────────────────────────────────────────────

export function buildStarPrompt(input: StarInput): string {
  return `
You are an expert NHS supporting statement writer. Convert this STAR evidence into a professional NHS-style paragraph.

CRITERION: "${input.criterionText}"
TYPE: ${input.criterionType}
CATEGORY: ${input.category}
${input.bandLevel ? `BAND LEVEL: ${input.bandLevel}` : ''}
${input.roleType ? `ROLE TYPE: ${input.roleType}` : ''}

CANDIDATE'S STAR EVIDENCE:
SITUATION: ${input.situation}
TASK: ${input.task}
ACTION: ${input.action}
RESULT: ${input.result}
${input.metrics ? `METRICS: ${input.metrics}` : ''}
${input.mdtContext ? `MDT CONTEXT: ${input.mdtContext}` : ''}
${input.reflection ? `REFLECTION: ${input.reflection}` : ''}
${input.nhsValues ? `NHS VALUES DEMONSTRATED: ${input.nhsValues}` : ''}

KEYWORDS TO MIRROR: ${input.keywords.join(', ')}

WRITING RULES (NON-NEGOTIABLE):
1. Write in FIRST PERSON ("I", never "we" for personal actions)
2. NHS professional tone — confident but not arrogant
3. 120-180 words per paragraph
4. Open with the criterion link: "In my role as... I demonstrated..."
5. Embed STAR naturally — don't label S/T/A/R explicitly
6. Include at least ONE measurable outcome (number, percentage, timeframe)
7. Mirror keywords from the criterion naturally
8. If NHS values are relevant, weave them in without forcing
9. End with impact or learning, not a generic statement
10. Never fabricate — only use what the candidate provided
11. Clinical framing: use NHS terminology naturally (e.g., "care pathway", "multidisciplinary approach", "person-centred care")
12. Band-appropriate language: Band 5 = autonomous practice, Band 6 = leadership, Band 7+ = strategic

ANTI-PATTERNS TO AVOID:
- "I am passionate about..." (empty)
- "I have experience in..." without specifics (vague)
- "I always ensure..." (unsubstantiated)
- Starting every sentence with "I"
- Generic closing like "I would welcome the opportunity"

Return ONLY valid JSON:
{
  "paragraph": "The generated paragraph text",
  "wordCount": <number>,
  "keywordsMirrored": ["list of criterion keywords used"],
  "keywordsMissing": ["keywords not naturally incorporated"],
  "starElements": {
    "situationClear": true/false,
    "taskSpecific": true/false,
    "actionPersonal": true/false,
    "resultMeasurable": true/false
  },
  "strengthNote": "One sentence on what makes this paragraph strong",
  "improvementNote": "One specific suggestion to make it even better"
}
`.trim()
}

// ─── STAR Question Generator ──────────────────────────────────────────────────

export function buildQuestionPrompt(
  criterionText: string,
  category: string,
  bandLevel: number | null
): string {
  return `
You are an NHS application coach. Generate guided questions to help a candidate provide STAR evidence for this criterion.

CRITERION: "${criterionText}"
CATEGORY: ${category}
${bandLevel ? `TARGET BAND: ${bandLevel}` : ''}

Generate 4 focused questions — one for each STAR element — that help the candidate recall a SPECIFIC example. Questions should be:
- Concrete and prompting (not "tell me about a time")
- Role-specific and band-appropriate
- Designed to extract measurable, named evidence

Return ONLY valid JSON:
{
  "situationPrompt": "Where were you working and what was happening? (e.g., which ward/team, what specific challenge arose)",
  "taskPrompt": "What was YOUR specific responsibility in this situation?",
  "actionPrompt": "What did YOU personally do? (specific steps, not 'we')",
  "resultPrompt": "What was the measurable outcome? (numbers, timeframes, patient impact)",
  "metricsPrompt": "Can you quantify the impact? (%, number of patients, time saved)",
  "tip": "One sentence of coaching advice for this specific criterion"
}
`.trim()
}