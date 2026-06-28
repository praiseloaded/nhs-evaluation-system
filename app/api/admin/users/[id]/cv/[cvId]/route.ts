// app/api/admin/users/[id]/cv/[cvId]/route.ts

import { getDb }         from '@/lib/db-router'
import { withAdminAuth } from '@/lib/admin-auth'

export const runtime = 'nodejs'

export const GET = withAdminAuth(async (_req: Request, _admin: any, ctx: any) => {
  const { id, cvId } = await ctx.params

  // id is the userId — use getDb to route to correct shard
  const db      = await getDb(id)
  const profile = await db.cvProfile.findUnique({ where: { id: cvId } })

  if (!profile || profile.userId !== id) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }

  return Response.json({ success: true, profile })
})