// app/api/career-gps/route.ts
// MOAT 10 — NHS Career GPS™
// Takes current band, current evidence, target role.
// Returns gap map, fastest route, projected timeline, training recommendations.

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { callGeminiJSON } from "@/lib/application/ai"
// Note: if this import fails, update path to match your existing AI utility location

// Band expectations — what evidence is expected at each level
const BAND_EXPECTATIONS: Record<number, { skills: string[]; experience: string[]; qualifications: string[] }> = {
  2: {
    skills: ["Basic patient care", "Communication", "Following instructions"],
    experience: ["Care home or ward support", "Volunteering"],
    qualifications: ["GCSE level or equivalent"],
  },
  3: {
    skills: ["Venepuncture", "Specimen handling", "ECG", "Vitals monitoring", "TRAK"],
    experience: ["6+ months NHS or clinical setting", "Phlebotomy practice"],
    qualifications: ["NVQ Level 2/3 Health & Social Care or equivalent"],
  },
  4: {
    skills: ["Cannulation", "Advanced venepuncture", "Clinical audit", "Mentoring junior staff", "QA"],
    experience: ["2+ years NHS", "Supervisory experience", "Protocol development"],
    qualifications: ["NVQ Level 3 or BTEC", "Phlebotomy qualification"],
  },
  5: {
    skills: ["MDT leadership", "Clinical governance", "Service improvement", "Research", "Datix"],
    experience: ["3+ years NHS", "Band 4 or equivalent", "Project experience"],
    qualifications: ["Degree or equivalent", "Professional registration (NMC/HCPC)"],
  },
  6: {
    skills: ["Clinical leadership", "Budget management", "Policy development", "Supervision", "Audit lead"],
    experience: ["5+ years NHS", "Band 5 qualified", "Leadership role"],
    qualifications: ["Degree + post-registration qualification", "Specialist training"],
  },
  7: {
    skills: ["Strategic planning", "Service development", "Staff management", "Research leadership", "Business cases"],
    experience: ["7+ years NHS", "Senior clinical/management role"],
    qualifications: ["Masters level or equivalent", "Specialist registration"],
  },
  8: {
    skills: ["Executive leadership", "Organisational transformation", "Policy influence", "Budget ownership"],
    experience: ["10+ years NHS", "Director or Head of Service level"],
    qualifications: ["Masters/PhD", "Senior leadership programme"],
  },
}

function buildCareerGpsPrompt(input: {
  currentBand: number
  targetBand: number
  currentEvidence: string
  targetRole: string
  yearsExperience: number
}): string {
  const current = BAND_EXPECTATIONS[input.currentBand] ?? BAND_EXPECTATIONS[3]
  const target  = BAND_EXPECTATIONS[input.targetBand] ?? BAND_EXPECTATIONS[5]

  return `
You are an NHS career development advisor. Create a personalised Career GPS for this candidate.

CURRENT POSITION:
- Band: ${input.currentBand}
- Years experience: ${input.yearsExperience}
- Current evidence/skills: ${input.currentEvidence}

TARGET:
- Band: ${input.targetBand}
- Target role: ${input.targetRole}

WHAT BAND ${input.targetBand} EXPECTS:
Skills: ${target.skills.join(", ")}
Experience: ${target.experience.join(", ")}
Qualifications: ${target.qualifications.join(", ")}

WHAT THEY CURRENTLY HAVE (Band ${input.currentBand}):
Skills: ${current.skills.join(", ")}

Analyse the gap and create a concrete career GPS with:
1. gap_analysis: exactly what is missing from current → target
2. fastest_route: ordered steps (shortest path, not comprehensive)
3. projected_timeline: realistic months per step
4. training_recommendations: specific courses/qualifications with approximate cost/time
5. quick_wins: things they can do in the next 30 days
6. application_readiness: % ready to apply for Band ${input.targetBand} now

Be specific and practical. Reference real NHS training pathways (Skills for Health, e-learning for health, local NHS Trust training).

Respond ONLY with JSON:
{
  "currentBandScore": 68,
  "applicationReadiness": 42,
  "gapSummary": "2-sentence summary",
  "gapAnalysis": {
    "missingSkills": ["skill1", "skill2"],
    "missingExperience": ["exp1", "exp2"],
    "missingQualifications": ["qual1"],
    "strengths": ["strength1", "strength2"]
  },
  "fastestRoute": [
    {
      "step": 1,
      "action": "Complete phlebotomy training",
      "why": "Required for Band 3+ clinical roles",
      "timeMonths": 1,
      "cost": "Free via NHS Trust or £150-400 private",
      "provider": "Skills for Health / local NHS Trust",
      "priority": "critical"
    }
  ],
  "projectedTimeline": {
    "readyForBand": ${input.targetBand},
    "totalMonths": 6,
    "milestones": [
      { "month": 1, "achievement": "Venepuncture competency signed off" },
      { "month": 3, "achievement": "ECG and specimen handling completed" },
      { "month": 6, "achievement": "Ready to apply for Band ${input.targetBand}" }
    ]
  },
  "trainingRecommendations": [
    {
      "name": "Phlebotomy Certificate",
      "provider": "Skills for Health",
      "duration": "2-4 weeks",
      "cost": "Free (NHS) or £200-400 (private)",
      "url": "https://www.skillsforhealth.org.uk",
      "bandImpact": "Essential for Band 3"
    }
  ],
  "quickWins": [
    "Ask your line manager for a venepuncture competency assessment date",
    "Complete Moving & Handling e-learning on ESR today (free, 1 hour)"
  ]
}
`.trim()
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const body = await req.json()
    const { currentBand, targetBand, currentEvidence, targetRole, yearsExperience } = body

    if (!currentBand || !targetBand) {
      return Response.json({ error: "currentBand and targetBand required" }, { status: 400 })
    }

    const result = await callGeminiJSON(
      buildCareerGpsPrompt({ currentBand, targetBand, currentEvidence: currentEvidence ?? "", targetRole: targetRole ?? `Band ${targetBand} NHS role`, yearsExperience: yearsExperience ?? 0 }),
      4000
    )

    // Note: careerGpsData persistence requires schema migration
    // Add careerGpsData Json? to User model and run prisma db push to enable

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
    // Career GPS data is not yet persisted — returns null until schema migration adds careerGpsData field
    return Response.json({ success: true, data: null })
  } catch (error: any) {
    return Response.json({ error: error?.message ?? "Failed" }, { status: 500 })
  }
}