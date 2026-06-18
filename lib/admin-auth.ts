// lib/admin-auth.ts
// TEMPORARY DEBUG VERSION — has one extra console.error line in
// isAdminSession() so the real underlying error surfaces in your
// terminal instead of being silently swallowed into a `false`.
// Once we find the bug, swap back to the clean version.

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export class AdminAuthError extends Error {
  status: number
  constructor(message: string, status = 403) {
    super(message)
    this.status = status
  }
}

/**
 * Use at the top of every admin API route handler.
 * Returns the verified admin session, or throws AdminAuthError.
 *
 * Re-checks the DB role on every call rather than trusting only the JWT,
 * so revoking admin access takes effect immediately rather than waiting
 * for token expiry/refresh.
 */
export async function requireAdmin() {
  const session = await auth()
  console.log("ADMIN_DEBUG session.user.id:", session?.user?.id)

  if (!session?.user?.id) {
    throw new AdminAuthError("Not authenticated", 401)
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, role: true, suspended: true },
  })
  console.log("ADMIN_DEBUG db user found:", user)

  if (!user || user.role !== "admin") {
    throw new AdminAuthError("Admin access required", 403)
  }
  if (user.suspended) {
    throw new AdminAuthError("Account suspended", 403)
  }

  return { id: user.id, email: user.email as string }
}

/**
 * Use in server components (e.g. app/admin/layout.tsx) to redirect
 * non-admins before rendering anything admin-related.
 */
export async function isAdminSession(): Promise<boolean> {
  try {
    await requireAdmin()
    return true
  } catch (err) {
    // DEBUG: this line is the whole point of this temporary file —
    // it prints the REAL error instead of silently returning false.
    console.error("ISADMIN_DEBUG real error:", err)
    return false
  }
}

/**
 * Wraps a route handler so AdminAuthError is converted into a proper
 * Response without every route needing its own try/catch boilerplate.
 *
 * Usage:
 *   export const GET = withAdminAuth(async (req, admin) => { ... })
 */
export function withAdminAuth<T>(
  handler: (req: Request, admin: { id: string; email: string }, ctx?: T) => Promise<Response>
) {
  return async (req: Request, ctx?: T) => {
    try {
      const admin = await requireAdmin()
      return await handler(req, admin, ctx)
    } catch (err: any) {
      if (err instanceof AdminAuthError) {
        return Response.json({ error: err.message }, { status: err.status })
      }
      console.error("ADMIN_ROUTE_ERROR:", err)
      return Response.json({ error: err?.message ?? "Internal error" }, { status: 500 })
    }
  }
}

/**
 * Writes an entry to AdminAuditLog. Call this from every action route
 * (tier change, suspend, delete, impersonate, refund, edit) — never
 * skip this for "full control" actions, since it's the only record
 * of what an admin did to a user's account.
 */
export async function logAdminAction(params: {
  adminId: string
  adminEmail: string
  action: string
  targetType: string
  targetId?: string
  targetEmail?: string
  before?: any
  after?: any
  notes?: string
  ipAddress?: string
}) {
  await prisma.adminAuditLog.create({
    data: {
      adminId: params.adminId,
      adminEmail: params.adminEmail,
      action: params.action,
      targetType: params.targetType,
      targetId: params.targetId,
      targetEmail: params.targetEmail,
      before: params.before ?? undefined,
      after: params.after ?? undefined,
      notes: params.notes,
      ipAddress: params.ipAddress,
    },
  })
}