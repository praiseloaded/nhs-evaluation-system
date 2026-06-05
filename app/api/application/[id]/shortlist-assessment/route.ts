// app/api/application/[id]/shortlist-assessment/route.ts

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { NextRequest } from "next/server"
import { buildShortlistPrompt } from "@/lib/shortlisting/prompt"

type Params = { params: Promise<{ id: string }> }

export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const session = await auth()
    if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 })

    // Pro-only
    const { getUserTier } = await import("@/lib/billing/tier")
    const tier = await getUserTier(session.user.id)
    if (tier !== "pro") {
      return Response.json({ error: "Shortlisting Intelligence requires Pro plan", blocked: true }, { status: 402 })
    }

    const application = await prisma.application.findUnique({
      where: { id },
      include: { criteria: { orderBy: { order: "asc" } } },
    })

    if (!application || application.userId !== session.user.id) {
      return Response.json({ error: "Not found" }, { status: 404 })
    }

    const parsedSpec = application.parsedSpec as any
    const liveScore = application.liveScore as any
    const cvScore = (application as any).cvScore as any

    // Build criteria breakdown
    const criteriaBreakdown = application.criteria.map(c => ({
      criterionText: c.criterionText,
      type: c.type,
      category: c.category,
      hasEvidence: !!(c.situation && c.task && c.action && c.result),
      paragraphScore: c.paragraphScore,
    }))

    const prompt = buildShortlistPrompt({
      jobTitle: application.jobTitle,
      band: application.band,
      employer: application.employer,
      jobDescription: application.jobDescription,
      parsedSpec,
      cvText: (application as any).cvText,
      supportingStatement: application.fullStatement,
      liveScore,
      cvScore,
      criteriaBreakdown,
    })

    // Call Gemini
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) throw new Error("GEMINI_API_KEY not set")

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: `You are a senior NHS shortlisting panel. Return ONLY valid JSON.\n\n${prompt}` }] }],
          generationConfig: {
            temperature: 0.15,
            maxOutputTokens: 8000,
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
    for (const part of parts) { if (part.text) text = part.text.trim() }

    const assessment = JSON.parse(text)
    assessment.assessedAt = new Date().toISOString()

    // Save to application
    await prisma.application.update({
      where: { id },
      data: { shortlistAssessment: assessment },
    })

    return Response.json({ success: true, assessment })
  } catch (error: any) {
    console.error("SHORTLIST_ASSESSMENT_ERROR:", error)
    return Response.json({ error: error?.message ?? "Assessment failed" }, { status: 500 })
  }
}

// GET — fetch existing assessment
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const session = await auth()
    if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const application = await prisma.application.findUnique({
      where: { id },
      select: { userId: true, shortlistAssessment: true },
    })

    if (!application || application.userId !== session.user.id) {
      return Response.json({ error: "Not found" }, { status: 404 })
    }

    return Response.json({
      success: true,
      assessment: application.shortlistAssessment ?? null,
    })
  } catch (error: any) {
    return Response.json({ error: error?.message ?? "Failed" }, { status: 500 })
  }
}