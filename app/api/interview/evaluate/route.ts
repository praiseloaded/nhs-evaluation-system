// app/api/interview/evaluate/route.ts

import { prisma } from "@/lib/prisma"
import { getDb }  from "@/lib/db-router"
import { auth } from "@/auth"
import { getPanellistById } from "@/lib/interview/panellists"

export const runtime = 'nodejs'

function buildEvaluationPrompt(
  panellistName: string,
  panellistRole: string,
  panellistStyle: string,
  question: string,
  scoringCriteria: string,
  category: string,
  transcript: string,
  jobTitle: string
): string {
  return `
You are ${panellistName}, ${panellistRole} on an NHS interview panel for a ${jobTitle} role.

You just asked: "${question}"

The candidate answered: "${transcript}"

QUESTION CATEGORY: ${category}
SCORING CRITERIA: ${scoringCriteria}
YOUR ASSESSMENT STYLE: ${panellistStyle}

Score this answer STRICTLY as a real NHS panel member would. Return ONLY valid JSON.

SCORING GUIDE:
85-100: Exceptional — specific STAR example with measurable outcome, directly relevant
70-84:  Strong — clear example with context and result, well-structured
55-69:  Adequate — relevant but lacks specificity or outcome
40-54:  Weak — generic, no real example, surface-level
25-39:  Poor — off-topic or very vague
0-24:   Unacceptable — no meaningful content

REQUIRED JSON:
{
  "score": <0-100>,
  "verdict": "exceptional|strong|adequate|weak|poor|unacceptable",
  "strengths": ["What the candidate did well — 1-3 bullet points"],
  "gaps": ["What was missing or weak — 1-3 bullet points"],
  "panellistNote": "A 1-2 sentence note as ${panellistName} would write on the scoring sheet",
  "starRating": {
    "situation": <true if specific context was given>,
    "task": <true if their responsibility was clear>,
    "action": <true if personal actions described (not 'we')>,
    "result": <true if outcome/impact stated>
  },
  "improvementTip": "One specific sentence on how to improve this answer"
}
`.trim()
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id as string
    const db      = await getDb(userId)
    const body = await req.json()
    const { interviewId, questionId, transcript } = body

    if (!interviewId || !questionId || !transcript) {
      return Response.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }

    // Fetch interview
    const interview = await db.interview.findUnique({ where: { id: interviewId } })
    if (!interview || interview.userId !== userId) {
      return Response.json({ success: false, error: "Interview not found" }, { status: 404 })
    }

    // Find the question
    const questions = interview.questions as any[]
    // Follow-up IDs have '_fu' suffix — strip it to find the original question
    const baseQuestionId = questionId.replace(/_fu$/, '')
    const question = questions.find((q: any) => q.id === baseQuestionId)
    if (!question) {
      return Response.json({ success: false, error: "Question not found" }, { status: 404 })
    }
    const isFollowUp = questionId !== baseQuestionId

    // Get panellist info
    const panellist = getPanellistById(question.panellistId)
    if (!panellist) {
      return Response.json({ success: false, error: "Panellist not found" }, { status: 404 })
    }

    // Evaluate with Gemini
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) throw new Error("GEMINI_API_KEY not set")

    const prompt = buildEvaluationPrompt(
      panellist.name,
      panellist.role,
      panellist.questionStyle,
      question.question,
      question.scoringCriteria ?? "",
      question.category ?? "competency",
      transcript,
      interview.jobTitle
    )

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: `You are a strict NHS interview panel assessor. Return ONLY valid JSON.\n\n${prompt}` }],
            },
          ],
          generationConfig: {
            temperature: 0,
            maxOutputTokens: 2000,
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

    const evaluation = JSON.parse(text)

    // Save the answer
    const answer = await db.interviewAnswer.create({
      data: {
        interviewId,
        questionId,
        panellistId: question.panellistId,
        transcript,
        score: evaluation.score ?? 0,
        evaluation,
      },
    })

    // Update interview status
    await db.interview.update({
      where: { id: interviewId },
      data: { status: "in_progress", startedAt: interview.startedAt ?? new Date() },
    })

    return Response.json({
      success: true,
      answerId: answer.id,
      evaluation,
    })

  } catch (error: any) {
    console.error("INTERVIEW_EVALUATE_ERROR:", error)
    return Response.json(
      { success: false, error: error?.message ?? "Evaluation failed" },
      { status: 500 },
    )
  }
}