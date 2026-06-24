// app/api/cv/route.ts
// CRUD for CV profiles — list and create

import { prisma } from "@/lib/prisma"
import { getDb }  from "@/lib/db-router"
import { auth } from "@/auth"

export const runtime = 'nodejs'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 })
    const db      = await getDb(session.user.id)

    const profiles = await db.cvProfile.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: 'desc' },
    })
    return Response.json({ success: true, profiles })
  } catch (error: any) {
    console.error("CV_LIST_ERROR:", error)
    return Response.json({ error: error?.message ?? "Failed" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 })
  const db      = await getDb(session.user.id)

    const body = await req.json()
    const profile = await db.cvProfile.create({
      data: {
        userId: session.user.id,
        title: body.title ?? "My CV",
        template: body.template ?? "clinical",
        fullName: body.fullName ?? session.user.name ?? null,
        email: body.email ?? session.user.email ?? null,
      },
    })
    return Response.json({ success: true, profile })
  } catch (error: any) {
    console.error("CV_CREATE_ERROR:", error)
    return Response.json({ error: error?.message ?? "Failed" }, { status: 500 })
  }
}