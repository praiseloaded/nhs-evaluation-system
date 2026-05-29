// modules/ai/retry.ts

import { runAIAnalysis } from "./client"

function extractJson(raw: string) {
  try {
    // remove markdown fences
    const cleaned = raw
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim()

    // find first JSON object
    const start = cleaned.indexOf("{")
    const end = cleaned.lastIndexOf("}")

    if (start === -1 || end === -1) {
      throw new Error("No JSON object found")
    }

    return cleaned.slice(start, end + 1)
  } catch {
    throw new Error("Failed to extract JSON")
  }
}

export async function getValidatedAIResult(input: {
  jobTitle: string
  jobSpec: string
  cv: string
  statement: string
}) {
  let lastError: any = null

  for (let i = 0; i < 3; i++) {
    try {
      const raw = await runAIAnalysis(input)

      const jsonString = extractJson(raw)

      const parsed = JSON.parse(jsonString)

      return parsed
    } catch (err) {
      lastError = err
      console.error("AI Parse Attempt Failed:", err)
    }
  }

  throw new Error(
    `AI validation failed after retries: ${lastError}`
  )
}