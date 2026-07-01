// app/api/radar/route.ts
import { auth }               from '@/auth'
import { getEffectiveUserId } from '@/lib/effective-user'
import { getDb }              from '@/lib/db-router'

export const runtime = 'nodejs'

function daysUntil(dateStr: string): number | null {
  try {
    const diff = (new Date(dateStr).getTime() - Date.now()) / 86400000
    return Math.round(diff)
  } catch { return null }
}

function matchScore(job: any, keywords: string[]): number {
  const text = `${job.title} ${job.employer ?? ''}`.toLowerCase()
  if (!keywords.length) return 50
  const hits = keywords.filter(k => text.includes(k.toLowerCase())).length
  return Math.min(100, Math.round((hits / keywords.length) * 100) + 30)
}

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (await getEffectiveUserId()) ?? (session.user.id as string)
  const db     = await getDb(userId)

  // Build keyword profile from CV + recent analyses
  const [cvProfile, recentAnalysis] = await Promise.all([
    db.cvProfile.findFirst({ where: { userId }, orderBy: { updatedAt: 'desc' }, select: { skills: true, professionalRegistration: true } }).catch(() => null),
    db.analysis.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' }, select: { jobTitle: true } }).catch(() => null),
  ])

  const skillKeywords: string[] = []
  const skillsField = (cvProfile as any)?.skills
  if (Array.isArray(skillsField)) {
    for (const group of skillsField) {
      if (Array.isArray(group?.items)) skillKeywords.push(...group.items)
      else if (typeof group?.items === 'string') skillKeywords.push(group.items)
    }
  }

  const searchKeyword = recentAnalysis?.jobTitle?.split(' ').slice(0, 2).join(' ') || skillKeywords[0] || 'nurse'

  // Pull live NHS jobs
  let jobs: any[] = []
  try {
    const baseUrl = new URL(req.url).origin
    const jobsRes = await fetch(`${baseUrl}/api/jobs/search?keyword=${encodeURIComponent(searchKeyword)}`, {
      headers: { cookie: req.headers.get('cookie') ?? '' },
    })
    const jobsData = await jobsRes.json()
    jobs = jobsData.jobs ?? []
  } catch { jobs = [] }

  const enriched = jobs.slice(0, 20).map((j: any) => {
    const days  = j.closingDate ? daysUntil(j.closingDate) : null
    const match = matchScore(j, skillKeywords)
    return {
      ...j,
      matchScore:   match,
      closingSoon:  days !== null && days >= 0 && days <= 5,
      daysToClose:  days,
      isNew:        j.datePosted ? daysUntil(j.datePosted) !== null && Math.abs(daysUntil(j.datePosted)!) <= 2 : false,
    }
  })

  const highMatch    = enriched.filter(j => j.matchScore >= 70).sort((a,b) => b.matchScore - a.matchScore)
  const closingSoon  = enriched.filter(j => j.closingSoon)
  const newToday     = enriched.filter(j => j.isNew)
  const recommended  = enriched.slice().sort((a,b) => b.matchScore - a.matchScore).slice(0, 5)

  return Response.json({
    success: true,
    generatedAt: new Date().toISOString(),
    searchKeyword,
    summary: {
      totalScanned: enriched.length,
      highMatchCount: highMatch.length,
      closingSoonCount: closingSoon.length,
      newTodayCount: newToday.length,
    },
    highMatch:   highMatch.slice(0, 10),
    closingSoon: closingSoon.slice(0, 10),
    newToday:    newToday.slice(0, 10),
    recommended,
  })
}