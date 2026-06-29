// app/api/coach/route.ts
// AI Career Coach — conversational, knows user's full profile

import { auth }  from '@/auth'
import { getDb } from '@/lib/db-router'
import { prisma }  from '@/lib/prisma'
import { prisma2 } from '@/lib/db-router'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { messages } = await req.json()
    if (!messages?.length) return Response.json({ error: 'messages required' }, { status: 400 })

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) throw new Error('GEMINI_API_KEY not set')

    const db = await getDb(session.user.id)

    // Load full user context
    const [cvProfile, applications, evidenceItems] = await Promise.all([
      db.cvProfile.findFirst({
        where: { userId: session.user.id },
        orderBy: { updatedAt: 'desc' },
        select: {
          fullName: true, personalStatement: true, professionalRegistration: true,
          workExperience: true, skills: true, education: true, certifications: true,
        },
      }).catch(() => null),

      Promise.any([
        prisma.application.findMany({ where: { userId: session.user.id }, orderBy: { createdAt: 'desc' }, take: 5, select: { jobTitle: true, employer: true, status: true, nhsBand: true, createdAt: true } }),
        prisma2.application.findMany({ where: { userId: session.user.id }, orderBy: { createdAt: 'desc' }, take: 5, select: { jobTitle: true, employer: true, status: true, nhsBand: true, createdAt: true } }),
      ]).catch(() => []),

      Promise.any([
        prisma.evidenceItem?.findMany?.({ where: { userId: session.user.id }, take: 10, select: { title: true, competency: true } }).catch(() => []) || Promise.resolve([]),
        Promise.resolve([]),
      ]).catch(() => []),
    ])

    const userTier = (session.user as any)?.tier ?? 'free'

    const systemPrompt = `You are OmniJobReady AI Career Coach — an expert NHS career adviser with deep knowledge of:
- NHS Agenda for Change pay bands (Band 1–9) and career progression
- NHS recruitment processes, person specifications, and shortlisting criteria
- HCPC, NMC, GMC, IBMS, and other professional registration requirements
- UK visa sponsorship and Skilled Worker routes for NHS roles
- NHS Scotland, England, Wales, and Northern Ireland differences
- Evidence-based career planning, CPD requirements, and portfolio building

USER PROFILE:
Name: ${cvProfile?.fullName || 'Unknown'}
Registration: ${cvProfile?.professionalRegistration || 'Not provided'}
Current band/experience: ${JSON.stringify((cvProfile?.workExperience as any)?.[0] || {}).slice(0, 300)}
Skills: ${JSON.stringify(cvProfile?.skills || []).slice(0, 300)}
Education: ${JSON.stringify(cvProfile?.education || []).slice(0, 300)}

RECENT APPLICATIONS (last 5):
${(applications as any[]).map((a: any) => `- ${a.jobTitle} at ${a.employer} (${a.nhsBand || 'band unknown'}) — ${a.status || 'applied'}`).join('\n') || 'No applications yet'}

EVIDENCE VAULT:
${(evidenceItems as any[]).map((e: any) => `- ${e.title} (${e.competency})`).join('\n') || 'No evidence items'}

ACCOUNT TIER: ${userTier}

COACHING STYLE:
- Be direct and specific — no generic career advice
- Always ground advice in NHS-specific context
- When recommending next steps, be actionable (e.g. "Update your Band 6 application before [date]" not "consider applying")
- Ask one focused follow-up question when you need more information
- Keep responses concise — under 250 words unless the user asks for detail
- Use bullet points for lists, plain prose for advice
- If the user asks about salary, reference current 2024/25 AfC pay scales
- If the user asks about bands, explain both the pay and the typical responsibilities`

    // Build conversation for Gemini
    const geminiMessages = [
      { role: 'user', parts: [{ text: systemPrompt + '\n\nRespond as the career coach. Be helpful, specific, and NHS-aware.' }] },
      { role: 'model', parts: [{ text: `Hello${cvProfile?.fullName ? ` ${cvProfile.fullName.split(' ')[0]}` : ''}! I'm your NHS Career Coach. I have your profile loaded and I'm ready to help with anything — next role, CV, interviews, pay, sponsorship, or career progression. What would you like to work on today?` }] },
      ...messages.map((m: any) => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }],
      })),
    ]

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: geminiMessages,
          generationConfig: {
            temperature: 0.5,
            maxOutputTokens: 1500,
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      }
    )

    if (!response.ok) throw new Error(`Gemini error: ${response.status}`)
    const data = await response.json()
    const parts = data?.candidates?.[0]?.content?.parts ?? []
    let reply = ''
    for (const part of parts) { if (part.text) reply += part.text }

    return Response.json({ success: true, reply: reply.trim() })
  } catch (error: any) {
    console.error('[coach]', error)
    return Response.json({ error: error.message ?? 'Coach failed' }, { status: 500 })
  }
}