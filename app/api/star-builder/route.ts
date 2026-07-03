// app/api/star-builder/route.ts
// Conversational STAR builder — one message at a time
import { createNotification } from '@/lib/notifications'
import { auth }               from '@/auth'
import { getEffectiveUserId } from '@/lib/effective-user'
import { getDb }              from '@/lib/db-router'

export const runtime = 'nodejs'

const STAGES = ['situation', 'task', 'action', 'result', 'polish'] as const
type Stage = typeof STAGES[number]

const STAGE_PROMPTS: Record<Stage, string> = {
  situation: `You are an NHS career coach helping build a STAR example. Ask ONE clear, warm question about the SITUATION — the context, setting, or problem the user faced. Keep it under 2 sentences. Be specific and encouraging.`,
  task:      `Now ask ONE question about the TASK — what was the user specifically responsible for in this situation? What was expected of them? One question only, 2 sentences max.`,
  action:    `Now ask about the ACTION — what did the user personally do? Prompt them to be specific: steps taken, decisions made, skills used. Ask one focused question. 2 sentences max.`,
  result:    `Now ask about the RESULT — what actually happened? Prompt for specific outcomes: numbers, patient feedback, team impact, measurable improvements. One question, 2 sentences max.`,
  polish:    `Based on the full conversation, write a polished STAR example (120–160 words) in first person, past tense. Use NHS language naturally. Start with the action, not "I am". Then on a new line, write: TITLE: [a 5–8 word title for this STAR example]. Then: COMPETENCY: [the most relevant NHS competency this evidences, e.g. "Clinical governance", "MDT working", "Patient safety"]. Output ONLY the STAR paragraph, then TITLE:, then COMPETENCY: — nothing else.`,
}

async function callGemini(systemPrompt: string, messages: { role: string; content: string }[]) {
  const apiKey = process.env.GEMINI_API_KEY
  const contents = messages.map(m => ({
    role:  m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.content }],
  }))

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: { temperature: 0.6, maxOutputTokens: 600 },
      }),
    }
  )
  const data = await res.json()
  return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
}

// GET — start or continue session
export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (await getEffectiveUserId()) ?? (session.user.id as string)
  const db     = await getDb(userId)

  const { messages = [], stage = 'situation', jobContext = '' } = await req.json()

  const systemPrompt = `You are a warm, expert NHS career coach helping a healthcare professional build a strong STAR evidence example${jobContext ? ` for the role: ${jobContext}` : ''}. You ask one precise question at a time to draw out specific, evidenced experience. Never write the answer for them — only ask questions until the polish stage.`

  // Polish stage — generate the final STAR + save to vault
  if (stage === 'polish') {
    const fullConversation = [
      { role: 'user', content: `I want to build a STAR example${jobContext ? ` for: ${jobContext}` : ''}.` },
      ...messages,
    ]
    const raw = await callGemini(STAGE_PROMPTS.polish, fullConversation)

    // Parse the result
    const titleMatch     = raw.match(/TITLE:\s*(.+)/i)
    const competencyMatch= raw.match(/COMPETENCY:\s*(.+)/i)
    const star = raw
      .replace(/TITLE:.+/gi, '')
      .replace(/COMPETENCY:.+/gi, '')
      .trim()
    const title      = titleMatch?.[1]?.trim()     ?? 'STAR Example'
    const competency = competencyMatch?.[1]?.trim() ?? 'Clinical practice'

    // Save to EvidenceVault
    try {
      const saved = await db.evidenceEntry.create({
        data: {
          userId,
          title,
          competency,
          action: star, // store polished text in action field
          situation: messages.find((m:any) => m._stage === 'situation')?.content ?? '',
          task:      messages.find((m:any) => m._stage === 'task')?.content      ?? '',
          result:    messages.find((m:any) => m._stage === 'result')?.content    ?? '',
        },
      })
      createNotification({
        userId,
        type:    'star_saved',
        title:   'STAR example saved',
        body:    `"${title}" has been added to your EvidenceVault™.`,
        linkUrl: '/dashboard/evidence-vault',
      }).catch(() => {})
      return Response.json({ success: true, done: true, star, title, competency, savedId: saved.id })
    } catch {
      return Response.json({ success: true, done: true, star, title, competency, savedId: null })
    }
  }

  // Normal conversation stage
  const reply = await callGemini(
    systemPrompt + '\n\n' + STAGE_PROMPTS[stage as Stage],
    messages.length === 0
      ? [{ role: 'user', content: `I want to build a STAR example${jobContext ? ` for: ${jobContext}` : ''}. Please start.` }]
      : messages
  )

  const stageIdx  = STAGES.indexOf(stage as Stage)
  const nextStage = stageIdx < STAGES.length - 1 ? STAGES[stageIdx + 1] : 'polish'

  return Response.json({ success: true, reply, nextStage, done: false })
}