
import { getDb }  from "@/lib/db-router"
import { auth }                    from "@/auth"
import { callGeminiJSON }          from "@/lib/application/ai"
import { buildParserPrompt, postProcessParsedSpec } from "@/lib/application/parser"
import { sendEmail }               from "@/lib/email"
import { analysisCompleteEmail }   from "@/lib/email-templates"

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 })
    const userId = session.user.id as string
    const db     = await getDb(userId)

    const body = await req.json()
    const {
      jobTitle,
      jobDescription,
      personSpec,
      cvText,
      nhsValuesText,
      employer,
      band,
      sourceUrl,
      detectedNation,
      statementWordLimit,
    } = body

    if (!jobTitle || !jobDescription) {
      return Response.json({ error: "jobTitle and jobDescription required" }, { status: 400 })
    }

    const combined = [jobDescription, personSpec].filter(Boolean).join("\n\n")

    const parserInput = employer
      ? combined
      : `[NOTE: Extract the NHS employer / Health Board name from this job description if present]\n\n${combined}`

    const prompt = buildParserPrompt(jobTitle, parserInput)
    const raw    = await callGeminiJSON(prompt, 6000)
    const parsed = postProcessParsedSpec(raw)

    const resolvedEmployer = employer ?? (parsed as any).employer ?? raw.employer ?? null
    const resolvedNation   = detectedNation ?? raw.detectedNation ?? "unknown"

    // Q3 trigger detection
    const combinedLower = combined.toLowerCase()
    const q3Triggers: string[] = []
    if (combinedLower.includes("guaranteed interview") || combinedLower.includes("disability confident")) q3Triggers.push("gis")
    if (combinedLower.includes("relocation")) q3Triggers.push("relocation")
    if (combinedLower.includes("part time") || combinedLower.includes("part-time") || combinedLower.includes("flexible working") || combinedLower.includes("job share")) q3Triggers.push("part_time")
    if (combinedLower.includes("notice period") || combinedLower.includes("start date")) q3Triggers.push("notice_period")

    // Create application
    const application = await db.application.create({
      data: {
        userId,
        jobTitle,
        band:         band         ?? null,
        employer:     resolvedEmployer,
        sourceUrl:    sourceUrl    ?? null,
        jobDescription,
        personSpec:   personSpec   ?? null,
        cvText:       cvText       ?? null,
        nhsValuesText: nhsValuesText ?? null,
        parsedSpec: (({
          ...parsed,
          q3Triggers,
          resolvedBoard:      resolvedEmployer,
          detectedNation:     resolvedNation,
          statementWordLimit: statementWordLimit ?? null,
        }) as any),
        status: "draft",
      },
    })

    // Create criterion records
    const allCriteria = [
      ...parsed.essentialCriteria.map((c: any, i: number) => ({ ...c, order: i })),
      ...parsed.desirableCriteria.map((c: any, i: number) => ({ ...c, order: i + 100 })),
    ]
    for (const c of allCriteria) {
      await db.applicationCriterion.create({
        data: {
          applicationId: application.id,
          criterionText: c.text,
          type:          c.type,
          category:      c.category,
          order:         c.order,
        },
      })
    }

    // â”€â”€ Analysis complete email â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // Sends as soon as the job spec is parsed and criteria are extracted.
    // The score at this point reflects criteria coverage only (no statement yet)
    // â€” we show it as an "analysis ready" notification so the user comes back.
    const userRow = await db.user.findUnique({
      where:  { id: userId },
      select: { email: true, name: true },
    })

    if (userRow?.email) {
      const essentialCount = parsed.essentialCriteria?.length ?? 0
      const totalCount     = allCriteria.length
      // Simple coverage score: how many criteria were extracted vs expected
      const coverageScore  = Math.min(100, Math.round((essentialCount / Math.max(totalCount, 1)) * 100 + 40))

      sendEmail({
        to:      userRow.email,
        subject: `Analysis ready: ${jobTitle} â€” OmniJobReady AIâ„¢`,
        html:    analysisCompleteEmail({
          name:              userRow.name ?? "",
          jobTitle,
          employer:          resolvedEmployer,
          overallScore:      coverageScore,
          grade:             coverageScore >= 80 ? "strong" : coverageScore >= 60 ? "developing" : "needs_work",
          essentialCoverage: Math.min(100, Math.round((essentialCount / Math.max(1, essentialCount)) * 100)),
          shortlistUrl:      `${process.env.NEXTAUTH_URL}/dashboard/application/${application.id}`,
        }),
      }).catch(err => console.error("[parse-spec] analysis email failed:", err))
    }

    return Response.json({
      success:       true,
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
