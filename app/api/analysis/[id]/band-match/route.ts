// app/api/analysis/[id]/band-match/route.ts

import { getDb }               from '@/lib/db-router'
import { getEffectiveUserId }  from '@/lib/effective-user'
import { auth }        from '@/auth'
import { prisma }      from '@/lib/prisma'
import { NextRequest } from 'next/server'

type Params = { params: Promise<{ id: string }> }

const BAND_LEVELS = ['2', '3', '4', '5', '6', '7', '8a']

async function callAI(prompt: string): Promise<string> {
  if (process.env.GEMINI_API_KEY) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 8192,
              responseMimeType: 'application/json',
            },
          }),
        }
      )
      if (res.ok) {
        const data = await res.json()
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
        if (text) return text
        const reason = data?.candidates?.[0]?.finishReason
        console.warn('[band-match] Gemini empty text, finishReason:', reason)
      } else {
        const errStatus = res.status
        console.warn('[band-match] Gemini HTTP', errStatus)
        // 503 = overloaded — try fallback model
        if (errStatus === 503) {
          try {
            const res2 = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  contents: [{ role: 'user', parts: [{ text: prompt }] }],
                  generationConfig: { temperature: 0.1, maxOutputTokens: 8192, responseMimeType: 'application/json' },
                }),
              }
            )
            if (res2.ok) {
              const data2 = await res2.json()
              const text2 = data2?.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
              if (text2) return text2
            }
          } catch (e2: any) {
            console.warn('[band-match] Gemini 1.5 fallback failed:', e2.message)
          }
        }
      }
    } catch (e: any) {
      console.warn('[band-match] Gemini error:', e.message)
    }
  }

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model:            'llama-3.3-70b-versatile',
      max_tokens:       6000,
      temperature:      0.1,
      response_format:  { type: 'json_object' },
      messages:         [{ role: 'user', content: prompt }],
    }),
    signal: AbortSignal.timeout(50000),
  })
  if (!res.ok) {
    const errBody = await res.text().catch(() => '')
    throw new Error(`Groq HTTP ${res.status}: ${errBody}`)
  }
  const data = await res.json()
  return data.choices[0].message.content as string
}

function extractJSON(raw: string): any | null {
  if (!raw) return null
  const cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
  try { return JSON.parse(cleaned) } catch {}
  const start = cleaned.indexOf('{')
  const end   = cleaned.lastIndexOf('}')
  if (start !== -1 && end > start) {
    try { return JSON.parse(cleaned.slice(start, end + 1)) } catch {}
  }
  return null
}

function normaliseBands(parsed: any): any[] {
  let bands: any[] = Array.isArray(parsed) ? parsed : (parsed?.bands ?? [])

  return BAND_LEVELS.map(level => {
    const normBand = (v: any) => String(v ?? '').toLowerCase().replace(/^band\s*/i, '').trim()
    const found = bands.find((b: any) => normBand(b.band) === level)
    if (found) {
      return {
        band:            level,
        label:           found.label           ?? `Band ${level}`,
        matchPct:        Math.min(100, Math.max(0, Number(found.matchPct ?? 0))),
        status:          ['exceeds','strong','match','stretch','gap'].includes(found.status) ? found.status : 'gap',
        metCount:        Number(found.metCount  ?? 0),
        totalCount:      Number(found.totalCount ?? 10),
        gaps:            Array.isArray(found.gaps)            ? found.gaps.slice(0, 5)            : [],
        strengths:       Array.isArray(found.strengths)       ? found.strengths.slice(0, 5)       : [],
        keyMissing:      Array.isArray(found.keyMissing)      ? found.keyMissing.slice(0, 3)      : [],
        developmentPlan: Array.isArray(found.developmentPlan) ? found.developmentPlan.slice(0, 3) : [],
        verdict:         String(found.verdict  ?? ''),
        suitability:     String(found.suitability ?? ''),
        timeToReady:     found.timeToReady ?? null,
      }
    }
    return {
      band: level, label: `Band ${level}`, matchPct: 0, status: 'gap',
      metCount: 0, totalCount: 10, gaps: [], strengths: [],
      keyMissing: [], developmentPlan: [],
      verdict: 'Insufficient data', suitability: '', timeToReady: null,
    }
  })
}

function buildPrompt(record: any, result: any): string {
  const criteria  = result.criteriaAnalysis ?? []
  const values    = result.nhsValues        ?? []
  const strengths = result.strengths        ?? []

  const metCriteria    = criteria.filter((c: any) => c.status === 'met').map((c: any) => c.criterion).slice(0, 10)
  const partialCriteria= criteria.filter((c: any) => c.status === 'partially met').map((c: any) => c.criterion).slice(0, 6)
  const notMetCriteria = criteria.filter((c: any) => c.status === 'not met').map((c: any) => c.criterion).slice(0, 8)
  const valuesShown    = values.filter((v: any) => v.classification !== 'absent').map((v: any) => v.name)
  const strengthsList  = strengths.map((s: any) => typeof s === 'string' ? s : s.claim ?? '').slice(0, 5)
  const weaknesses     = (result.weaknesses ?? []).slice(0, 5)
  const sb             = result.scoredBreakdown ?? {}

  return `You are a senior NHS workforce development specialist and recruitment expert.

Analyse this candidate's application and produce a detailed band-level match assessment across all 7 NHS bands.

═══ CANDIDATE PROFILE ═══
Job applied for: ${record.jobTitle ?? 'Unknown'}
Overall score: ${sb.overallScore ?? 'N/A'}%
Criteria coverage: ${sb.criteriaCoverage ?? 'N/A'}%
Values alignment: ${sb.valuesAlignment ?? 'N/A'}%

Criteria MET (${metCriteria.length}): ${metCriteria.join(' | ') || 'None'}
Criteria PARTIALLY MET (${partialCriteria.length}): ${partialCriteria.join(' | ') || 'None'}
Criteria NOT MET (${notMetCriteria.length}): ${notMetCriteria.join(' | ') || 'None'}

NHS Values demonstrated: ${valuesShown.join(', ') || 'None identified'}
Key strengths: ${strengthsList.join(' | ') || 'None'}
Key weaknesses: ${weaknesses.join(' | ') || 'None'}

Job description: ${(record.jobDescription ?? '').slice(0, 600)}
Essential criteria: ${(record.essentialCriteria ?? '').slice(0, 400)}
Person spec: ${(record.personSpec ?? '').slice(0, 300)}

═══ BAND STANDARDS ═══
Band 2: Basic HCA/support tasks. Supervised. No quals needed. Evidence: basic care, following instructions, patient contact.
Band 3: Skilled support, some autonomy, may supervise Band 2. Evidence: specific skills, working independently, basic clinical.
Band 4: Associate practitioner. Significant autonomy, specialist skills. Evidence: specialist clinical, independent working, leadership beginnings, HNC/foundation degree or equiv.
Band 5: Qualified practitioner (nurse/AHP/scientist). FULL REGISTRATION required (NMC/HCPC). Evidence: degree, professional reg, clinical decision-making, MDT, patient assessment.
Band 6: Senior/specialist. Leads service, mentors staff, service development. Evidence: post-reg experience, specialist expertise, leadership, audit/quality improvement, autonomous practice.
Band 7: Advanced practitioner or manager. Manages teams, strategic input. Evidence: advanced qualification, team management, budget responsibility, research, change leadership.
Band 8a: Consultant or senior manager. Org-wide influence. Evidence: consultant expertise, strategic leadership, publications, significant research, high-level management.

═══ INSTRUCTIONS ═══
For each band produce:
- matchPct: honest 0-100 score (be strict — Band 5 with no NMC reg = max 20%)
- status: exceeds/strong/match/stretch/gap
- metCount/totalCount: criteria evidenced vs expected at this band
- strengths: up to 4 specific pieces of evidence that support this band
- gaps: up to 4 specific things missing for this band
- keyMissing: top 2-3 critical missing items that MOST limit this band fit
- developmentPlan: up to 3 specific actionable steps to close the gap for this band
- verdict: one honest sentence (max 15 words) about fit
- suitability: "Ready now" | "6-12 months" | "1-2 years" | "2+ years" | "Not applicable"
- timeToReady: estimated months to be ready for this band (integer, null if already ready or not applicable)

Rules:
- Max 3 strengths per band (10 words each max)
- Max 3 gaps per band (10 words each max)
- Max 2 keyMissing per band (8 words each max)
- Max 2 developmentPlan per band (12 words each max)
- verdict max 12 words
- suitability: "Ready now" or "6-12 months" or "1-2 years" or "2+ years" or "Not applicable"

Return JSON object with bands array. Be concise to avoid truncation.`.trim()
}

export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const { id }  = await params
    const session = await auth()
    if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })
    const userId = (await getEffectiveUserId()) ?? (session.user.id as string)
    const db     = await getDb(userId)

    const record = await db.analysis.findUnique({ where: { id } })
    if (!record || record.userId !== userId) return Response.json({ error: 'Not found' }, { status: 404 })

    const result = (record.result as any) ?? {}

    // Return cached — but re-run if all bands show 0% (bad cached result)
    if (result.bandMatch?.length) {
      const allZero = result.bandMatch.every((b: any) => b.matchPct === 0)
      const hasData = result.bandMatch.some((b: any) =>
        (b.strengths?.length ?? 0) > 0 || (b.gaps?.length ?? 0) > 0 || b.verdict !== 'Insufficient data'
      )
      if (!allZero && hasData) {
        return Response.json({ bands: result.bandMatch, cached: true })
      }
      console.log('[band-match] Stale/empty cache detected — re-running')
    }

    // Run AI
    const raw    = await callAI(buildPrompt(record, result))
    console.log('[band-match] Raw response (first 600):', raw.slice(0, 600))

    const parsed = extractJSON(raw)
    console.log('[band-match] Parsed type:', typeof parsed, '| keys:', parsed ? Object.keys(parsed) : 'null')
    console.log('[band-match] Parsed bands count:', parsed?.bands?.length ?? parsed?.length ?? 'none')
    if (parsed?.bands?.[0]) {
      console.log('[band-match] First band sample:', JSON.stringify(parsed.bands[0]).slice(0, 200))
    }

    if (!parsed) {
      console.error('[band-match] Parse failed. Raw (800 chars):', raw.slice(0, 800))
      return Response.json({ error: 'AI returned invalid response — please try again' }, { status: 500 })
    }

    const resultBands = normaliseBands(parsed)
    console.log('[band-match] First normalised band:', JSON.stringify(resultBands[0]).slice(0, 200))

    // Save
    await db.analysis.update({
      where: { id },
      data:  { result: { ...result, bandMatch: resultBands } },
    })

    return Response.json({ bands: resultBands, cached: false })

  } catch (err: any) {
    console.error('[band-match]', err)
    return Response.json({ error: err.message ?? 'Band match failed' }, { status: 500 })
  }
}