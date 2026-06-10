// app/api/application/parse-spec/route.ts
//
// Accepts four separate document texts:
//   jobDescription    — the job advert text
//   personSpec        — person specification (may overlap with jobDescription)
//   cvText            — applicant CV
//   nhsValuesText     — Trust/Board NHS values document (used in Q2 generation)
//
// Also accepts pre-detected nation + word limit from the launcher UI.

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { callGeminiJSON } from "@/lib/application/ai"
import { buildParserPrompt, postProcessParsedSpec } from "@/lib/application/parser"

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 })
    const userId = session.user.id as string

    const body = await req.json()
    const {
      jobTitle,
      jobDescription,
      personSpec,          // now separate from jobDescription
      cvText,
      nhsValuesText,       // NEW — Trust/Board values document
      employer,
      band,
      sourceUrl,
      detectedNation,      // NEW — from launcher auto-detection
      statementWordLimit,  // NEW — for England/Wales/NI dynamic limit
    } = body

    if (!jobTitle || !jobDescription) {
      return Response.json({ error: "jobTitle and jobDescription required" }, { status: 400 })
    }

    // Combine JD + person spec for criteria extraction
    const combined = [jobDescription, personSpec].filter(Boolean).join("\n\n")

    // Attempt to extract employer from JD if not supplied
    const parserInput = employer
      ? combined
      : `[NOTE: Extract the NHS employer / Health Board name from this job description if present]\n\n${combined}`

    const prompt = buildParserPrompt(jobTitle, parserInput)
    const raw = await callGeminiJSON(prompt, 6000)
    const parsed = postProcessParsedSpec(raw)

    const resolvedEmployer = employer ?? parsed.employer ?? raw.employer ?? null
    const resolvedNation   = detectedNation ?? raw.detectedNation ?? "unknown"

    // Q3 trigger detection
    const combinedLower = combined.toLowerCase()
    const q3Triggers: string[] = []
    if (combinedLower.includes("guaranteed interview") || combinedLower.includes("disability confident")) q3Triggers.push("gis")
    if (combinedLower.includes("relocation")) q3Triggers.push("relocation")
    if (combinedLower.includes("part time") || combinedLower.includes("part-time") || combinedLower.includes("flexible working") || combinedLower.includes("job share")) q3Triggers.push("part_time")
    if (combinedLower.includes("notice period") || combinedLower.includes("start date")) q3Triggers.push("notice_period")

    // Create application
    const application = await prisma.application.create({
      data: {
        userId,
        jobTitle,
        band: band ?? null,
        employer: resolvedEmployer,
        sourceUrl: sourceUrl ?? null,
        jobDescription,
        personSpec: personSpec ?? null,
        cvText: cvText ?? null,
        // @ts-expect-error — new fields
        nhsValuesText: nhsValuesText ?? null,
        parsedSpec: {
          ...parsed,
          q3Triggers,
          resolvedBoard: resolvedEmployer,
          detectedNation: resolvedNation,
          statementWordLimit: statementWordLimit ?? null,
        },
        status: "draft",
      },
    })

    // Create criterion records
    const allCriteria = [
      ...parsed.essentialCriteria.map((c: any, i: number) => ({ ...c, order: i })),
      ...parsed.desirableCriteria.map((c: any, i: number) => ({ ...c, order: i + 100 })),
    ]
    for (const c of allCriteria) {
      await prisma.applicationCriterion.create({
        data: {
          applicationId: application.id,
          criterionText: c.text,
          type: c.type,
          category: c.category,
          order: c.order,
        },
      })
    }

    return Response.json({
      success: true,
      applicationId: application.id,
      parsed,
      criteriaCount: allCriteria.length,
      resolvedEmployer,
      resolvedNation,
      q3Triggers,
      nhsValuesLoaded: !!nhsValuesText,
      employerWarning: !resolvedEmployer
        ? "No Health Board/Trust name detected. Q2 will use generic values. Add the employer name for a more targeted statement."
        : null,
    })
  } catch (error: any) {
    console.error("PARSE_SPEC_ERROR:", error)
    return Response.json({ error: error?.message ?? "Parse failed" }, { status: 500 })
  }
}