// app/api/application/list/route.ts

import { getDb } from "@/lib/db-router"
import { auth }  from "@/auth"

export const runtime = 'nodejs'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const db = await getDb(session.user.id)

    const applications = await (db.application as any).findMany({
      where:   { userId: session.user.id },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true, jobTitle: true, band: true, employer: true,
        status: true, completeness: true, wordCount: true,
        createdAt: true, updatedAt: true,
        statementQ1: true, statementQ2: true,
      },
    })

    return Response.json({
      applications: applications.map((a: any) => ({
        id:           a.id,
        jobTitle:     a.jobTitle,
        band:         a.band,
        employer:     a.employer,
        status:       a.status,
        completeness: a.completeness ?? 0,
        wordCount:    a.wordCount,
        createdAt:    a.createdAt,
        statementQ1:  a.statementQ1 ?? null,
        statementQ2:  a.statementQ2 ?? null,
      })),
    })
  } catch (error: any) {
    console.error("LIST_APPLICATIONS_ERROR:", error)
    return Response.json({ error: error?.message ?? "Failed" }, { status: 500 })
  }
}