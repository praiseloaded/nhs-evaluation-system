// app/api/application/[id]/context/route.ts
// Saves current role and years experience from wizard Step 3

import { prisma } from "@/lib/prisma"
import { getDb }  from "@/lib/db-router"
import { auth } from "@/auth"

export const runtime = 'nodejs'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 })
    const db      = await getDb(session.user.id)

    const { currentRole, yearsExperience } = await req.json()

    const application = await db.application.findUnique({ where: { id: params.id } })
    if (!application || application.userId !== session.user.id) {
      return Response.json({ error: "Not found" }, { status: 404 })
    }

    await db.application.update({
      where: { id: params.id },
      data: {
        currentRole: currentRole ?? null,
        yearsExperience: yearsExperience ?? null,
      },
    })

    return Response.json({ success: true })
  } catch (error: any) {
    return Response.json({ error: error?.message ?? "Failed" }, { status: 500 })
  }
}