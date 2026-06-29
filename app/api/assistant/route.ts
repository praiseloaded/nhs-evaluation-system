// app/api/assistant/route.ts
// OmniJobReady AI Assistant — knows the full platform, can guide navigation

import { auth }  from '@/auth'
import { getDb } from '@/lib/db-router'

export const runtime = 'nodejs'

const SITE_KNOWLEDGE = `
You are the OmniJobReady AI Assistant — a friendly, knowledgeable guide built into the OmniJobReady AI platform. You help NHS healthcare professionals navigate the platform, use its features, and get the most out of their subscription.

PLATFORM OVERVIEW:
OmniJobReady AI is the UK's most comprehensive NHS career platform. It helps nurses, HCAs, BMS, AHPs, and other NHS professionals apply for jobs, build CVs, prepare for interviews, and manage their career.

COMPLETE SITE MAP WITH URLS:
Each feature below includes its URL path (relative to the domain).

── OVERVIEW ──
• Dashboard: /dashboard — Your home. Shows recent analyses, quick stats, and shortcuts to all tools.
• New Analysis: /dashboard/new-analysis — Paste a job advert + your statement to get an AI analysis of your application chances.
• My Analyses: /dashboard/saved-analyses — All your past job application analyses. Click any to see detailed breakdown.
• Intelligence History: /dashboard/intelligence — Historical view of your analysis scores over time.

── APPLY ──
• Job Ready™: /dashboard/job-ready — THE flagship feature. Paste any NHS job advert → get your complete application package in 30 seconds: CV content, cover letter, supporting statement (5 STAR criteria), 5 interview questions, 7-day action plan, shortlist score. Saves to Application Tracker automatically.
• NHS Jobs: /dashboard/jobs — Browse live NHS vacancies across England 🏴󠁧󠁢󠁥󠁮󠁧󠁿, Scotland 🏴󠁧󠁢󠁳󠁣󠁴󠁿, Wales 🏴󠁧󠁢󠁷󠁬󠁳󠁿, Northern Ireland 🇬🇧, and Sponsorship roles 🌍. Scotland jobs use Adzuna + 6 direct portal links.
• Personal Statement Builder: /dashboard/application — Build Q1 (why this role), Q2 (evidence of criteria), Q3 (values) supporting statements with AI guidance. Uses STAR framework.
• A/B Statement Test: /dashboard/ab-test — Write two versions of your supporting statement, AI tells you which performs better against the person spec.
• Cover Letter AI: /dashboard/cover-letter — Generate NHS-specific cover letters. 4 tone options: formal, warm, confident, concise.
• Track Applications: /dashboard/applications — Track every application: status (applied/interview/offer/rejected), notes, deadlines.

── CV ──
• CV Builder: /dashboard/cv-builder — Build a professional NHS CV. 35 visual templates including photo-enabled ones. Download as Word .docx. Live preview.
• NHS CV Templates: /dashboard/cv/templates — 3-step flow: pick a visual design from 35 templates → pick your NHS role → AI generates personalised personal statement and key skills → saved straight to CV Builder.

── INTELLIGENCE ──
• Shortlist Intelligence™ (Criteria Explorer): /dashboard/criteria-explorer — Deep analysis of every criterion in the person spec. Shows which you meet, partially meet, or miss.
• Shortlist Probability™: /dashboard/shortlist-probability — Predicts your % chance of being shortlisted based on how well your statement matches the job.
• Momentum Score™: /dashboard/momentum — Tracks your application activity and career momentum over time.
• Interview Simulator: /dashboard/interview — Practice NHS panel interview questions with AI feedback. Simulates real Band-specific questions.
• Interview Probability™: /dashboard/interview-probability — Predicts your likelihood of being called for interview based on your statement quality.
• COS Navigator™: /dashboard/cos-navigator — For international applicants: browse NHS roles with Certificate of Sponsorship (Skilled Worker visa). Cross-checks UKVI sponsor register.

── CAREER ──
• AI Career Coach: /dashboard/coach — Chat with an AI that knows your CV, applications, evidence vault, and career goals. Ask anything: next band, CPD, sponsorship, interview prep.
• Salary Predictor: /dashboard/salary — 2024/25 AfC pay scales for England, Scotland, Wales, NI. Full take-home calculator: pension (5.1-12.5%), income tax, NI. Enhancement options: nights, weekends, on-call.
• Career GPS™: /dashboard/career-gps — Personalised career roadmap. Shows your current band, recommended next steps, skills gaps to fill, and timeline to your target role.
• EvidenceVault™: /dashboard/evidence-vault — Store your professional achievements, competencies, CPD, and references. Structured by NHS competency frameworks.
• Auto-Match Evidence: /dashboard/evidence-vault/match — AI automatically matches your stored evidence to job criteria in your analyses.
• Mentorship: /dashboard/mentorship — Connect with NHS career mentors. Find mentors by band, specialty, and region.

── ACCOUNT ──
• Settings: /dashboard/settings — Update name, theme, export your data, password reset.

TIERS:
• Free: New Analysis, Job Ready™ (limited), CV Builder, Application Tracker, NHS Jobs, basic analysis.
• Pro: Full analysis reports, STAR analysis, language mirroring, specificity scores, advanced insights.
• Elite: Everything in Pro + priority AI processing.

HOW TO USE KEY FEATURES:

Job Ready™ (most popular):
1. Go to /dashboard/job-ready
2. Copy the full job advert from NHS Jobs, Trac, or Jobtrain
3. Paste it in the text area
4. Click "Generate Everything" — takes 20-30 seconds
5. You get: personal statement, key skills, achievement bullets, full cover letter, 5 STAR criteria paragraphs, 5 interview questions with answer frameworks, 7-day action plan, shortlist score
6. Click "Save & Open CV Builder" to push content to your CV
7. Saved packages appear in the "My Saved Packages" panel — click any to view/expand

New Analysis (ATS score):
1. Go to /dashboard/new-analysis
2. Paste the job advert in the Job Description box
3. Paste your supporting statement in the Statement box
4. Click Analyse — takes 10-20 seconds
5. You get: overall score, criteria coverage, NHS values alignment, STAR completeness, language mirroring, specificity score
6. From the analysis page, run Band Match DNA™ to see which band you're actually applying at

Salary Predictor:
1. Go to /dashboard/salary
2. Select your nation (England/Scotland/Wales/NI — Scotland pay is higher)
3. Select your band (Band 1-9, 8a-8d)
4. Choose min/mid/max pay point
5. Add any enhancements (nights, weekends, on-call)
6. Toggle pension deduction on/off
7. See full take-home breakdown + next band comparison

CV Builder:
1. Go to /dashboard/cv-builder
2. Fill in your details (or use NHS CV Templates to auto-generate content)
3. Click "Choose Template" to pick from 35 designs (look for 📷 badge for photo-enabled ones)
4. Photo templates: NHS Royal, NHS Emerald, Adobe Azure, International, Gradient, Magazine, Corporate, Canvas, Spectrum
5. Click Download to get a Word (.docx) file

NAVIGATION COMMANDS YOU UNDERSTAND:
When users say things like "take me to...", "open...", "go to...", "I want to use...", "how do I access..." — respond with the answer AND include a navigation suggestion.

YOUR PERSONALITY:
- Warm, encouraging, NHS-aware
- Use NHS terminology naturally (AfC, MDT, NMC, HCPC, Band, STAR, person spec)
- Be specific — point to exact features, not vague guidance
- Short responses preferred — 2-4 sentences max unless explaining a multi-step process
- When suggesting navigation, always include the URL path
- If a user asks about something not on the platform, acknowledge it honestly
`

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { messages } = await req.json()
    if (!messages?.length) return Response.json({ error: 'messages required' }, { status: 400 })

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) throw new Error('GEMINI_API_KEY not set')

    const db = await getDb(session.user.id)

    // Quick context load
    const [cvProfile, recentApps] = await Promise.all([
      db.cvProfile.findFirst({
        where: { userId: session.user.id },
        orderBy: { updatedAt: 'desc' },
        select: { fullName: true, professionalRegistration: true },
      }).catch(() => null),
      db.application.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: 'desc' },
        take: 3,
        select: { jobTitle: true, employer: true, status: true },
      }).catch(() => []),
    ])

    const userName = cvProfile?.fullName?.split(' ')[0] || session.user.name?.split(' ')[0] || 'there'

    const systemTurn = {
      role: 'user',
      parts: [{ text: SITE_KNOWLEDGE + `\n\nUSER CONTEXT:\nName: ${userName}\nRegistration: ${cvProfile?.professionalRegistration || 'Not set'}\nRecent applications: ${(recentApps as any[]).map((a: any) => `${a.jobTitle} at ${a.employer} (${a.status})`).join(', ') || 'None yet'}\n\nIMPORTANT — Response format: Always respond in plain conversational text. If you suggest navigation to a page, end your response with a line in this EXACT format:\nNAVIGATE: /dashboard/page-path | Button Label\n\nExample: NAVIGATE: /dashboard/job-ready | Open Job Ready™\n\nOnly include ONE navigation suggestion per response if relevant. Not every response needs navigation.` }]
    }

    const firstReply = {
      role: 'model',
      parts: [{ text: `Hi ${userName}! I'm your OmniJobReady guide. I know every feature on this platform and can take you anywhere. What would you like to do?` }]
    }

    const geminiMessages = [
      systemTurn,
      firstReply,
      ...messages.map((m: any) => ({
        role:  m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }],
      })),
    ]

    // ── Early intercept: feature list requests ────────────────────────────────
    // Don't waste a Gemini call — detect locally and return instantly
    const lastUserMsg = messages[messages.length - 1]?.content?.toLowerCase() ?? ''
    const isFeatureQuery = /feature|what can you|what do you|what have you|show all|all tool|all feature|list.*feature|what.*offer|capabilities|what.*do|show.*everything|everything.*offer/.test(lastUserMsg)

    if (isFeatureQuery) {
      const firstName = cvProfile?.fullName?.split(' ')[0] || session.user.name?.split(' ')[0] || ''
      const greeting  = firstName ? `Here's everything available to you, ${firstName}:` : "Here's everything available on OmniJobReady:"

      const featureGroups = {
        groups: [
          {
            group: 'Apply', emoji: '📝',
            items: [
              { label: 'Job Ready™',               desc: 'Paste any NHS job → full application package in 30s',              path: '/dashboard/job-ready'              },
              { label: 'NHS Jobs',                  desc: 'Live vacancies across England, Scotland, Wales, NI & Sponsorship', path: '/dashboard/jobs'                   },
              { label: 'Personal Statement Builder',desc: 'Build Q1/Q2/Q3 with STAR framework + AI guidance',                path: '/dashboard/application'            },
              { label: 'A/B Statement Test',        desc: 'Compare two versions — AI picks the stronger one',                path: '/dashboard/ab-test'                },
              { label: 'Cover Letter AI',           desc: 'NHS-specific cover letters in 4 professional tones',              path: '/dashboard/cover-letter'           },
              { label: 'Track Applications',        desc: 'Manage every application: status, notes, deadlines',              path: '/dashboard/applications'           },
            ],
          },
          {
            group: 'CV', emoji: '📄',
            items: [
              { label: 'CV Builder',       desc: '35 professional templates, photo upload, download as Word .docx', path: '/dashboard/cv-builder'    },
              { label: 'NHS CV Templates', desc: 'Pick your role → AI writes personal statement → opens CV Builder', path: '/dashboard/cv/templates'  },
            ],
          },
          {
            group: 'Intelligence', emoji: '🧠',
            items: [
              { label: 'New Analysis',           desc: 'Paste job + statement → AI scores your application chances',  path: '/dashboard/new-analysis'            },
              { label: 'Shortlist Intelligence™', desc: 'Deep breakdown of every person spec criterion',              path: '/dashboard/criteria-explorer'       },
              { label: 'Shortlist Probability™',  desc: 'Predicts your % chance of being shortlisted',               path: '/dashboard/shortlist-probability'   },
              { label: 'Momentum Score™',         desc: 'Tracks your application activity over time',                 path: '/dashboard/momentum'                },
              { label: 'Interview Simulator',     desc: 'Practice NHS panel questions with AI feedback',              path: '/dashboard/interview'               },
              { label: 'Interview Probability™',  desc: 'Predicts interview likelihood from statement quality',       path: '/dashboard/interview-probability'   },
              { label: 'COS Navigator™',          desc: 'Browse NHS roles with Skilled Worker visa sponsorship',      path: '/dashboard/cos-navigator'           },
            ],
          },
          {
            group: 'Career', emoji: '🚀',
            items: [
              { label: 'AI Career Coach',    desc: 'Chat AI that knows your CV, applications & career goals',   path: '/dashboard/coach'             },
              { label: 'Salary Predictor',   desc: '2024/25 AfC take-home calculator for all 4 UK nations',    path: '/dashboard/salary'            },
              { label: 'Career GPS™',        desc: 'Personalised roadmap from current band to target role',    path: '/dashboard/career-gps'        },
              { label: 'EvidenceVault™',     desc: 'Store achievements, CPD & references by competency',       path: '/dashboard/evidence-vault'    },
              { label: 'Auto-Match Evidence',desc: 'AI matches your stored evidence to job criteria instantly', path: '/dashboard/evidence-vault/match'},
              { label: 'Mentorship',         desc: 'Connect with NHS career mentors by band & specialty',      path: '/dashboard/mentorship'        },
            ],
          },
        ],
      }

      return Response.json({ success: true, reply: greeting, navigate: null, featureGroups })
    }

        const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: geminiMessages,
          generationConfig: {
            temperature:    0.4,
            maxOutputTokens: 400,
          },
        }),
      }
    )

    if (!response.ok) throw new Error(`Gemini ${response.status}`)
    const data  = await response.json()
    const parts = data?.candidates?.[0]?.content?.parts ?? []
    let reply = parts.map((p: any) => p.text || '').join('').trim()

    // Parse feature groups JSON
    let featureGroups: any = null
    if (reply.startsWith('FEATURES_JSON:')) {
      try {
        featureGroups = JSON.parse(reply.slice('FEATURES_JSON:'.length))
        reply = ''
      } catch { /* keep as text */ }
    }

    // Parse single navigation suggestion
    let navigate: { path: string; label: string } | null = null
    const navMatch = reply.match(/\nNAVIGATE: ([^\s|]+) \| (.+)$/)
    if (navMatch) {
      navigate = { path: navMatch[1].trim(), label: navMatch[2].trim() }
      reply    = reply.replace(/\nNAVIGATE: .+$/, '').trim()
    }

    return Response.json({ success: true, reply, navigate, featureGroups })
  } catch (err: any) {
    console.error('[assistant]', err)
    return Response.json({ error: err.message ?? 'Failed' }, { status: 500 })
  }
}