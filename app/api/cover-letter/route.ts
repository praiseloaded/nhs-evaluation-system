// app/api/cover-letter/route.ts

import { auth }    from '@/auth'
import { getDb }   from '@/lib/db-router'
import { prisma }  from '@/lib/prisma'
import { prisma2 } from '@/lib/db-router'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })
    const db = await getDb(session.user.id)

    const {
      applicationId,
      jobTitle,
      employer,
      jobDescription,
      cvText,
      motivation,
      tone,
    } = await req.json()

    if (!jobTitle || !employer) {
      return Response.json({ error: 'jobTitle and employer required' }, { status: 400 })
    }

    // Load application data if applicationId provided
    let application: any = null
    if (applicationId) {
      application =
        await prisma.application.findUnique({ where: { id: applicationId } }).catch(() => null) ??
        await prisma2.application.findUnique({ where: { id: applicationId } }).catch(() => null)
    }

    // Load user's CV profile if available
    const cvProfile = await db.cvProfile.findFirst({
      where:   { userId: session.user.id },
      orderBy: { updatedAt: 'desc' },
      select:  { fullName: true, email: true, phone: true, location: true, personalStatement: true, workExperience: true },
    }).catch(() => null)

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) throw new Error('GEMINI_API_KEY not set')

    const parsedSpec = application?.parsedSpec as any
    const topCriteria = [
      ...(parsedSpec?.essentialCriteria ?? []).slice(0, 3).map((c: any) => c.text),
    ].filter(Boolean)

    const prompt = buildCoverLetterPrompt({
      jobTitle,
      employer,
      jobDescription:   jobDescription ?? application?.jobDescription ?? '',
      cvText:           cvText ?? '',
      motivation:       motivation ?? '',
      tone:             tone ?? 'professional',
      candidateName:    cvProfile?.fullName ?? '[Your Name]',
      topCriteria,
      existingStatement: application?.fullStatement ?? '',
    })

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature:      0.4,
            maxOutputTokens:  2000,
            responseMimeType: 'application/json',
            thinkingConfig:   { thinkingBudget: 0 },
          },
        }),
      }
    )

    if (!response.ok) throw new Error(`Gemini error: ${response.status}`)

    const data  = await response.json()
    const parts = data?.candidates?.[0]?.content?.parts ?? []
    let text = ''
    for (const part of parts) { if (part.text) text = part.text.trim() }

    const result = JSON.parse(text)

    return Response.json({ success: true, ...result })
  } catch (error: any) {
    console.error('[cover-letter]', error)
    return Response.json({ error: error.message ?? 'Failed' }, { status: 500 })
  }
}

function buildCoverLetterPrompt(input: {
  jobTitle:          string
  employer:          string
  jobDescription:    string
  cvText:            string
  motivation:        string
  tone:              string
  candidateName:     string
  topCriteria:       string[]
  existingStatement: string
}): string {
  return `
You are an expert NHS cover letter writer. Write a compelling, concise NHS cover letter.

ROLE: ${input.jobTitle}
EMPLOYER: ${input.employer}
TONE: ${input.tone}
CANDIDATE: ${input.candidateName}

TOP ESSENTIAL CRITERIA TO ADDRESS:
${input.topCriteria.length ? input.topCriteria.map((c, i) => `${i+1}. ${c}`).join('\n') : 'Not provided — write a strong general letter'}

${input.motivation ? `CANDIDATE'S MOTIVATION:\n${input.motivation}` : ''}
${input.existingStatement ? `CANDIDATE'S SUPPORTING STATEMENT (use for evidence — do NOT repeat verbatim):\n${input.existingStatement.slice(0, 800)}` : ''}
${input.jobDescription ? `JOB DESCRIPTION EXTRACT:\n${input.jobDescription.slice(0, 1000)}` : ''}

STRUCTURE:
Paragraph 1 (Opening — 2–3 sentences): State the role you're applying for and your most compelling qualification for it. Open with a strong past-tense achievement — not "I am writing to apply."

Paragraph 2 (Evidence — 3–4 sentences): Address 2–3 of the top essential criteria with specific STAR evidence. Quantify outcomes where possible. Mirror the employer's language.

Paragraph 3 (Why this employer — 2–3 sentences): Demonstrate genuine knowledge of ${input.employer}. Reference their values, strategic priorities, or something specific about the department/service. Show you've done research.

Paragraph 4 (Close — 1–2 sentences): Forward-looking, confident close. Express availability for interview. No "I hope to hear from you" or "I would be grateful."

RULES:
- Maximum 350 words
- Past tense for achievements
- No banned phrases: eager, passionate, committed, dedicated, I am writing to apply, I believe I am, I feel I am
- Address the letter to "Dear Hiring Manager" unless a name is provided
- Sign off: Yours sincerely, [Name]
- No generic filler — every sentence earns its place

Respond ONLY with JSON:
{
  "coverLetter": "Full cover letter text including greeting and sign-off",
  "wordCount": 0,
  "keyStrengths": ["strength addressed in letter 1", "strength 2", "strength 3"],
  "suggestedSubjectLine": "Email subject line for sending this application",
  "improvements": ["One thing to improve if the user edits this letter"]
}
`.trim()
}