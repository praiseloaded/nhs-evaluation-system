// modules/ai/nhs-engine.ts

import { grokChatCompletion } from "@/lib/xai"

function buildMasterPrompt(input: any): string {
  return typeof input === 'string' ? input : JSON.stringify(input)
}

function safeParse(raw: string): any {
  try {
    const clean = raw.replace(/```json|```/g, '').trim()
    return JSON.parse(clean)
  } catch {
    return {}
  }
}

export async function runNHSScoringEngine(input: any) {
  const prompt = buildMasterPrompt(input)

  const raw = await grokChatCompletion([
    { role: "system", content: "You are an NHS recruitment scoring engine. Return ONLY valid JSON. No markdown. No explanations." },
    { role: "user",   content: prompt },
  ])

  return safeParse(raw)
}