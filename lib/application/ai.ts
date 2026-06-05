// lib/application/ai.ts
//
// Shared AI caller for all Application Builder prompts

export async function callGeminiJSON(prompt: string, maxTokens = 4000): Promise<any> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error("GEMINI_API_KEY not set")

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
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

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Gemini error: ${response.status} — ${err}`)
  }

  const data = await response.json()
  const parts = data?.candidates?.[0]?.content?.parts ?? []
  let text = ""
  for (const part of parts) {
    if (part.text) text = part.text.trim()
  }

  if (!text) {
    throw new Error(`Empty Gemini response (finishReason: ${data?.candidates?.[0]?.finishReason})`)
  }

  return JSON.parse(text)
}