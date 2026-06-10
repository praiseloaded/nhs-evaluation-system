// app/api/application/save-evidence/route.ts
//
// Receives raw plain-English evidence from the wizard Step 4.
// If the user has experience → converts to STAR silently via AI.
// If noExperience = true → generates a development/aspiration sentence.
// Finds the matching ApplicationCriterion and saves the generated paragraph.

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { callGeminiJSON } from "@/lib/application/ai"

function buildEvidencePrompt(criterionText: string, rawEvidence: string, jobTitle: string, employer: string | null): string {
  return `
You are an expert NHS recruitment writer.

Convert the following raw evidence into a concise NHS-style STAR paragraph (60–80 words).

CRITERION: ${criterionText}
JOB: ${jobTitle}${employer ? ` at ${employer}` : ''}
RAW EVIDENCE FROM APPLICANT: ${rawEvidence}

Rules:
- Write in first person, active voice
- Structure: brief situation → task/responsibility → specific action → measurable result
- Use professional NHS language naturally — no hollow phrases
- 60–80 words maximum
- No bullet points — one flowing paragraph
- Do not invent facts not present in the raw evidence

Respond with JSON: { "paragraph": "...", "wordCount": <int> }
`.trim()
}

function buildDevelopmentPrompt(criterionText: string, jobTitle: string, employer: string | null): string {
  return `
You are an expert NHS recruitment writer.

Write a forward-looking development sentence (30–50 words) for a candidate who does not yet have experience in this criterion.

CRITERION: ${criterionText}
JOB: ${jobTitle}${employer ? ` at ${employer}` : ''}

Rules:
- Show genuine commitment to developing this skill
- Reference the role or organisation where appropriate
- Professional, confident tone — not apologetic
- 30–50 words, one sentence or two short sentences
- Do not imply the candidate is unqualified — frame as an area of active development

Respond with JSON: { "paragraph": "...", "wordCount": <int> }
`.trim()
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const body = await req.json()
    const { applicationId, criterionText, type, rawEvidence, noExperience } = body

    if (!applicationId || !criterionText) {
      return Response.json({ error: "applicationId and criterionText required" }, { status: 400 })
    }

    // Verify application belongs to user
    const application = await prisma.application.findUnique({ where: { id: applicationId } })
    if (!application || application.userId !== session.user.id) {
      return Response.json({ error: "Not found" }, { status: 404 })
    }

    // Find matching criterion
    const criterion = await prisma.applicationCriterion.findFirst({
      where: { applicationId, criterionText },
    })
    if (!criterion) {
      return Response.json({ error: "Criterion not found" }, { status: 404 })
    }

    // Generate paragraph
    const prompt = noExperience
      ? buildDevelopmentPrompt(criterionText, application.jobTitle, application.employer)
      : buildEvidencePrompt(criterionText, rawEvidence, application.jobTitle, application.employer)

    const result = await callGeminiJSON(prompt, 1000)
    const paragraph = result.paragraph ?? ""

    // Save to criterion
    await prisma.applicationCriterion.update({
      where: { id: criterion.id },
      data: {
        // Store raw evidence in situation field for reference
        situation: noExperience ? null : rawEvidence,
        generatedParagraph: paragraph,
        paragraphScore: noExperience ? 40 : 75, // development sentences score lower
        status: "complete",
      },
    })

    // Update application completeness
    const allCriteria  = await prisma.applicationCriterion.findMany({ where: { applicationId } })
    const completed    = allCriteria.filter(c => c.generatedParagraph).length
    const completeness = Math.round((completed / allCriteria.length) * 100)
    await prisma.application.update({
      where: { id: applicationId },
      data: { completeness, status: completeness === 100 ? "in_progress" : "draft" },
    })

    return Response.json({
      success: true,
      criterionId: criterion.id,
      paragraph,
      wordCount: result.wordCount ?? paragraph.split(/\s+/).filter(Boolean).length,
      isDevelopment: noExperience,
    })
  } catch (error: any) {
    console.error("SAVE_EVIDENCE_ERROR:", error)
    return Response.json({ error: error?.message ?? "Failed" }, { status: 500 })
  }
}