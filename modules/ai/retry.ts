// modules/ai/retry.ts
//
// Provider priority:
//   1. Google Gemini (gemini-2.5-flash) — 1M context, 1,500 req/day free
//   2. Groq (llama-3.3-70b-versatile)  — 100k tokens/day free (fallback)
//
// Smart routing:
//   - Estimates token usage
//   - Short/medium input → single call (covers 99% of NHS job specs)
//   - Very large input   → truncates to fit, never chunks
//   - If primary fails   → falls back to secondary provider
//   - Never retries on rate limits (429)

import {
  buildAnalysisPrompt,
  buildChunk1Prompt,
  buildChunk2Prompt,
  estimateTokens,
  type PromptInput,
} from "./prompt-builder"

// ─── Config ───────────────────────────────────────────────────────────────────

const MAX_RETRIES = 2
// Gemini 2.5 Flash has 1M context — use a generous budget.
// We only chunk if the prompt itself is enormous (>40k tokens input).
// This prevents chunking for typical NHS job specs (3k-15k tokens).
const SINGLE_CALL_BUDGET = 45_000   // input tokens only — not including output
const SINGLE_MAX_OUTPUT  = 25_000
const CHUNK_MAX_OUTPUT   = 20_000
const CHUNK_DELAY_MS     = 8_000

// Truncate input to this character limit before sending
// ~40k chars ≈ 10k tokens — keeps us well within single-call budget
const MAX_INPUT_CHARS = 45_000

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
          thinkingConfig: { thinkingBudget: 0 },
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
    if (blockReason === "SAFETY") throw new Error("Gemini blocked response due to safety filters")
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

  const data     = await response.json()
  const stopReason = data?.choices?.[0]?.finish_reason
  if (stopReason === "length") console.warn("Groq truncated response (finish_reason: length)")

  const raw = data?.choices?.[0]?.message?.content?.trim()
  if (!raw) throw new Error("Empty response from Groq")
  return raw
}

// ─── Unified caller with fallback ─────────────────────────────────────────────

async function callAI(prompt: string, maxTokens: number): Promise<string> {
  const estimatedInputTokens = estimateTokens(prompt)
  const GROQ_INPUT_LIMIT     = 8_000

  if (process.env.GEMINI_API_KEY) {
    // Retry Gemini up to 3 times on 503 (temporary overload) with backoff
    // Only fall back to Groq on 429 (rate limit) or persistent failure
    const GEMINI_RETRIES   = 3
    const GEMINI_RETRY_DELAYS = [3000, 8000, 15000] // ms between retries
    let lastGeminiError: any

    for (let attempt = 1; attempt <= GEMINI_RETRIES; attempt++) {
      try {
        return await callGemini(prompt, maxTokens)
      } catch (err: any) {
        lastGeminiError = err

        if (err?.status === 429) {
          // Rate limited — no point retrying, fall through to Groq
          console.warn("[AI] Gemini rate limited (429). Trying Groq fallback...")
          break
        }

        if (err?.status === 503 && attempt < GEMINI_RETRIES) {
          // Temporary overload — wait and retry Gemini
          const delay = GEMINI_RETRY_DELAYS[attempt - 1]
          console.warn(`[AI] Gemini 503 (attempt ${attempt}/${GEMINI_RETRIES}). Retrying in ${delay}ms...`)
          await new Promise(resolve => setTimeout(resolve, delay))
          continue
        }

        // Other error or final attempt — fall through to Groq
        console.warn(`[AI] Gemini failed (attempt ${attempt}): ${err?.message}. Trying Groq fallback...`)
        break
      }
    }
  }

  if (process.env.GROQ_API_KEY) {
    if (estimatedInputTokens > GROQ_INPUT_LIMIT) {
      throw new Error(
        `Payload too large for Groq fallback (estimated ${estimatedInputTokens} input tokens, limit ~${GROQ_INPUT_LIMIT}). ` +
        `Gemini must be available for large analyses.`
      )
    }
    return await callGroq(prompt, maxTokens)
  }

  throw new Error("No AI provider configured. Set GEMINI_API_KEY or GROQ_API_KEY in .env")
}

// ─── Input truncation ─────────────────────────────────────────────────────────
// Truncates the job spec portion of the input to stay within budget.
// Criteria and statement are preserved — only the raw job spec is trimmed.

function truncateInput(input: PromptInput): PromptInput {
  const truncated = { ...input }

  if ((truncated.jobSpec?.length ?? 0) > MAX_INPUT_CHARS) {
    console.warn(
      `[AI] jobSpec truncated from ${truncated.jobSpec!.length} to ${MAX_INPUT_CHARS} chars ` +
      `to avoid chunking. All criteria fields preserved.`
    )
    truncated.jobSpec = truncated.jobSpec!.slice(0, MAX_INPUT_CHARS) +
      '\n\n[Job description truncated — too long. Essential and desirable criteria above are complete.]'
  }

  return truncated
}

// ─── JSON parsing with repair ─────────────────────────────────────────────────

function parseJSON(raw: string): any {
  let cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "")
    .trim()

  try { return JSON.parse(cleaned) } catch {
    console.warn("[JSON] Parse failed, attempting repair on", cleaned.length, "chars...")
  }

  cleaned = cleaned.replace(/,\s*$/, "")

  let openBraces = 0, openBrackets = 0, inString = false, escaped = false
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

  if (inString) cleaned += '"'
  cleaned = cleaned.replace(/,\s*"[^"]*"?\s*:?\s*"?[^"]*$/, "")

  openBraces = 0; openBrackets = 0; inString = false; escaped = false
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

  cleaned = cleaned.replace(/,\s*$/, "")
  for (let i = 0; i < openBrackets; i++) cleaned += "]"
  for (let i = 0; i < openBraces; i++) cleaned += "}"

  try {
    const result = JSON.parse(cleaned)
    console.log("[JSON] Repair succeeded")
    return result
  } catch (e) {
    console.error("[JSON] Repair also failed. First 500 chars:", cleaned.slice(0, 500))
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
  if (!result) { warnings.push("result is null"); return warnings }
  if (!result.nhsValues || result.nhsValues.length < 1) warnings.push("nhsValues missing")
  if (!result.breakdown?.starCompleteness?.examples?.length) warnings.push("starCompleteness.examples missing")

  const expected = (result.criteriaInventory?.essentialTotal ?? 0) + (result.criteriaInventory?.desirableTotal ?? 0)
  const actual   = result.criteriaAnalysis?.length ?? 0
  if (expected > 0 && actual < expected * 0.8) warnings.push(`criteriaAnalysis incomplete: ${actual} of ~${expected}`)

  return warnings
}

// ─── Single-call mode ─────────────────────────────────────────────────────────

async function singleCallAnalysis(input: PromptInput): Promise<any> {
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const prompt = buildAnalysisPrompt(input)
      const raw    = await callAI(prompt, SINGLE_MAX_OUTPUT)
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
      if (isRateLimitError(err) || isPayloadTooLarge(err)) throw err
      if (attempt < MAX_RETRIES) continue
    }
  }

  throw lastError ?? new Error("Single-call analysis failed")
}

// ─── Chunked mode (kept for truly enormous inputs) ────────────────────────────
// Only triggers when jobSpec > 40k chars even after truncation.
// Fixed merge: arrays are concatenated, not overwritten.

async function chunkedAnalysis(input: PromptInput): Promise<any> {
  console.log("[CHUNKED] Input too large for single call — splitting into 2 chunks")

  let chunk1Result: any
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const prompt = buildChunk1Prompt(input)
      console.log(`[CHUNK1] Attempt ${attempt}, estimated tokens: ${estimateTokens(prompt)}`)
      const raw  = await callAI(prompt, CHUNK_MAX_OUTPUT)
      chunk1Result = parseJSON(raw)
      if (!chunk1Result?.criteriaInventory) {
        console.warn(`[CHUNK1] Missing criteriaInventory on attempt ${attempt}`)
        if (attempt < MAX_RETRIES) continue
      }
      break
    } catch (err: any) {
      console.error(`[CHUNK1] Attempt ${attempt} failed:`, err?.message)
      if (isRateLimitError(err) || attempt >= MAX_RETRIES) throw new Error(`Chunk 1 failed: ${err?.message}`)
    }
  }

  console.log(`[CHUNKED] Waiting ${CHUNK_DELAY_MS}ms before chunk 2...`)
  await new Promise(resolve => setTimeout(resolve, CHUNK_DELAY_MS))

  const cov  = chunk1Result?.breakdown?.criteriaCoverage ?? {}
  const star = chunk1Result?.breakdown?.starCompleteness ?? {}

  const chunk1Summary = {
    seniority:         chunk1Result?.seniority         ?? { demonstratedBand: null, targetBand: null, bandGap: 0 },
    criteriaInventory: chunk1Result?.criteriaInventory ?? { essentialTotal: 0, desirableTotal: 0 },
    essentialMet:      cov.essentialMet      ?? 0,
    essentialNotMet:   cov.essentialNotMet   ?? 0,
    desirableMet:      cov.desirableMet      ?? 0,
    starExamplesFound: star.examplesFound    ?? 0,
    resultsAbsent:     star.resultsConsistentlyAbsent ?? false,
  }

  let chunk2Result: any = {}
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const prompt = buildChunk2Prompt(input, chunk1Summary)
      console.log(`[CHUNK2] Attempt ${attempt}, estimated tokens: ${estimateTokens(prompt)}`)
      const raw  = await callAI(prompt, CHUNK_MAX_OUTPUT)
      chunk2Result = parseJSON(raw)
      if (!chunk2Result?.nhsValues?.length) {
        console.warn(`[CHUNK2] Missing nhsValues on attempt ${attempt}`)
        if (attempt < MAX_RETRIES) continue
      }
      break
    } catch (err: any) {
      console.error(`[CHUNK2] Attempt ${attempt} failed:`, err?.message)
      if (isRateLimitError(err) || attempt >= MAX_RETRIES) {
        console.error("[CHUNK2] Failed. Using partial chunk 1 result.")
        break
      }
    }
  }

  // ── Merge — arrays concatenated, not overwritten ──────────────────────────
  const merged = {
    seniority:         chunk1Result?.seniority         ?? { demonstratedBand: null, targetBand: null, bandGap: 0 },
    criteriaInventory: chunk1Result?.criteriaInventory ?? { essentialTotal: 0, desirableTotal: 0 },

    // Concatenate criteriaAnalysis from both chunks (chunk2 may add more rows)
    criteriaAnalysis: [
      ...(chunk1Result?.criteriaAnalysis ?? []),
      ...(chunk2Result?.criteriaAnalysis ?? []),
    ],

    breakdown: {
      criteriaCoverage:  chunk1Result?.breakdown?.criteriaCoverage  ?? { essentialMet: 0, essentialPartial: 0, essentialNotMet: 0, desirableMet: 0, desirablePartial: 0, desirableNotMet: 0 },
      starCompleteness:  chunk1Result?.breakdown?.starCompleteness  ?? { examplesFound: 0, resultsConsistentlyAbsent: false, examples: [] },
      specificity:       chunk1Result?.breakdown?.specificity       ?? { totalClaims: 0, tier1Count: 0, tier2Count: 0, tier3Count: 0 },
      languageMirroring: chunk2Result?.languageMirroring            ?? { specPhrasesTotal: 0, present: 0, paraphrased: 0, absent: 0, phrasesFound: [], phrasesMissing: [] },
    },

    atsMatch:      chunk1Result?.atsMatch      ?? undefined,
    statementScan: chunk1Result?.statementScan ?? undefined,
    confidence:    chunk2Result?.confidence    ?? 0,

    nhsValues:     chunk2Result?.nhsValues     ?? [],
    rejectionRisk: chunk2Result?.rejectionRisk ?? undefined,
    operationalRealism:   chunk2Result?.operationalRealism   ?? undefined,
    bandCoaching:         chunk2Result?.bandCoaching         ?? undefined,

    // Concatenate array fields from both chunks
    strengths:            [...(chunk1Result?.strengths        ?? []), ...(chunk2Result?.strengths        ?? [])],
    weaknesses:           [...(chunk1Result?.weaknesses       ?? []), ...(chunk2Result?.weaknesses       ?? [])],
    missingCriteria:      [...(chunk1Result?.missingCriteria  ?? []), ...(chunk2Result?.missingCriteria  ?? [])],
    recommendations:      [...(chunk1Result?.recommendations  ?? []), ...(chunk2Result?.recommendations  ?? [])],
    roleMatchSuggestions: [...(chunk1Result?.roleMatchSuggestions ?? []), ...(chunk2Result?.roleMatchSuggestions ?? [])],
  }

  console.log(`[CHUNKED] Merge complete. criteriaAnalysis rows: ${merged.criteriaAnalysis.length}`)
  return merged
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function getValidatedAIResult(input: PromptInput): Promise<any> {
  // Truncate input first — prevents unnecessary chunking for long job specs
  const safeInput      = truncateInput(input)
  const fullPrompt     = buildAnalysisPrompt(safeInput)
  const estimatedInput = estimateTokens(fullPrompt)   // input tokens only

  console.log(`[AI] Estimated total tokens: ${estimatedInput} (budget: ${SINGLE_CALL_BUDGET})`)
  console.log(`[AI] Providers: ${process.env.GEMINI_API_KEY ? "Gemini (primary)" : "no Gemini"} | ${process.env.GROQ_API_KEY ? "Groq (fallback)" : "no Groq"}`)

  // Single call covers 99% of analyses — chunking only for truly massive inputs
  if (estimatedInput <= SINGLE_CALL_BUDGET) {
    try {
      return await singleCallAnalysis(safeInput)
    } catch (err: any) {
      if (isPayloadTooLarge(err)) {
        console.warn("[AI] Single call too large — falling back to chunked mode")
      } else {
        throw err
      }
    }
  }

  return await chunkedAnalysis(safeInput)
}