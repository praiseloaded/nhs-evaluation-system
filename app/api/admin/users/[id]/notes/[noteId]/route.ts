// app/api/admin/users/[id]/notes/[noteId]/route.ts

import { prisma } from "@/lib/prisma"
import { withAdminAuth } from "@/lib/admin-auth"

export const DELETE = withAdminAuth(async (req: Request, admin, ctx: any) => {
  const { noteId } = await ctx.params
  await prisma.adminNote.delete({ where: { id: noteId } }).catch(() => {})
  return Response.json({ success: true })
})