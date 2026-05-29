import { grokChatCompletion } from "@/lib/xai"

export async function runNHSScoringEngine(input) {
  const prompt = buildMasterPrompt(input)

  const raw = await grokChatCompletion([
    {
      role: "system",
      content:
        "You are an NHS recruitment scoring engine. Return ONLY valid JSON. No markdown. No explanations."
    },
    {
      role: "user",
      content: prompt
    }
  ])

  return safeParse(raw)
}