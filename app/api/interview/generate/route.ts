// app/api/interview/generate/route.ts

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { NHS_PANEL } from "@/lib/interview/panellists"

const SYSTEM_MESSAGE = `You are an NHS interview panel question designer. Generate realistic interview questions that a real NHS panel would ask. Return ONLY valid JSON.`

function buildQuestionPrompt(jobTitle: string, jobDescription: string, band: string | null): string {
  return `
Generate interview questions for an NHS panel interview.

ROLE: ${jobTitle}
${band ? `BAND: ${band}` : ""}

JOB SPEC:
${jobDescription.slice(0, 3000)}

PANEL MEMBERS:
1. Clinical Lead (Dr. Sarah Okonkwo) — tests clinical competence, patient safety, evidence-based practice
2. HR Panel Member (James Mitchell) — tests NHS values, equality & diversity, conflict handling, professionalism
3. Service Manager (Amara Osei) — tests operational delivery, caseload management, change leadership, governance

RULES:
- Generate exactly 9 questions: 3 per panellist
- Each question must be specific to THIS role and band level
- Include a mix of: competency-based, values-based, and scenario-based questions
- Questions should test the essential criteria from the job spec
- Each panellist should ask from their own perspective
- Include one follow-up prompt per question (what the panellist would probe if the answer is vague)
- Order: rotate between panellists (clinical, hr, operational, clinical, hr, operational, ...)

REQUIRED JSON OUTPUT:
{
  "questions": [
    {
      "id": "q1",
      "panellistId": "clinical|hr|operational",
      "category": "competency|values|scenario|motivation",
      "question": "The full question text as the panellist would say it",
      "context": "What this question is really testing (hidden from candidate)",
      "followUp": "A follow-up probe if the answer lacks depth",
      "maxScore": 100,
      "scoringCriteria": "What a strong answer looks like in 1 sentence"
    }
  ]
}
`.trim()
}

async function generateQuestions(jobTitle: string, jobDescription: string, band: string | null): Promise<any[]> {
  const apiKey = process.env.GEMINI_API_KEY

  if (!apiKey) throw new Error("GEMINI_API_KEY not set")

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: `${SYSTEM_MESSAGE}\n\n${buildQuestionPrompt(jobTitle, jobDescription, band)}` }],
          },
        ],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 4000,
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

  const parsed = JSON.parse(text)
  return parsed.questions ?? parsed
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id as string


    // Pro-only feature
    const { getUserTier } = await import('@/lib/billing/tier')
    const tier = await getUserTier(userId)
    if (tier !== 'pro') {
      return Response.json(
        { success: false, error: 'Interview simulator requires Pro plan', blocked: true },
        { status: 402 },
      )
    }

    
    const body = await req.json()
    const { analysisId } = body

    if (!analysisId) {
      return Response.json({ success: false, error: "analysisId required" }, { status: 400 })
    }

    // Fetch the analysis
    const analysis = await prisma.analysis.findUnique({ where: { id: analysisId } })

    if (!analysis || analysis.userId !== userId) {
      return Response.json({ success: false, error: "Analysis not found" }, { status: 404 })
    }

    // Generate questions
    const questions = await generateQuestions(
      analysis.jobTitle,
      analysis.jobDescription,
      (analysis as any).band ?? null
    )

    // Create interview session
    const interview = await prisma.interview.create({
      data: {
        userId,
        analysisId,
        jobTitle: analysis.jobTitle,
        band: (analysis as any).band ?? null,
        panellists: NHS_PANEL,
        questions,
        status: "pending",
      },
    })

    return Response.json({
      success: true,
      interviewId: interview.id,
      questions,
      panellists: NHS_PANEL,
    })

  } catch (error: any) {
    console.error("INTERVIEW_GENERATE_ERROR:", error)
    return Response.json(
      { success: false, error: error?.message ?? "Failed to generate interview" },
      { status: 500 },
    )
  }
}