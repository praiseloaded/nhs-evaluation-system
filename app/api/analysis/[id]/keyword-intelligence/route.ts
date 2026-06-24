// app/api/analysis/[id]/keyword-intelligence/route.ts
// MOAT 7 — NHS Keyword Intelligence™
// Detects NHS-specific keywords in the statement/CV, flags missing ones,
// shows which are backed by evidence vs just mentioned.

import { prisma } from "@/lib/prisma"
import { getDb }  from "@/lib/db-router"
import { auth } from "@/auth"
import { callGeminiJSON } from "@/lib/application/ai"

export const runtime = 'nodejs'

// ─── NHS Keyword Taxonomy ─────────────────────────────────────────────────────
// Grouped by clinical domain. Each keyword has a weight (impact on shortlisting).

export const NHS_KEYWORD_TAXONOMY = [
  // Clinical Governance & Safety
  { keyword: "Clinical Governance",     group: "Governance & Safety",  weight: 95, definition: "Framework for quality and safety in NHS care" },
  { keyword: "Patient Safety",          group: "Governance & Safety",  weight: 95, definition: "Preventing harm to patients" },
  { keyword: "Duty of Candour",         group: "Governance & Safety",  weight: 90, definition: "Legal duty to be open about mistakes" },
  { keyword: "Safeguarding",            group: "Governance & Safety",  weight: 90, definition: "Protecting vulnerable adults and children" },
  { keyword: "Datix",                   group: "Governance & Safety",  weight: 85, definition: "NHS incident reporting system" },
  { keyword: "Risk Assessment",         group: "Governance & Safety",  weight: 85, definition: "Identifying and managing clinical risks" },
  { keyword: "Audit",                   group: "Governance & Safety",  weight: 80, definition: "Clinical audit to improve standards" },
  { keyword: "Quality Improvement",     group: "Governance & Safety",  weight: 80, definition: "Systematic improvement of care quality" },
  { keyword: "Escalation",              group: "Governance & Safety",  weight: 80, definition: "Raising concerns through proper channels" },
  // Clinical Practice
  { keyword: "MDT",                     group: "Clinical Practice",    weight: 90, definition: "Multi-disciplinary team working" },
  { keyword: "IPC",                     group: "Clinical Practice",    weight: 88, definition: "Infection prevention and control" },
  { keyword: "SOP",                     group: "Clinical Practice",    weight: 85, definition: "Standard operating procedures" },
  { keyword: "COSHH",                   group: "Clinical Practice",    weight: 80, definition: "Control of Substances Hazardous to Health" },
  { keyword: "Sample Integrity",        group: "Clinical Practice",    weight: 85, definition: "Maintaining quality of clinical specimens" },
  { keyword: "Venepuncture",            group: "Clinical Practice",    weight: 90, definition: "Blood collection from veins" },
  { keyword: "Cannulation",             group: "Clinical Practice",    weight: 85, definition: "Inserting IV access device" },
  { keyword: "ECG",                     group: "Clinical Practice",    weight: 80, definition: "Electrocardiogram recording" },
  { keyword: "Specimen Handling",       group: "Clinical Practice",    weight: 85, definition: "Processing clinical specimens correctly" },
  // Professional Standards
  { keyword: "NMC",                     group: "Professional Standards", weight: 90, definition: "Nursing and Midwifery Council registration" },
  { keyword: "HCPC",                    group: "Professional Standards", weight: 90, definition: "Health and Care Professions Council" },
  { keyword: "Reflective Practice",     group: "Professional Standards", weight: 80, definition: "Learning through structured reflection" },
  { keyword: "PDP&R",                   group: "Professional Standards", weight: 75, definition: "Personal development planning and review" },
  { keyword: "Revalidation",            group: "Professional Standards", weight: 80, definition: "Maintaining professional registration" },
  // Equality & Values
  { keyword: "Equality & Diversity",    group: "Values & Equality",    weight: 85, definition: "Promoting fair treatment for all" },
  { keyword: "Dignity and Respect",     group: "Values & Equality",    weight: 85, definition: "Core NHS value in patient care" },
  { keyword: "Confidentiality",         group: "Values & Equality",    weight: 90, definition: "Protecting patient information" },
  { keyword: "Person-Centred Care",     group: "Values & Equality",    weight: 88, definition: "Care focused on individual needs" },
  // Systems & Admin
  { keyword: "TRAK",                    group: "NHS Systems",           weight: 80, definition: "NHS patient administration system" },
  { keyword: "EMIS",                    group: "NHS Systems",           weight: 75, definition: "Electronic patient record system" },
  { keyword: "SystmOne",               group: "NHS Systems",           weight: 75, definition: "Clinical information system" },
  { keyword: "Electronic Patient Record", group: "NHS Systems",        weight: 80, definition: "Digital patient record system" },
]

function buildKeywordPrompt(
  statement: string,
  jobDescription: string,
  keywordsToCheck: typeof NHS_KEYWORD_TAXONOMY,
): string {
  const keywordList = keywordsToCheck.map(k => `"${k.keyword}"`).join(", ")

  return `
You are an NHS recruitment keyword analyst.

Analyse this NHS supporting statement and job description for the following NHS-specific keywords.
For each keyword, determine:
1. Is it PRESENT in the statement/CV? (even partial matches count — "infection control" matches "IPC")
2. If present, is it EVIDENCE-BACKED (specific example given) or just MENTIONED (generic claim)?
3. Is it REQUIRED by the job description?

KEYWORDS TO CHECK: ${keywordList}

JOB DESCRIPTION (first 1500 chars):
${jobDescription.slice(0, 1500)}

SUPPORTING STATEMENT:
${statement.slice(0, 3000)}

For each keyword respond with status:
- "present_evidenced" = in statement with a specific example
- "present_mentioned" = in statement but no specific evidence
- "absent_required" = NOT in statement but IS required by job description  
- "absent_optional" = NOT in statement, not explicitly required
- "not_applicable" = irrelevant to this specific role

Respond ONLY with JSON:
{
  "keywords": [
    {
      "keyword": "Clinical Governance",
      "status": "present_evidenced",
      "evidence": "brief quote or description of where it appears",
      "recommendation": "what to add if missing or weak"
    }
  ],
  "overallKeywordScore": 72,
  "criticalMissing": ["keyword1", "keyword2"],
  "quickWins": ["add X", "mention Y"]
}
`.trim()
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await auth()

 if (!session?.user?.id) {
  return Response.json({ error: 'Unauthorized' }, { status: 401 })
}
const db = await getDb(session.user.id)

    const analysis = await db.analysis.findUnique({
      where: { id },
    })

    if (!analysis || analysis.userId !== session.user.id) {
      return Response.json({ error: "Not found" }, { status: 404 })
    }

    const statement = (analysis.statement ?? "") + " " + (analysis.cv ?? "")
    const jobDesc = analysis.jobDescription ?? ""

    if (!statement.trim()) {
      return Response.json(
        { error: "No statement found for this analysis" },
        { status: 400 }
      )
    }

    const result = await callGeminiJSON(
      buildKeywordPrompt(statement, jobDesc, NHS_KEYWORD_TAXONOMY),
      3000
    )

    const enrichedKeywords = (result.keywords ?? []).map((k: any) => {
      const meta = NHS_KEYWORD_TAXONOMY.find(
        t => t.keyword.toLowerCase() === k.keyword.toLowerCase()
      )

      return {
        ...k,
        weight: meta?.weight ?? 70,
        group: meta?.group ?? "General",
        definition: meta?.definition ?? "",
      }
    })

    const responseData = {
      success: true,
      overallKeywordScore: result.overallKeywordScore ?? 0,
      criticalMissing: result.criticalMissing ?? [],
      quickWins: result.quickWins ?? [],
      keywords: enrichedKeywords,
      updatedAt: new Date().toISOString(),
    }

    try {
      await db.analysis.update({
        where: { id },
        data: { keywordIntel: responseData },
      })
    } catch (e) {
      console.warn("Save skipped:", (e as any)?.message)
    }

    return Response.json(responseData)
  } catch (error: any) {
    return Response.json(
      { error: error?.message ?? "Failed" },
      { status: 500 }
    )
  }
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await auth()

    if (!session?.user?.id)
      return Response.json({ error: "Unauthorized" }, { status: 401 })

    const analysis = await db.analysis.findUnique({
      where: { id },
    })

    if (!analysis || analysis.userId !== session.user.id) {
      return Response.json({ error: "Not found" }, { status: 404 })
    }

    return Response.json({
      success: true,
      data: analysis.keywordIntel ?? null,
    })
  } catch (error: any) {
    return Response.json(
      { error: error?.message ?? "Failed" },
      { status: 500 }
    )
  }
}