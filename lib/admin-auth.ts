// lib/admin-auth.ts

import { auth }    from "@/auth"
import { prisma }  from "@/lib/prisma"
import { prisma2 } from "@/lib/db-router"

export class AdminAuthError extends Error {
  status: number
  constructor(message: string, status = 403) {
    super(message)
    this.status = status
  }
}

export async function requireAdmin() {
  const session = await auth()

  if (!session?.user?.id) {
    throw new AdminAuthError("Not authenticated", 401)
  }

  // Check primary DB first, fall back to secondary
  let user = await prisma.user.findUnique({
    where:  { id: session.user.id },
    select: { id: true, email: true, role: true, suspended: true },
  }).catch(() => null)

  if (!user) {
    user = await prisma2.user.findUnique({
      where:  { id: session.user.id },
      select: { id: true, email: true, role: true, suspended: true },
    }).catch(() => null)
  }

  if (!user || user.role !== "admin") {
    throw new AdminAuthError("Admin access required", 403)
  }
  if (user.suspended) {
    throw new AdminAuthError("Account suspended", 403)
  }

  return { id: user.id, email: user.email as string }
}

export async function isAdminSession(): Promise<boolean> {
  try {
    await requireAdmin()
    return true
  } catch (err) {
    console.error("ISADMIN_DEBUG real error:", err)
    return false
  }
}

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
      adminId:     params.adminId,
      adminEmail:  params.adminEmail,
      action:      params.action,
      targetType:  params.targetType,
      targetId:    params.targetId,
      targetEmail: params.targetEmail,
      before:      params.before   ?? undefined,
      after:       params.after    ?? undefined,
      notes:       params.notes,
      ipAddress:   params.ipAddress,
    },
  })
}