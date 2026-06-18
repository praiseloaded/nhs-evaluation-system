// app/api/admin/users/[id]/notes/route.ts
// New feature: internal notes admins can leave on a user's account.

import { prisma } from "@/lib/prisma"
import { withAdminAuth } from "@/lib/admin-auth"

export const GET = withAdminAuth(async (req: Request, admin, ctx: any) => {
  const { id } = await ctx.params
  const notes = await prisma.adminNote.findMany({
    where: { userId: id },
    orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
  })
  return Response.json({ success: true, notes })
})

export const POST = withAdminAuth(async (req: Request, admin, ctx: any) => {
  const { id } = await ctx.params
  const { body, pinned } = await req.json()
  if (!body?.trim()) return Response.json({ error: "Note body required" }, { status: 400 })

  const note = await prisma.adminNote.create({
    data: { userId: id, adminId: admin.id, adminEmail: admin.email, body: body.trim(), pinned: !!pinned },
  })
  return Response.json({ success: true, note })
})