// app/api/cv/route.ts
import { auth }              from '@/auth'
import { prisma }            from '@/lib/prisma'
import { prisma2, getDb }   from '@/lib/db-router'

async function findUserDb(userId: string) {
  // Try both shards — whichever has the User record is the right one
  const [inPrimary, inSecondary] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { id: true } }).catch(() => null),
    prisma2.user.findUnique({ where: { id: userId }, select: { id: true } }).catch(() => null),
  ])
  if (inPrimary)   return prisma
  if (inSecondary) return prisma2
  return null // user not found in either shard
}

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const db = await getDb(session.user.id)
    const profiles = await db.cvProfile.findMany({
      where:   { userId: session.user.id },
      orderBy: { updatedAt: 'desc' },
      select:  { id: true, title: true, template: true, fullName: true, updatedAt: true },
    })
    return Response.json({ success: true, profiles })
  } catch (error: any) {
    console.error('CV_LIST_ERROR:', error)
    return Response.json({ error: error?.message ?? 'Failed' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()

    // Find which shard holds this user's record
    const db = await findUserDb(session.user.id)

    if (!db) {
      // User not found in either shard — log and return clear error
      console.error('CV_CREATE: user not found in any shard:', session.user.id)
      return Response.json({ error: 'User account not found. Please sign out and sign back in.' }, { status: 400 })
    }

    const profile = await db.cvProfile.create({
      data: {
        userId:   session.user.id,
        title:    body.title    ?? 'My CV',
        template: body.template ?? 'classic',
        fullName: body.fullName ?? session.user.name  ?? null,
        email:    body.email    ?? session.user.email ?? null,
      },
    })
    return Response.json({ success: true, profile })
  } catch (error: any) {
    console.error('CV_CREATE_ERROR:', error)
    return Response.json({ error: error?.message ?? 'Failed' }, { status: 500 })
  }
}