// app/api/criteria-explorer/route.ts
//
// Omni Shortlist Intelligence™ — deep criteria analysis engine.
// Goes beyond extracting criteria to revealing HOW recruiters score them.

export const runtime = 'nodejs'

import { auth }  from '@/auth'
import { getDb } from '@/lib/db-router'
import { NextRequest } from 'next/server'

// ── AI caller ─────────────────────────────────────────────────────────────────

async function callGemini(prompt: string): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature:      0.1,
          maxOutputTokens:  8192,
          responseMimeType: 'application/json',
          thinkingConfig:   { thinkingBudget: 0 },
        },
      }),
    }
  )
  if (!res.ok) throw new Error(`Gemini ${res.status}`)
  const data  = await res.json()
  const parts = data?.candidates?.[0]?.content?.parts ?? []
  let text = ''
  for (const p of parts) if (p.text) text = p.text.trim()
  if (!text) throw new Error('Empty Gemini response')
  return text
}

function parseJSON(raw: string): any {
  const cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
  try { return JSON.parse(cleaned) } catch {}
  const s = cleaned.indexOf('{'), e = cleaned.lastIndexOf('}')
  if (s !== -1 && e > s) try { return JSON.parse(cleaned.slice(s, e + 1)) } catch {}
  return null
}

// ── Main analysis prompt ──────────────────────────────────────────────────────

function buildExplorerPrompt(jobTitle: string, jobSpec: string, cvText?: string): string {
  return `
You are a senior NHS shortlisting panel expert and workforce intelligence analyst.
Analyse this job specification deeply — go beyond surface criteria to reveal how
recruiters actually score applications. Return ONLY valid JSON.

JOB TITLE: ${jobTitle}

JOB SPECIFICATION:
${jobSpec.slice(0, 5000)}

${cvText ? `CANDIDATE CV/EXPERIENCE:\n${cvText.slice(0, 2000)}` : ''}

Produce a complete Shortlist Intelligence Report with these sections:

1. EXPLICIT CRITERIA — extract every stated essential and desirable criterion
2. HIDDEN CRITERIA — infer unstated criteria that panels always assess for this role/band
3. RECRUITER HEAT MAP — classify each criterion by scoring weight
4. RECRUITER SCORING GUIDE — for each Critical criterion, what scores high vs low
5. STAR OPPORTUNITY FINDER — if CV provided, match candidate experiences to criteria
6. SHORTLISTING PREDICTION — predicted score if candidate addresses each criterion well

Return this exact JSON structure:
{
  "jobTitle": "${jobTitle}",
  "band": "<detected band or null>",
  "employer": "<detected NHS employer or null>",

  "explicitCriteria": {
    "essential": [
      {
        "id": "e1",
        "text": "<criterion text>",
        "category": "clinical|communication|leadership|technical|values|qualification|experience|other",
        "heatLevel": "critical|important|low",
        "weight": <1-10>,
        "maxPoints": <integer — marks panel awards for this criterion>
      }
    ],
    "desirable": [
      {
        "id": "d1",
        "text": "<criterion text>",
        "category": "clinical|communication|leadership|technical|values|qualification|experience|other",
        "heatLevel": "critical|important|low",
        "weight": <1-10>,
        "maxPoints": <integer>
      }
    ]
  },

  "hiddenCriteria": [
    {
      "id": "h1",
      "text": "<hidden criterion — e.g. 'Understanding of NHS governance frameworks'>",
      "reason": "<why this is always assessed even though not stated>",
      "heatLevel": "critical|important|low",
      "examples": ["<specific example that would impress>", "<example>"]
    }
  ],

  "heatMapSummary": {
    "critical": ["<criterion id>", "<criterion id>"],
    "important": ["<criterion id>"],
    "low": ["<criterion id>"],
    "criticalNote": "<1 sentence explaining where most shortlisting points lie>"
  },

  "scoringGuide": [
    {
      "criterionId": "e1",
      "criterionText": "<short version>",
      "maxPoints": <int>,
      "whatScoresHigh": [
        "<specific evidence that earns full marks — e.g. 'Named a patient scenario, described your exact action, stated a measurable outcome'>"
      ],
      "whatScoresLow": [
        "<what earns zero or low marks — e.g. 'Generic statement like I always treat patients with dignity'>",
        "<another low-scoring pattern>"
      ],
      "idealSTAR": "<one sentence describing the ideal STAR example for this criterion>",
      "keyPhrasesToInclude": ["<exact phrase from job spec to mirror>", "<phrase>"]
    }
  ],

  "starOpportunities": ${cvText ? `[
    {
      "experienceRef": "<reference to something in the CV>",
      "suggestedFor": ["<criterion id>", "<criterion id>"],
      "starSuggestion": "<how to frame this experience as a STAR story for the criterion>",
      "strengthLevel": "strong|moderate|weak"
    }
  ]` : '[]'},

  "shortlistingPrediction": {
    "totalAvailablePoints": <int>,
    "criticalCriteriaCount": <int>,
    "estimatedTimeToComplete": "<e.g. 2-3 hours of focused writing>",
    "topThreePriorities": [
      "<most important thing to do — e.g. 'Write a strong STAR example for criterion X'>",
      "<second priority>",
      "<third priority>"
    ],
    "shortlistLikelihood": {
      "ifAllCriteriaMet": "high|medium|low",
      "ifCriticalOnly": "high|medium|low",
      "ifDesirableOnly": "medium|low"
    }
  },

  "quickWins": [
    "<specific actionable tip — e.g. 'Mirror the phrase non-medical prescribing from the spec — panels search for it'>",
    "<tip>",
    "<tip>",
    "<tip>",
    "<tip>"
  ]
}

Rules:
- Hidden criteria should reflect NHS-specific expectations for this band/role — not generic advice
- Scoring guide must be specific to THIS job spec, not generic NHS tips
- Weight 1-10 where 10 = most important to shortlisting outcome
- Heat levels: critical = panels score it 0–10, important = 0–5, low = pass/fail check
- Be strict and realistic — most criteria have fewer than 5 things that score highly
`.trim()
}

// ── GET: list past explorations ───────────────────────────────────────────────

export async function GET(_req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const db   = await getDb(session.user.id)
  const list = await db.criteriaExplorer.findMany({
    where:   { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take:    20,
    select:  { id: true, jobTitle: true, createdAt: true },
  })

  return Response.json({ explorations: list })
}

// ── POST: run new exploration ─────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { jobTitle, jobSpec, cvText } = body

    if (!jobTitle || !jobSpec) {
      return Response.json({ error: 'jobTitle and jobSpec are required' }, { status: 400 })
    }
    if (jobSpec.trim().split(/\s+/).length < 30) {
      return Response.json({ error: 'Job specification is too short — paste the full person spec' }, { status: 400 })
    }

    const db = await getDb(session.user.id)

    console.log('[criteria-explorer] Running analysis for:', jobTitle)
    const raw    = await callGemini(buildExplorerPrompt(jobTitle, jobSpec, cvText))
    const result = parseJSON(raw)

    if (!result) {
      return Response.json({ error: 'AI analysis failed — please try again' }, { status: 500 })
    }

    const record = await db.criteriaExplorer.create({
      data: {
        userId:   session.user.id,
        jobTitle: result.jobTitle ?? jobTitle,
        jobSpec:  jobSpec.slice(0, 8000),
        cvText:   cvText ? cvText.slice(0, 3000) : null,
        result,
      },
    })

    console.log('[criteria-explorer] Saved:', record.id)
    return Response.json({ success: true, explorationId: record.id, result })

  } catch (err: any) {
    console.error('[criteria-explorer]', err)
    return Response.json({ error: err.message ?? 'Analysis failed' }, { status: 500 })
  }
}