// lib/effective-user.ts
//
// Add this helper and use it anywhere you currently call `auth()` and then
// read `session.user.id` to fetch a user's own data (dashboard pages,
// analysis list, CV builder, momentum, etc). It transparently returns the
// impersonated user's id when an admin is impersonating, while leaving
// every other route (admin routes, billing, account settings) using the
// real session as-is.
//
// IMPORTANT: never use this for admin-only routes (those should keep using
// requireAdmin() directly against the real session) — only use it for
// routes that serve the "regular user" experience, so impersonation
// actually shows the admin what the user sees.

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { cookies } from "next/headers"

const IMPERSONATE_COOKIE = "impersonate_uid"

export async function getEffectiveUserId(): Promise<string | null> {
  const session = await auth()
  if (!session?.user?.id) return null

  // Only check the impersonation cookie if the real session belongs to an admin —
  // a non-admin can't forge this cookie's effect even if they somehow set it,
  // because we re-verify the admin's role here, not just trust the cookie.
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  })
  if (dbUser?.role !== 'admin') return session.user.id

  const cookieStore = await cookies()
  const raw = cookieStore.get(IMPERSONATE_COOKIE)?.value
  if (!raw) return session.user.id

  try {
    const { uid } = JSON.parse(raw)
    return uid ?? session.user.id
  } catch {
    return session.user.id
  }
}

/**
 * Returns both the real admin id (if impersonating) and the effective id,
 * so UI can render the "Viewing as {user}" banner correctly.
 */
export async function getImpersonationState(): Promise<{
  isImpersonating: boolean
  realAdminId: string | null
  effectiveUserId: string | null
}> {
  const session = await auth()
  if (!session?.user?.id) return { isImpersonating: false, realAdminId: null, effectiveUserId: null }

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  })
  if (dbUser?.role !== 'admin') {
    return { isImpersonating: false, realAdminId: null, effectiveUserId: session.user.id }
  }

  const cookieStore = await cookies()
  const raw = cookieStore.get(IMPERSONATE_COOKIE)?.value
  if (!raw) return { isImpersonating: false, realAdminId: session.user.id, effectiveUserId: session.user.id }

  try {
    const { uid } = JSON.parse(raw)
    return { isImpersonating: true, realAdminId: session.user.id, effectiveUserId: uid }
  } catch {
    return { isImpersonating: false, realAdminId: session.user.id, effectiveUserId: session.user.id }
  }
}