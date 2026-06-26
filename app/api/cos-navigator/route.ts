// app/api/cos-navigator/route.ts
//
// COS & Sponsorship Intelligence™
// Analyses NHS job postings for sponsorship likelihood,
// visa route suitability, and salary threshold compliance.

export const runtime = 'nodejs'

import { auth }  from '@/auth'
import { getDb } from '@/lib/db-router'
import { NextRequest } from 'next/server'

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
  if (!text) throw new Error('Empty response')
  return text
}

function parseJSON(raw: string): any {
  const cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
  try { return JSON.parse(cleaned) } catch {}
  const s = cleaned.indexOf('{'), e = cleaned.lastIndexOf('}')
  if (s !== -1 && e > s) try { return JSON.parse(cleaned.slice(s, e + 1)) } catch {}
  return null
}

function buildCosPrompt(input: {
  jobTitle:       string
  band:           string
  employer:       string
  salary:         string
  jobSpec:        string
  nationality:    string
  currentVisa:    string
  registrationBody: string
}): string {
  return `
You are a UK immigration specialist with deep expertise in NHS Skilled Worker and Health & Care Worker visas.
Analyse this NHS job for sponsorship likelihood and visa suitability. Return ONLY valid JSON.

JOB DETAILS:
Title: ${input.jobTitle}
Band: ${input.band}
Employer: ${input.employer}
Advertised Salary: ${input.salary || 'not specified'}
Applicant Nationality: ${input.nationality}
Current Visa Status: ${input.currentVisa}
Professional Registration Body: ${input.registrationBody}

JOB SPEC EXCERPT:
${input.jobSpec.slice(0, 2000)}

Analyse based on your knowledge of:
- UK Shortage Occupation List (SOL) as of 2024-2025
- NHS Skilled Worker visa requirements
- Health & Care Worker visa eligibility
- NHS Band salary thresholds vs Home Office minimums
- Historical NHS trust sponsorship patterns
- GOC, NMC, HCPC, GMC registration requirements

Return this exact JSON:
{
  "overallLikelihood": "high|medium|low|very_low",
  "likelihoodScore": <0-100>,
  "likelihoodReason": "<2-3 sentence overall assessment>",

  "visaRoutes": [
    {
      "route": "Health and Care Worker visa|Skilled Worker visa|Other",
      "eligible": true|false,
      "reason": "<why eligible or not>",
      "advantages": ["<advantage>"],
      "requirements": ["<specific requirement to meet>"]
    }
  ],

  "shortageOccupation": {
    "onList": true|false,
    "roleCode": "<SOC code if known or null>",
    "listName": "<SOL or RLMT exempt or null>",
    "benefit": "<what being on the list means for this applicant>",
    "note": "<any caveats — e.g. specific bands or settings only>"
  },

  "salaryCheck": {
    "advertisedSalary": "<from job or band scale>",
    "minimumRequired": "<current Home Office threshold for this route>",
    "meetsThreshold": true|false|"unknown",
    "goingRateForRole": "<typical NHS going rate for this band/role>",
    "advice": "<what to do if salary is borderline>"
  },

  "employerSponsorshipProfile": {
    "isLikelySponsor": true|false,
    "reason": "<why this trust is/isn't likely to sponsor>",
    "trustType": "NHS Foundation Trust|NHS Trust|GP Practice|Private NHS contractor|Unknown",
    "sponsorshipHistory": "active|limited|unknown",
    "redFlags": ["<anything that reduces sponsorship likelihood>"],
    "positiveSignals": ["<anything that increases likelihood — e.g. international nurse programme>"]
  },

  "registrationRequirements": {
    "body": "<NMC|HCPC|GMC|GPhC|GOC|RCVS|None>",
    "requiredBeforeStart": true|false,
    "overseasProcessAvailable": true|false,
    "estimatedTimeToRegister": "<e.g. 3-6 months>",
    "keySteps": ["<step 1>", "<step 2>", "<step 3>"],
    "englishTestRequired": "<IELTS/OET/exempt>",
    "note": "<any important caveat>"
  },

  "actionPlan": [
    {
      "priority": "immediate|soon|later",
      "action": "<specific thing to do>",
      "reason": "<why this matters>",
      "link": "<relevant URL if known — e.g. NMC overseas registration page>"
    }
  ],

  "redFlags": [
    "<anything that could prevent sponsorship or create visa problems>"
  ],

  "encouragingFactors": [
    "<anything in the applicant or job profile that makes success more likely>"
  ],

  "estimatedTimeline": {
    "jobApplicationToOffer": "<e.g. 4-8 weeks>",
    "cosToVisaDecision": "<e.g. 3-8 weeks>",
    "registrationIfNeeded": "<e.g. 3-6 months>",
    "totalFromNow": "<realistic total e.g. 4-9 months>",
    "criticalPath": "<what determines the longest delay>"
  },

  "keyResources": [
    { "title": "<resource name>", "url": "<URL>", "relevance": "<why useful>" }
  ]
}

Be realistic and specific. NHS trusts vary significantly in their willingness to sponsor.
Base salary thresholds on 2024-2025 Home Office rates (£26,200 minimum, £23,700 for shortage occupations on SOL, £20,960 for new entrants in some routes).
For Health & Care visa: applicant must be in eligible occupation AND registered/recognised by relevant body.
`.trim()
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const db   = await getDb(session.user.id)
    const list = await (db as any).cosNavigator?.findMany?.({
      where:   { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take:    20,
      select:  { id: true, jobTitle: true, employer: true, overallLikelihood: true, createdAt: true },
    }) ?? []

    return Response.json({ analyses: list })
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const {
      jobTitle, band, employer, salary,
      jobSpec, nationality, currentVisa, registrationBody,
    } = body

    if (!jobTitle || !employer) {
      return Response.json({ error: 'jobTitle and employer are required' }, { status: 400 })
    }

    console.log('[cos-navigator] Analysing:', jobTitle, 'at', employer)

    const raw    = await callGemini(buildCosPrompt({
      jobTitle, band: band || '', employer, salary: salary || '',
      jobSpec: jobSpec || '', nationality: nationality || 'not specified',
      currentVisa: currentVisa || 'not specified',
      registrationBody: registrationBody || 'not specified',
    }))

    const result = parseJSON(raw)
    if (!result) return Response.json({ error: 'Analysis failed — please try again' }, { status: 500 })

    return Response.json({ success: true, result, jobTitle, employer })

  } catch (err: any) {
    console.error('[cos-navigator]', err)
    return Response.json({ error: err.message ?? 'Analysis failed' }, { status: 500 })
  }
}