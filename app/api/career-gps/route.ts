// app/api/career-gps/route.ts

import { getDb }          from "@/lib/db-router"
import { auth }           from "@/auth"
import { callGeminiJSON } from "@/lib/application/ai"

export const runtime = 'nodejs'

const PARTNER_PROVIDER = {
  name: "Phlebotomy Courses & Training",
  url:  "https://phlebotomycourses-training.com/",
  covers: ["phlebotomy","venepuncture","ecg","electrocardiogram","cannulation","blood collection","specimen handling"],
}

function isPartnerRelevant(text: string): boolean {
  const lower = text.toLowerCase()
  return PARTNER_PROVIDER.covers.some(kw => lower.includes(kw))
}

const BAND_EXPECTATIONS: Record<number, { skills: string[]; experience: string[]; qualifications: string[] }> = {
  2: { skills: ["Basic patient care","Communication","Following instructions"],      experience: ["Care home or ward support","Volunteering"],                                   qualifications: ["GCSE level or equivalent"] },
  3: { skills: ["Venepuncture","Specimen handling","ECG","Vitals monitoring","TRAK"],experience: ["6+ months NHS or clinical setting","Phlebotomy practice"],                   qualifications: ["NVQ Level 2/3 Health & Social Care or equivalent"] },
  4: { skills: ["Cannulation","Advanced venepuncture","Clinical audit","Mentoring","QA"], experience: ["2+ years NHS","Supervisory experience"],                               qualifications: ["NVQ Level 3 or BTEC","Phlebotomy qualification"] },
  5: { skills: ["MDT leadership","Clinical governance","Service improvement","Research","Datix"], experience: ["3+ years NHS","Band 4 or equivalent"],                         qualifications: ["Degree or equivalent","Professional registration (NMC/HCPC)"] },
  6: { skills: ["Clinical leadership","Budget management","Policy development","Supervision"], experience: ["5+ years NHS","Band 5 qualified"],                                qualifications: ["Degree + post-registration qualification"] },
  7: { skills: ["Strategic planning","Service development","Staff management","Research leadership"], experience: ["7+ years NHS","Senior clinical/management role"],           qualifications: ["Masters level or equivalent"] },
  8: { skills: ["Executive leadership","Organisational transformation","Policy influence"],   experience: ["10+ years NHS","Director or Head of Service level"],               qualifications: ["Masters/PhD","Senior leadership programme"] },
}

function buildCareerGpsPrompt(input: { currentBand: number; targetBand: number; currentEvidence: string; targetRole: string; yearsExperience: number }): string {
  const current = BAND_EXPECTATIONS[input.currentBand] ?? BAND_EXPECTATIONS[3]
  const target  = BAND_EXPECTATIONS[input.targetBand]  ?? BAND_EXPECTATIONS[5]
  return `You are an NHS career development advisor. Create a personalised Career GPS.
CURRENT: Band ${input.currentBand}, ${input.yearsExperience} years, evidence: ${input.currentEvidence}
TARGET: Band ${input.targetBand}, role: ${input.targetRole}
BAND ${input.targetBand} EXPECTS: Skills: ${target.skills.join(", ")} | Experience: ${target.experience.join(", ")} | Quals: ${target.qualifications.join(", ")}
CURRENTLY HAS: ${current.skills.join(", ")}
PRIORITY PROVIDER for phlebotomy/ECG/venepuncture/cannulation: "${PARTNER_PROVIDER.name}" (${PARTNER_PROVIDER.url})
Return JSON with: currentBandScore, applicationReadiness, gapSummary, gapAnalysis, fastestRoute, projectedTimeline, trainingRecommendations, quickWins`.trim()
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 })
    const db = await getDb(session.user.id)

    const { currentBand, targetBand, currentEvidence, targetRole, yearsExperience } = await req.json()
    if (!currentBand || !targetBand) return Response.json({ error: "currentBand and targetBand required" }, { status: 400 })

    const result = await callGeminiJSON(buildCareerGpsPrompt({ currentBand, targetBand, currentEvidence: currentEvidence ?? "", targetRole: targetRole ?? `Band ${targetBand} NHS role`, yearsExperience: yearsExperience ?? 0 }), 4000)

    if (Array.isArray(result.fastestRoute)) {
      result.fastestRoute = result.fastestRoute.map((step: any) =>
        isPartnerRelevant(`${step.action} ${step.why}`)
          ? { ...step, provider: PARTNER_PROVIDER.name, providerUrl: PARTNER_PROVIDER.url }
          : step
      )
    }
    if (Array.isArray(result.trainingRecommendations)) {
      const hasPartner = result.trainingRecommendations.some((t: any) => isPartnerRelevant(`${t.name} ${t.bandImpact}`))
      result.trainingRecommendations = result.trainingRecommendations.map((t: any) =>
        isPartnerRelevant(`${t.name} ${t.bandImpact}`) ? { ...t, provider: PARTNER_PROVIDER.name, url: PARTNER_PROVIDER.url } : t
      )
      if (!hasPartner && isPartnerRelevant(JSON.stringify(result.gapAnalysis ?? {}).toLowerCase())) {
        result.trainingRecommendations.unshift({ name: "Phlebotomy & ECG Training", provider: PARTNER_PROVIDER.name, duration: "1-2 days", cost: "From £99", url: PARTNER_PROVIDER.url, bandImpact: `Closes gap for Band ${targetBand}` })
      }
    }

    const toSave = { ...result, currentBand, targetBand, targetRole, currentEvidence, yearsExperience, updatedAt: new Date().toISOString() }
    try {
      await db.user.update({ where: { id: session.user.id }, data: { careerGpsData: toSave } })
    } catch (saveErr) {
      console.warn("[Career GPS] Save skipped:", (saveErr as any)?.message)
    }

    return Response.json({ success: true, ...result, currentBand, targetBand, targetRole })
  } catch (error: any) {
    console.error("CAREER_GPS_ERROR:", error)
    return Response.json({ error: error?.message ?? "Failed" }, { status: 500 })
  }
}

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 })
    const db = await getDb(session.user.id)  // ← was missing in GET
    try {
      const user = await db.user.findUnique({ where: { id: session.user.id } })
      return Response.json({ success: true, data: (user as any)?.careerGpsData ?? null })
    } catch {
      return Response.json({ success: true, data: null })
    }
  } catch (error: any) {
    return Response.json({ error: error?.message ?? "Failed" }, { status: 500 })
  }
}