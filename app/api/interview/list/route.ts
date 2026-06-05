// app/api/interview/list/route.ts

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id as string

    const interviews = await prisma.interview.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        jobTitle: true,
        band: true,
        status: true,
        totalScore: true,
        createdAt: true,
        completedAt: true,
      },
    })

    return Response.json({ success: true, interviews })

  } catch (error: any) {
    console.error("INTERVIEW_LIST_ERROR:", error)
    return Response.json(
      { success: false, error: error?.message ?? "Failed to list interviews" },
      { status: 500 },
    )
  }
}