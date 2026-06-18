// app/api/admin/users/[id]/cv/[cvId]/route.ts
// Full CV profile content — same shape the CV builder itself reads,
// so the admin preview can reuse the same rendering logic.

import { prisma } from "@/lib/prisma"
import { withAdminAuth } from "@/lib/admin-auth"

export const GET = withAdminAuth(async (req: Request, admin, ctx: any) => {
  const { id, cvId } = await ctx.params

  const profile = await prisma.cvProfile.findUnique({ where: { id: cvId } })
  if (!profile || profile.userId !== id) {
    return Response.json({ error: "Not found" }, { status: 404 })
  }

  return Response.json({ success: true, profile })
})