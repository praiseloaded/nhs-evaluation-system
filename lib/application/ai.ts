// lib/application/ai.ts
//
// Shared AI caller for all Application Builder prompts.
// Tries multiple Gemini models in order — if one is overloaded (503),
// rate-limited (429), or unavailable (404), falls back to the next.

const GEMINI_MODELS = [
  "gemini-2.5-flash",
];

// All of these are worth retrying with the next model
const RETRYABLE_STATUSES = new Set([404, 429, 500, 502, 503, 504])

async function callModel(
  model: string,
  prompt: string,
  maxTokens: number,
  apiKey: string,
): Promise<{ success: boolean; data?: any; status?: number; error?: string }> {
  let response: Response
  try {
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: maxTokens,
            responseMimeType: "application/json",
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      },
    )
  } catch (err: any) {
    // fetch failed = network error (DNS, firewall, no internet)
    // Do NOT stop here — try next model in case it's a transient blip
    console.warn(`[AI] ${model} — network error: ${err?.message}`)
    return { success: false, status: 503, error: `network error: ${err?.message}` }
  }

  if (!response.ok) {
    const err = await response.text()
    console.warn(`[AI] ${model} — HTTP ${response.status}: ${err.slice(0, 120)}`)
    return { success: false, status: response.status, error: err }
  }

  const data = await response.json()
  const parts = data?.candidates?.[0]?.content?.parts ?? []
  let text = ""
  for (const part of parts) {
    if (part.text) text = part.text.trim()
  }

  if (!text) {
    const reason = data?.candidates?.[0]?.finishReason ?? "unknown"
    console.warn(`[AI] ${model} — empty response (finishReason: ${reason})`)
    return { success: false, status: 200, error: `empty response — finishReason: ${reason}` }
  }

  const parsed = tryParseJSON(text)
  if (parsed !== null) {
    return { success: true, data: parsed }
  }

  console.warn(`[AI] ${model} — JSON parse failed. Raw (first 300 chars): ${text.slice(0, 300)}`)
  return { success: false, status: 200, error: `JSON parse failed. Raw: ${text.slice(0, 200)}` }
}

// ─── Robust JSON extraction ─────────────────────────────────────────────────
// Gemini occasionally wraps JSON in markdown fences, adds trailing commentary,
// includes trailing commas, or leaves raw control characters inside strings —
// all of which break a direct JSON.parse despite responseMimeType: "application/json".
// Try multiple recovery strategies before giving up.
function tryParseJSON(raw: string): any | null {
  let text = raw.trim()

  // 1. Direct parse
  try { return JSON.parse(text) } catch {}

  // 2. Strip markdown code fences (```json ... ``` or ``` ... ```)
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenced) {
    try { return JSON.parse(fenced[1].trim()) } catch {}
  }

  // 3. Extract the largest {...} or [...] block (handles leading/trailing commentary)
  const firstBrace = text.search(/[{\[]/)
  if (firstBrace >= 0) {
    const openChar  = text[firstBrace]
    const closeChar = openChar === '{' ? '}' : ']'
    const lastClose = text.lastIndexOf(closeChar)
    if (lastClose > firstBrace) {
      const candidate = text.slice(firstBrace, lastClose + 1)
      try { return JSON.parse(candidate) } catch {}

      // 4. Remove trailing commas before } or ] — common Gemini artifact
      const noTrailingCommas = candidate.replace(/,(\s*[}\]])/g, '$1')
      try { return JSON.parse(noTrailingCommas) } catch {}

      // 5. Strip control characters that break JSON.parse (raw newlines inside strings etc.)
      const cleaned = noTrailingCommas.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
      try { return JSON.parse(cleaned) } catch {}
    }
  }

  return null
}

export async function callGeminiJSON(prompt: string, maxTokens = 4000): Promise<any> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error("GEMINI_API_KEY not set")

  const errors: string[] = []

  for (const model of GEMINI_MODELS) {
    console.log(`[AI] Trying ${model}...`)
    const result = await callModel(model, prompt, maxTokens, apiKey)

    if (result.success) {
      console.log(`[AI] Success with ${model}`)
      return result.data
    }

    errors.push(`${model}: ${result.status ?? "err"} — ${(result.error ?? "").slice(0, 80)}`)

    const status = result.status ?? 503

    // Stop immediately only on auth errors — everything else try next model
    if (status === 400 || status === 401 || status === 403) {
      throw new Error(
        `[AI] ${model} failed with non-retryable status ${status}.\n${errors.join("\n")}`
      )
    }

    // Small pause before next attempt
    await new Promise(r => setTimeout(r, 400))
  }

  throw new Error(`[AI] All Gemini models exhausted.\n${errors.join("\n")}`)
}