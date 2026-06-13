// app/api/evidence-vault/interview/route.ts
// Interview Answer Vault

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"

export const COMMON_QUESTIONS = [
  { question: "Tell us about yourself and why you want this role", category: "general" },
  { question: "Describe a time you worked as part of a team", category: "teamwork" },
  { question: "Tell us about a time you dealt with a difficult patient or colleague", category: "difficult_situation" },
  { question: "How do you handle pressure or a busy workload?", category: "general" },
  { question: "Give an example of demonstrating the NHS values", category: "values" },
  { question: "Describe a time you showed leadership or took initiative", category: "leadership" },
  { question: "Tell us about a clinical procedure you are confident performing", category: "clinical" },
]

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const entries = await prisma.interviewVaultEntry.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
  })
  return Response.json({ entries, suggestedQuestions: COMMON_QUESTIONS })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { question, category, answer, linkedEvidenceId } = body
  if (!question || !answer) return Response.json({ error: "question and answer required" }, { status: 400 })

  const entry = await prisma.interviewVaultEntry.create({
    data: {
      userId: session.user.id, question, category: category ?? "general", answer,
      linkedEvidenceId: linkedEvidenceId ?? null,
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

  const existing = await prisma.interviewVaultEntry.findUnique({ where: { id } })
  if (!existing || existing.userId !== session.user.id) return Response.json({ error: "Not found" }, { status: 404 })

  const entry = await prisma.interviewVaultEntry.update({ where: { id }, data })
  return Response.json({ entry })
}

export async function DELETE(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await req.json()
  const existing = await prisma.interviewVaultEntry.findUnique({ where: { id } })
  if (!existing || existing.userId !== session.user.id) return Response.json({ error: "Not found" }, { status: 404 })

  await prisma.interviewVaultEntry.delete({ where: { id } })
  return Response.json({ success: true })
}