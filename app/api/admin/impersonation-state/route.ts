// app/api/admin/impersonation-state/route.ts

import { getDb }   from '@/lib/db-router'
import { auth }    from '@/auth'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return Response.json({ isImpersonating: false })

  const cookieStore = await cookies()
  const raw = cookieStore.get('impersonate_uid')?.value
  if (!raw) return Response.json({ isImpersonating: false })

  try {
    const { uid } = JSON.parse(raw)
    // Use getDb to find user in correct shard
    const db     = await getDb(uid)
    const target = await db.user.findUnique({
      where:  { id: uid },
      select: { email: true },
    })
    return Response.json({ isImpersonating: true, targetEmail: target?.email ?? null })
  } catch {
    return Response.json({ isImpersonating: false })
  }
}