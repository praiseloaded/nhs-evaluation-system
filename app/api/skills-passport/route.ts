// app/api/skills-passport/route.ts
import { auth }               from '@/auth'
import { getEffectiveUserId } from '@/lib/effective-user'
import { getDb }              from '@/lib/db-router'

export const runtime = 'nodejs'

export const SKILL_CATEGORIES = [
  { id: 'venepuncture',      label: 'Venepuncture',       emoji: '🩸' },
  { id: 'ecg',               label: 'ECG',                emoji: '💓' },
  { id: 'vital_signs',       label: 'Vital Signs',        emoji: '🌡️' },
  { id: 'specimen_handling', label: 'Specimen Handling',  emoji: '🧪' },
  { id: 'communication',     label: 'Communication',      emoji: '💬' },
  { id: 'documentation',     label: 'Documentation',      emoji: '📋' },
  { id: 'infection_control', label: 'Infection Control',  emoji: '🧼' },
  { id: 'safeguarding',      label: 'Safeguarding',       emoji: '🛡️' },
]

const STATUS_VALUES = ['not_started', 'developing', 'competent', 'expert'] as const

async function loadPassport(db: any, userId: string) {
  const record = await db.application.findFirst({
    where:  { userId, notes: 'skills_passport' },
    select: { id: true, parsedSpec: true, updatedAt: true },
  })
  const skills: Record<string, any> = (record?.parsedSpec as any)?.skills ?? {}
  return {
    recordId: record?.id ?? null,
    updatedAt: record?.updatedAt ?? null,
    skills: SKILL_CATEGORIES.map(cat => ({
      ...cat,
      status:   skills[cat.id]?.status   ?? 'not_started',
      evidence: skills[cat.id]?.evidence ?? '',
      lastUpdated: skills[cat.id]?.lastUpdated ?? null,
    })),
  }
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (await getEffectiveUserId()) ?? (session.user.id as string)
  const db     = await getDb(userId)

  const data = await loadPassport(db, userId)
  return Response.json({ success: true, ...data })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (await getEffectiveUserId()) ?? (session.user.id as string)
  const db     = await getDb(userId)

  const { skillId, status, evidence } = await req.json()
  if (!SKILL_CATEGORIES.find(c => c.id === skillId)) {
    return Response.json({ error: 'Invalid skill' }, { status: 400 })
  }
  if (!STATUS_VALUES.includes(status)) {
    return Response.json({ error: 'Invalid status' }, { status: 400 })
  }

  const existing = await db.application.findFirst({
    where:  { userId, notes: 'skills_passport' },
    select: { id: true, parsedSpec: true },
  })

  const currentSkills: Record<string, any> = (existing?.parsedSpec as any)?.skills ?? {}
  currentSkills[skillId] = {
    status,
    evidence:    evidence ?? currentSkills[skillId]?.evidence ?? '',
    lastUpdated: new Date().toISOString(),
  }

  if (existing) {
    await db.application.update({
      where: { id: existing.id },
      data:  { parsedSpec: { skills: currentSkills } },
    })
  } else {
    await db.application.create({
      data: {
        userId,
        jobTitle:   'NHS Skills Passport',
        employer:   'Personal Development',
        status:     'tracking',
        notes:      'skills_passport',
        jobDescription: 'Auto-generated tracking entry for NHS Skills Passport progress', 
        parsedSpec: { skills: currentSkills },
      },
    })
  }

  const data = await loadPassport(db, userId)
  return Response.json({ success: true, ...data })
}