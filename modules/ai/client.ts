// modules/ai/client.ts

import { buildAnalysisPrompt } from "./prompt-builder"
import { grokChatCompletion }  from "@/lib/xai"

export async function runAIAnalysis(input: {
  jobTitle:  string
  jobSpec:   string
  cv:        string
  statement: string
  tier?:     "free" | "paid"
}) {
  const prompt = buildAnalysisPrompt({
    ...input,
    tier: input.tier ?? 'paid',
  })

  const raw = await grokChatCompletion([
    { role: "system", content: "You are a strict JSON-only NHS analysis engine." },
    { role: "user",   content: prompt },
  ])

  return raw
}