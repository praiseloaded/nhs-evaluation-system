// app/api/marketplace/route.ts
import { auth }               from '@/auth'
import { getEffectiveUserId } from '@/lib/effective-user'
import { getDb }              from '@/lib/db-router'

export const runtime = 'nodejs'

export const MARKETPLACE_CATEGORIES = [
  { id: 'phlebotomy',   label: 'Phlebotomy Courses',     emoji: '🩸', desc: 'Accredited venepuncture & cannulation training' },
  { id: 'ecg',          label: 'ECG Training',           emoji: '💓', desc: 'ECG recording & interpretation courses'         },
  { id: 'interview',    label: 'Interview Coaching',     emoji: '🎤', desc: '1:1 coaching from NHS recruitment specialists'  },
  { id: 'mentorship',   label: 'Mentors',                emoji: '🧭', desc: 'Connect with experienced NHS professionals'      },
  { id: 'mock',         label: 'Mock Interviews',        emoji: '🎭', desc: 'Practice with real NHS panel simulations'        },
  { id: 'employers',    label: 'Employer Partners',      emoji: '🏥', desc: 'Direct routes into partner NHS trusts'           },
]

// GET — list categories with live listing counts + current user's waitlist status
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (await getEffectiveUserId()) ?? (session.user.id as string)
  const db     = await getDb(userId)

  // Listings stored as Application records with notes: 'marketplace_listing:<category>'
  const listings = await db.application.findMany({
    where: { notes: { startsWith: 'marketplace_listing:' } },
    select: { id: true, notes: true, parsedSpec: true },
  }).catch(() => [])

  // Waitlist entries stored as notes: 'marketplace_waitlist:<category>' scoped to this user
  const myWaitlist = await db.application.findMany({
    where: { userId, notes: { startsWith: 'marketplace_waitlist:' } },
    select: { notes: true },
  }).catch(() => [])
  const joinedCategories = new Set(
    myWaitlist.map((w: any) => w.notes.replace('marketplace_waitlist:', ''))
  )

  // Count waitlist size per category (across all users, anonymised)
  const allWaitlist = await db.application.findMany({
    where: { notes: { startsWith: 'marketplace_waitlist:' } },
    select: { notes: true },
  }).catch(() => [])
  const waitlistCounts: Record<string, number> = {}
  for (const w of allWaitlist as any[]) {
    const cat = w.notes.replace('marketplace_waitlist:', '')
    waitlistCounts[cat] = (waitlistCounts[cat] ?? 0) + 1
  }

  const categories = MARKETPLACE_CATEGORIES.map(cat => {
    const catListings = (listings as any[])
      .filter(l => l.notes === `marketplace_listing:${cat.id}`)
      .map(l => l.parsedSpec)
    return {
      ...cat,
      live:           catListings.length > 0,
      listings:       catListings,
      waitlistCount:  waitlistCounts[cat.id] ?? 0,
      joined:         joinedCategories.has(cat.id),
    }
  })

  return Response.json({ success: true, categories })
}

// POST — join/leave waitlist for a category
export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (await getEffectiveUserId()) ?? (session.user.id as string)
  const db     = await getDb(userId)

  const { categoryId, action } = await req.json()
  if (!MARKETPLACE_CATEGORIES.find(c => c.id === categoryId)) {
    return Response.json({ error: 'Invalid category' }, { status: 400 })
  }

  const noteKey = `marketplace_waitlist:${categoryId}`
  const existing = await db.application.findFirst({ where: { userId, notes: noteKey } })

  if (action === 'leave') {
    if (existing) await db.application.delete({ where: { id: existing.id } })
    return Response.json({ success: true, joined: false })
  }

  // action === 'join' (default)
  if (!existing) {
    await db.application.create({
      data: {
        userId,
        jobTitle: 'Marketplace Waitlist',
        jobDescription: 'Employer intelligence reference record — not a live job application',
        employer: categoryId,
        status:   'waitlisted',
        notes:    noteKey,
      },
    })
  }
  return Response.json({ success: true, joined: true })
}