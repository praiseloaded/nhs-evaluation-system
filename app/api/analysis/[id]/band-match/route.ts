// app/api/analysis/[id]/band-match/route.ts

import { auth }        from '@/auth'
import { getDb }       from '@/lib/db-router'
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
      model:           'llama-3.3-70b-versatile',
      max_tokens:      6000,
      temperature:     0.1,
      response_format: { type: 'json_object' },
      messages:        [{ role: 'user', content: prompt }],
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
  const bands: any[] = Array.isArray(parsed) ? parsed : (parsed?.bands ?? [])
  return BAND_LEVELS.map(level => {
    const found = bands.find((b: any) => String(b.band) === level)
    if (found) {
      return {
        band:            String(found.band ?? level),
        label:           found.label           ?? `Band ${level}`,
        matchPct:        Math.min(100, Math.max(0, Number(found.matchPct ?? 0))),
        status:          ['exceeds','strong','match','stretch','gap'].includes(found.status) ? found.status : 'gap',
        metCount:        Number(found.metCount  ?? 0),
        totalCount:      Number(found.totalCount ?? 10),
        gaps:            Array.isArray(found.gaps)            ? found.gaps.slice(0, 5)            : [],
        strengths:       Array.isArray(found.strengths)       ? found.strengths.slice(0, 5)       : [],
        keyMissing:      Array.isArray(found.keyMissing)      ? found.keyMissing.slice(0, 3)      : [],
        developmentPlan: Array.isArray(found.developmentPlan) ? found.developmentPlan.slice(0, 3) : [],
        verdict:         String(found.verdict     ?? ''),
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

  const metCriteria     = criteria.filter((c: any) => c.status === 'met').map((c: any) => c.criterion).slice(0, 10)
  const partialCriteria = criteria.filter((c: any) => c.status === 'partially met').map((c: any) => c.criterion).slice(0, 6)
  const notMetCriteria  = criteria.filter((c: any) => c.status === 'not met').map((c: any) => c.criterion).slice(0, 8)
  const valuesShown     = values.filter((v: any) => v.classification !== 'absent').map((v: any) => v.name)
  const strengthsList   = strengths.map((s: any) => typeof s === 'string' ? s : s.claim ?? '').slice(0, 5)
  const weaknesses      = (result.weaknesses ?? []).slice(0, 5)
  const sb              = result.scoredBreakdown ?? {}

  const cov            = result.breakdown?.criteriaCoverage ?? {}
  const missingList    = (result.missingCriteria ?? []).slice(0, 6)
  const hasCriteria    = metCriteria.length > 0 || partialCriteria.length > 0 || notMetCriteria.length > 0
  const coverageFallback = !hasCriteria && (cov.essentialMet !== undefined)
    ? `Coverage counts: ${cov.essentialMet ?? 0} essential met, ${cov.essentialPartial ?? 0} partial, ${cov.essentialNotMet ?? 0} not met, ${cov.desirableMet ?? 0} desirable met`
    : ''
  const bandCoaching = result.bandCoaching ?? null
  const seniority    = result.seniority    ?? null
  const atsMatch     = result.atsMatch     ?? null

  return `You are a senior NHS workforce development specialist and recruitment expert.

Analyse this candidate's application and produce a detailed band-level match assessment across all 7 NHS bands.

═══ CANDIDATE PROFILE ═══
Job applied for: ${record.jobTitle ?? 'Unknown'}
Overall score: ${sb.overallScore ?? 'N/A'}%
Criteria coverage: ${sb.criteriaCoverage ?? 'N/A'}%
Values alignment: ${sb.valuesAlignment ?? 'N/A'}%

Criteria MET (${metCriteria.length}): ${metCriteria.join(' | ') || 'None recorded'}
Criteria PARTIALLY MET (${partialCriteria.length}): ${partialCriteria.join(' | ') || 'None recorded'}
Criteria NOT MET (${notMetCriteria.length}): ${notMetCriteria.join(' | ') || 'None recorded'}
${coverageFallback ? `Coverage summary: ${coverageFallback}` : ''}
${missingList.length > 0 ? `Missing criteria flagged: ${missingList.join(' | ')}` : ''}
${seniority ? `Seniority: demonstrated Band ${seniority.demonstratedBand ?? 'unknown'}, target Band ${seniority.targetBand ?? 'unknown'}, gap ${seniority.bandGap ?? 0}` : ''}
${atsMatch ? `ATS match: ${atsMatch.foundCount ?? 0}/${atsMatch.totalKeywords ?? 0} keywords found` : ''}
${bandCoaching ? `Band coaching target: ${bandCoaching.bandLabel ?? ''} — ${bandCoaching.mostCriticalBandGap ?? ''}` : ''}

NHS Values demonstrated: ${valuesShown.join(', ') || 'None identified'}
Key strengths: ${strengthsList.join(' | ') || 'None identified'}
Key weaknesses: ${weaknesses.join(' | ') || 'Use criteria coverage and missing criteria above'}

Job description: ${(record.jobDescription ?? '').slice(0, 600)}
Essential criteria: ${(record.essentialCriteria ?? '').slice(0, 400)}
Person spec: ${(record.personSpec ?? '').slice(0, 300)}

═══ BAND STANDARDS ═══
Band 2: Basic HCA/support tasks. Supervised. No quals needed.
Band 3: Skilled support, some autonomy, may supervise Band 2.
Band 4: Associate practitioner. Significant autonomy, specialist skills.
Band 5: Qualified practitioner (nurse/AHP/scientist). FULL REGISTRATION required (NMC/HCPC).
Band 6: Senior/specialist. Leads service, mentors staff, service development.
Band 7: Advanced practitioner or manager. Manages teams, strategic input.
Band 8a: Consultant or senior manager. Org-wide influence.

═══ INSTRUCTIONS ═══
For each band produce matchPct, status, metCount, totalCount, strengths, gaps, keyMissing, developmentPlan, verdict, suitability, timeToReady.
- NEVER return "Insufficient data" — always produce a best-effort assessment
- Base band fit on job title, scores, seniority band gap, and any available criteria

Return JSON object with bands array.`.trim()
}

export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const { id }  = await params
    const session = await auth()
    if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const userId = session.user.id
    const db     = await getDb(userId)

    const record = await db.analysis.findUnique({ where: { id } })
    if (!record || record.userId !== userId) {
      return Response.json({ error: 'Not found' }, { status: 404 })
    }

    const result = (record.result as any) ?? {}

    // Return cached unless stale
    if (result.bandMatch?.length) {
      const allZero = result.bandMatch.every((b: any) => b.matchPct === 0)
      const hasData = result.bandMatch.some((b: any) =>
        (b.strengths?.length ?? 0) > 0 || (b.gaps?.length ?? 0) > 0 || b.verdict !== 'Insufficient data'
      )
      if (!allZero && hasData) {
        return Response.json({ bands: result.bandMatch, cached: true })
      }
      console.log('[band-match] Stale/empty cache — re-running')
    }

    const raw    = await callAI(buildPrompt(record, result))
    const parsed = extractJSON(raw)

    if (!parsed) {
      console.error('[band-match] Parse failed. Raw:', raw.slice(0, 800))
      return Response.json({ error: 'AI returned invalid response — please try again' }, { status: 500 })
    }

    const resultBands = normaliseBands(parsed)

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