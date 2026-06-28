// app/api/cv/[id]/route.ts

import { getDb } from "@/lib/db-router"
import { auth }  from "@/auth"

export const runtime = 'nodejs'

async function getDbAndProfile(id: string, userId: string) {
  const db      = await getDb(userId)
  const profile = await db.cvProfile.findUnique({ where: { id } })
  return { db, profile }
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id }  = await params
    const session = await auth()
    if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 })
    const { profile } = await getDbAndProfile(id, session.user.id)
    if (!profile || profile.userId !== session.user.id) return Response.json({ error: "Not found" }, { status: 404 })
    return Response.json({ success: true, profile })
  } catch (error: any) {
    return Response.json({ error: error?.message ?? "Failed" }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id }  = await params
    const session = await auth()
    if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 })
    const { db, profile } = await getDbAndProfile(id, session.user.id)
    if (!profile || profile.userId !== session.user.id) return Response.json({ error: "Not found" }, { status: 404 })

    const body    = await req.json()
    const allowed = ['title','template','fullName','email','phone','location','professionalRegistration','personalStatement','workExperience','education','skills','certifications','additionalInfo','references']
    const data: Record<string, any> = {}
    for (const key of allowed) { if (key in body) data[key] = body[key] }

    const updated = await db.cvProfile.update({ where: { id }, data })
    return Response.json({ success: true, profile: updated })
  } catch (error: any) {
    console.error("CV_UPDATE_ERROR:", error)
    return Response.json({ error: error?.message ?? "Failed" }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id }  = await params
    const session = await auth()
    if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 })
    const { db, profile } = await getDbAndProfile(id, session.user.id)
    if (!profile || profile.userId !== session.user.id) return Response.json({ error: "Not found" }, { status: 404 })
    await db.cvProfile.delete({ where: { id } })
    return Response.json({ success: true })
  } catch (error: any) {
    return Response.json({ error: error?.message ?? "Failed" }, { status: 500 })
  }
}
