// app/api/evidence-vault/match/route.ts
//
// EvidenceVault → Statement Auto-Pull
// AI matches stored STAR examples to job criteria automatically.
// One click fills the application with the user's best evidence.

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

// ── Matching prompt ───────────────────────────────────────────────────────────

function buildMatchPrompt(
  jobTitle: string,
  criteria: Array<{ id: string; text: string; type: string }>,
  vaultEntries: Array<{ id: string; title: string; category: string; situation: string; task: string; action: string; result: string; skillTags: string[]; nhsValueTags: string[] }>
): string {
  const criteriaBlock = criteria.map((c, i) =>
    `[${c.id}] (${c.type}) ${c.text}`
  ).join('\n')

  const vaultBlock = vaultEntries.map(e =>
    `[${e.id}] "${e.title}" (${e.category})
  S: ${e.situation.slice(0, 150)}
  T: ${e.task.slice(0, 100)}
  A: ${e.action.slice(0, 150)}
  R: ${e.result.slice(0, 100)}
  Tags: ${[...e.skillTags, ...e.nhsValueTags].join(', ')}`
  ).join('\n\n')

  return `
You are an expert NHS recruitment consultant. Match stored STAR evidence to job criteria.

JOB: ${jobTitle}

CRITERIA TO FILL (${criteria.length} total):
${criteriaBlock}

VAULT ENTRIES AVAILABLE (${vaultEntries.length} total):
${vaultBlock}

For each criterion, find the best matching vault entry. One vault entry can match multiple criteria.
Score the match strength 1-10. If no good match exists, set matchStrength below 4.

Return JSON:
{
  "matches": [
    {
      "criterionId": "<criterion id>",
      "criterionText": "<short version>",
      "criterionType": "essential|desirable",
      "vaultEntryId": "<vault entry id or null if no match>",
      "vaultTitle": "<vault entry title or null>",
      "matchStrength": <1-10>,
      "matchReason": "<1 sentence explaining why this evidence fits this criterion>",
      "suggestedFraming": "<how to present this STAR example for this specific criterion — 1-2 sentences>",
      "missingElements": ["<what this evidence lacks for this criterion>"]
    }
  ],
  "unmatched": ["<criterion id of any criterion with no suitable evidence>"],
  "summary": {
    "strongMatches": <count of matchStrength >= 7>,
    "weakMatches": <count of matchStrength 4-6>,
    "noMatch": <count with no vault entry>,
    "recommendation": "<1 sentence overall assessment>"
  }
}

Rules:
- Only match if genuinely relevant — a weak false match is worse than no match
- matchStrength 8-10: vault entry directly addresses the criterion with strong evidence
- matchStrength 5-7: vault entry is relevant but needs framing or has gaps
- matchStrength 1-4: poor fit — flag as unmatched
- Prefer essential criteria matches over desirable when vault entries are limited
`.trim()
}

// ── GET: load existing matches for an application ─────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const applicationId = req.nextUrl.searchParams.get('applicationId')
    if (!applicationId) return Response.json({ error: 'applicationId required' }, { status: 400 })

    const db  = await getDb(session.user.id)
    const app = await db.application.findUnique({
      where:   { id: applicationId },
      include: { criteria: { orderBy: { order: 'asc' } } },
    })

    if (!app || app.userId !== session.user.id) {
      return Response.json({ error: 'Not found' }, { status: 404 })
    }

    // Return criteria with their current evidence filled status
    const criteria = app.criteria.map(c => ({
      id:           c.id,
      text:         c.criterionText,
      type:         c.type,
      hasSituation: !!c.situation,
      hasTask:      !!c.task,
      hasAction:    !!c.action,
      hasResult:    !!c.result,
      situation:    c.situation,
      task:         c.task,
      action:       c.action,
      result:       c.result,
    }))

    // Load vault entries
    const vault = await db.evidenceEntry.findMany({
      where:   { userId: session.user.id },
      orderBy: { usageCount: 'desc' },
    })

    return Response.json({
      applicationId,
      jobTitle: app.jobTitle,
      criteria,
      vaultCount: vault.length,
      hasParsedSpec: !!(app.parsedSpec),
    })
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

// ── POST: run AI matching ─────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { applicationId } = body

    if (!applicationId) return Response.json({ error: 'applicationId required' }, { status: 400 })

    const db = await getDb(session.user.id)

    // Load application + criteria
    const app = await db.application.findUnique({
      where:   { id: applicationId },
      include: { criteria: { orderBy: { order: 'asc' } } },
    })
    if (!app || app.userId !== session.user.id) {
      return Response.json({ error: 'Not found' }, { status: 404 })
    }

    if (app.criteria.length === 0) {
      return Response.json({ error: 'No criteria found — parse the job spec first' }, { status: 400 })
    }

    // Load vault entries
    const vault = await db.evidenceEntry.findMany({
      where:   { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take:    50,
    })

    if (vault.length === 0) {
      return Response.json({
        error: 'Your EvidenceVault is empty — add STAR examples first',
        vaultEmpty: true,
      }, { status: 400 })
    }

    // Run AI matching
    console.log(`[evidence-match] Matching ${app.criteria.length} criteria against ${vault.length} vault entries`)

    const raw    = await callGemini(buildMatchPrompt(
      app.jobTitle,
      app.criteria.map(c => ({ id: c.id, text: c.criterionText, type: c.type })),
      vault.map(e => ({
        id:          e.id,
        title:       e.title,
        category:    e.category,
        situation:   e.situation,
        task:        e.task,
        action:      e.action,
        result:      e.result,
        skillTags:   e.skillTags,
        nhsValueTags: e.nhsValueTags,
      }))
    ))

    const result = parseJSON(raw)
    if (!result?.matches) {
      return Response.json({ error: 'AI matching failed — please try again' }, { status: 500 })
    }

    // Enrich matches with full vault entry data
    const vaultMap = new Map(vault.map(e => [e.id, e]))
    const enrichedMatches = result.matches.map((m: any) => ({
      ...m,
      vaultEntry: m.vaultEntryId ? {
        id:        m.vaultEntryId,
        title:     vaultMap.get(m.vaultEntryId)?.title,
        situation: vaultMap.get(m.vaultEntryId)?.situation,
        task:      vaultMap.get(m.vaultEntryId)?.task,
        action:    vaultMap.get(m.vaultEntryId)?.action,
        result:    vaultMap.get(m.vaultEntryId)?.result,
      } : null,
    }))

    return Response.json({
      success: true,
      applicationId,
      jobTitle: app.jobTitle,
      matches:  enrichedMatches,
      summary:  result.summary,
      unmatched: result.unmatched ?? [],
    })

  } catch (err: any) {
    console.error('[evidence-match]', err)
    return Response.json({ error: err.message ?? 'Matching failed' }, { status: 500 })
  }
}

// ── PATCH: apply approved matches to application criteria ─────────────────────

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { applicationId, approvedMatches } = body
    // approvedMatches: Array<{ criterionId, vaultEntryId }>

    if (!applicationId || !approvedMatches?.length) {
      return Response.json({ error: 'applicationId and approvedMatches required' }, { status: 400 })
    }

    const db = await getDb(session.user.id)

    // Verify ownership
    const app = await db.application.findUnique({ where: { id: applicationId } })
    if (!app || app.userId !== session.user.id) {
      return Response.json({ error: 'Not found' }, { status: 404 })
    }

    // Load vault entries for the approved ones
    const vaultIds    = approvedMatches.map((m: any) => m.vaultEntryId).filter(Boolean)
    const vaultEntries = await db.evidenceEntry.findMany({
      where: { id: { in: vaultIds }, userId: session.user.id },
    })
    const vaultMap = new Map(vaultEntries.map(e => [e.id, e]))

    // Apply each approved match to the criterion
    let applied = 0
    for (const match of approvedMatches) {
      const entry = vaultMap.get(match.vaultEntryId)
      if (!entry) continue

      await db.applicationCriterion.updateMany({
        where: { id: match.criterionId, applicationId },
        data: {
          situation: entry.situation,
          task:      entry.task,
          action:    entry.action,
          result:    entry.result,
          status:    'evidence_pulled',
        },
      })

      // Increment vault usage count
      await db.evidenceEntry.update({
        where: { id: entry.id },
        data:  { usageCount: { increment: 1 } },
      })

      applied++
    }

    console.log(`[evidence-match] Applied ${applied} matches to application ${applicationId}`)
    return Response.json({ success: true, applied })

  } catch (err: any) {
    console.error('[evidence-match PATCH]', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}