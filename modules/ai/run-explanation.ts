import { runAIAnalysis } from "./client"

function extractJson(raw: string) {
  const cleaned = raw
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim()

  const start = cleaned.indexOf("{")
  const end = cleaned.lastIndexOf("}")

  if (start === -1 || end === -1) {
    throw new Error("No JSON found")
  }

  return JSON.parse(cleaned.slice(start, end + 1))
}

export async function getExplanation(input: any) {
  const raw = await runAIAnalysis(input)
  return extractJson(raw)
}