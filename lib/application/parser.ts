// lib/application/parser.ts
//
// Hybrid parser: rule-based pre-processing + Gemini LLM extraction
// Handles: plain text, poorly formatted PDFs, duplicates, merged criteria

export interface ParsedCriterion {
  id: string
  text: string
  type: "essential" | "desirable"
  category: "clinical" | "leadership" | "values" | "qualification" | "experience" | "skills" | "knowledge" | "other"
  keywords: string[]
}

export interface ParsedSpec {
  essentialCriteria: ParsedCriterion[]
  desirableCriteria: ParsedCriterion[]
  nhsValues: string[]
  bandLevel: number | null
  roleType: string | null
  totalCriteria: number
}

// ─── Rule-based pre-processor ─────────────────────────────────────────────────

function preProcess(raw: string): string {
  return raw
    // Normalize whitespace
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/ {2,}/g, ' ')
    // Fix common PDF artifacts
    .replace(/●/g, '•')
    .replace(/○/g, '•')
    .replace(/■/g, '•')
    .replace(/▪/g, '•')
    .replace(/–/g, '-')
    .replace(/—/g, '-')
    .replace(/'/g, "'")
    .replace(/"/g, '"')
    .replace(/"/g, '"')
    // Remove page numbers and headers
    .replace(/Page \d+ of \d+/gi, '')
    .replace(/\d+\s*\|\s*P a g e/gi, '')
    .trim()
}

// ─── LLM Parser Prompt ───────────────────────────────────────────────────────

export function buildParserPrompt(jobTitle: string, rawText: string): string {
  const cleaned = preProcess(rawText)

  return `
You are an NHS recruitment document parser. Extract structured criteria from this job specification.

RULES:
1. Extract EVERY individual criterion — do not merge multiple criteria into one
2. Separate essential from desirable criteria
3. If a criterion contains "and" joining two distinct requirements, split them
4. Classify each criterion's category:
   - "clinical" → clinical skills, patient care, procedures, assessments
   - "leadership" → team leading, mentoring, supervision, management
   - "values" → NHS values, compassion, dignity, equality, diversity
   - "qualification" → degrees, NMC registration, SPQ, certificates
   - "experience" → years of experience, specific role experience
   - "skills" → communication, IT, caseload management
   - "knowledge" → knowledge of policies, frameworks, legislation
   - "other" → anything that doesn't fit above
5. Extract 3-5 keywords per criterion that a candidate must mirror
6. Identify any NHS values mentioned explicitly
7. Detect band level from the title or description
8. Remove duplicate criteria (same requirement worded differently)

EDGE CASES:
- If essential/desirable sections aren't clearly labelled, infer from context
- "Registered nurse" is always essential
- Qualifications are typically essential unless stated otherwise
- "Desirable" often appears as "Advantageous", "Preferred", or "Would be beneficial"

JOB TITLE: ${jobTitle}

DOCUMENT:
${cleaned.slice(0, 8000)}

Return ONLY valid JSON:
{
  "essentialCriteria": [
    {
      "id": "e1",
      "text": "The exact criterion text",
      "type": "essential",
      "category": "clinical|leadership|values|qualification|experience|skills|knowledge|other",
      "keywords": ["keyword1", "keyword2", "keyword3"]
    }
  ],
  "desirableCriteria": [
    {
      "id": "d1",
      "text": "The exact criterion text",
      "type": "desirable",
      "category": "...",
      "keywords": ["..."]
    }
  ],
  "nhsValues": ["Working together", "Respect and dignity", "Commitment to quality", "Compassion", "Improving lives", "Everyone counts"],
  "bandLevel": null,
  "roleType": "community|acute|mental_health|primary_care|specialist|management|other"
}
`.trim()
}

// ─── Post-process: deduplicate + validate ─────────────────────────────────────

export function postProcessParsedSpec(raw: any): ParsedSpec {
  const essential = (raw.essentialCriteria ?? []).map((c: any, i: number) => ({
    ...c,
    id: c.id || `e${i + 1}`,
    type: "essential" as const,
    keywords: c.keywords ?? [],
  }))

  const desirable = (raw.desirableCriteria ?? []).map((c: any, i: number) => ({
    ...c,
    id: c.id || `d${i + 1}`,
    type: "desirable" as const,
    keywords: c.keywords ?? [],
  }))

  // Deduplicate by normalized text
  const seen = new Set<string>()
  const dedup = (list: ParsedCriterion[]) => list.filter(c => {
    const key = c.text.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 50)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  const essentialDeduped = dedup(essential)
  const desirableDeduped = dedup(desirable)

  return {
    essentialCriteria: essentialDeduped,
    desirableCriteria: desirableDeduped,
    nhsValues: raw.nhsValues ?? [],
    bandLevel: raw.bandLevel ?? null,
    roleType: raw.roleType ?? null,
    totalCriteria: essentialDeduped.length + desirableDeduped.length,
  }
}