// app/api/ping/route.ts
import { prisma } from "@/lib/prisma"

export const runtime = 'nodejs'

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`
    return Response.json({ ok: true })
  } catch {
    return Response.json({ ok: false })
  }
}