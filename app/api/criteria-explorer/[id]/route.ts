// app/api/criteria-explorer/[id]/route.ts
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

    const exploration = await db.criteriaExplorer.findUnique({ where: { id } })
    if (!exploration || exploration.userId !== session.user.id) {
      return Response.json({ error: 'Not found' }, { status: 404 })
    }

    return Response.json({ success: true, result: exploration.result, jobTitle: exploration.jobTitle, createdAt: exploration.createdAt })
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}