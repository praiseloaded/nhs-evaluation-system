// lib/effective-user.ts
import { auth }         from '@/auth'
import { getDb }        from '@/lib/db-router'
import { cookies }      from 'next/headers'

const IMPERSONATE_COOKIE = 'impersonate_uid'

async function isAdmin(userId: string): Promise<boolean> {
  try {
    const db   = await getDb(userId)
    const user = await db.user.findUnique({
      where:  { id: userId },
      select: { role: true },
    })
    return user?.role === 'admin'
  } catch {
    return false
  }
}

async function getCookiePayload(): Promise<{ uid: string; adminId: string } | null> {
  try {
    const cookieStore = await cookies()
    const raw = cookieStore.get(IMPERSONATE_COOKIE)?.value
    if (!raw) return null
    const payload = JSON.parse(raw)
    if (!payload?.uid || !payload?.adminId) return null
    return payload
  } catch {
    return null
  }
}

export async function getEffectiveUserId(): Promise<string | null> {
  const session = await auth()
  if (!session?.user?.id) return null

  // Non-admin always gets their own ID — check cookie is irrelevant
  const adminCheck = await isAdmin(session.user.id)
  if (!adminCheck) return session.user.id

  // Admin: only use cookie if the adminId in it matches THIS session
  const payload = await getCookiePayload()
  if (!payload || payload.adminId !== session.user.id) return session.user.id

  return payload.uid
}

export async function getImpersonationState(): Promise<{
  isImpersonating: boolean
  realAdminId:     string | null
  effectiveUserId: string | null
}> {
  const session = await auth()
  if (!session?.user?.id) {
    return { isImpersonating: false, realAdminId: null, effectiveUserId: null }
  }

  const adminCheck = await isAdmin(session.user.id)
  if (!adminCheck) {
    return { isImpersonating: false, realAdminId: null, effectiveUserId: session.user.id }
  }

  const payload = await getCookiePayload()
  if (!payload || payload.adminId !== session.user.id) {
    return { isImpersonating: false, realAdminId: session.user.id, effectiveUserId: session.user.id }
  }

  return {
    isImpersonating: true,
    realAdminId:     session.user.id,
    effectiveUserId: payload.uid,
  }
}