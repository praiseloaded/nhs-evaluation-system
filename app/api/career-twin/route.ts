// app/api/career-twin/route.ts
// Omni Career Twin™ — pulls the user's entire vault and assembles
// a full application package using the most relevant evidence.

import { auth }               from '@/auth'
import { getEffectiveUserId } from '@/lib/effective-user'
import { getDb }              from '@/lib/db-router'

export const runtime = 'nodejs'

async function callGemini(prompt: string, maxTokens = 16000) {
  const apiKey = process.env.GEMINI_API_KEY
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.4, maxOutputTokens: maxTokens, responseMimeType: 'application/json' },
      }),
    }
  )
  if (!res.ok) throw new Error(`Gemini ${res.status}`)
  const data = await res.json()
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}'
  return JSON.parse(text)
}

function buildTwinPrompt(jobText: string, vault: any): string {
  return `
You are the user's "Career Twin" — an AI that knows everything about their professional history and assembles NHS job applications using their REAL evidence, not generic content.

THE USER'S COMPLETE PROFESSIONAL VAULT:

CV PROFILE:
${JSON.stringify(vault.cvProfile ?? {}, null, 2).slice(0, 2000)}

SKILLS PASSPORT (competency levels):
${JSON.stringify(vault.skillsPassport ?? {}, null, 2).slice(0, 1000)}

EVIDENCE VAULT (STAR examples & achievements):
${JSON.stringify(vault.evidenceEntries ?? [], null, 2).slice(0, 3000)}

PAST ANALYSES (what worked before, scores achieved):
${JSON.stringify(vault.pastAnalysesSummary ?? [], null, 2).slice(0, 1500)}

PAST APPLICATIONS (history):
${JSON.stringify(vault.pastApplications ?? [], null, 2).slice(0, 1000)}

THE JOB THEY WANT TO APPLY FOR:
${jobText.slice(0, 3000)}

YOUR TASK:
Assemble a complete application using ONLY evidence that genuinely exists in the vault above. Where the vault has a real STAR example or achievement that matches a criterion, use it — quote/paraphrase the REAL details (ward names, numbers, outcomes). Where the vault has NO matching evidence for a criterion, flag it clearly as a GAP rather than inventing evidence.

Respond ONLY with this JSON:
{
  "matchedEvidence": [
    {
      "criterion": "the job criterion this addresses",
      "evidenceSource": "which vault entry this came from — e.g. 'Evidence Vault: IV cannulation entry' or 'CV: achievement bullet 2'",
      "starAnswer": "WRITE 80-110 WORDS using the REAL evidence found — specific ward, numbers, outcomes from the vault. If evidence exists, this should sound authentic and specific, not generic.",
      "confidence": "high if strong real evidence exists, medium if partial match, low if loosely related"
    }
  ],
  "gaps": [
    {
      "criterion": "a job criterion with NO matching evidence in the vault",
      "whyGap": "explain what's missing",
      "suggestion": "what the user should add to their Evidence Vault to close this gap"
    }
  ],
  "personalStatement": "WRITE 180-200 WORDS using only real evidence from the vault. If insufficient evidence exists for a strong statement, note this in a separate 'statementQuality' field rather than padding with generic claims.",
  "statementQuality": "strong / adequate / needs-more-evidence",
  "overallReadiness": 72,
  "readinessVerdict": "WRITE 1-2 sentences on whether this application is ready to submit or needs more evidence gathered first",
  "nextSteps": [
    "WRITE a specific next step — e.g. add an Evidence Vault entry for X",
    "WRITE a second next step"
  ]
}
`.trim()
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })
    const userId = (await getEffectiveUserId()) ?? (session.user.id as string)
    const db     = await getDb(userId)

    const { jobText, jobUrl } = await req.json()
    if (!jobText?.trim()) return Response.json({ error: 'Job description required' }, { status: 400 })

    // Pull the entire vault in parallel
    const [cvProfile, evidenceEntries, pastAnalyses, pastApplications, skillsRecord] = await Promise.all([
      db.cvProfile.findFirst({ where: { userId }, orderBy: { updatedAt: 'desc' } }).catch(() => null),
      db.evidenceEntry.findMany({ where: { userId }, orderBy: { updatedAt: 'desc' }, take: 20 }).catch(() => []),
      db.analysis.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 5,
        select: { jobTitle: true, result: true } }).catch(() => []),
      db.application.findMany({ where: { userId, notes: { not: { in: ['skills_passport'] } } },
        orderBy: { createdAt: 'desc' }, take: 10,
        select: { jobTitle: true, employer: true, status: true } }).catch(() => []),
      db.application.findFirst({ where: { userId, notes: 'skills_passport' }, select: { parsedSpec: true } }).catch(() => null),
    ])

    const vault = {
      cvProfile: cvProfile ? {
        fullName: (cvProfile as any).fullName,
        personalStatement: (cvProfile as any).personalStatement,
        skills: (cvProfile as any).skills,
        professionalRegistration: (cvProfile as any).professionalRegistration,
      } : null,
      skillsPassport: (skillsRecord?.parsedSpec as any)?.skills ?? {},
      evidenceEntries: (evidenceEntries as any[]).map(e => ({
        title: e.title, situation: e.situation, task: e.task, action: e.action, result: e.result, competency: e.competency,
      })),
      pastAnalysesSummary: (pastAnalyses as any[]).map(a => ({
        jobTitle: a.jobTitle, score: a.result?.scoredBreakdown?.overall ?? a.result?.overallScore,
      })),
      pastApplications: (pastApplications as any[]).map(a => ({ jobTitle: a.jobTitle, employer: a.employer, status: a.status })),
    }

    const hasEvidence = vault.evidenceEntries.length > 0 || vault.cvProfile

    if (!hasEvidence) {
      return Response.json({
        success: true,
        insufficientVault: true,
        message: 'Your Career Twin needs more data to work well. Add entries to EvidenceVault™ and complete your CV Builder profile first, then try again.',
      })
    }

    const result = await callGemini(buildTwinPrompt(jobText, vault))

    return Response.json({ success: true, ...result, vaultSummary: {
      evidenceCount: vault.evidenceEntries.length,
      hasCvProfile: !!vault.cvProfile,
      pastAnalysesCount: vault.pastAnalysesSummary.length,
    }})

  } catch (err: any) {
    console.error('[career-twin]', err)
    return Response.json({ error: err.message ?? 'Failed' }, { status: 500 })
  }
}