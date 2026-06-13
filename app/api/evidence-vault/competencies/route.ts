// app/api/evidence-vault/competencies/route.ts
// Competency Tracker

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"

// Standard NHS clinical skills shown by default
export const DEFAULT_SKILLS = [
  "Venepuncture", "Cannulation", "ECG Recording", "Vital Signs",
  "Specimen Processing", "Blood Glucose Monitoring", "Manual Handling",
  "Infection Control", "Basic Life Support", "Medication Administration",
  "Wound Care", "Catheterisation", "Research Documentation", "Audit Participation",
]

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const competencies = await prisma.competency.findMany({
    where: { userId: session.user.id },
    orderBy: { skillName: "asc" },
  })

  // Merge with default skills not yet tracked
  const trackedNames = new Set(competencies.map(c => c.skillName))
  const untracked = DEFAULT_SKILLS.filter(s => !trackedNames.has(s)).map(s => ({
    id: null, skillName: s, status: "not_started", evidenceId: null, notes: null,
    signedOffBy: null, signedOffDate: null, userId: session.user.id,
  }))

  return Response.json({ competencies: [...competencies, ...untracked] })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { skillName, status, evidenceId, notes, signedOffBy, signedOffDate } = body
  if (!skillName) return Response.json({ error: "skillName required" }, { status: 400 })

  const competency = await prisma.competency.upsert({
    where: { userId_skillName: { userId: session.user.id, skillName } },
    update: {
      status: status ?? "training",
      evidenceId: evidenceId ?? null,
      notes: notes ?? null,
      signedOffBy: signedOffBy ?? null,
      signedOffDate: signedOffDate ? new Date(signedOffDate) : null,
    },
    create: {
      userId: session.user.id, skillName,
      status: status ?? "training",
      evidenceId: evidenceId ?? null,
      notes: notes ?? null,
      signedOffBy: signedOffBy ?? null,
      signedOffDate: signedOffDate ? new Date(signedOffDate) : null,
    },
  })
  return Response.json({ competency })
}

export async function DELETE(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await req.json()
  const existing = await prisma.competency.findUnique({ where: { id } })
  if (!existing || existing.userId !== session.user.id) return Response.json({ error: "Not found" }, { status: 404 })

  await prisma.competency.delete({ where: { id } })
  return Response.json({ success: true })
}