// modules/ai/retry.ts
//
// Provider priority:
//   1. Google Gemini (gemini-2.5-flash) — 1,500 req/day free, 1M context
//   2. Groq (llama-3.3-70b-versatile)  — 100k tokens/day free (fallback)
//
// Smart routing:
//   - Estimates token usage
//   - Short input → single call
//   - Long input  → chunked (2 calls with delay)
//   - If primary fails → falls back to secondary provider
//   - Never retries on rate limits (429)

import {
  buildAnalysisPrompt,
  buildChunk1Prompt,
  buildChunk2Prompt,
  estimateTokens,
  type PromptInput,
} from "./prompt-builder"

// ─── Config ───────────────────────────────────────────────────────────────────

const MAX_RETRIES        = 2
const SINGLE_CALL_BUDGET = 10000
const SINGLE_MAX_OUTPUT  = 16000
const CHUNK_MAX_OUTPUT   = 12000
const CHUNK_DELAY_MS     = 2000

const SYSTEM_MESSAGE = "You are a strict NHS recruitment panel assessor. Return ONLY valid JSON. No markdown. No commentary. No code blocks."

// ─── Provider: Google Gemini ──────────────────────────────────────────────────

async function callGemini(prompt: string, maxTokens: number): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error("GEMINI_API_KEY not set")

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: `${SYSTEM_MESSAGE}\n\n${prompt}` }],
          },
        ],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: maxTokens,
          responseMimeType: "application/json",
          thinkingConfig: {
            thinkingBudget: 0,
          },
        },
      }),
    },
  )

  if (!response.ok) {
    const errBody = await response.text()
    const err = new Error(`Gemini API error: ${response.status} — ${errBody}`)
    ;(err as any).status = response.status
    throw err
  }

  const data = await response.json()

  // Gemini 2.5 Flash may return multiple parts (thinking + answer).
  // Find the last text part — that's the actual JSON response.
  const parts = data?.candidates?.[0]?.content?.parts ?? []
  let text = ""
  for (const part of parts) {
    if (part.text) text = part.text.trim()
  }

  if (!text) {
    const blockReason = data?.candidates?.[0]?.finishReason
    if (blockReason === "SAFETY") {
      throw new Error("Gemini blocked response due to safety filters")
    }
    console.error("[Gemini] Unexpected response shape:", JSON.stringify(data).slice(0, 500))
    throw new Error(`Empty response from Gemini (finishReason: ${blockReason ?? "unknown"})`)
  }

  console.log(`[Gemini] Response received: ${text.length} chars, finishReason: ${data?.candidates?.[0]?.finishReason ?? "unknown"}`)

  return text
}

// ─── Provider: Groq (fallback) ────────────────────────────────────────────────

async function callGroq(prompt: string, maxTokens: number): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) throw new Error("GROQ_API_KEY not set")

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      max_tokens: maxTokens,
      temperature: 0,
      messages: [
        { role: "system", content: SYSTEM_MESSAGE },
        { role: "user",   content: prompt },
      ],
    }),
  })

  if (!response.ok) {
    const errBody = await response.text()
    const err = new Error(`Groq API error: ${response.status} — ${errBody}`)
    ;(err as any).status = response.status
    throw err
  }

  const data = await response.json()

  const stopReason = data?.choices?.[0]?.finish_reason
  if (stopReason === "length") {
    console.warn("Groq truncated response (finish_reason: length)")
  }

  const raw = data?.choices?.[0]?.message?.content?.trim()
  if (!raw) throw new Error("Empty response from Groq")

  return raw
}

// ─── Unified caller with fallback ─────────────────────────────────────────────

async function callAI(prompt: string, maxTokens: number): Promise<string> {
  // Try Gemini first
  if (process.env.GEMINI_API_KEY) {
    try {
      return await callGemini(prompt, maxTokens)
    } catch (err: any) {
      if (err?.status === 429) {
        console.warn("[AI] Gemini rate limited. Trying Groq fallback...")
      } else {
        console.warn(`[AI] Gemini failed: ${err?.message}. Trying Groq fallback...`)
      }
    }
  }

  // Fallback to Groq
  if (process.env.GROQ_API_KEY) {
    return await callGroq(prompt, maxTokens)
  }

  throw new Error("No AI provider configured. Set GEMINI_API_KEY or GROQ_API_KEY in .env")
}

// ─── JSON parsing with repair ─────────────────────────────────────────────────

function parseJSON(raw: string): any {
  let cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "")
    .trim()

  // First try: parse as-is
  try {
    return JSON.parse(cleaned)
  } catch {
    console.warn("[JSON] Parse failed, attempting repair on", cleaned.length, "chars...")
  }

  // ── Repair truncated JSON ─────────────────────────────────────────────────

  // Remove trailing comma
  cleaned = cleaned.replace(/,\s*$/, "")

  // Count open brackets/braces and detect unclosed strings
  let openBraces = 0
  let openBrackets = 0
  let inString = false
  let escaped = false

  for (const ch of cleaned) {
    if (escaped) { escaped = false; continue }
    if (ch === "\\") { escaped = true; continue }
    if (ch === '"') { inString = !inString; continue }
    if (inString) continue
    if (ch === "{") openBraces++
    if (ch === "}") openBraces--
    if (ch === "[") openBrackets++
    if (ch === "]") openBrackets--
  }

  // Close any open string
  if (inString) cleaned += '"'

  // Remove trailing partial key-value pair after closing the string
  cleaned = cleaned.replace(/,\s*"[^"]*"?\s*:?\s*"?[^"]*$/, "")

  // Recount after cleanup
  openBraces = 0
  openBrackets = 0
  inString = false
  escaped = false

  for (const ch of cleaned) {
    if (escaped) { escaped = false; continue }
    if (ch === "\\") { escaped = true; continue }
    if (ch === '"') { inString = !inString; continue }
    if (inString) continue
    if (ch === "{") openBraces++
    if (ch === "}") openBraces--
    if (ch === "[") openBrackets++
    if (ch === "]") openBrackets--
  }

  // Remove any trailing comma again after cleanup
  cleaned = cleaned.replace(/,\s*$/, "")

  // Close open brackets and braces
  for (let i = 0; i < openBrackets; i++) cleaned += "]"
  for (let i = 0; i < openBraces; i++) cleaned += "}"

  try {
    const result = JSON.parse(cleaned)
    console.log("[JSON] Repair succeeded")
    return result
  } catch (e) {
    console.error("[JSON] Repair also failed. First 500 chars:", cleaned.slice(0, 500))
    console.error("[JSON] Last 200 chars:", cleaned.slice(-200))
    throw e
  }
}

// ─── Validation ───────────────────────────────────────────────────────────────

function isRateLimitError(err: any): boolean {
  return err?.status === 429 || err?.message?.includes("429")
}

function isPayloadTooLarge(err: any): boolean {
  return err?.status === 413 || err?.message?.includes("413")
}

function quickValidate(result: any): string[] {
  const warnings: string[] = []

  if (!result) {
    warnings.push("result is null")
    return warnings
  }

  if (!result.nhsValues || result.nhsValues.length < 1)
    warnings.push("nhsValues missing")

  if (!result.breakdown?.starCompleteness?.examples?.length)
    warnings.push("starCompleteness.examples missing")

  const expected =
    (result.criteriaInventory?.essentialTotal ?? 0) +
    (result.criteriaInventory?.desirableTotal ?? 0)
  const actual = result.criteriaAnalysis?.length ?? 0

  if (expected > 0 && actual < expected * 0.8)
    warnings.push(`criteriaAnalysis incomplete: ${actual} of ~${expected}`)

  return warnings
}

// ─── Single-call mode ─────────────────────────────────────────────────────────

async function singleCallAnalysis(input: PromptInput): Promise<any> {
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const prompt = buildAnalysisPrompt(input)
      const raw = await callAI(prompt, SINGLE_MAX_OUTPUT)
      const result = parseJSON(raw)

      const warnings = quickValidate(result)
      if (warnings.length > 0) {
        console.warn(`INCOMPLETE_AI_RESULT (attempt ${attempt}):`, warnings)
        if (attempt < MAX_RETRIES) continue
        console.error("MAX_RETRIES reached with incomplete result. Saving partial.")
      }

      return result

    } catch (err: any) {
      lastError = err
      console.error(`Single-call attempt ${attempt} failed:`, err?.message)

      // Never retry on rate limits or payload-too-large
      if (isRateLimitError(err)) throw err
      if (isPayloadTooLarge(err)) throw err

      if (attempt < MAX_RETRIES) continue
    }
  }

  throw lastError ?? new Error("Single-call analysis failed")
}

// ─── Chunked mode ─────────────────────────────────────────────────────────────

async function chunkedAnalysis(input: PromptInput): Promise<any> {
  console.log("[CHUNKED] Input too large for single call — splitting into 2 chunks")

  // ── Chunk 1: Criteria, STAR, Specificity, Seniority, ATS, Scan ────────────
  let chunk1Result: any

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const prompt = buildChunk1Prompt(input)
      console.log(`[CHUNK1] Attempt ${attempt}, estimated tokens: ${estimateTokens(prompt)}`)

      const raw = await callAI(prompt, CHUNK_MAX_OUTPUT)
      chunk1Result = parseJSON(raw)

      if (!chunk1Result?.criteriaInventory) {
        console.warn(`[CHUNK1] Missing criteriaInventory on attempt ${attempt}`)
        if (attempt < MAX_RETRIES) continue
      }

      break

    } catch (err: any) {
      console.error(`[CHUNK1] Attempt ${attempt} failed:`, err?.message)
      if (isRateLimitError(err) || attempt >= MAX_RETRIES) {
        throw new Error(`Chunk 1 failed: ${err?.message}`)
      }
    }
  }

  // ── Delay between chunks ──────────────────────────────────────────────────
  console.log(`[CHUNKED] Waiting ${CHUNK_DELAY_MS}ms before chunk 2...`)
  await new Promise(resolve => setTimeout(resolve, CHUNK_DELAY_MS))

  // ── Build chunk 1 summary for context ─────────────────────────────────────
  const cov = chunk1Result?.breakdown?.criteriaCoverage ?? {}
  const star = chunk1Result?.breakdown?.starCompleteness ?? {}

  const chunk1Summary = {
    seniority:         chunk1Result?.seniority ?? { demonstratedBand: null, targetBand: null, bandGap: 0 },
    criteriaInventory: chunk1Result?.criteriaInventory ?? { essentialTotal: 0, desirableTotal: 0 },
    essentialMet:      cov.essentialMet ?? 0,
    essentialNotMet:   cov.essentialNotMet ?? 0,
    desirableMet:      cov.desirableMet ?? 0,
    starExamplesFound: star.examplesFound ?? 0,
    resultsAbsent:     star.resultsConsistentlyAbsent ?? false,
  }

  // ── Chunk 2: Values, Language, Risk, Coaching, Strengths/Weaknesses ───────
  let chunk2Result: any

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const prompt = buildChunk2Prompt(input, chunk1Summary)
      console.log(`[CHUNK2] Attempt ${attempt}, estimated tokens: ${estimateTokens(prompt)}`)

      const raw = await callAI(prompt, CHUNK_MAX_OUTPUT)
      chunk2Result = parseJSON(raw)

      if (!chunk2Result?.nhsValues?.length) {
        console.warn(`[CHUNK2] Missing nhsValues on attempt ${attempt}`)
        if (attempt < MAX_RETRIES) continue
      }

      break

    } catch (err: any) {
      console.error(`[CHUNK2] Attempt ${attempt} failed:`, err?.message)
      if (isRateLimitError(err) || attempt >= MAX_RETRIES) {
        console.error("[CHUNK2] Failed. Returning partial result from chunk 1.")
        chunk2Result = {}
      }
    }
  }

  // ── Merge chunks ──────────────────────────────────────────────────────────
  const merged = {
    seniority:         chunk1Result?.seniority ?? { demonstratedBand: null, targetBand: null, bandGap: 0 },
    criteriaInventory: chunk1Result?.criteriaInventory ?? { essentialTotal: 0, desirableTotal: 0 },
    criteriaAnalysis:  chunk1Result?.criteriaAnalysis ?? [],
    breakdown: {
      criteriaCoverage: chunk1Result?.breakdown?.criteriaCoverage ?? { essentialMet: 0, essentialPartial: 0, essentialNotMet: 0, desirableMet: 0, desirablePartial: 0, desirableNotMet: 0 },
      starCompleteness: chunk1Result?.breakdown?.starCompleteness ?? { examplesFound: 0, resultsConsistentlyAbsent: false, examples: [] },
      specificity:      chunk1Result?.breakdown?.specificity ?? { totalClaims: 0, tier1Count: 0, tier2Count: 0, tier3Count: 0 },
      languageMirroring: chunk2Result?.languageMirroring ?? { specPhrasesTotal: 0, present: 0, paraphrased: 0, absent: 0, phrasesFound: [], phrasesMissing: [] },
    },
    atsMatch:      chunk1Result?.atsMatch ?? undefined,
    statementScan: chunk1Result?.statementScan ?? undefined,

    confidence:          chunk2Result?.confidence ?? 0,
    nhsValues:           chunk2Result?.nhsValues ?? [],
    rejectionRisk:       chunk2Result?.rejectionRisk ?? undefined,
    operationalRealism:  chunk2Result?.operationalRealism ?? undefined,
    bandCoaching:        chunk2Result?.bandCoaching ?? undefined,
    strengths:           chunk2Result?.strengths ?? [],
    weaknesses:          chunk2Result?.weaknesses ?? [],
    missingCriteria:     chunk2Result?.missingCriteria ?? [],
    recommendations:     chunk2Result?.recommendations ?? [],
    roleMatchSuggestions: chunk2Result?.roleMatchSuggestions ?? [],
  }

  console.log("[CHUNKED] Merge complete.")
  return merged
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function getValidatedAIResult(input: PromptInput): Promise<any> {
  const fullPrompt = buildAnalysisPrompt(input)
  const estimatedTotal = estimateTokens(fullPrompt) + SINGLE_MAX_OUTPUT

  console.log(`[AI] Estimated total tokens: ${estimatedTotal} (budget: ${SINGLE_CALL_BUDGET})`)
  console.log(`[AI] Providers: ${process.env.GEMINI_API_KEY ? "Gemini (primary)" : "no Gemini"} | ${process.env.GROQ_API_KEY ? "Groq (fallback)" : "no Groq"}`)

  if (estimatedTotal <= SINGLE_CALL_BUDGET) {
    try {
      return await singleCallAnalysis(input)
    } catch (err: any) {
      if (isPayloadTooLarge(err)) {
        console.warn("[AI] Single call too large — falling back to chunked mode")
      } else {
        throw err
      }
    }
  }

  return await chunkedAnalysis(input)
}