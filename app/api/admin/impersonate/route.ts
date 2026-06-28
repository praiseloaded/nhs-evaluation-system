// app/api/admin/impersonate/route.ts

import { prisma }                    from '@/lib/prisma'
import { getDb }                     from '@/lib/db-router'
import { withAdminAuth, logAdminAction } from '@/lib/admin-auth'
import { cookies }                   from 'next/headers'

export const runtime = 'nodejs'

const IMPERSONATE_COOKIE = 'impersonate_uid'
const MAX_DURATION_MS    = 60 * 60 * 1000

export const POST = withAdminAuth(async (req: Request, admin: any) => {
  const { userId, reason } = await req.json()
  if (!userId) return Response.json({ error: 'userId required' }, { status: 400 })

  // Use getDb to find user in correct shard
  const db     = await getDb(userId)
  const target = await db.user.findUnique({
    where:  { id: userId },
    select: { id: true, email: true, role: true },
  })

  if (!target)                  return Response.json({ error: 'User not found' }, { status: 404 })
  if (target.role === 'admin')  return Response.json({ error: 'Cannot impersonate another admin' }, { status: 403 })

  // ImpersonationSession lives in primary DB (not sharded)
  const session = await prisma.impersonationSession.create({
    data: { adminId: admin.id, targetUserId: userId, reason },
  })

  await logAdminAction({
    adminId:    admin.id,
    adminEmail: admin.email,
    action:     'impersonate',
    targetType: 'user',
    targetId:   userId,
    targetEmail: target.email ?? undefined,
    notes:      reason ?? 'Impersonation started',
  })

  const cookieStore = await cookies()
  cookieStore.set(IMPERSONATE_COOKIE, JSON.stringify({
    uid:       userId,
    sessionId: session.id,
    adminId:   admin.id,
  }), {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   MAX_DURATION_MS / 1000,
    path:     '/',
  })

  return Response.json({ success: true, targetEmail: target.email })
})

export const DELETE = withAdminAuth(async (_req: Request, _admin: any) => {
  const cookieStore = await cookies()
  const raw = cookieStore.get(IMPERSONATE_COOKIE)?.value
  if (raw) {
    try {
      const { sessionId } = JSON.parse(raw)
      await prisma.impersonationSession.update({
        where: { id: sessionId },
        data:  { endedAt: new Date() },
      }).catch(() => {})
    } catch {}
  }
  cookieStore.delete(IMPERSONATE_COOKIE)
  return Response.json({ success: true })
})