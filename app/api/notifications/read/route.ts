// app/api/notifications/read/route.ts
// POST { id } to mark one notification read, or { all: true } to clear all.

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const { id, all } = await req.json()

  if (all) {
    await prisma.notification.updateMany({
      where: { userId: session.user.id, read: false },
      data: { read: true },
    })
    return Response.json({ success: true })
  }

  if (!id) return Response.json({ error: "id or all required" }, { status: 400 })

  const notif = await prisma.notification.findUnique({ where: { id } })
  if (!notif || notif.userId !== session.user.id) {
    return Response.json({ error: "Not found" }, { status: 404 })
  }

  await prisma.notification.update({ where: { id }, data: { read: true } })
  return Response.json({ success: true })
}