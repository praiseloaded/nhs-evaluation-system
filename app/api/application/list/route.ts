// app/api/application/list/route.ts

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const applications = await prisma.application.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: "desc" },
      take: 20,
      select: {
        id: true, jobTitle: true, band: true, completeness: true,
        status: true, wordCount: true, createdAt: true,
      },
    })

    return Response.json({ success: true, applications })
  } catch (error: any) {
    return Response.json({ error: error?.message ?? "Failed" }, { status: 500 })
  }
}