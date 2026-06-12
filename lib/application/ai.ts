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

  const finishReason = data?.candidates?.[0]?.finishReason
  const parsed = tryParseJSON(text, finishReason === "MAX_TOKENS")
  if (parsed !== null) {
    return { success: true, data: parsed }
  }

  console.warn(`[AI] ${model} — JSON parse failed (finishReason: ${finishReason}). Raw (first 300 chars): ${text.slice(0, 300)}`)
  console.warn(`[AI] ${model} — Raw (last 300 chars): ${text.slice(-300)}`)
  return { success: false, status: 200, error: `JSON parse failed. Raw: ${text.slice(0, 200)}` }
}

// ─── Robust JSON extraction ─────────────────────────────────────────────────
// Gemini occasionally wraps JSON in markdown fences, adds trailing commentary,
// includes trailing commas, leaves raw control characters inside strings, or —
// if maxOutputTokens is hit — cuts the response off mid-object/array.
// Try multiple recovery strategies before giving up.
function tryParseJSON(raw: string, allowTruncationSalvage = false): any | null {
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

  // 6. Truncation salvage — the response was cut off mid-JSON (hit maxOutputTokens).
  // Walk backwards from the end, repeatedly trimming to the last "}" or "]" and
  // attempting to close any open braces/brackets, until something parses.
  if (allowTruncationSalvage || true) {
    const start = text.search(/[{\[]/)
    if (start >= 0) {
      let working = text.slice(start)
      // Remove control chars and a dangling trailing comma up front
      working = working.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')

      for (let cut = working.length; cut > 0; ) {
        // Find the last closing brace/bracket at or before `cut`
        const lastBrace   = working.lastIndexOf('}', cut - 1)
        const lastBracket = working.lastIndexOf(']', cut - 1)
        const lastClose   = Math.max(lastBrace, lastBracket)
        if (lastClose <= 0) break

        let candidate = working.slice(0, lastClose + 1)
        // Drop a dangling trailing comma right before the cut point
        candidate = candidate.replace(/,\s*$/, '')

        // Count unmatched open braces/brackets (ignoring those inside strings, roughly)
        const stack: string[] = []
        let inString = false
        let escape = false
        for (const ch of candidate) {
          if (escape) { escape = false; continue }
          if (ch === '\\') { escape = true; continue }
          if (ch === '"') { inString = !inString; continue }
          if (inString) continue
          if (ch === '{' || ch === '[') stack.push(ch)
          else if (ch === '}' || ch === ']') stack.pop()
        }

        // Close any still-open structures in reverse order
        let closed = candidate
        for (let i = stack.length - 1; i >= 0; i--) {
          closed += stack[i] === '{' ? '}' : ']'
        }

        try {
          const result = JSON.parse(closed)
          console.warn(`[AI] Recovered truncated JSON via salvage (kept ${closed.length}/${working.length} chars)`)
          return result
        } catch {}

        // Try again from just before this closing char
        cut = lastClose
      }
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