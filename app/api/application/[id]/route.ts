// app/api/application/[id]/route.ts

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { NextRequest } from "next/server"

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const session = await auth()
    if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const application = await prisma.application.findUnique({
      where: { id },
      include: {
        criteria: { orderBy: { order: "asc" } },
        drafts: { orderBy: { createdAt: "desc" }, take: 5 },
      },
    })

    if (!application || application.userId !== session.user.id) {
      return Response.json({ error: "Not found" }, { status: 404 })
    }

    return Response.json({ success: true, application })
  } catch (error: any) {
    return Response.json({ error: error?.message ?? "Failed" }, { status: 500 })
  }
}