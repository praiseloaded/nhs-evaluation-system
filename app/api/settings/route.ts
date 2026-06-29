// app/api/settings/route.ts
import { auth }    from '@/auth'
import { getDb }   from '@/lib/db-router'


export const runtime = 'nodejs'

// GET — load current user profile
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = session.user.id as string
  const db     = await getDb(userId)

  const user = await db.user.findUnique({
    where:  { id: userId },
    select: { id: true, name: true, email: true, image: true, tier: true },
  })
  if (!user) return Response.json({ error: 'User not found' }, { status: 404 })

  return Response.json({ success: true, user })
}

// PATCH — update name
export async function PATCH(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = session.user.id as string
  const body   = await req.json()

  const db = await getDb(userId)

  const allowed: Record<string, any> = {}
  if (typeof body.name === 'string' && body.name.trim().length >= 2) {
    allowed.name = body.name.trim().slice(0, 100)
  }

  if (!Object.keys(allowed).length) {
    return Response.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const updated = await db.user.update({
    where:  { id: userId },
    data:   allowed,
    select: { id: true, name: true, email: true },
  })

  return Response.json({ success: true, user: updated })
}

// POST /api/settings/export — export all user data as JSON
export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = session.user.id as string
  const db     = await getDb(userId)
  const { action } = await req.json().catch(() => ({}))

  if (action === 'export') {
    const [analyses, applications, cvProfiles] = await Promise.all([
      db.analysis.findMany({
        where:   { userId },
        orderBy: { createdAt: 'desc' },
        select:  { id: true, jobTitle: true, createdAt: true, result: true },
      }).catch(() => []),
      db.application.findMany({
        where:   { userId },
        orderBy: { createdAt: 'desc' },
        select:  { id: true, jobTitle: true, employer: true, status: true, createdAt: true },
      }).catch(() => []),
      db.cvProfile.findMany({
        where:   { userId },
        orderBy: { updatedAt: 'desc' },
        select:  { id: true, title: true, fullName: true, personalStatement: true, updatedAt: true },
      }).catch(() => []),
    ])

    const exportData = {
      exportedAt:   new Date().toISOString(),
      userId,
      analyses:     analyses.length,
      applications: applications.length,
      cvProfiles:   cvProfiles.length,
      data:         { analyses, applications, cvProfiles },
    }

    return new Response(JSON.stringify(exportData, null, 2), {
      headers: {
        'Content-Type':        'application/json',
        'Content-Disposition': `attachment; filename="omnijobready-export-${new Date().toISOString().split('T')[0]}.json"`,
      },
    })
  }

  return Response.json({ error: 'Unknown action' }, { status: 400 })
}