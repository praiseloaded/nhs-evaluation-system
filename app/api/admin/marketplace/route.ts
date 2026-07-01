// app/api/admin/marketplace/route.ts
import { auth }  from '@/auth'
import { getDb } from '@/lib/db-router'
import { isAdminSession } from '@/lib/admin-auth'

export const runtime = 'nodejs'

const VALID_CATEGORIES = ['phlebotomy','ecg','interview','mentorship','mock','employers']

// POST — add a real listing (admin only)
export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await isAdminSession())) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { categoryId, name, url, priceLabel, description } = await req.json()
  if (!VALID_CATEGORIES.includes(categoryId) || !name || !url) {
    return Response.json({ error: 'categoryId, name, and url are required' }, { status: 400 })
  }

  const db = await getDb(session.user.id as string)

  await db.application.create({
    data: {
      userId:   session.user.id as string,
      jobTitle: 'Marketplace Listing',
      employer: name,
      status:   'active',
        jobDescription: 'Employer intelligence reference record — not a live job application',
      notes:    `marketplace_listing:${categoryId}`,
      parsedSpec: { name, url, priceLabel: priceLabel ?? '', description: description ?? '' },
    },
  })

  return Response.json({ success: true })
}

// DELETE — remove a listing (admin only)
export async function DELETE(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await isAdminSession())) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await req.json()
  const db = await getDb(session.user.id as string)
  await db.application.delete({ where: { id } }).catch(() => null)

  return Response.json({ success: true })
}

// GET — list all listings + waitlist counts (admin only)
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await isAdminSession())) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const db = await getDb(session.user.id as string)

  const [listings, waitlist] = await Promise.all([
    db.application.findMany({ where: { notes: { startsWith: 'marketplace_listing:' } } }),
    db.application.findMany({ where: { notes: { startsWith: 'marketplace_waitlist:' } }, select: { notes: true, userId: true } }),
  ])

  const waitlistCounts: Record<string, number> = {}
  for (const w of waitlist as any[]) {
    const cat = w.notes.replace('marketplace_waitlist:', '')
    waitlistCounts[cat] = (waitlistCounts[cat] ?? 0) + 1
  }

  return Response.json({
    success: true,
    listings: (listings as any[]).map(l => ({
      id: l.id, category: l.notes.replace('marketplace_listing:', ''), ...l.parsedSpec,
    })),
    waitlistCounts,
  })
}