// app/api/notifications/read/route.ts
// POST { id } to mark one notification read, or { all: true } to clear all.

import { prisma } from "@/lib/prisma"
import { getDb }  from "@/lib/db-router"
import { auth } from "@/auth"

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 })
  const db      = await getDb(session.user.id)

  const { id, all } = await req.json()

  if (all) {
    await db.notification.updateMany({
      where: { userId: session.user.id, read: false },
      data: { read: true },
    })
    return Response.json({ success: true })
  }

  if (!id) return Response.json({ error: "id or all required" }, { status: 400 })

  const notif = await db.notification.findUnique({ where: { id } })
  if (!notif || notif.userId !== session.user.id) {
    return Response.json({ error: "Not found" }, { status: 404 })
  }

  await db.notification.update({ where: { id }, data: { read: true } })
  return Response.json({ success: true })
}