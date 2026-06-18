// app/api/admin/users/[id]/interviews/[interviewId]/route.ts
// Full Interview Simulator session — panellists, questions, every answer
// with its transcript/audio link and per-answer evaluation.

import { prisma } from "@/lib/prisma"
import { withAdminAuth } from "@/lib/admin-auth"

export const GET = withAdminAuth(async (req: Request, admin, ctx: any) => {
  const { id, interviewId } = await ctx.params

  const interview = await prisma.interview.findUnique({
    where: { id: interviewId },
    include: {
      answers: { orderBy: { answeredAt: 'asc' } },
    },
  })

  if (!interview || interview.userId !== id) {
    return Response.json({ error: "Not found" }, { status: 404 })
  }

  return Response.json({ success: true, interview })
})