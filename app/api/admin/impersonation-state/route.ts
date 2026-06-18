// app/api/admin/impersonation-state/route.ts
// Lightweight check used by the AdminShell banner — returns whether the
// current admin is impersonating, and who, without requiring a full
// requireAdmin() round trip on every page load elsewhere.

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { cookies } from "next/headers"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return Response.json({ isImpersonating: false })

  const cookieStore = await cookies()
  const raw = cookieStore.get("impersonate_uid")?.value
  if (!raw) return Response.json({ isImpersonating: false })

  try {
    const { uid } = JSON.parse(raw)
    const target = await prisma.user.findUnique({ where: { id: uid }, select: { email: true } })
    return Response.json({ isImpersonating: true, targetEmail: target?.email ?? null })
  } catch {
    return Response.json({ isImpersonating: false })
  }
}