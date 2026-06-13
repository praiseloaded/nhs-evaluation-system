// app/api/evidence-vault/references/route.ts
// Reference & Employment History Vault

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const entries = await prisma.referenceEntry.findMany({
    where: { userId: session.user.id },
    orderBy: [{ endDate: "desc" }, { startDate: "desc" }],
  })
  return Response.json({ entries })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { employer, jobTitle, startDate, endDate, responsibilities, achievements, refereeName, refereeRole, refereeEmail, refereePhone } = body
  if (!employer || !jobTitle || !responsibilities) {
    return Response.json({ error: "employer, jobTitle, responsibilities required" }, { status: 400 })
  }

  const entry = await prisma.referenceEntry.create({
    data: {
      userId: session.user.id,
      employer, jobTitle,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      responsibilities, achievements: achievements ?? null,
      refereeName: refereeName ?? null, refereeRole: refereeRole ?? null,
      refereeEmail: refereeEmail ?? null, refereePhone: refereePhone ?? null,
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

  const existing = await prisma.referenceEntry.findUnique({ where: { id } })
  if (!existing || existing.userId !== session.user.id) return Response.json({ error: "Not found" }, { status: 404 })

  if (data.startDate) data.startDate = new Date(data.startDate)
  if (data.endDate) data.endDate = new Date(data.endDate)

  const entry = await prisma.referenceEntry.update({ where: { id }, data })
  return Response.json({ entry })
}

export async function DELETE(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await req.json()
  const existing = await prisma.referenceEntry.findUnique({ where: { id } })
  if (!existing || existing.userId !== session.user.id) return Response.json({ error: "Not found" }, { status: 404 })

  await prisma.referenceEntry.delete({ where: { id } })
  return Response.json({ success: true })
}