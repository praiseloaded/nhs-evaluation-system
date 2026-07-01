// app/api/employer-intelligence/route.ts
import { auth }               from '@/auth'
import { getEffectiveUserId } from '@/lib/effective-user'
import { getDb }              from '@/lib/db-router'

export const runtime = 'nodejs'

function buildPrompt(employerName: string): string {
  return `
You are an NHS recruitment intelligence analyst. Generate a profile for this NHS employer based on publicly known information and typical patterns for NHS organisations of this type.

EMPLOYER: ${employerName}

Generate REAL, SPECIFIC content — not generic placeholders. If you don't have specific knowledge of this exact trust, use realistic NHS-typical information for an organisation of this type and be clear it's a general NHS pattern rather than confirmed fact about this specific trust.

Respond ONLY with this JSON:
{
  "employerName": "${employerName}",
  "overview": "WRITE 2-3 sentences about this trust/board — size, services, region, reputation",
  "values": ["value 1 specific to this organisation", "value 2", "value 3", "value 4"],
  "commonInterviewThemes": [
    "WRITE a specific interview theme this employer likely focuses on",
    "WRITE a second theme",
    "WRITE a third theme",
    "WRITE a fourth theme"
  ],
  "typicalEssentialCriteria": [
    "WRITE a criterion commonly required across roles at this trust",
    "WRITE a second common criterion",
    "WRITE a third common criterion"
  ],
  "workingEnvironment": "WRITE 2-3 sentences describing what it's like working here — culture, pace, support",
  "serviceSpecialties": ["specialty 1", "specialty 2", "specialty 3"],
  "applicationTips": [
    "WRITE one specific tip for applying to this employer",
    "WRITE a second tip"
  ],
  "confidence": "high or general — state 'general' if this is typical NHS pattern rather than confirmed specific knowledge of this trust"
}
`.trim()
}

async function callGemini(prompt: string) {
  const apiKey = process.env.GEMINI_API_KEY
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.5, maxOutputTokens: 2000, responseMimeType: 'application/json' },
      }),
    }
  )
  if (!res.ok) throw new Error(`Gemini ${res.status}`)
  const data = await res.json()
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}'
  return JSON.parse(text)
}

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (await getEffectiveUserId()) ?? (session.user.id as string)
  const db     = await getDb(userId)

  const { searchParams } = new URL(req.url)
  const employer = (searchParams.get('employer') ?? '').trim()
  if (!employer) return Response.json({ error: 'employer required' }, { status: 400 })

  // Check cache — stored as a notification-like record keyed by employer name
  const cacheKey = `employer_intel:${employer.toLowerCase()}`
  const cached = await db.application.findFirst({
    where:  { userId, notes: cacheKey },
    select: { parsedSpec: true, updatedAt: true },
  })

  // Cache valid for 30 days
  if (cached && cached.updatedAt && (Date.now() - new Date(cached.updatedAt).getTime()) < 30*24*60*60*1000) {
    return Response.json({ success: true, profile: cached.parsedSpec, cached: true })
  }

  try {
    const profile = await callGemini(buildPrompt(employer))

    const existing = await db.application.findFirst({ where: { userId, notes: cacheKey } })
    if (existing) {
      await db.application.update({ where: { id: existing.id }, data: { parsedSpec: profile } })
    } else {
      await db.application.create({
        data: {
          userId, jobTitle: 'Employer Intelligence', employer,
          status: 'reference', notes: cacheKey, parsedSpec: profile,
            jobDescription: 'Employer intelligence reference record — not a live job application',

        },
      })
    }

    return Response.json({ success: true, profile, cached: false })
  } catch (err: any) {
    return Response.json({ error: err.message ?? 'Failed to generate profile' }, { status: 500 })
  }
}