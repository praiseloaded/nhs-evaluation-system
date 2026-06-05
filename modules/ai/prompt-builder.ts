// modules/ai/prompt-builder.ts
//
// Three prompt modes:
//   1. buildAnalysisPrompt()  — single-call full analysis (primary)
//   2. buildChunk1Prompt()    — criteria, STAR, specificity, seniority, ATS, scan
//   3. buildChunk2Prompt()    — values, language, risk, coaching, strengths/weaknesses
//
// With Gemini's 1M context window, most inputs fit in a single call.
// Chunking is kept as a safety net for extreme edge cases or Groq fallback.

export interface PromptInput {
  jobTitle:  string
  jobSpec:   string
  cv?:       string
  statement: string
  tier:      "free" | "paid"
}

// ─── Token helpers ────────────────────────────────────────────────────────────

/** Conservative estimate: 1 token ≈ 3.5 chars for English text */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3.5)
}

function truncate(text: string, maxChars: number): string {
  if (!text || text.length <= maxChars) return text
  const keepStart = Math.floor(maxChars * 0.75)
  const keepEnd   = maxChars - keepStart - 50
  const start = text.slice(0, keepStart)
  const end   = text.slice(-keepEnd)
  return `${start}\n\n[... content trimmed for length ...]\n\n${end}`
}

// ─── Input block (shared by chunk prompts) ────────────────────────────────────

function inputBlock(
  jobTitle:  string,
  jobSpec:   string,
  cv:        string,
  statement: string,
  limits:    { jobSpec: number; cv: number; statement: number }
): string {
  return `
==== INPUT ====

JOB TITLE: ${jobTitle}

JOB SPECIFICATION:
${truncate(jobSpec, limits.jobSpec)}

CV:
${truncate(cv, limits.cv)}

SUPPORTING STATEMENT:
${truncate(statement, limits.statement)}
`.trim()
}

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLE-CALL FULL PROMPT
// Gemini handles this easily. Limits are generous — full content preserved.
// ═══════════════════════════════════════════════════════════════════════════════

export function buildAnalysisPrompt(input: PromptInput): string {
  // Gemini: 1M context — no need to truncate aggressively
  // These limits are safety caps, not normal constraints
  const jobSpec   = truncate(input.jobSpec,       20000)
  const cv        = truncate(input.cv ?? "",      20000)
  const statement = truncate(input.statement,     15000)

  return `
You are a STRICT NHS RECRUITMENT PANEL ASSESSOR. ZERO TOLERANCE for score inflation.
Return ONLY valid JSON. No markdown, no commentary, no code blocks.

RULES:
- Score only EXPLICIT evidence. Never infer from job title or profession.
- "met"=1.0 credit, "partially met"=0.5, "not met"=0.0
- Default to "not met" when evidence is ambiguous.
- "We" actions do NOT count as personal Action in STAR.
- Vague results ("improved outcomes") do NOT count as Result.
- Do NOT award "behavioural" NHS value classification without a specific described behaviour.
- Language mirroring: only count phrases from THIS specific job spec.
- Each band gap = -10 point deduction on criteria and STAR scores.
- List ALL unmet/partial criteria as weaknesses. Do not soften.
- Recommendations must name the specific criterion/gap and be directive.

STEPS:
1. Extract and count every essential and desirable criterion individually.
2. Assess each criterion: "met"/"partially met"/"not met" with quoted evidence.
3. Calculate coverage: essentialMet (sum of credits), desirableMet (sum of credits).
4. Find all STAR examples. Classify each element: "present"/"weak"/"absent".
5. Classify specificity: tier1 (measurable+named), tier2 (named only), tier3 (generic).
6. Assess 5 NHS values: "behavioural_with_outcome"/"behavioural"/"referenced"/"keyword"/"absent".
7. Assess language mirroring against THIS job spec's distinctive phrases.
8. ATS keyword scan (up to 20 keywords).
9. Statement surface scan (wordCount, hasExamples, usesWeLanguage, etc.).
10. Seniority: demonstratedBand, targetBand, bandGap.
11. Rejection risk across 4 gates (ATS sift, Human shortlisting, Values-based, Interview).
12. Operational realism across 5 dimensions.
13. Band-specific coaching for target band.
14. Strengths (with quoted evidence), weaknesses, missingCriteria, recommendations.
15. Up to 3 role match suggestions.

OUTPUT JSON SHAPE:
{
  "confidence": <0-100>,
  "seniority": { "demonstratedBand": <int|null>, "targetBand": <int|null>, "bandGap": <int> },
  "criteriaInventory": { "essentialTotal": <int>, "desirableTotal": <int> },
  "criteriaAnalysis": [{ "criterion": "", "type": "essential|desirable", "status": "met|partially met|not met", "evidence": "", "improvement": "" }],
  "breakdown": {
    "criteriaCoverage": { "essentialMet": <num>, "essentialPartial": <int>, "essentialNotMet": <int>, "desirableMet": <num>, "desirablePartial": <int>, "desirableNotMet": <int> },
    "starCompleteness": { "examplesFound": <int>, "resultsConsistentlyAbsent": <bool>, "examples": [{ "ref": "", "summary": "", "situation": "present|weak|absent", "task": "present|weak|absent", "action": "present|weak|absent", "result": "present|weak|absent", "weLanguageDetected": <bool> }] },
    "specificity": { "totalClaims": <int>, "tier1Count": <int>, "tier2Count": <int>, "tier3Count": <int> },
    "languageMirroring": { "specPhrasesTotal": <int>, "present": <int>, "paraphrased": <int>, "absent": <int>, "phrasesFound": [], "phrasesMissing": [] }
  },
  "atsMatch": { "totalKeywords": <int>, "foundCount": <int>, "missingCount": <int>, "keywordsFound": [], "keywordsMissing": [], "missingGrouped": { "critical": [], "recommended": [] } },
  "statementScan": { "wordCount": <int>, "hasExamples": <bool>, "exampleCount": <int>, "resultsPresent": <bool>, "usesWeLanguage": <bool>, "openingIsGeneric": <bool>, "closingIsGeneric": <bool> },
  "nhsValues": [{ "name": "", "classification": "behavioural_with_outcome|behavioural|referenced|keyword|absent", "evidence": "" }],
  "strengths": [{ "claim": "", "evidence": "" }],
  "weaknesses": [],
  "missingCriteria": [],
  "recommendations": [],
  "rejectionRisk": { "overall": "high|medium|low", "gates": [{ "gate": "", "riskLevel": "high|medium|low", "reason": "", "fix": "" }] },
  "operationalRealism": { "level": "strong|adequate|weak", "dimensions": [{ "name": "", "classification": "demonstrated|implied|absent", "evidence": "", "gap": "" }] },
  "bandCoaching": { "targetBand": <int>, "bandLabel": "", "coreExpectation": "", "whatPanelsLookFor": [], "candidateGaps": [], "bandSpecificTips": [], "mostCriticalBandGap": "" },
  "roleMatchSuggestions": [{ "roleTitle": "", "bandRange": "", "reason": "" }]
}

JOB TITLE: ${input.jobTitle}

JOB SPECIFICATION:
${jobSpec}

CV:
${cv}

SUPPORTING STATEMENT:
${statement}
`.trim()
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHUNK 1 — Criteria, STAR, Specificity, Seniority, ATS, StatementScan
// Used only when falling back to Groq with long inputs.
// ═══════════════════════════════════════════════════════════════════════════════

export function buildChunk1Prompt(input: PromptInput): string {
  const data = inputBlock(
    input.jobTitle,
    input.jobSpec,
    input.cv ?? "",
    input.statement,
    { jobSpec: 3500, cv: 3500, statement: 2000 }
  )

  return `
You are a STRICT NHS RECRUITMENT PANEL ASSESSOR. Return ONLY valid JSON.

TASK: Assess criteria coverage, STAR examples, specificity, seniority, ATS keywords, and statement structure.

RULES:
- Score only EXPLICIT evidence. Never infer from job title or profession.
- "met"=1.0, "partially met"=0.5, "not met"=0.0. Default to "not met" when ambiguous.
- "We" actions do NOT count as personal Action in STAR.
- Vague results ("improved outcomes") do NOT count as Result.
- Specificity: tier1=measurable+named, tier2=named only, tier3=generic/vague.
- Each band gap = -10 points on criteria and STAR.

REQUIRED OUTPUT (JSON only):
{
  "seniority": { "demonstratedBand": <int|null>, "targetBand": <int|null>, "bandGap": <int> },
  "criteriaInventory": { "essentialTotal": <int>, "desirableTotal": <int> },
  "criteriaAnalysis": [{ "criterion": "", "type": "essential|desirable", "status": "met|partially met|not met", "evidence": "", "improvement": "" }],
  "breakdown": {
    "criteriaCoverage": { "essentialMet": <num>, "essentialPartial": <int>, "essentialNotMet": <int>, "desirableMet": <num>, "desirablePartial": <int>, "desirableNotMet": <int> },
    "starCompleteness": { "examplesFound": <int>, "resultsConsistentlyAbsent": <bool>, "examples": [{ "ref": "", "summary": "", "situation": "present|weak|absent", "task": "present|weak|absent", "action": "present|weak|absent", "result": "present|weak|absent", "weLanguageDetected": <bool> }] },
    "specificity": { "totalClaims": <int>, "tier1Count": <int>, "tier2Count": <int>, "tier3Count": <int> }
  },
  "atsMatch": { "totalKeywords": <int>, "foundCount": <int>, "missingCount": <int>, "keywordsFound": [], "keywordsMissing": [], "missingGrouped": { "critical": [], "recommended": [] } },
  "statementScan": { "wordCount": <int>, "hasExamples": <bool>, "exampleCount": <int>, "resultsPresent": <bool>, "usesWeLanguage": <bool>, "openingIsGeneric": <bool>, "closingIsGeneric": <bool> }
}

${data}
`.trim()
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHUNK 2 — Values, Language, Risk, Coaching, Strengths/Weaknesses
// ═══════════════════════════════════════════════════════════════════════════════

export function buildChunk2Prompt(
  input: PromptInput,
  chunk1Summary: {
    seniority:          { demonstratedBand: number | null; targetBand: number | null; bandGap: number }
    criteriaInventory:  { essentialTotal: number; desirableTotal: number }
    essentialMet:       number
    essentialNotMet:    number
    desirableMet:       number
    starExamplesFound:  number
    resultsAbsent:      boolean
  }
): string {
  const data = inputBlock(
    input.jobTitle,
    input.jobSpec,
    input.cv ?? "",
    input.statement,
    { jobSpec: 3000, cv: 1500, statement: 3000 }
  )

  const summary = JSON.stringify(chunk1Summary)

  return `
You are a STRICT NHS RECRUITMENT PANEL ASSESSOR. Return ONLY valid JSON.

TASK: Assess NHS values, language mirroring, rejection risk, operational realism, band coaching, strengths, weaknesses, and recommendations.

CONTEXT FROM PRIOR ANALYSIS:
${summary}

RULES:
- NHS values: only "behavioural_with_outcome" if specific behaviour AND outcome stated. Only "behavioural" if specific behaviour described. "referenced" if context but no behaviour. "keyword" if mentioned without context. "absent" if not found.
- Language mirroring: only count phrases from THIS specific job spec, not general NHS language.
- Rejection risk: 4 gates (ATS sift, Human shortlisting, Values-based, Interview). Overall = "high" if any gate is high.
- Operational realism: 5 dimensions (NHS pressures, Escalation/governance, MDT working, Documentation/accountability, Patient flow). Each: "demonstrated"/"implied"/"absent".
- Band coaching: based on target band from context above.
- Strengths MUST have quoted evidence. Weaknesses MUST list EVERY unmet/partial essential criterion.
- Recommendations must name the specific gap and be directive.

REQUIRED OUTPUT (JSON only):
{
  "confidence": <0-100>,
  "nhsValues": [{ "name": "", "classification": "behavioural_with_outcome|behavioural|referenced|keyword|absent", "evidence": "" }],
  "languageMirroring": { "specPhrasesTotal": <int>, "present": <int>, "paraphrased": <int>, "absent": <int>, "phrasesFound": [], "phrasesMissing": [] },
  "rejectionRisk": { "overall": "high|medium|low", "gates": [{ "gate": "", "riskLevel": "high|medium|low", "reason": "", "fix": "" }] },
  "operationalRealism": { "level": "strong|adequate|weak", "dimensions": [{ "name": "", "classification": "demonstrated|implied|absent", "evidence": "", "gap": "" }] },
  "bandCoaching": { "targetBand": <int>, "bandLabel": "", "coreExpectation": "", "whatPanelsLookFor": [], "candidateGaps": [], "bandSpecificTips": [], "mostCriticalBandGap": "" },
  "strengths": [{ "claim": "", "evidence": "" }],
  "weaknesses": [],
  "missingCriteria": [],
  "recommendations": [],
  "roleMatchSuggestions": [{ "roleTitle": "", "bandRange": "", "reason": "" }]
}

${data}
`.trim()
}