// app/api/ab-test/route.ts
//
// Scores two supporting statements against the same job spec,
// then generates a comparison analysis with a winner recommendation.

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
          temperature:      0,
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

// ── Scoring prompt ────────────────────────────────────────────────────────────

function buildScoringPrompt(jobTitle: string, jobSpec: string, statement: string, label: string): string {
  return `
You are a strict NHS recruitment panel assessor scoring a supporting statement.
Return ONLY valid JSON. No markdown.

STATEMENT LABEL: ${label}
JOB TITLE: ${jobTitle}

JOB SPECIFICATION (first 3000 chars):
${jobSpec.slice(0, 3000)}

SUPPORTING STATEMENT:
${statement.slice(0, 4000)}

Score this statement across 5 dimensions. Be strict — score only explicit evidence.

Return JSON:
{
  "overallScore": <0-100>,
  "criteriaCoverage": <0-100>,
  "nhsValues": <0-100>,
  "starQuality": <0-100>,
  "languageMirroring": <0-100>,
  "specificity": <0-100>,
  "verdict": "strong|competitive|needs_work|at_risk",
  "wordCount": <int>,
  "strengths": ["<specific strength with evidence>", "<strength>", "<strength>"],
  "weaknesses": ["<specific weakness>", "<weakness>", "<weakness>"],
  "missingElements": ["<missing item>", "<missing item>"],
  "openingQuality": "strong|generic|weak",
  "starExamplesCount": <int>,
  "hasQuantifiedOutcomes": <bool>,
  "usesWeLanguage": <bool>
}
`.trim()
}

// ── Comparison prompt ─────────────────────────────────────────────────────────

function buildComparisonPrompt(
  jobTitle: string,
  scoreA: any,
  scoreB: any,
  statementA: string,
  statementB: string
): string {
  return `
You are an expert NHS recruitment consultant comparing two supporting statements.
Return ONLY valid JSON. No markdown.

JOB: ${jobTitle}

STATEMENT A SCORES: ${JSON.stringify(scoreA)}
STATEMENT B SCORES: ${JSON.stringify(scoreB)}

STATEMENT A (first 1500 chars): ${statementA.slice(0, 1500)}
STATEMENT B (first 1500 chars): ${statementB.slice(0, 1500)}

Produce a detailed comparison. Be specific — reference actual content from each statement.

Return JSON:
{
  "winner": "A|B|tied",
  "winnerReason": "<1-2 sentence explanation of why winner is better>",
  "scoreDiff": <int absolute difference in overall scores>,
  "dimensionWinners": {
    "criteriaCoverage": "A|B|tied",
    "nhsValues": "A|B|tied",
    "starQuality": "A|B|tied",
    "languageMirroring": "A|B|tied",
    "specificity": "A|B|tied"
  },
  "whatADoesBetter": ["<specific thing with reference to content>", "<thing>"],
  "whatBDoesBetter": ["<specific thing>", "<thing>"],
  "bestElementsToKeep": {
    "fromA": ["<element from A to keep>", "<element>"],
    "fromB": ["<element from B to keep>", "<element>"]
  },
  "idealStatement": "<2-3 sentence description of what the perfect merged version would look like>",
  "quickWins": ["<specific change to make to winner to improve it further>", "<change>", "<change>"]
}
`.trim()
}

// ── GET: list past tests ───────────────────────────────────────────────────────

export async function GET(_req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const db   = await getDb(session.user.id)
  const tests = await db.aBTest.findMany({
    where:   { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take:    20,
    select: {
      id: true, jobTitle: true, scoreA: true, scoreB: true,
      winner: true, createdAt: true,
    },
  })

  return Response.json({ tests })
}

// ── POST: run a new test ──────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { jobTitle, jobSpec, statementA, statementB } = body

    if (!jobTitle || !jobSpec || !statementA || !statementB) {
      return Response.json({ error: 'jobTitle, jobSpec, statementA and statementB are required' }, { status: 400 })
    }
    if (statementA.trim().split(/\s+/).length < 50) {
      return Response.json({ error: 'Statement A is too short — minimum 50 words' }, { status: 400 })
    }
    if (statementB.trim().split(/\s+/).length < 50) {
      return Response.json({ error: 'Statement B is too short — minimum 50 words' }, { status: 400 })
    }

    const db = await getDb(session.user.id)

    // ── Score both statements in parallel ────────────────────────────────────
    console.log('[ab-test] Scoring both statements...')
    const [rawA, rawB] = await Promise.all([
      callGemini(buildScoringPrompt(jobTitle, jobSpec, statementA, 'A')),
      callGemini(buildScoringPrompt(jobTitle, jobSpec, statementB, 'B')),
    ])

    const resultA = parseJSON(rawA)
    const resultB = parseJSON(rawB)

    if (!resultA || !resultB) {
      return Response.json({ error: 'AI scoring failed — please try again' }, { status: 500 })
    }

    // ── Run comparison ────────────────────────────────────────────────────────
    console.log('[ab-test] Running comparison...')
    const rawComp    = await callGemini(buildComparisonPrompt(jobTitle, resultA, resultB, statementA, statementB))
    const comparison = parseJSON(rawComp)

    const winner = comparison?.winner ?? (
      resultA.overallScore > resultB.overallScore ? 'A' :
      resultB.overallScore > resultA.overallScore ? 'B' : 'tied'
    )

    // ── Save ──────────────────────────────────────────────────────────────────
    const test = await db.aBTest.create({
      data: {
        userId:     session.user.id,
        jobTitle,
        jobSpec:    jobSpec.slice(0, 5000),
        statementA: statementA.slice(0, 5000),
        statementB: statementB.slice(0, 5000),
        scoreA:     resultA.overallScore ?? 0,
        scoreB:     resultB.overallScore ?? 0,
        winner,
        resultA,
        resultB,
        comparison,
      },
    })

    console.log(`[ab-test] Test ${test.id} complete — Winner: ${winner}`)
    return Response.json({ success: true, testId: test.id, resultA, resultB, comparison, winner })

  } catch (err: any) {
    console.error('[ab-test]', err)
    return Response.json({ error: err.message ?? 'Test failed' }, { status: 500 })
  }
}