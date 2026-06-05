// app/api/application/[id]/status/route.ts

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { NextRequest } from "next/server"

type Params = { params: Promise<{ id: string }> }

const VALID_STATUSES = [
  "draft", "in_progress", "complete", "submitted",
  "shortlisted", "interview", "offer", "rejected",
]

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const session = await auth()
    if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const body = await req.json()
    const { status, notes, deadlineDate, interviewDate } = body

    if (status && !VALID_STATUSES.includes(status)) {
      return Response.json({ error: `Invalid status. Allowed: ${VALID_STATUSES.join(", ")}` }, { status: 400 })
    }

    const application = await prisma.application.findUnique({ where: { id } })
    if (!application || application.userId !== session.user.id) {
      return Response.json({ error: "Not found" }, { status: 404 })
    }

    // Build update data
    const updateData: any = {}

    if (status) {
      updateData.status = status

      // Workflow triggers
      if (status === "submitted" && !application.submittedAt) {
        updateData.submittedAt = new Date()
      }
    }

    if (notes !== undefined) updateData.notes = notes
    if (deadlineDate !== undefined) updateData.deadlineDate = deadlineDate ? new Date(deadlineDate) : null
    if (interviewDate !== undefined) updateData.interviewDate = interviewDate ? new Date(interviewDate) : null

    const updated = await prisma.application.update({
      where: { id },
      data: updateData,
    })

    return Response.json({
      success: true,
      status: updated.status,
      submittedAt: updated.submittedAt,
    })
  } catch (error: any) {
    console.error("STATUS_UPDATE_ERROR:", error)
    return Response.json({ error: error?.message ?? "Failed" }, { status: 500 })
  }
}