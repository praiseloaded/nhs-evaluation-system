// app/api/momentum/route.ts
// MOAT 8 â€” Application Momentum Scoreâ„¢
//
// Calculates velocity of applications over time, tracks outcomes,
// identifies trends (increasing / stable / declining), and explains why.

import { getDb } from "@/lib/db-router"
import { auth }  from "@/auth"

type Outcome = 'pending' | 'shortlisted' | 'interview' | 'offer' | 'rejected' | 'withdrawn'

function getWindow(days: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d
}

function countInWindow(apps: any[], field: string, from: Date): number {
  return apps.filter((a: any) => a[field] && new Date(a[field]) >= from).length
}

function successRate(apps: any[]): number {
  const decided = apps.filter((a: any) => a.outcome && a.outcome !== 'pending' && a.outcome !== 'withdrawn')
  if (decided.length === 0) return 0
  const positive = decided.filter(a => ['shortlisted', 'interview', 'offer'].includes(a.outcome))
  return Math.round((positive.length / decided.length) * 100)
}

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 })
    const db = await getDb(session.user.id)

    const apps = await db.application.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        jobTitle: true,
        employer: true,
        status: true,
        outcome: true,
        outcomeDate: true,
        createdAt: true,
        submittedAt: true,
        interviewDate: true,
      },
    })

    const now     = new Date()
    const w30     = getWindow(30)
    const w60     = getWindow(60)
    const w90     = getWindow(90)

    // Count submitted applications per window
    const submitted30 = countInWindow(apps, 'submittedAt', w30)
    const submitted60 = countInWindow(apps, 'submittedAt', w60) - submitted30
    const submitted90 = countInWindow(apps, 'submittedAt', w90) - submitted60 - submitted30

    // Outcomes
    const interviews   = apps.filter((a: any) => a.outcome === 'interview' || a.status === 'interview')
    const shortlisted  = apps.filter((a: any) => a.outcome === 'shortlisted')
    const offers       = apps.filter((a: any) => a.outcome === 'offer')
    const rejected     = apps.filter((a: any) => a.outcome === 'rejected')

    const total       = apps.length
    const totalSubmitted = apps.filter((a: any) => a.submittedAt || ['submitted','interview','offer','rejected'].includes(a.status ?? '')).length
    const successRatePct = successRate(apps)

    // Trend â€” compare last 30 days to previous 30 days
    let trend: 'increasing' | 'stable' | 'declining' = 'stable'
    let trendReason = ''

    if (submitted30 > submitted60 + 1) {
      trend = 'increasing'
      trendReason = `You submitted ${submitted30} application${submitted30 !== 1 ? 's' : ''} in the last 30 days â€” more than the previous period (${submitted60}).`
    } else if (submitted30 < submitted60 - 1) {
      trend = 'declining'
      trendReason = `Submissions dropped from ${submitted60} in the previous 30 days to ${submitted30} in the last 30 days.`
    } else {
      trendReason = `Submission rate is steady at around ${submitted30}â€“${submitted60} applications per 30 days.`
    }

    // Interview rate
    const interviewRate = totalSubmitted > 0
      ? Math.round((interviews.length / totalSubmitted) * 100)
      : 0

    // â”€â”€ Momentum Score â€” composite 0-100 â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // Factors:
    //   Outcome quality  40% â€” best outcome achieved (offer=100, interview=80, shortlisted=60, pending=30, rejected=10)
    //   Interview rate   30% â€” interviews / submitted (capped at 100%)
    //   Submission rate  30% â€” rolling 30-day velocity (2 apps/month = 100%)

    // Best outcome achieved across all applications
    const bestOutcome = (() => {
      if (offers.length > 0)      return 100
      if (interviews.length > 0)  return 80
      if (shortlisted.length > 0) return 60
      if (rejected.length > 0)    return 10  // submitted and got feedback â€” at least active
      if (totalSubmitted > 0)     return 30  // submitted but pending
      return 0
    })()

    // Submission rate â€” 2 per month = full score, smoothed so old apps still count
    const recentSubmitted = Math.max(submitted30, Math.round((totalSubmitted / Math.max(1, Math.ceil((Date.now() - (apps[apps.length - 1]?.createdAt ? new Date(apps[apps.length - 1].createdAt).getTime() : Date.now())) / (30 * 24 * 60 * 60 * 1000))) ) ))
    const submissionScore = Math.min(100, recentSubmitted * 50)  // 2 apps in 30 days = 100%

    const interviewScore  = Math.min(100, interviewRate * 2)     // 50% interview rate = 100%

    const momentumScore = Math.round(
      bestOutcome    * 0.40 +
      interviewScore * 0.30 +
      submissionScore * 0.30
    )

    // Rolling monthly submissions (last 6 months)
    const monthlyCounts = Array.from({ length: 6 }, (_, i) => {
      const from = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
      const to   = new Date(now.getFullYear(), now.getMonth() - (5 - i) + 1, 0)
      const label = from.toLocaleDateString('en-GB', { month: 'short' })
      const count = apps.filter((a: any) => {
        const d = a.submittedAt ? new Date(a.submittedAt) : null
        return d && d >= from && d <= to
      }).length
      return { month: label, count }
    })

    // Recent applications (last 5)
    const recent = apps.slice(0, 5).map(a => ({
      id: a.id,
      jobTitle: a.jobTitle,
      employer: a.employer,
      status: a.status,
      outcome: a.outcome,
      submittedAt: a.submittedAt,
    }))

    // Coaching insight
    let insight = ''
    if (total === 0) {
      insight = 'No applications yet. Start by creating your first application in the Statement Builder.'
    } else if (totalSubmitted === 0) {
      insight = `You have ${total} application${total !== 1 ? 's' : ''} in progress but none submitted yet. Complete and submit them to start building momentum.`
    } else if (offers.length > 0) {
      insight = `Congratulations â€” you have received an offer! Update the outcome below to keep your momentum record accurate.`
    } else if (interviews.length > 0) {
      insight = `You are getting interviews â€” great signal. Use the Interview Simulatorâ„¢ to prepare and convert them into offers.`
    } else if (shortlisted.length > 0) {
      insight = `You are getting shortlisted â€” your applications are strong enough to pass the paper sift. Focus on interview preparation to convert shortlists into interviews.`
    } else if (interviewRate === 0 && totalSubmitted >= 3) {
      insight = 'You have submitted applications but received no interviews yet. Try running the Keyword Intelligenceâ„¢ and Evidence Gapsâ„¢ analysis on your next application before submitting.'
    } else if (trend === 'declining') {
      insight = 'Application rate is slowing down. Consistent applications â€” even 1-2 per week â€” significantly improve your chances of finding the right role.'
    } else {
      insight = `You have submitted ${totalSubmitted} application${totalSubmitted !== 1 ? 's' : ''}. Update the outcome on each one below so your momentum score reflects your real results.`
    }

    return Response.json({
      success: true,
      momentumScore,
      trend,
      trendReason,
      insight,
      scoreBreakdown: {
        outcomeQuality:  Math.round(bestOutcome    * 0.40),
        interviewFactor: Math.round(interviewScore  * 0.30),
        velocityFactor:  Math.round(submissionScore * 0.30),
        bestOutcome,
      },
      stats: {
        total,
        totalSubmitted,
        interviews:    interviews.length,
        shortlisted:   shortlisted.length,
        offers:        offers.length,
        rejected:      rejected.length,
        interviewRate,
        successRate:   successRatePct,
      },
      velocity: {
        last30:     submitted30,
        previous30: submitted60,
        previous60: submitted90,
      },
      monthlyCounts,
      recent,
    })
  } catch (error: any) {
    console.error("MOMENTUM_ERROR:", error)
    return Response.json({ error: error?.message ?? "Failed" }, { status: 500 })
  }
}

// Update outcome on a specific application
export async function PATCH(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const { id, outcome, outcomeNotes } = await req.json()
    if (!id || !outcome) return Response.json({ error: "id and outcome required" }, { status: 400 })
    const db = await getDb(session.user.id)

    const app = await db.application.findUnique({ where: { id } })
    if (!app || app.userId !== session.user.id) {
      return Response.json({ error: "Not found" }, { status: 404 })
    }

    const updated = await db.application.update({
      where: { id },
      data: { outcome, outcomeDate: new Date(), outcomeNotes: outcomeNotes ?? null } as any,
    })
    return Response.json({ success: true, application: updated })
  } catch (error: any) {
    return Response.json({ error: error?.message ?? "Failed" }, { status: 500 })
  }
}
