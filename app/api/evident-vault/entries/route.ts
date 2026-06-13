// app/api/evidence-vault/entries/route.ts
// Experience Library — STAR evidence entries

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const entries = await prisma.evidenceEntry.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
  })
  return Response.json({ entries })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { title, category, situation, task, action, result, skillTags, nhsValueTags, dateOccurred, employer } = body

  if (!title || !situation || !task || !action || !result) {
    return Response.json({ error: "title, situation, task, action, result are required" }, { status: 400 })
  }

  const entry = await prisma.evidenceEntry.create({
    data: {
      userId: session.user.id,
      title, category: category ?? "other",
      situation, task, action, result,
      skillTags: skillTags ?? [],
      nhsValueTags: nhsValueTags ?? [],
      dateOccurred: dateOccurred ? new Date(dateOccurred) : null,
      employer: employer ?? null,
    },
  })
  return Response.json({ entry })
}

export async function PATCH(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { id, ...data } = body
  if (!id) return Response.json({ error: "id required" }, { status: 400 })

  const existing = await prisma.evidenceEntry.findUnique({ where: { id } })
  if (!existing || existing.userId !== session.user.id) return Response.json({ error: "Not found" }, { status: 404 })

  if (data.dateOccurred) data.dateOccurred = new Date(data.dateOccurred)

  const entry = await prisma.evidenceEntry.update({ where: { id }, data })
  return Response.json({ entry })
}

export async function DELETE(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await req.json()
  const existing = await prisma.evidenceEntry.findUnique({ where: { id } })
  if (!existing || existing.userId !== session.user.id) return Response.json({ error: "Not found" }, { status: 404 })

  await prisma.evidenceEntry.delete({ where: { id } })
  return Response.json({ success: true })
}