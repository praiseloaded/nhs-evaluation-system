// app/api/interview/follow-up/route.ts
//
// After a candidate answers, this route decides:
// 1. Should the SAME panellist probe deeper?
// 2. Should a DIFFERENT panellist jump in based on their specialty?
// Like a real panel where the HR member might say "Just picking up on
// what you said about teamwork..."

import { prisma } from "@/lib/prisma"
import { getDb }  from "@/lib/db-router"
import { auth } from "@/auth"
import { NHS_PANEL } from "@/lib/interview/panellists"

export const runtime = 'nodejs'

function buildFollowUpPrompt(
  panellists: any[],
  askingPanellistId: string,
  originalQuestion: string,
  candidateAnswer: string,
  evaluation: any,
  jobTitle: string
): string {
  const panelDescriptions = panellists.map(p =>
    `- ${p.name} (${p.role}): focuses on ${p.specialty}. Style: ${p.questionStyle}`
  ).join('\n')

  return `
You are coordinating an NHS interview panel for a ${jobTitle} role.

THE PANEL:
${panelDescriptions}

The panellist "${askingPanellistId}" just asked: "${originalQuestion}"

The candidate answered: "${candidateAnswer}"

Evaluation gaps found: ${JSON.stringify(evaluation.gaps ?? [])}
STAR elements missing: ${JSON.stringify(
    Object.entries(evaluation.starRating ?? {})
      .filter(([, v]) => !v)
      .map(([k]) => k)
  )}
Score: ${evaluation.score}/100

DECISION: Should any panellist ask a follow-up question?

RULES:
1. If the answer was STRONG (score >= 80) — usually no follow-up needed, but a different panellist might probe from their angle
2. If the answer was ADEQUATE (score 50-79) — the same panellist should probe the gaps
3. If the answer was WEAK (score < 50) — give a gentle prompt to elaborate
4. A DIFFERENT panellist should jump in when:
   - The answer touched on THEIR specialty area (e.g. candidate mentioned values → HR jumps in)
   - The answer raised a concern in THEIR domain (e.g. candidate mentioned team issues → Service Manager probes)
   - The candidate mentioned something that another panellist's role covers
5. Maximum 1 follow-up per question
6. The follow-up must sound natural — like a real panellist would interject

Return ONLY valid JSON:
{
  "shouldFollowUp": true | false,
  "followUpPanellistId": "clinical | hr | operational",
  "followUpQuestion": "The follow-up question as the panellist would say it",
  "interjection": "How they introduce themselves jumping in (e.g. 'If I may just pick up on something you mentioned...' or 'Thank you. I'd like to explore that further...')",
  "reason": "Why this panellist is asking (hidden from candidate)",
  "probeArea": "situation | task | action | result | depth | specificity | values | governance | leadership"
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

    const { getUserTier } = await import("@/lib/billing/tier")
    const tier = await getUserTier(userId)
    if (tier !== "pro") {
      return Response.json({ success: false, error: "Pro plan required" }, { status: 402 })
    }

    const body = await req.json()
    const { interviewId, questionId, transcript, evaluation } = body

    if (!interviewId || !questionId || !transcript || !evaluation) {
      return Response.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }

    const interview = await db.interview.findUnique({ where: { id: interviewId } })
    if (!interview || interview.userId !== userId) {
      return Response.json({ success: false, error: "Interview not found" }, { status: 404 })
    }

    const questions = interview.questions as any[]
    const question = questions.find((q: any) => q.id === questionId)
    if (!question) {
      return Response.json({ success: false, error: "Question not found" }, { status: 404 })
    }

    const panellists = interview.panellists as any[]

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) throw new Error("GEMINI_API_KEY not set")

    const prompt = buildFollowUpPrompt(
      panellists,
      question.panellistId,
      question.question,
      transcript,
      evaluation,
      interview.jobTitle
    )

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: `You are an NHS interview panel coordinator. Return ONLY valid JSON.\n\n${prompt}` }] }],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 1000,
            responseMimeType: "application/json",
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      }
    )

    if (!response.ok) {
      const err = await response.text()
      throw new Error(`Gemini error: ${response.status} — ${err}`)
    }

    const data = await response.json()
    const parts = data?.candidates?.[0]?.content?.parts ?? []
    let text = ""
    for (const part of parts) { if (part.text) text = part.text.trim() }

    const result = JSON.parse(text)

    return Response.json({
      success: true,
      shouldFollowUp: result.shouldFollowUp ?? false,
      followUpPanellistId: result.followUpPanellistId ?? question.panellistId,
      followUpQuestion: result.followUpQuestion ?? "",
      interjection: result.interjection ?? "",
      probeArea: result.probeArea ?? "",
    })
  } catch (error: any) {
    console.error("FOLLOW_UP_ERROR:", error)
    return Response.json({ success: false, error: error?.message ?? "Failed" }, { status: 500 })
  }
}