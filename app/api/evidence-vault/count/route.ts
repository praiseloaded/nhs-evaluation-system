// app/api/evidence-vault/count/route.ts
// Lightweight endpoint — just returns the count, not full entries
import { auth }               from '@/auth'
import { getEffectiveUserId } from '@/lib/effective-user'
import { getDb }              from '@/lib/db-router'

export const runtime = 'nodejs'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (await getEffectiveUserId()) ?? (session.user.id as string)
  const db     = await getDb(userId)

  try {
    const count = await db.evidenceEntry.count({ where: { userId } })
    return Response.json({ success: true, count })
  } catch {
    return Response.json({ success: true, count: 0 })
  }
}