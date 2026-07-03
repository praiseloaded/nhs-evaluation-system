// app/api/job-ready/route.ts
// POST — generate complete application package from job advert
// GET  — list or retrieve saved Job Ready packages
//
// Storage strategy:
//   - Application.notes    = 'job_ready'  (short exact-match marker, never truncated)
//   - Application.parsedSpec = { jobReadyPackage: {...} }  (JSON column, no size limit)

import { createNotification } from '@/lib/notifications'
import { auth }   from '@/auth'
import { getDb }  from '@/lib/db-router'
import { prisma }  from '@/lib/prisma'
import { prisma2 } from '@/lib/db-router'

export const runtime = 'nodejs'

// ── GET — list all packages, or load one by id ────────────────────────────────
export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const db  = await getDb(session.user.id)
    const url = new URL(req.url)
    const id  = url.searchParams.get('id')

    // Single package — load full parsedSpec
    if (id) {
      const app = await db.application.findUnique({
        where:  { id },
        select: { id: true, jobTitle: true, employer: true, band: true,
                  notes: true, parsedSpec: true, updatedAt: true, userId: true },
      })
      if (!app || app.userId !== session.user.id) {
        return Response.json({ error: 'Not found' }, { status: 404 })
      }
      const packageData = (app.parsedSpec as any)?.jobReadyPackage ?? null
      return Response.json({ success: true, packageData })
    }

    // List all Job Ready packages — exact match on notes = 'job_ready'
    const packages = await db.application.findMany({
      where:   { userId: session.user.id, notes: 'job_ready' },
      orderBy: { updatedAt: 'desc' },
      take:    50,
      select:  { id: true, jobTitle: true, employer: true, band: true,
                 status: true, updatedAt: true },
    })

    return Response.json({ success: true, packages })
  } catch (err: any) {
    console.error('[job-ready GET]', err)
    return Response.json({ error: err.message ?? 'Failed' }, { status: 500 })
  }
}

// ── POST — generate package ───────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { jobText, jobUrl } = await req.json()
    if (!jobText && !jobUrl) return Response.json({ error: 'jobText or jobUrl required' }, { status: 400 })

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) throw new Error('GEMINI_API_KEY not set')

    const db = await getDb(session.user.id)

    const cvProfile = await db.cvProfile.findFirst({
      where:   { userId: session.user.id },
      orderBy: { updatedAt: 'desc' },
      select:  { fullName: true, personalStatement: true, workExperience: true,
                 skills: true, education: true, certifications: true,
                 professionalRegistration: true },
    }).catch(() => null)

    const recentApps = await Promise.any([
      prisma.application.findMany({ where: { userId: session.user.id }, orderBy: { createdAt: 'desc' }, take: 3, select: { jobTitle: true, employer: true } }),
      prisma2.application.findMany({ where: { userId: session.user.id }, orderBy: { createdAt: 'desc' }, take: 3, select: { jobTitle: true, employer: true } }),
    ]).catch(() => [])

    const profileBlock = cvProfile ? `
CANDIDATE PROFILE (personalise everything using this — do NOT write generic content):
Name: ${cvProfile.fullName || 'Not provided'}
Registration: ${cvProfile.professionalRegistration || 'Not stated'}
Current statement: ${cvProfile.personalStatement?.slice(0, 500) || 'Not provided'}
Work history: ${JSON.stringify(cvProfile.workExperience || []).slice(0, 1000)}
Skills: ${JSON.stringify(cvProfile.skills || []).slice(0, 400)}
Education: ${JSON.stringify(cvProfile.education || []).slice(0, 400)}
Certifications: ${JSON.stringify(cvProfile.certifications || []).slice(0, 300)}
Previous applications: ${(recentApps as any[]).map((a: any) => `${a.jobTitle} at ${a.employer}`).join(', ') || 'None'}
` : 'No profile — use realistic NHS placeholders in [square brackets] for the candidate to fill in.'

    const prompt = `
You are a specialist NHS career writer. Generate a COMPLETE, REAL application package for the job advert below.

CRITICAL: Every field in the JSON must contain REAL GENERATED CONTENT — not instructions, not placeholders.
Write actual sentences. Write actual bullet points. Write actual questions. Never copy back the field description.

JOB ADVERT:
${jobText || `URL: ${jobUrl}`}

${profileBlock}

WRITING RULES (apply to every piece of content):
- First person, past tense for achievements: "I led", "I reduced", "I introduced"
- NEVER write: passionate, dedicated, committed, eager, I am writing to apply, I believe I would be, dynamic
- Use NHS language: MDT, escalation, safeguarding, NMC/HCPC, Datix, SystmOne, EMIS, duty of candour
- Personal statement: open with ONE specific achievement in the first sentence, then name the role and employer
- Cover letter: first paragraph must start with what the person HAS DONE — not who they are
- STAR evidence: specific ward or setting, specific action the person took, specific measurable outcome
- Interview questions: write the ACTUAL question an NHS panel would ask for this exact band and specialty
- Action plan: tasks specific to THIS employer and THIS job — not generic advice

Generate the following JSON. Replace every value with real, specific, generated content:

{
  "jobTitle": "exact job title from the advert",
  "employer": "exact employer name from the advert",
  "band": "Band X or grade from the advert",
  "location": "location from the advert",
  "closingDate": null,
  "essentialCriteria": [
    "first essential criterion copied verbatim from person spec",
    "second essential criterion",
    "third essential criterion",
    "fourth essential criterion",
    "fifth essential criterion"
  ],
  "atsKeywords": [
    "keyword from job spec 1",
    "keyword from job spec 2",
    "keyword from job spec 3",
    "keyword from job spec 4",
    "keyword from job spec 5",
    "keyword from job spec 6",
    "keyword from job spec 7",
    "keyword from job spec 8"
  ],
  "cvContent": {
    "personalStatement": "WRITE 180-200 WORDS HERE. First sentence: one specific clinical or professional achievement from the candidate profile with context (ward, team, outcome). Second sentence: states the role and employer from the advert and why this is the right next step. Then 3-4 sentences weaving in specific ATS keywords from the job spec and evidence of relevant skills. Final sentence: what the candidate will bring to this specific team from day one. Must sound like a real person wrote it after a long shift, not an AI.",
    "keySkills": [
      "Write a real competency for this role — specific, not generic",
      "Write a second real competency",
      "Write a third real competency",
      "Write a fourth real competency",
      "Write a fifth real competency",
      "Write a sixth real competency"
    ],
    "achievementBullets": [
      "Past-tense verb + what was done + specific measurable outcome — e.g. Reduced specimen rejection rate by 18% over six months by rewriting the labelling SOP and training 12 ward staff",
      "Second achievement bullet with number or outcome",
      "Third achievement bullet with number or outcome"
    ]
  },
  "coverLetter": {
    "subjectLine": "Application for [Job Title] — [Reference number if visible in advert]",
    "body": "WRITE 300-320 WORDS HERE across 3 paragraphs. Paragraph 1 (100-110 words): opens with a specific past achievement directly relevant to this role — not 'I am writing to apply'. Paragraph 2 (110-120 words): addresses two specific essential criteria from the person spec using brief STAR evidence pulled from the candidate profile. Paragraph 3 (80-90 words): shows genuine specific knowledge of this employer — reference their trust strategy, CQC rating, department, local population or recent news if known. End: Yours sincerely. Make each paragraph flow naturally."
  },
  "supportingStatement": {
    "intro": "Two sentences. First names the role and employer and states how long the candidate has worked in this specialty. Second gives one specific reason why this role is the right next step.",
    "criteria": [
      {
        "criterion": "first essential criterion from person spec verbatim",
        "starEvidence": "WRITE 90-110 WORDS HERE. Situation: specific ward, department or setting. Task: what the candidate was responsible for. Action: specific steps they took, named techniques or processes. Result: measurable outcome — number, percentage, patient feedback, audit result. Should read like someone describing a real shift or project from memory, not a textbook."
      },
      {
        "criterion": "second essential criterion verbatim",
        "starEvidence": "WRITE 90-110 WORDS HERE. Use a different scenario and different verb from the first criterion."
      },
      {
        "criterion": "third essential criterion verbatim",
        "starEvidence": "WRITE 90-110 WORDS HERE. Use a third distinct scenario."
      },
      {
        "criterion": "fourth essential criterion verbatim",
        "starEvidence": "WRITE 90-110 WORDS HERE."
      },
      {
        "criterion": "fifth essential criterion verbatim",
        "starEvidence": "WRITE 90-110 WORDS HERE."
      }
    ],
    "closing": "Two sentences. First states what the candidate will bring to the team from day one — specific skills or experience. Second is a confident close. No 'I hope to hear from you' or 'I look forward to the opportunity'."
  },
  "interviewPrep": {
    "questions": [
      {
        "question": "Write the actual values-based question this NHS employer would ask, based on their stated values or NHS values",
        "keyPoints": [
          "Which NHS value or trust value to reference and brief example",
          "Which specific experience from the profile to draw on",
          "How to close the answer — what it demonstrates about the candidate"
        ]
      },
      {
        "question": "Write the actual clinical or role-specific competency question for this exact band and specialty",
        "keyPoints": [
          "Which clinical knowledge or skill to demonstrate",
          "Specific technique, protocol or standard to mention",
          "Safety or governance angle relevant to this role"
        ]
      },
      {
        "question": "Write the actual scenario question: Tell me about a time you... [relevant to a real challenge in this role]",
        "keyPoints": [
          "The type of situation and why panels ask it for this role",
          "Key STAR beats: what happened, what they did, what changed",
          "What outcome to emphasise to show competence"
        ]
      },
      {
        "question": "Write the actual MDT or team-working question for this clinical setting",
        "keyPoints": [
          "Which MDT roles to mention for this specialty",
          "What effective collaboration looks like in this setting",
          "Communication or handover aspect to highlight"
        ]
      },
      {
        "question": "Write the actual CPD or professional development question for this band and registration body",
        "keyPoints": [
          "Which CPD activities or qualifications to mention for this role",
          "How to frame career ambition without appearing to want the hiring manager's job",
          "Specific training, course or portfolio evidence relevant to this post"
        ]
      }
    ],
    "researchTips": [
      "Write one specific thing to research about THIS employer — their CQC rating, trust strategy, department speciality or recent press",
      "Write one current NHS policy or priority directly relevant to THIS role that the candidate should be able to speak to in interview",
      "Write one thing about the local population, patient demographic or catchment area for this trust or practice"
    ]
  },
  "actionPlan": [
    { "day": 1, "task": "Write a specific day-1 task for this employer — e.g. register on the exact application system they use (NHS Jobs / Trac / Jobtrain for Scotland)", "timeMinutes": 20 },
    { "day": 2, "task": "Write a specific writing task using the personal statement content above", "timeMinutes": 45 },
    { "day": 3, "task": "Write a specific supporting statement task — which criterion to start with and why it is strongest", "timeMinutes": 60 },
    { "day": 4, "task": "Write a specific research task about this employer", "timeMinutes": 30 },
    { "day": 5, "task": "Write a specific task to strengthen the application based on any gaps in the candidate profile vs person spec", "timeMinutes": 40 },
    { "day": 6, "task": "Write specific proof-reading checks for this type of NHS application", "timeMinutes": 30 },
    { "day": 7, "task": "Write the specific submit and follow-up step for this employer's system", "timeMinutes": 15 }
  ],
  "shortlistChance": {
    "score": 72,
    "verdict": "Strong",
    "strengths": [
      "Write a specific strength matching this candidate profile to this person spec",
      "Write a second specific strength"
    ],
    "gaps": [
      "Write a genuine gap between the candidate profile and person spec — only include if one exists"
    ]
  }
}
`.trim()

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature:      0.4,
            maxOutputTokens:  16000,
            responseMimeType: 'application/json',
          },
        }),
      }
    )

    if (!response.ok) throw new Error(`Gemini error: ${response.status}`)
    const data  = await response.json()
    const parts = data?.candidates?.[0]?.content?.parts ?? []
    let text = ''
    for (const part of parts) { if (part.text) text = part.text.trim() }
    const result = JSON.parse(text.replace(/```json|```/g, '').trim())

    // ── Save to Application model ────────────────────────────────────────────
    let applicationId: string | null = null
    try {
      const savedApp = await db.application.create({
        data: {
          userId:         session.user.id,
          jobTitle:       result.jobTitle  || 'Unknown Role',
          employer:       result.employer  || 'Unknown Employer',
          band:           result.band      || '',
          status:         'draft',
          notes:          'job_ready',                 // ← exact match marker
          parsedSpec:     { jobReadyPackage: result },  // ← full JSON, no size limit
          fullStatement:  result.cvContent?.personalStatement || '',
          jobDescription: (jobText || '').slice(0, 5000),
        } as any,
      })
      applicationId = savedApp.id
    } catch (saveErr: any) {
      console.error('[job-ready] application save error:', saveErr)
    }

    // ── Also push personal statement + skills into the CV Profile ─────────────
    let cvProfileId: string | null = null
    try {
      const existingProfile = await db.cvProfile.findFirst({
        where:   { userId: session.user.id },
        orderBy: { updatedAt: 'desc' },
        select:  { id: true },
      })

      // One skills group with all skills as array — matches what CV builder expects
      const skillsPayload = (result.cvContent?.keySkills || []).length
        ? [{ category: 'Key Skills', items: result.cvContent.keySkills }]
        : []

      if (existingProfile) {
        await db.cvProfile.update({
          where: { id: existingProfile.id },
          data:  {
            personalStatement: result.cvContent?.personalStatement || '',
            skills:            skillsPayload,
          },
        })
        cvProfileId = existingProfile.id
      } else {
        // Create a new profile pre-filled with generated content
        const newProfile = await db.cvProfile.create({
          data: {
            userId:            session.user.id,
            title:             `${result.jobTitle} CV`,
            template:          'classic',
            personalStatement: result.cvContent?.personalStatement || '',
            skills:            skillsPayload,
            fullName:          cvProfile?.fullName || '',
            email:             '',
            phone:             '',
            location:          '',
          } as any,
        })
        cvProfileId = newProfile.id
      }
    } catch (cvErr: any) {
      console.error('[job-ready] CV profile save error (non-fatal):', cvErr)
    }

    createNotification({
      userId,
      type:    'job_ready_complete',
      title:   'Job Ready™ package ready',
      body:    `Your full application package for "${result.jobTitle ?? 'this role'}" is ready — CV content, cover letter, interview prep and 7-day plan.`,
      linkUrl: '/dashboard/job-ready',
    }).catch(() => {})

    return Response.json({ success: true, result, applicationId, cvProfileId })

  } catch (error: any) {
    console.error('[job-ready]', error)
    return Response.json({ error: error.message ?? 'Generation failed' }, { status: 500 })
  }
}

// ── DELETE — remove a saved Job Ready package ─────────────────────────────────
export async function DELETE(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await req.json()
    if (!id) return Response.json({ error: 'id required' }, { status: 400 })

    const db = await getDb(session.user.id)

    // Verify it belongs to this user and is a job_ready package
    const app = await db.application.findUnique({
      where:  { id },
      select: { userId: true, notes: true },
    })

    if (!app || app.userId !== session.user.id) {
      return Response.json({ error: 'Not found' }, { status: 404 })
    }
    if (app.notes !== 'job_ready') {
      return Response.json({ error: 'Not a Job Ready package' }, { status: 400 })
    }

    await db.application.delete({ where: { id } })
    return Response.json({ success: true })
  } catch (err: any) {
    console.error('[job-ready DELETE]', err)
    return Response.json({ error: err.message ?? 'Failed' }, { status: 500 })
  }
}