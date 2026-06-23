

import { NextRequest, NextResponse } from 'next/server'
import { auth }             from '@/auth'
import { prisma }           from '@/lib/prisma'
import { callGeminiJSON }   from '@/lib/application/ai'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { applicationId } = await req.json()

    const app = await prisma.application.findUnique({
      where:   { id: applicationId },
      include: { criteria: true },
    })
    if (!app || app.userId !== session.user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const parsedSpec         = (app.parsedSpec as any) ?? {}
    const competencyEvidence = parsedSpec.competencyEvidence as Record<string, any> ?? {}

    if (Object.keys(competencyEvidence).length === 0) {
      return NextResponse.json({ error: 'Complete the competency evidence first' }, { status: 400 })
    }

    const strongCompetencies = Object.values(competencyEvidence)
      .filter((ce: any) => !ce.noExperience && ce.evidence?.trim().split(/\s+/).length > 30)
      .map((ce: any) => ce.label)

    const gapCompetencies = Object.values(competencyEvidence)
      .filter((ce: any) => ce.noExperience || !ce.evidence?.trim())
      .map((ce: any) => ce.label)

    const nation = parsedSpec.detectedNation ?? 'england'

    const prompt = `You are an NHS interview preparation expert. Based on this candidate's competency profile, predict the most likely panel interview questions.

ROLE: ${app.jobTitle}${app.band ? ` (${app.band})` : ''}
EMPLOYER: ${app.employer ?? 'NHS'}
NATION: ${nation}

STRONG COMPETENCIES (candidate has evidence):
${strongCompetencies.join('\n') || 'None identified'}

GAP AREAS (candidate has no/weak evidence):
${gapCompetencies.join('\n') || 'None — strong across all areas'}

Respond in valid JSON only. No markdown, no preamble. Schema:
{
  "strengthQuestions": [
    { "question": "string", "competency": "string", "tip": "string" }
  ],
  "gapQuestions": [
    { "question": "string", "competency": "string", "tip": "string" }
  ],
  "valuesQuestions": [
    { "question": "string", "value": "string", "tip": "string" }
  ]
}

Rules:
- strengthQuestions: 3–4 probing follow-up questions on their strong areas
- gapQuestions: 4–5 questions the panel WILL ask about the gap areas (these are most important)
- valuesQuestions: 3 NHS values-based questions specific to ${nation} values framework
- tip: one sentence of preparation advice for each question
- Keep questions realistic — NHS panels use values-based and competency-based formats
- Use "Tell me about a time..." or "Give me an example of..." phrasing`

    const questions = await callGeminiJSON(prompt, 1500)
    if (!questions?.strengthQuestions) {
      return NextResponse.json({ error: 'Failed to generate questions' }, { status: 500 })
    }

    // Cache on the application so repeat fetches are instant
    await prisma.application.update({
      where: { id: applicationId },
      data:  { parsedSpec: { ...parsedSpec, predictedQuestions: questions, questionsGeneratedAt: new Date().toISOString() } },
    })

    return NextResponse.json({ questions })
  } catch (err) {
    console.error('[predict-interview-questions]', err)
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 })
  }
}