// app/api/interview/[id]/route.ts

import { prisma } from "@/lib/prisma"
import { getDb }  from "@/lib/db-router"
import { auth } from "@/auth"
import { NextRequest } from "next/server"

export const runtime = 'nodejs'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params

    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id as string
    const db      = await getDb(userId)

    const interview = await db.interview.findUnique({
      where: { id },
      include: { answers: { orderBy: { answeredAt: "asc" } } },
    })

    if (!interview || interview.userId !== userId) {
      return Response.json({ success: false, error: "Not found" }, { status: 404 })
    }

    return Response.json({ success: true, interview })

  } catch (error: any) {
    console.error("INTERVIEW_GET_ERROR:", error)
    return Response.json(
      { success: false, error: error?.message ?? "Failed to fetch interview" },
      { status: 500 },
    )
  }
}