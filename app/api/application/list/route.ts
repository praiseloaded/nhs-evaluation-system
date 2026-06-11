// app/api/application/list/route.ts
// Returns all applications for the current user
// Includes statementQ1/Q2 so the list view can show "Statement ready" vs "In progress"

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const applications = await prisma.application.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        jobTitle: true,
        band: true,
        employer: true,
        status: true,
        completeness: true,
        wordCount: true,
        createdAt: true,
        updatedAt: true,
        // @ts-expect-error — new schema fields
        statementQ1: true,
        // @ts-expect-error — new schema fields
        statementQ2: true,
      },
    })

    return Response.json({
      applications: applications.map(a => ({
        id: a.id,
        jobTitle: a.jobTitle,
        band: a.band,
        employer: a.employer,
        status: a.status,
        completeness: a.completeness ?? 0,
        wordCount: a.wordCount,
        createdAt: a.createdAt,
        // @ts-expect-error
        statementQ1: a.statementQ1 ?? null,
        // @ts-expect-error
        statementQ2: a.statementQ2 ?? null,
      })),
    })
  } catch (error: any) {
    console.error("LIST_APPLICATIONS_ERROR:", error)
    return Response.json({ error: error?.message ?? "Failed" }, { status: 500 })
  }
}