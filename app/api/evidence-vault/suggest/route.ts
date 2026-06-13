// app/api/evidence-vault/suggest/route.ts
//
// Statement Builder integration — given a criterion text, finds matching
// EvidenceVault entries by skill tag / category overlap.
// Used in the wizard's evidence step to pre-suggest existing examples
// before the user writes a new one from scratch.

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const { criterionText } = await req.json()
  if (!criterionText) return Response.json({ error: "criterionText required" }, { status: 400 })

  const entries = await prisma.evidenceEntry.findMany({ where: { userId: session.user.id } })
  if (entries.length === 0) return Response.json({ suggestions: [] })

  const lower = criterionText.toLowerCase()

  // Score each entry by keyword overlap with the criterion text
  const scored = entries.map(e => {
    let score = 0
    for (const tag of e.skillTags) {
      if (lower.includes(tag.toLowerCase())) score += 3
    }
    for (const value of e.nhsValueTags) {
      if (lower.includes(value.toLowerCase())) score += 2
    }
    // Category keyword matches
    const categoryKeywords: Record<string, string[]> = {
      clinical: ['clinical', 'procedure', 'venepuncture', 'cannulation', 'ecg', 'specimen'],
      patient_interaction: ['patient', 'communication', 'care', 'compassion'],
      research: ['research', 'study', 'participant', 'consent'],
      audit: ['audit', 'quality', 'improvement', 'governance'],
      training: ['training', 'teaching', 'mentoring', 'develop'],
      leadership: ['leadership', 'supervis', 'manage', 'lead'],
    }
    const keywords = categoryKeywords[e.category] ?? []
    if (keywords.some(k => lower.includes(k))) score += 1

    // Title word overlap
    const titleWords = e.title.toLowerCase().split(/\s+/).filter(w => w.length > 3)
    if (titleWords.some(w => lower.includes(w))) score += 1

    return { entry: e, score }
  })

  const suggestions = scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(s => ({
      id: s.entry.id,
      title: s.entry.title,
      situation: s.entry.situation,
      task: s.entry.task,
      action: s.entry.action,
      result: s.entry.result,
      skillTags: s.entry.skillTags,
      score: s.score,
    }))

  return Response.json({ suggestions })
}

// Increment usage count when a suggestion is actually used in a statement
export async function PATCH(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await req.json()
  if (!id) return Response.json({ error: "id required" }, { status: 400 })

  const entry = await prisma.evidenceEntry.findUnique({ where: { id } })
  if (!entry || entry.userId !== session.user.id) return Response.json({ error: "Not found" }, { status: 404 })

  await prisma.evidenceEntry.update({ where: { id }, data: { usageCount: { increment: 1 } } })
  return Response.json({ success: true })
}