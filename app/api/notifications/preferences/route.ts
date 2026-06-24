// app/api/notifications/preferences/route.ts
// GET current mute list, POST to toggle mute for a given type.

import { prisma } from "@/lib/prisma"
import { getDb }  from "@/lib/db-router"
import { auth } from "@/auth"

export const runtime = 'nodejs'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 })
  const db      = await getDb(session.user.id)

  const prefs = await db.notificationPreference.findMany({
    where: { userId: session.user.id, muted: true },
    select: { type: true },
  })

  return Response.json({ success: true, mutedTypes: prefs.map(p => p.type) })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 })
  const db      = await getDb(session.user.id)

  const { type, muted } = await req.json()
  if (!type) return Response.json({ error: "type required" }, { status: 400 })

  await db.notificationPreference.upsert({
    where: { userId_type: { userId: session.user.id, type } },
    update: { muted: !!muted },
    create: { userId: session.user.id, type, muted: !!muted },
  })

  return Response.json({ success: true })
}