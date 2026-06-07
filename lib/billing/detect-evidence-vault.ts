// lib/billing/detect-evidence-vault.ts
//
// Detects EvidenceVault from CV + statement, then cross-references each entry
// against the job description, essential criteria, and desirable criteria.
// Each entry gains:
//   - present:     found in CV/statement
//   - relevance:   "essential" | "desirable" | "bonus" | "not-required"
//   - matchStatus: "matched" | "gap" | "unrequired-present" | "absent"
//   - jobContext:  quote from job spec mentioning this

import { emptyVault, type EvidenceEntry } from "@/lib/billing/evidence-vault"

// ─────────────────────────────────────────────────────────────────────────────
// Extended types
// ─────────────────────────────────────────────────────────────────────────────

export type EvidenceRelevance   = "essential" | "desirable" | "bonus" | "not-required"
export type EvidenceMatchStatus = "matched" | "gap" | "unrequired-present" | "absent"

export interface RichEvidenceEntry extends EvidenceEntry {
  relevance:   EvidenceRelevance
  matchStatus: EvidenceMatchStatus
  jobContext?: string  // phrase from job spec, max 15 words
}

export interface RichEvidenceVault {
  employment: Record<"nhs" | "careHome" | "research" | "volunteering",       RichEvidenceEntry>
  clinical:   Record<"venepuncture" | "ecg" | "vitals" | "specimenHandling", RichEvidenceEntry>
  behaviour:  Record<"teamwork" | "communication" | "compassion" | "respect", RichEvidenceEntry>
  leadership: Record<"supervision" | "mentoring" | "teaching",                RichEvidenceEntry>
}

// ─────────────────────────────────────────────────────────────────────────────
// Prompts
// ─────────────────────────────────────────────────────────────────────────────

function buildDetectionPrompt(cv: string, statement: string): string {
  return `
You are an NHS recruitment evidence extractor.

Read the CV and supporting statement. For each evidence item decide:
- "present": true if there is ANY mention, example, or clear implication
- "present": false if there is no evidence at all
- "detail": short quote or phrase showing where you found it (max 12 words), or "" if absent

Return ONLY valid JSON — no markdown, no preamble.

CV:
${cv.slice(0, 3000)}

SUPPORTING STATEMENT:
${statement.slice(0, 2500)}

JSON shape:
{
  "employment": {
    "nhs":          { "present": true|false, "detail": "..." },
    "careHome":     { "present": true|false, "detail": "..." },
    "research":     { "present": true|false, "detail": "..." },
    "volunteering": { "present": true|false, "detail": "..." }
  },
  "clinical": {
    "venepuncture":     { "present": true|false, "detail": "..." },
    "ecg":              { "present": true|false, "detail": "..." },
    "vitals":           { "present": true|false, "detail": "..." },
    "specimenHandling": { "present": true|false, "detail": "..." }
  },
  "behaviour": {
    "teamwork":      { "present": true|false, "detail": "..." },
    "communication": { "present": true|false, "detail": "..." },
    "compassion":    { "present": true|false, "detail": "..." },
    "respect":       { "present": true|false, "detail": "..." }
  },
  "leadership": {
    "supervision": { "present": true|false, "detail": "..." },
    "mentoring":   { "present": true|false, "detail": "..." },
    "teaching":    { "present": true|false, "detail": "..." }
  }
}`.trim()
}

function buildJobMatchPrompt(
  jobDescription: string,
  essentialCriteria: string,
  desirableCriteria: string,
  personSpec: string,
): string {
  const jobContext = [
    jobDescription,
    essentialCriteria ? `ESSENTIAL CRITERIA:\n${essentialCriteria}` : "",
    desirableCriteria ? `DESIRABLE CRITERIA:\n${desirableCriteria}` : "",
    personSpec        ? `PERSON SPECIFICATION:\n${personSpec}`       : "",
  ].filter(Boolean).join("\n\n").slice(0, 4000)

  return `
You are an NHS job specification analyser.

Read the job description, essential criteria, desirable criteria, and person specification.
For each evidence item decide how much this specific job requires it:

- "essential"    — explicitly listed as essential/required, or clearly assumed for safe practice in this role
- "desirable"    — listed as desirable/advantageous/preferred
- "bonus"        — not listed but would strengthen this application
- "not-required" — irrelevant or not applicable to this role

Also provide "jobContext": a short phrase (max 15 words) quoting or paraphrasing where in the
job spec this appears. Leave "" if not mentioned at all.

Return ONLY valid JSON — no markdown, no preamble.

JOB SPECIFICATION:
${jobContext}

JSON shape:
{
  "employment": {
    "nhs":          { "relevance": "essential|desirable|bonus|not-required", "jobContext": "..." },
    "careHome":     { "relevance": "essential|desirable|bonus|not-required", "jobContext": "..." },
    "research":     { "relevance": "essential|desirable|bonus|not-required", "jobContext": "..." },
    "volunteering": { "relevance": "essential|desirable|bonus|not-required", "jobContext": "..." }
  },
  "clinical": {
    "venepuncture":     { "relevance": "essential|desirable|bonus|not-required", "jobContext": "..." },
    "ecg":              { "relevance": "essential|desirable|bonus|not-required", "jobContext": "..." },
    "vitals":           { "relevance": "essential|desirable|bonus|not-required", "jobContext": "..." },
    "specimenHandling": { "relevance": "essential|desirable|bonus|not-required", "jobContext": "..." }
  },
  "behaviour": {
    "teamwork":      { "relevance": "essential|desirable|bonus|not-required", "jobContext": "..." },
    "communication": { "relevance": "essential|desirable|bonus|not-required", "jobContext": "..." },
    "compassion":    { "relevance": "essential|desirable|bonus|not-required", "jobContext": "..." },
    "respect":       { "relevance": "essential|desirable|bonus|not-required", "jobContext": "..." }
  },
  "leadership": {
    "supervision": { "relevance": "essential|desirable|bonus|not-required", "jobContext": "..." },
    "mentoring":   { "relevance": "essential|desirable|bonus|not-required", "jobContext": "..." },
    "teaching":    { "relevance": "essential|desirable|bonus|not-required", "jobContext": "..." }
  }
}`.trim()
}

// ─────────────────────────────────────────────────────────────────────────────
// AI calls — Gemini primary, Groq fallback
// ─────────────────────────────────────────────────────────────────────────────

async function callGemini(prompt: string): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 1024 },
      }),
    }
  )
  if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`)
  const data = await res.json()
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
  if (!text) throw new Error("Gemini returned empty response")
  return text
}

async function callGroq(prompt: string): Promise<string> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
      max_tokens: 1024,
    }),
  })
  if (!res.ok) throw new Error(`Groq HTTP ${res.status}`)
  const data = await res.json()
  return data.choices[0].message.content as string
}

async function callAI(prompt: string): Promise<string> {
  if (process.env.GEMINI_API_KEY) {
    try {
      return await callGemini(prompt)
    } catch (e) {
      console.warn("[EvidenceVault] Gemini failed, falling back to Groq:", e)
    }
  }
  return await callGroq(prompt)
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const LABELS: Record<string, Record<string, string>> = {
  employment: { nhs: "NHS", careHome: "Care Home", research: "Research", volunteering: "Volunteering" },
  clinical:   { venepuncture: "Venepuncture", ecg: "ECG", vitals: "Vitals", specimenHandling: "Specimen Handling" },
  behaviour:  { teamwork: "Teamwork", communication: "Communication", compassion: "Compassion", respect: "Respect" },
  leadership: { supervision: "Supervision", mentoring: "Mentoring", teaching: "Teaching" },
}

const CATEGORIES = ["employment", "clinical", "behaviour", "leadership"] as const

function safeParseJSON(raw: string): any | null {
  try {
    return JSON.parse(raw.replace(/```json|```/g, "").trim())
  } catch {
    return null
  }
}

function deriveMatchStatus(
  present: boolean,
  relevance: EvidenceRelevance,
): EvidenceMatchStatus {
  if (present  && relevance === "essential")    return "matched"
  if (present  && relevance === "desirable")    return "matched"
  if (present  && relevance === "bonus")        return "matched"
  if (!present && relevance === "essential")    return "gap"
  if (!present && relevance === "desirable")    return "gap"
  if (present  && relevance === "not-required") return "unrequired-present"
  return "absent"
}

// ─────────────────────────────────────────────────────────────────────────────
// Merge both AI responses into RichEvidenceVault
// ─────────────────────────────────────────────────────────────────────────────

function mergeIntoRichVault(
  detectionParsed: any,
  jobMatchParsed:  any,
): RichEvidenceVault {
  const base = emptyVault()
  const rich: any = {}

  for (const cat of CATEGORIES) {
    rich[cat] = {}
    for (const key of Object.keys(base[cat])) {
      const detected = detectionParsed?.[cat]?.[key] ?? {}
      const jobMatch  = jobMatchParsed?.[cat]?.[key]  ?? {}

      const present: boolean = Boolean(detected.present)

      const relevance: EvidenceRelevance = (
        ["essential", "desirable", "bonus", "not-required"].includes(jobMatch.relevance)
          ? jobMatch.relevance
          : "bonus"
      ) as EvidenceRelevance

      rich[cat][key] = {
        label:      LABELS[cat]?.[key] ?? key,
        present,
        detail:     typeof detected.detail    === "string" ? detected.detail.slice(0, 120)    : "",
        jobContext: typeof jobMatch.jobContext === "string" ? jobMatch.jobContext.slice(0, 120) : "",
        relevance,
        matchStatus: deriveMatchStatus(present, relevance),
        addedAt:    new Date().toISOString(),
      } satisfies RichEvidenceEntry
    }
  }

  return rich as RichEvidenceVault
}

// ─────────────────────────────────────────────────────────────────────────────
// Public export
// ─────────────────────────────────────────────────────────────────────────────

export interface DetectEvidenceVaultInput {
  cv:                string
  statement:         string
  jobDescription:    string
  essentialCriteria: string
  desirableCriteria: string
  personSpec:        string
}

export async function detectEvidenceVault(
  input: DetectEvidenceVaultInput,
): Promise<RichEvidenceVault> {
  const { cv, statement, jobDescription, essentialCriteria, desirableCriteria, personSpec } = input

  if (!cv && !statement) {
    console.warn("[EvidenceVault] No CV or statement — returning empty vault")
    return mergeIntoRichVault({}, {})
  }

  // Run both AI calls in parallel — saves ~1–2 seconds
  const [detectionRaw, jobMatchRaw] = await Promise.allSettled([
    callAI(buildDetectionPrompt(cv, statement)),
    callAI(buildJobMatchPrompt(jobDescription, essentialCriteria, desirableCriteria, personSpec)),
  ])

  const detectionParsed = detectionRaw.status === "fulfilled"
    ? safeParseJSON(detectionRaw.value) : null

  const jobMatchParsed  = jobMatchRaw.status === "fulfilled"
    ? safeParseJSON(jobMatchRaw.value)  : null

  if (!detectionParsed) console.warn("[EvidenceVault] Detection parse failed")
  if (!jobMatchParsed)  console.warn("[EvidenceVault] Job match parse failed")

  return mergeIntoRichVault(detectionParsed ?? {}, jobMatchParsed ?? {})
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility — critical gaps for the popup "Why not 90%?" block
// Only surfaces gaps for things the job actually asks for
// ─────────────────────────────────────────────────────────────────────────────

export function extractCriticalGaps(vault: RichEvidenceVault): string[] {
  const essentialGaps: string[] = []
  const desirableGaps: string[] = []

  for (const cat of CATEGORIES) {
    for (const entry of Object.values(vault[cat]) as RichEvidenceEntry[]) {
      if (entry.matchStatus !== "gap") continue
      const label = entry.jobContext
        ? `${entry.label} — "${entry.jobContext}"`
        : entry.label
      if (entry.relevance === "essential") essentialGaps.push(label)
      if (entry.relevance === "desirable") desirableGaps.push(label)
    }
  }

  // Show essential gaps first; fall back to desirable if none
  const gaps = essentialGaps.length > 0 ? essentialGaps : desirableGaps
  return gaps.slice(0, 6)
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility — summary counts for the popup header badge
// ─────────────────────────────────────────────────────────────────────────────

export interface VaultMatchSummary {
  essentialMatched:  number
  essentialTotal:    number
  desirableMatched:  number
  desirableTotal:    number
  coveragePercent:   number  // weighted: essential 70%, desirable 30%
}

export function summariseVaultMatch(vault: RichEvidenceVault): VaultMatchSummary {
  let essentialMatched = 0, essentialTotal = 0
  let desirableMatched = 0, desirableTotal = 0

  for (const cat of CATEGORIES) {
    for (const entry of Object.values(vault[cat]) as RichEvidenceEntry[]) {
      if (entry.relevance === "essential") {
        essentialTotal++
        if (entry.matchStatus === "matched") essentialMatched++
      }
      if (entry.relevance === "desirable") {
        desirableTotal++
        if (entry.matchStatus === "matched") desirableMatched++
      }
    }
  }

  const essentialPct = essentialTotal > 0 ? essentialMatched / essentialTotal : 1
  const desirablePct = desirableTotal > 0 ? desirableMatched / desirableTotal : 1
  const coveragePercent = Math.round((essentialPct * 0.7 + desirablePct * 0.3) * 100)

  return { essentialMatched, essentialTotal, desirableMatched, desirableTotal, coveragePercent }
}