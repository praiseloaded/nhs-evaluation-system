export async function grokChatCompletion(messages: { role: string; content: string }[]) {
  // Combine messages into a single prompt for Gemini
  const combinedPrompt = messages.map(m => m.content).join("\n\n")

  // ── Try Gemini first ──────────────────────────────────────────────────────
  if (process.env.GEMINI_API_KEY) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [{ text: combinedPrompt }],
              },
            ],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 4000,
            },
          }),
        },
      )

      if (res.ok) {
        const data = await res.json()
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
        if (text) return text
      }

      console.warn("[extract-job] Gemini failed, falling back to Groq...")
    } catch (err: any) {
      console.warn("[extract-job] Gemini error:", err?.message, "— falling back to Groq")
    }
  }

  // ── Fallback to Groq ─────────────────────────────────────────────────────
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages,
      temperature: 0.2,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Groq API error: ${err}`)
  }

  const data = await res.json()
  return data.choices[0].message.content as string
}