// app/api/cpd/route.ts
import { auth }               from '@/auth'
import { getEffectiveUserId } from '@/lib/effective-user'
import { getDb }              from '@/lib/db-router'

export const runtime = 'nodejs'

// NMC: 35 participatory hours per 3-year cycle
// HCPC: no fixed hour target but minimum 30 CPD activities
const TARGETS = {
  nmc:  { label: 'NMC Revalidation', hours: 35, period: '3 years', activities: null },
  hcpc: { label: 'HCPC Renewal',     hours: 0,  period: '2 years', activities: 30   },
  gmc:  { label: 'GMC Appraisal',    hours: 50, period: '1 year',  activities: null },
  none: { label: 'Personal goal',    hours: 20, period: '1 year',  activities: null },
}

async function loadEntries(db: any, userId: string) {
  const record = await db.application.findFirst({
    where: { userId, notes: 'cpd_tracker' },
    select: { id: true, parsedSpec: true },
  })
  return {
    recordId: record?.id ?? null,
    entries:  ((record?.parsedSpec as any)?.entries ?? []) as any[],
    settings: ((record?.parsedSpec as any)?.settings ?? { body: 'nmc', cycleStart: new Date().toISOString().slice(0, 10) }) as any,
  }
}

async function saveData(db: any, userId: string, recordId: string | null, data: any) {
  if (recordId) {
    await db.application.update({ where: { id: recordId }, data: { parsedSpec: data } })
  } else {
    await db.application.create({
      data: { userId, jobTitle: 'CPD Tracker', employer: 'Personal Development', status: 'tracking', notes: 'cpd_tracker', parsedSpec: data },
    })
  }
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (await getEffectiveUserId()) ?? (session.user.id as string)
  const db     = await getDb(userId)
  const data   = await loadEntries(db, userId)
  return Response.json({ success: true, ...data, targets: TARGETS })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (await getEffectiveUserId()) ?? (session.user.id as string)
  const db     = await getDb(userId)

  const body = await req.json()
  const { action } = body
  const existing = await loadEntries(db, userId)

  if (action === 'add') {
    const entry = {
      id:          crypto.randomUUID(),
      date:        body.date,
      title:       body.title,
      type:        body.type,      // participatory | self-directed | practice
      hours:       Number(body.hours) || 0,
      provider:    body.provider ?? '',
      reflection:  body.reflection ?? '',
      evidence:    body.evidence ?? '',
      createdAt:   new Date().toISOString(),
    }
    const newEntries = [entry, ...existing.entries]
    await saveData(db, userId, existing.recordId, { entries: newEntries, settings: existing.settings })
    return Response.json({ success: true, entries: newEntries })
  }

  if (action === 'delete') {
    const newEntries = existing.entries.filter((e: any) => e.id !== body.id)
    await saveData(db, userId, existing.recordId, { entries: newEntries, settings: existing.settings })
    return Response.json({ success: true, entries: newEntries })
  }

  if (action === 'settings') {
    const newSettings = { ...existing.settings, ...body.settings }
    await saveData(db, userId, existing.recordId, { entries: existing.entries, settings: newSettings })
    return Response.json({ success: true, settings: newSettings })
  }

  return Response.json({ error: 'Unknown action' }, { status: 400 })
}
