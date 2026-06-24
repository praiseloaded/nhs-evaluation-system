// app/api/admin/impersonate/route.ts
//
// Impersonation design note:
// We do NOT swap out the admin's NextAuth session/JWT. Instead we set a
// separate, httpOnly "impersonate_uid" cookie that the app's data-fetching
// layer checks IN ADDITION to the real session. This means:
//   - The admin's own auth session is untouched and can't be hijacked by
//     this mechanism.
//   - Ending impersonation is just deleting one cookie — no session
//     corruption risk.
//   - Every page can show a persistent "Viewing as {user}" banner because
//     the real admin identity is still in `auth()`.
// Your existing `auth()`-based routes should be updated to prefer the
// impersonate cookie's user id when present AND the real session is an
// admin — see getEffectiveUserId() below for the helper to add to lib/.

import { prisma } from "@/lib/prisma"
import { withAdminAuth, logAdminAction } from "@/lib/admin-auth"
import { cookies } from "next/headers"

export const runtime = 'nodejs'

const IMPERSONATE_COOKIE = "impersonate_uid"
const MAX_DURATION_MS = 60 * 60 * 1000 // 1 hour hard cap, then auto-expires

export const POST = withAdminAuth(async (req: Request, admin) => {
  const { userId, reason } = await req.json()
  if (!userId) return Response.json({ error: "userId required" }, { status: 400 })

  const target = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, role: true } })
  if (!target) return Response.json({ error: "User not found" }, { status: 404 })
  if (target.role === 'admin') {
    return Response.json({ error: "Cannot impersonate another admin" }, { status: 403 })
  }

  const session = await prisma.impersonationSession.create({
    data: { adminId: admin.id, targetUserId: userId, reason },
  })

  await logAdminAction({
    adminId: admin.id,
    adminEmail: admin.email,
    action: 'impersonate',
    targetType: 'user',
    targetId: userId,
    targetEmail: target.email ?? undefined,
    notes: reason ?? 'Impersonation started',
  })

  const cookieStore = await cookies()
  cookieStore.set(IMPERSONATE_COOKIE, JSON.stringify({ uid: userId, sessionId: session.id, adminId: admin.id }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: MAX_DURATION_MS / 1000,
    path: '/',
  })

  return Response.json({ success: true, targetEmail: target.email })
})

export const DELETE = withAdminAuth(async (req: Request, admin) => {
  const cookieStore = await cookies()
  const raw = cookieStore.get(IMPERSONATE_COOKIE)?.value

  if (raw) {
    try {
      const { sessionId } = JSON.parse(raw)
      await prisma.impersonationSession.update({
        where: { id: sessionId },
        data: { endedAt: new Date() },
      }).catch(() => {})
    } catch {}
  }

  cookieStore.delete(IMPERSONATE_COOKIE)
  return Response.json({ success: true })
})