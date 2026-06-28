// app/api/ab-test/[id]/route.ts
import { auth }  from '@/auth'
import { getDb } from '@/lib/db-router'

export const runtime = 'nodejs'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const db     = await getDb(session.user.id)

    const test = await db.aBTest.findUnique({ where: { id } })
    if (!test || test.userId !== session.user.id) {
      return Response.json({ error: 'Not found' }, { status: 404 })
    }

    return Response.json({ success: true, test })
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}