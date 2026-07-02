// app/api/ats-simulator/route.ts
import { auth }               from '@/auth'
import { getEffectiveUserId } from '@/lib/effective-user'
import { getDb }              from '@/lib/db-router'

export const runtime = 'nodejs'

function sanitizeForPrompt(text: string) {
  return text
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .trim()
}

const PROMPT = (jobDescription: string, statement: string) => `
You are an NHS ATS (Applicant Tracking System) specialist. Analyse this supporting statement against the job description for ATS compatibility, keyword optimisation, and formatting issues.

JOB DESCRIPTION:
${sanitizeForPrompt(jobDescription).slice(0, 2500)}

SUPPORTING STATEMENT:
${sanitizeForPrompt(statement).slice(0, 3000)}

Respond with a JSON object matching the provided schema. Score atsScore from 0-100. Be specific and NHS-relevant in every field.
`.trim()

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    atsScore: { type: 'INTEGER' },
    verdict: { type: 'STRING' },
    keywordsFound: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          keyword:   { type: 'STRING' },
          count:     { type: 'INTEGER' },
          inJobSpec: { type: 'BOOLEAN' },
        },
        required: ['keyword', 'count', 'inJobSpec'],
      },
    },
    keywordsMissing: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          keyword:    { type: 'STRING' },
          importance: { type: 'STRING' },
          suggestion: { type: 'STRING' },
        },
        required: ['keyword', 'importance', 'suggestion'],
      },
    },
    formattingIssues: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          issue:    { type: 'STRING' },
          impact:   { type: 'STRING' },
          severity: { type: 'STRING' },
        },
        required: ['issue', 'impact', 'severity'],
      },
    },
    missingTerminology: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          term:    { type: 'STRING' },
          context: { type: 'STRING' },
        },
        required: ['term', 'context'],
      },
    },
    quickWins:      { type: 'ARRAY', items: { type: 'STRING' } },
    strengthsFound: { type: 'ARRAY', items: { type: 'STRING' } },
  },
  required: [
    'atsScore', 'verdict', 'keywordsFound', 'keywordsMissing',
    'formattingIssues', 'missingTerminology', 'quickWins', 'strengthsFound',
  ],
}

function safeJsonParse(text: string) {
  try {
    return JSON.parse(text)
  } catch (err) {
    console.error('[ats-simulator] JSON parse failed. Raw response:', text)
    throw new Error('The AI analysis came back malformed — please try again')
  }
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Retries on transient errors (503 overload, 429 rate limit, 500 internal).
// Does NOT retry on 400 (bad request) or 401/403 (auth) — those won't
// succeed on retry and should fail fast.
const RETRYABLE_STATUSES = new Set([429, 500, 503])
const MAX_RETRIES = 3

async function callGeminiOnce(prompt: string) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured')

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 20000,
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,
        },
      }),
    }
  )

  if (!res.ok) {
    const errText = await res.text()
    console.error('[ats-simulator] Gemini API error:', res.status, errText)
    const err: any = new Error(`Gemini API error (${res.status})`)
    err.status = res.status
    throw err
  }

  const data = await res.json()

  const candidate = data?.candidates?.[0]
  if (!candidate) {
    console.error('[ats-simulator] No candidates in Gemini response:', JSON.stringify(data))
    throw new Error('AI returned no result — please try again')
  }
  if (candidate.finishReason && candidate.finishReason !== 'STOP') {
    console.error('[ats-simulator] Gemini finishReason:', candidate.finishReason, JSON.stringify(data))
    if (candidate.finishReason === 'MAX_TOKENS') {
      throw new Error('The analysis was too long and got cut off — try a shorter statement or job description')
    }
    throw new Error('AI could not complete the analysis — please try again')
  }

  const text = candidate?.content?.parts?.[0]?.text ?? '{}'
  return safeJsonParse(text)
}

async function callGemini(prompt: string) {
  let lastErr: any

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await callGeminiOnce(prompt)
    } catch (err: any) {
      lastErr = err
      const isRetryable = RETRYABLE_STATUSES.has(err.status)
      const isLastAttempt = attempt === MAX_RETRIES

      if (!isRetryable || isLastAttempt) throw err

      // Exponential backoff with jitter: ~800ms, ~1.6s, ~3.2s
      const backoff = 800 * Math.pow(2, attempt) + Math.random() * 300
      console.warn(`[ats-simulator] Gemini ${err.status}, retrying in ${Math.round(backoff)}ms (attempt ${attempt + 1}/${MAX_RETRIES})`)
      await sleep(backoff)
    }
  }

  throw lastErr
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })
    const userId = (await getEffectiveUserId()) ?? (session.user.id as string)

    // Resolves which shard this user belongs to. Not persisting yet —
    // kept here so a future save can use `db.<model>.create(...)`
    // without re-plumbing the shard lookup.
    const db = await getDb(userId)
    void db // no-op until persistence is added

    const { jobDescription, statement } = await req.json()
    if (!jobDescription?.trim() || !statement?.trim()) {
      return Response.json({ error: 'Both job description and statement are required' }, { status: 400 })
    }

    const result = await callGemini(PROMPT(jobDescription, statement))
    return Response.json({ success: true, ...result })
  } catch (err: any) {
    console.error('[ats-simulator]', err)
    const isOverload = err.status === 503 || err.status === 429
    return Response.json(
      {
        error: isOverload
          ? 'The AI service is under heavy load right now. Please try again in a moment.'
          : err.message ?? 'Failed',
      },
      { status: isOverload ? 503 : 500 }
    )
  }
}