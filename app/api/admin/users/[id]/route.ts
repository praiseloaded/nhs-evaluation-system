// app/api/admin/users/[id]/route.ts
// Same as users-id-route-v4.ts, with createNotification() calls added
// to the PATCH handler so users are notified of tier changes and
// suspend/unsuspend actions on their account.

import { prisma } from "@/lib/prisma"
import { withAdminAuth, logAdminAction } from "@/lib/admin-auth"
import { createNotification } from "@/lib/notifications"

export const runtime = 'nodejs'

export const GET = withAdminAuth(async (req: Request, admin, ctx: any) => {
  const { id } = await ctx.params

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true, name: true, email: true, image: true, tier: true, role: true,
      suspended: true, suspendedAt: true, suspendedReason: true,
      analysisUsed: true, analysisLimit: true, careerGpsData: true,
      stripeCustomerId: true, stripeSubscriptionId: true,
      createdAt: true, updatedAt: true,
      accounts: { select: { provider: true } },
    },
  })
  if (!user) return Response.json({ error: "Not found" }, { status: 404 })

  const [
    analysesRaw, applications, cvProfiles, auditLog,
    evidenceEntries, certificates, competencies, interviewVaultEntries, referenceEntries,
    interviews,
  ] = await Promise.all([
    prisma.analysis.findMany({
      where: { userId: id },
      orderBy: { createdAt: 'desc' },
      select: { id: true, jobTitle: true, createdAt: true, sourceUrl: true, result: true, interviewProbability: true },
    }),
    prisma.application.findMany({
      where: { userId: id },
      orderBy: { createdAt: 'desc' },
      select: { id: true, jobTitle: true, employer: true, status: true, outcome: true, submittedAt: true, createdAt: true },
    }).catch(() => []),
    prisma.cvProfile.findMany({
      where: { userId: id },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, title: true, template: true, fullName: true, updatedAt: true, createdAt: true },
    }).catch(() => []),
    prisma.adminAuditLog.findMany({ where: { targetId: id }, orderBy: { createdAt: 'desc' }, take: 20 }).catch(() => []),
    prisma.evidenceEntry.findMany({ where: { userId: id }, orderBy: { updatedAt: 'desc' } }).catch(() => []),
    prisma.certificate.findMany({ where: { userId: id }, orderBy: { createdAt: 'desc' } }).catch(() => []),
    prisma.competency.findMany({ where: { userId: id }, orderBy: { skillName: 'asc' } }).catch(() => []),
    prisma.interviewVaultEntry.findMany({ where: { userId: id }, orderBy: { updatedAt: 'desc' } }).catch(() => []),
    prisma.referenceEntry.findMany({ where: { userId: id }, orderBy: { createdAt: 'desc' } }).catch(() => []),
    prisma.interview.findMany({
      where: { userId: id },
      orderBy: { createdAt: 'desc' },
      select: { id: true, jobTitle: true, band: true, status: true, totalScore: true, startedAt: true, completedAt: true, createdAt: true, analysisId: true },
    }).catch(() => []),
  ])

  const analyses = analysesRaw.map(a => {
    const result = a.result as any
    const ip = a.interviewProbability as any
    return {
      id: a.id, jobTitle: a.jobTitle, createdAt: a.createdAt, sourceUrl: a.sourceUrl,
      overallScore: result?.scoredBreakdown?.overallScore ?? null,
      verdict: result?.scoredBreakdown?.verdict ?? null,
      interviewProbability: ip?.probability ?? ip?.score ?? null,
    }
  })

  const totalSubmitted = applications.filter(a => a.submittedAt || ['submitted', 'interview', 'offer', 'rejected'].includes(a.status ?? '')).length
  const interviewsWon = applications.filter(a => a.outcome === 'interview' || a.status === 'interview').length
  const offers = applications.filter(a => a.outcome === 'offer').length
  const momentum = {
    totalApplications: applications.length, totalSubmitted, interviews: interviewsWon, offers,
    interviewRate: totalSubmitted > 0 ? Math.round((interviewsWon / totalSubmitted) * 100) : 0,
  }

  const evidenceVault = {
    evidenceEntries, certificates, competencies, interviewVaultEntries, referenceEntries,
    counts: {
      evidenceEntries: evidenceEntries.length, certificates: certificates.length,
      competencies: competencies.length, interviewVaultEntries: interviewVaultEntries.length,
      referenceEntries: referenceEntries.length,
    },
  }

  return Response.json({
    success: true, user, analyses, applications, cvProfiles, auditLog, momentum,
    evidenceVault, careerGps: user.careerGpsData ?? null, interviews,
  })
})

export const PATCH = withAdminAuth(async (req: Request, admin, ctx: any) => {
  const { id } = await ctx.params
  const body = await req.json()

  const before = await prisma.user.findUnique({
    where: { id },
    select: { tier: true, role: true, suspended: true, suspendedReason: true, analysisLimit: true },
  })
  if (!before) return Response.json({ error: "Not found" }, { status: 404 })

  const data: Record<string, any> = {}
  let action = 'edit_record'

  if ('tier' in body) { data.tier = body.tier; action = 'tier_change' }
  if ('role' in body) { data.role = body.role; action = 'role_change' }
  if ('analysisLimit' in body) data.analysisLimit = body.analysisLimit
  if ('suspended' in body) {
    data.suspended = body.suspended
    data.suspendedAt = body.suspended ? new Date() : null
    data.suspendedReason = body.suspended ? (body.suspendedReason ?? null) : null
    action = body.suspended ? 'suspend' : 'unsuspend'
  }

  const updated = await prisma.user.update({ where: { id }, data })
  const target = await prisma.user.findUnique({ where: { id }, select: { email: true } })

  await logAdminAction({
    adminId: admin.id, adminEmail: admin.email, action,
    targetType: 'user', targetId: id, targetEmail: target?.email ?? undefined,
    before, after: data, notes: body.notes,
  })

  // Fire user-facing notifications for changes that affect their experience.
  if ('tier' in body && body.tier !== before.tier) {
    await createNotification({
      userId: id,
      type: 'account_tier_changed',
      title: `Your plan changed to ${body.tier}`,
      body: `Your account tier was updated from ${before.tier} to ${body.tier}.`,
      linkUrl: '/dashboard/settings',
    })
  }
  if ('suspended' in body) {
    await createNotification({
      userId: id,
      type: body.suspended ? 'account_suspended' : 'account_unsuspended',
      title: body.suspended ? 'Your account has been suspended' : 'Your account has been reinstated',
      body: body.suspended ? (body.suspendedReason ?? undefined) : undefined,
    })
  }

  return Response.json({ success: true, user: updated })
})

export const DELETE = withAdminAuth(async (req: Request, admin, ctx: any) => {
  const { id } = await ctx.params

  const target = await prisma.user.findUnique({ where: { id } })
  if (!target) return Response.json({ error: "Not found" }, { status: 404 })

  await logAdminAction({
    adminId: admin.id, adminEmail: admin.email, action: 'delete_user',
    targetType: 'user', targetId: id, targetEmail: target.email ?? undefined,
    before: target, notes: 'Account deleted by admin',
  })

  await prisma.user.delete({ where: { id } })
  return Response.json({ success: true })
})