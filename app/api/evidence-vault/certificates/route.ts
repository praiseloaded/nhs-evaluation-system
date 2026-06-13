// app/api/evidence-vault/certificates/route.ts
// Certificate Vault

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const certificates = await prisma.certificate.findMany({
    where: { userId: session.user.id },
    orderBy: [{ expiryDate: "asc" }, { updatedAt: "desc" }],
  })
  return Response.json({ certificates })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { name, issuer, certNumber, dateIssued, expiryDate, fileUrl, category } = body
  if (!name) return Response.json({ error: "name required" }, { status: 400 })

  const certificate = await prisma.certificate.create({
    data: {
      userId: session.user.id,
      name, issuer: issuer ?? null, certNumber: certNumber ?? null,
      dateIssued: dateIssued ? new Date(dateIssued) : null,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      fileUrl: fileUrl ?? null,
      category: category ?? "training",
    },
  })
  return Response.json({ certificate })
}

export async function PATCH(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { id, ...data } = body
  if (!id) return Response.json({ error: "id required" }, { status: 400 })

  const existing = await prisma.certificate.findUnique({ where: { id } })
  if (!existing || existing.userId !== session.user.id) return Response.json({ error: "Not found" }, { status: 404 })

  if (data.dateIssued) data.dateIssued = new Date(data.dateIssued)
  if (data.expiryDate) data.expiryDate = new Date(data.expiryDate)

  const certificate = await prisma.certificate.update({ where: { id }, data })
  return Response.json({ certificate })
}

export async function DELETE(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await req.json()
  const existing = await prisma.certificate.findUnique({ where: { id } })
  if (!existing || existing.userId !== session.user.id) return Response.json({ error: "Not found" }, { status: 404 })

  await prisma.certificate.delete({ where: { id } })
  return Response.json({ success: true })
}