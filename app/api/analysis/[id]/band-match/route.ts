// app/api/analysis/[id]/band-match/route.ts

import { auth }        from '@/auth'
import { prisma }      from '@/lib/prisma'
import { NextRequest } from 'next/server'

type Params = { params: Promise<{ id: string }> }

const BAND_LEVELS = ['2', '3', '4', '5', '6', '7', '8a']

const BAND_EXPECTATIONS: Record<string, string> = {
  '2':  'Basic healthcare support tasks, working under supervision. No formal qualifications required. Evidence needed: willingness to learn, patient interaction, basic care duties, following instructions.',
  '3':  'Skilled support role with some autonomy. May supervise Band 2. Evidence needed: relevant experience, some specialist knowledge, ability to work without constant supervision, basic clinical skills.',
  '4':  'Associate practitioner level. Significant autonomy, specialist skills, may lead small teams. Evidence needed: specialist clinical skills, independent working, some leadership, relevant qualification or equivalent experience.',
  '5':  'Qualified practitioner (e.g. Staff Nurse, Physiotherapist). Full professional registration required. Evidence needed: professional qualification, NMC/HCPC registration, clinical decision-making, patient assessment, MDT working.',
  '6':  'Senior/specialist practitioner. Leads service area, mentors others, contributes to service development. Evidence needed: specialist expertise, leadership, service development, advanced clinical skills, autonomous practice.',
  '7':  'Advanced practitioner or manager. Strategic responsibility, manages teams, advanced clinical or managerial role. Evidence needed: advanced qualifications, team leadership, budget management, strategic thinking, research/audit.',
  '8a': 'Consultant or senior manager. Organisation-wide impact, highly specialised expertise. Evidence needed: consultant-level expertise, strategic leadership, publications or significant research, budget responsibility.',
}

async function callAI(prompt: string): Promise<string> {
  // Gemini primary
  if (process.env.GEMINI_API_KEY) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 4000 },
          }),
        }
      )
      if (res.ok) {
        const data = await res.json()
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
        if (text) return text
      }
    } catch (e) {
      console.warn('[band-match] Gemini failed, trying Groq')
    }
  }

  // Groq fallback
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 4000,
      temperature: 0.1,
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  const data = await res.json()
  return data.choices[0].message.content as string
}

function buildPrompt(
  jobTitle: string,
  jobDescription: string,
  essentialCriteria: string,
  desirableCriteria: string,
  personSpec: string,
  criteriaAnalysis: any[],
  nhsValues: any[],
  strengths: any[],
  cv: string,
  statement: string,
): string {
  const metCriteria    = criteriaAnalysis.filter(c => c.status === 'met').map(c => c.criterion)
  const notMetCriteria = criteriaAnalysis.filter(c => c.status !== 'met').map(c => c.criterion)
  const valuesShown    = nhsValues.filter(v => v.classification !== 'absent').map(v => v.name)
  const strengthsList  = strengths.map(s => typeof s === 'string' ? s : s.claim ?? '')

  const bandExpectationsText = BAND_LEVELS
    .map(b => `BAND ${b}: ${BAND_EXPECTATIONS[b]}`)
    .join('\n\n')

  return `
You are an expert NHS recruitment analyst. Assess how well this candidate's application matches each NHS Band level from 2 to 8a.

JOB APPLIED FOR: ${jobTitle}

CANDIDATE EVIDENCE SUMMARY:
- Criteria met: ${metCriteria.slice(0, 15).join(', ') || 'None identified'}
- Criteria not met: ${notMetCriteria.slice(0, 10).join(', ') || 'None'}
- NHS Values demonstrated: ${valuesShown.join(', ') || 'None identified'}
- Strengths: ${strengthsList.slice(0, 5).join('; ') || 'None identified'}

JOB DESCRIPTION (excerpt):
${jobDescription.slice(0, 1000)}

ESSENTIAL CRITERIA:
${essentialCriteria.slice(0, 800)}

PERSON SPECIFICATION:
${personSpec.slice(0, 800)}

NHS BAND EXPECTATIONS:
${bandExpectationsText}

ASSESSMENT INSTRUCTIONS:
For each band 2, 3, 4, 5, 6, 7, 8a:
1. Calculate matchPct (0-100) — how well the candidate's EVIDENCE matches that band's expectations
2. Determine status: "exceeds" (90+), "strong" (75-89), "match" (60-74), "stretch" (45-59), "gap" (below 45)
3. List up to 4 specific gaps — what evidence is MISSING for that band
4. List up to 4 specific strengths — what evidence IS present for that band
5. Write a verdict (max 15 words) — one honest sentence about this band fit

CALIBRATION:
- Be realistic and strict. A Band 5 requires professional registration and clinical decision-making.
- A Band 6 requires demonstrated leadership and specialist expertise.
- Do NOT inflate scores. If the candidate shows no leadership evidence, Band 7+ should score below 30%.
- The band they applied for should be scored most carefully against the actual job spec.

Return ONLY valid JSON — no markdown, no preamble:
{
  "bands": [
    {
      "band": "2",
      "label": "Band 2",
      "matchPct": <0-100>,
      "status": "exceeds|strong|match|stretch|gap",
      "metCount": <number>,
      "totalCount": <number>,
      "gaps": ["...", "..."],
      "strengths": ["...", "..."],
      "verdict": "..."
    }
  ]
}`.trim()
}

export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const { id }  = await params
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const record = await prisma.analysis.findUnique({ where: { id } })
    if (!record || record.userId !== session.user.id) {
      return Response.json({ error: 'Not found' }, { status: 404 })
    }

    const result   = (record.result as any) ?? {}
    const criteria = result.criteriaAnalysis ?? []
    const values   = result.nhsValues        ?? []
    const strengths= result.strengths        ?? []

    const prompt = buildPrompt(
      record.jobTitle          ?? '',
      record.jobDescription    ?? '',
      record.essentialCriteria ?? '',
      record.desirableCriteria ?? '',
      record.personSpec        ?? '',
      criteria,
      values,
      strengths,
      record.cv        ?? '',
      record.statement ?? '',
    )

    const raw     = await callAI(prompt)
    const cleaned = raw.replace(/```json|```/g, '').trim()

    let parsed: any
    try {
      parsed = JSON.parse(cleaned)
    } catch {
      return Response.json({ error: 'Failed to parse band match result' }, { status: 500 })
    }

    // Ensure all 7 bands are present — fill missing with defaults
    const resultBands: any[] = []
    for (const level of BAND_LEVELS) {
      const found = parsed.bands?.find((b: any) => b.band === level)
      resultBands.push(found ?? {
        band:       level,
        label:      `Band ${level}`,
        matchPct:   0,
        status:     'gap',
        metCount:   0,
        totalCount: 10,
        gaps:       ['Insufficient data to assess'],
        strengths:  [],
        verdict:    'Could not assess — insufficient data',
      })
    }

    return Response.json({ bands: resultBands })

  } catch (err: any) {
    console.error('[band-match]', err)
    return Response.json({ error: err.message ?? 'Band match failed' }, { status: 500 })
  }
}