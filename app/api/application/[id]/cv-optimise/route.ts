// app/api/application/[id]/cv-optimise/route.ts

import { prisma } from "@/lib/prisma"
import { getDb }  from "@/lib/db-router"
import { auth } from "@/auth"
import { NextRequest } from "next/server"

export const runtime = 'nodejs'

type Params = { params: Promise<{ id: string }> }

const TONE_INSTRUCTIONS: Record<string, string> = {
  professional: `REWRITE TONE: Professional NHS clinical.
- Precise, formal, third-person where appropriate
- Lead with competencies and qualifications
- Use NHS/clinical terminology accurately
- Avoid personal anecdotes — focus on roles and responsibilities`,
  warm: `REWRITE TONE: Warm and human — still professional but reads like a real person.
- First person throughout ("I developed...", "I led...", "I worked with...")
- Include one brief specific example per section where possible
- Avoid bullet-point lists of duties — write short flowing sentences
- Sound enthusiastic about the work without being over the top
- NHS terminology used naturally, not forced`,
  personal: `REWRITE TONE: Personal and authentic — the candidate's own voice.
- Strong first-person narrative ("When I joined...", "One of the moments I'm most proud of...")
- Lead each section with a brief real example or moment, then explain the skill
- Show the person behind the role — why they care about nursing/healthcare
- Keep it professional but let personality come through
- Avoid corporate/generic phrases like "results-driven" or "team player"
- Specific is always better than general — name procedures, departments, patient groups`,
}

function buildCvOptimiserPrompt(
  jobTitle: string,
  jobDescription: string,
  parsedSpec: any,
  cvText: string,
  tone: string = 'warm'
): string {
  const essentialKeywords = (parsedSpec?.essentialCriteria ?? [])
    .flatMap((c: any) => c.keywords ?? [])
  const desirableKeywords = (parsedSpec?.desirableCriteria ?? [])
    .flatMap((c: any) => c.keywords ?? [])
  const allKeywords = [...new Set([...essentialKeywords, ...desirableKeywords])]

  return `
You are an NHS CV optimisation expert. Analyse this CV against the job specification and provide structured feedback.

JOB TITLE: ${jobTitle}

JOB SPECIFICATION (summary):
${jobDescription.slice(0, 3000)}

KEYWORDS FROM PERSON SPEC: ${allKeywords.join(', ')}

CANDIDATE CV:
${cvText.slice(0, 6000)}

${TONE_INSTRUCTIONS[tone] ?? TONE_INSTRUCTIONS.warm}

ANALYSE AND SCORE:

1. ATS MATCH (0-100): Would this CV pass automated keyword screening?
   - Check each keyword from the person spec
   - Flag missing critical keywords
   - Check for NHS-standard formatting

2. NHS VALUES ALIGNMENT (0-100): Does the CV demonstrate NHS values?
   - Look for: compassion, dignity, respect, teamwork, quality, improvement
   - Check if values are evidenced or just keyword-stuffed

3. CLINICAL RELEVANCE (0-100): How relevant is the clinical experience?
   - Match experience to the specific role requirements
   - Check band-appropriate experience level
   - Flag gaps in required clinical competencies

4. WEAK SECTIONS: Which CV sections need improvement?
   - Personal statement too generic?
   - Employment history missing outcomes?
   - Skills section too vague?

5. REWRITE SUGGESTIONS: For each weak section, provide specific NHS-optimised rewording.
   - Do NOT invent experience — only reframe existing content
   - Use NHS terminology naturally
   - Add STAR structure where missing

Return ONLY valid JSON:
{
  "atsMatch": {
    "score": <0-100>,
    "keywordsFound": ["list"],
    "keywordsMissing": ["list"],
    "criticalMissing": ["essential keywords not found"],
    "formatIssues": ["any ATS formatting problems"]
  },
  "valuesAlignment": {
    "score": <0-100>,
    "valuesFound": [{"value": "name", "evidence": "quote from CV", "strength": "strong|weak|absent"}],
    "valuesMissing": ["values not evidenced"]
  },
  "clinicalRelevance": {
    "score": <0-100>,
    "matchedExperience": ["relevant experience items"],
    "gaps": ["clinical areas not covered"],
    "bandAppropriate": true|false,
    "bandNote": "explanation"
  },
  "overall": <0-100>,
  "weakSections": [
    {
      "section": "Personal Statement|Employment History|Skills|Education|Other",
      "issue": "What's wrong",
      "severity": "high|medium|low",
      "currentText": "Brief quote of the weak text",
      "suggestedRewrite": "NHS-optimised rewrite of that section in the requested tone",
      "whyItMatters": "one sentence — why recruiters will respond better to this"
    }
  ],
  "topPriorities": [
    "The 3 most impactful changes ranked by importance"
  ]
}
`.trim()
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const session = await auth()
    if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 })
    const db      = await getDb(session.user.id)

    const application = await db.application.findUnique({ where: { id } })
    if (!application || application.userId !== session.user.id) {
      return Response.json({ error: "Not found" }, { status: 404 })
    }

    // Accept CV and tone from body or use stored CV
    const body = await req.json().catch(() => ({}))
    const cvText = body.cvText ?? application.cvText
    const tone = body.tone ?? 'warm'

    if (!cvText || cvText.trim().length < 50) {
      return Response.json({ error: "No CV text available. Upload or paste your CV first." }, { status: 400 })
    }

    const parsedSpec = application.parsedSpec as any

    // Call Gemini
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) throw new Error("GEMINI_API_KEY not set")

    const prompt = buildCvOptimiserPrompt(
      application.jobTitle,
      application.jobDescription,
      parsedSpec,
      cvText,
      tone
    )

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: `You are an NHS CV optimisation expert. Return ONLY valid JSON.\n\n${prompt}` }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 6000,
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

    const cvScore = JSON.parse(text)

    // Save CV score and CV text
    await db.application.update({
      where: { id },
      data: {
        cvScore,
        cvText: cvText,
      },
    })

    return Response.json({ success: true, cvScore })
  } catch (error: any) {
    console.error("CV_OPTIMISE_ERROR:", error)
    return Response.json({ error: error?.message ?? "CV optimisation failed" }, { status: 500 })
  }
}