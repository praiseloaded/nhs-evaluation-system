// app/dashboard/interview/[id]/start/route.ts

import { auth }    from "@/auth"
import { getDb }   from "@/lib/db-router"
import { NextRequest } from "next/server"

type Params = { params: Promise<{ id: string }> }

export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const { id }  = await params
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const db = await getDb(session.user.id)

    const interview = await db.interview.findUnique({ where: { id } })
    if (!interview || interview.userId !== session.user.id) {
      return Response.json({ success: false, error: "Not found" }, { status: 404 })
    }

    // Only set startedAt if not already started
    if (!interview.startedAt) {
      await db.interview.update({
        where: { id },
        data:  { status: "in_progress", startedAt: new Date() },
      })
    }

    return Response.json({ success: true, startedAt: interview.startedAt ?? new Date() })
  } catch (error: any) {
    return Response.json({ success: false, error: error?.message }, { status: 500 })
  }
}