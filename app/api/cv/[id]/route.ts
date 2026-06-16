// app/api/cv/[id]/route.ts
// GET, PATCH (autosave), DELETE for a single CV profile

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await auth()
    if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const profile = await prisma.cvProfile.findUnique({ where: { id } })
    if (!profile || profile.userId !== session.user.id) {
      return Response.json({ error: "Not found" }, { status: 404 })
    }
    return Response.json({ success: true, profile })
  } catch (error: any) {
    return Response.json({ error: error?.message ?? "Failed" }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await auth()
    if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const existing = await prisma.cvProfile.findUnique({ where: { id } })
    if (!existing || existing.userId !== session.user.id) {
      return Response.json({ error: "Not found" }, { status: 404 })
    }

    const body = await req.json()
    const allowed = [
      'title', 'template', 'fullName', 'email', 'phone', 'location',
      'professionalRegistration', 'personalStatement', 'workExperience',
      'education', 'skills', 'certifications', 'additionalInfo', 'references',
    ]
    const data: Record<string, any> = {}
    for (const key of allowed) {
      if (key in body) data[key] = body[key]
    }

    const updated = await prisma.cvProfile.update({ where: { id }, data })
    return Response.json({ success: true, profile: updated })
  } catch (error: any) {
    console.error("CV_UPDATE_ERROR:", error)
    return Response.json({ error: error?.message ?? "Failed" }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await auth()
    if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const existing = await prisma.cvProfile.findUnique({ where: { id } })
    if (!existing || existing.userId !== session.user.id) {
      return Response.json({ error: "Not found" }, { status: 404 })
    }

    await prisma.cvProfile.delete({ where: { id } })
    return Response.json({ success: true })
  } catch (error: any) {
    return Response.json({ error: error?.message ?? "Failed" }, { status: 500 })
  }
}