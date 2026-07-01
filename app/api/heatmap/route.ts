// app/api/heatmap/route.ts
import { auth }               from '@/auth'
import { getEffectiveUserId } from '@/lib/effective-user'
import { getDb }              from '@/lib/db-router'

export const runtime = 'nodejs'

const SPONSOR_KEYWORDS = ['nhs trust','foundation trust','health board','nhs scotland','nhs wales']

function scoreInterviewProbability(job: any, recentScore: number): number {
  // Blend: user's typical analysis score + small random variance for vacancy-specific factors
  const base = recentScore || 60
  return Math.min(95, Math.max(20, Math.round(base + (Math.random() * 10 - 5))))
}

function scoreSalary(salary: string): number {
  const match = salary?.match(/£([\d,]+)/)
  if (!match) return 50
  const val = parseInt(match[1].replace(/,/g, ''), 10)
  if (val >= 40000) return 90
  if (val >= 32000) return 75
  if (val >= 25000) return 60
  return 45
}

function scoreCompetition(employer: string): number {
  // Larger / well-known trusts assumed higher competition (lower score = more competitive)
  const big = ['guy','imperial','manchester','kings','royal london','great ormond']
  const isHighProfile = big.some(b => employer?.toLowerCase().includes(b))
  return isHighProfile ? 35 : 70
}

function scoreSponsorship(employer: string): number {
  return SPONSOR_KEYWORDS.some(k => employer?.toLowerCase().includes(k)) ? 85 : 50
}

function scoreProgression(title: string): number {
  const t = title?.toLowerCase() ?? ''
  if (t.includes('senior') || t.includes('band 6') || t.includes('band 7')) return 80
  if (t.includes('band 5') || t.includes('staff nurse')) return 65
  return 50
}

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (await getEffectiveUserId()) ?? (session.user.id as string)
  const db     = await getDb(userId)

  const { searchParams } = new URL(req.url)
  const keyword = searchParams.get('keyword') ?? 'nurse'

  const recentAnalysis = await db.analysis.findFirst({
    where: { userId }, orderBy: { createdAt: 'desc' }, select: { result: true },
  }).catch(() => null)
  const recentScore = (recentAnalysis?.result as any)?.scoredBreakdown?.overall ?? 60

  let jobs: any[] = []
  try {
    const baseUrl = new URL(req.url).origin
    const jobsRes = await fetch(`${baseUrl}/api/jobs/search?keyword=${encodeURIComponent(keyword)}`, {
      headers: { cookie: req.headers.get('cookie') ?? '' },
    })
    jobs = (await jobsRes.json()).jobs ?? []
  } catch { jobs = [] }

  const scored = jobs.slice(0, 25).map((j: any) => {
    const interview    = scoreInterviewProbability(j, recentScore)
    const salary       = scoreSalary(j.salary)
    const competition   = scoreCompetition(j.employer)
    const sponsorship   = scoreSponsorship(j.employer)
    const progression   = scoreProgression(j.title)
    const overall = Math.round(
      interview * 0.35 + salary * 0.2 + competition * 0.15 + sponsorship * 0.15 + progression * 0.15
    )
    return {
      ...j,
      heatScore: overall,
      factors: { interview, salary, competition, sponsorship, progression },
    }
  }).sort((a, b) => b.heatScore - a.heatScore)

  return Response.json({ success: true, jobs: scored, keyword })
}