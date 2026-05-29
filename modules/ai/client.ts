import { buildAnalysisPrompt } from "./prompt-builder"
import { grokChatCompletion } from "@/lib/xai"

export async function runAIAnalysis(input: {
  jobTitle: string
  jobSpec: string
  cv: string
  statement: string
}) {
  const prompt = buildAnalysisPrompt(input)

  const raw = await grokChatCompletion([
    {
      role: "system",
      content: "You are a strict JSON-only NHS analysis engine."
    },
    {
      role: "user",
      content: prompt
    }
  ])

  return raw
}