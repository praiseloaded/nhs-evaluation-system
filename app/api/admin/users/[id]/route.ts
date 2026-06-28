// app/api/admin/users/[id]/route.ts
// Checks BOTH databases for the user, fetches all data from the correct shard.

import { prisma }        from '@/lib/prisma'
import { prisma2 }       from '@/lib/db-router'
import { withAdminAuth } from '@/lib/admin-auth'

export const runtime = 'nodejs'

// ── Find which shard the user is on ──────────────────────────────────────────

async function resolveDb(userId: string) {
  const inPrimary = await prisma.user.findUnique({
    where:  { id: userId },
    select: { id: true },
  }).catch(() => null)

  return { db: inPrimary ? prisma : prisma2, shard: inPrimary ? 'primary' : 'secondary' }
}

// ── GET: full user profile + everything they have done ────────────────────────

export const GET = withAdminAuth(async (_req: Request, _admin: any, ctx: any) => {
  try {
    const { id }      = await ctx.params
    const { db, shard } = await resolveDb(id)

    // User + accounts
    const user = await db.user.findUnique({
      where:   { id },
      include: {
        accounts: { select: { provider: true } },
        _count: {
          select: {
            analyses: true, applications: true,
            interviews: true, cvProfiles: true,
          },
        },
      },
    })
    if (!user) return Response.json({ error: 'User not found' }, { status: 404 })

    // ── Fetch ALL collections from BOTH databases ────────────────────────────
    // Data may be in either shard depending on when it was created.
    // Always merge both to ensure nothing is missed.

    function mergeById<T extends { id: string }>(a: any, b: any): T[] {
      const arrA = Array.isArray(a) ? a : []
      const arrB = Array.isArray(b) ? b : []
      const seen = new Set<string>()
      return [...arrA, ...arrB].filter(item => item?.id && (seen.has(item.id) ? false : (seen.add(item.id), true)))
    }

    const [
      analyses1,       analyses2,
      apps1,           apps2,
      interviews1,     interviews2,
      cvProfiles1,     cvProfiles2,
      evidence1,       evidence2,
      certs1,          certs2,
      comps1,          comps2,
      ivault1,         ivault2,
      refs1,           refs2,
      abTests1,        abTests2,
      criteria1,       criteria2,
      threads1,        threads2,
    ] = await Promise.all([
      prisma.analysis.findMany({ where: { userId: id }, orderBy: { createdAt: 'desc' } }).catch(() => []),
      prisma2.analysis.findMany({ where: { userId: id }, orderBy: { createdAt: 'desc' } }).catch(() => []),
      prisma.application.findMany({ where: { userId: id }, orderBy: { createdAt: 'desc' }, select: { id: true, jobTitle: true, employer: true, band: true, status: true, outcome: true, createdAt: true, submittedAt: true, interviewDate: true, liveScore: true, completeness: true, statementQ1: true, statementQ2: true, statementQ3: true } }).catch(() => []),
      prisma2.application.findMany({ where: { userId: id }, orderBy: { createdAt: 'desc' }, select: { id: true, jobTitle: true, employer: true, band: true, status: true, outcome: true, createdAt: true, submittedAt: true, interviewDate: true, liveScore: true, completeness: true, statementQ1: true, statementQ2: true, statementQ3: true } }).catch(() => []),
      prisma.interview.findMany({ where: { userId: id }, orderBy: { createdAt: 'desc' }, select: { id: true, jobTitle: true, band: true, status: true, totalScore: true, createdAt: true, completedAt: true, feedback: true } }).catch(() => []),
      prisma2.interview.findMany({ where: { userId: id }, orderBy: { createdAt: 'desc' }, select: { id: true, jobTitle: true, band: true, status: true, totalScore: true, createdAt: true, completedAt: true, feedback: true } }).catch(() => []),
      prisma.cvProfile.findMany({ where: { userId: id }, orderBy: { updatedAt: 'desc' }, select: { id: true, title: true, template: true, fullName: true, updatedAt: true } }).catch(() => []),
      prisma2.cvProfile.findMany({ where: { userId: id }, orderBy: { updatedAt: 'desc' }, select: { id: true, title: true, template: true, fullName: true, updatedAt: true } }).catch(() => []),
      prisma.evidenceEntry.findMany({ where: { userId: id }, orderBy: { createdAt: 'desc' } }).catch(() => []),
      prisma2.evidenceEntry.findMany({ where: { userId: id }, orderBy: { createdAt: 'desc' } }).catch(() => []),
      prisma.certificate.findMany({ where: { userId: id }, orderBy: { createdAt: 'desc' } }).catch(() => []),
      prisma2.certificate.findMany({ where: { userId: id }, orderBy: { createdAt: 'desc' } }).catch(() => []),
      prisma.competency.findMany({ where: { userId: id }, orderBy: { skillName: 'asc' } }).catch(() => []),
      prisma2.competency.findMany({ where: { userId: id }, orderBy: { skillName: 'asc' } }).catch(() => []),
      prisma.interviewVaultEntry.findMany({ where: { userId: id }, orderBy: { createdAt: 'desc' } }).catch(() => []),
      prisma2.interviewVaultEntry.findMany({ where: { userId: id }, orderBy: { createdAt: 'desc' } }).catch(() => []),
      prisma.referenceEntry.findMany({ where: { userId: id }, orderBy: { createdAt: 'desc' } }).catch(() => []),
      prisma2.referenceEntry.findMany({ where: { userId: id }, orderBy: { createdAt: 'desc' } }).catch(() => []),
      (prisma as any).aBTest.findMany({ where: { userId: id }, orderBy: { createdAt: 'desc' }, select: { id: true, jobTitle: true, scoreA: true, scoreB: true, winner: true, createdAt: true } }).catch(() => []),
      (prisma2 as any).aBTest.findMany({ where: { userId: id }, orderBy: { createdAt: 'desc' }, select: { id: true, jobTitle: true, scoreA: true, scoreB: true, winner: true, createdAt: true } }).catch(() => []),
      (prisma as any).criteriaExplorer.findMany({ where: { userId: id }, orderBy: { createdAt: 'desc' }, select: { id: true, jobTitle: true, createdAt: true } }).catch(() => []),
      (prisma2 as any).criteriaExplorer.findMany({ where: { userId: id }, orderBy: { createdAt: 'desc' }, select: { id: true, jobTitle: true, createdAt: true } }).catch(() => []),
      prisma.mentorshipThread.findMany({ where: { userId: id }, orderBy: { lastMessageAt: 'desc' }, include: { messages: { orderBy: { createdAt: 'asc' } } } }).catch(() => []),
      prisma2.mentorshipThread.findMany({ where: { userId: id }, orderBy: { lastMessageAt: 'desc' }, include: { messages: { orderBy: { createdAt: 'asc' } } } }).catch(() => []),
    ])

    const rawAnalyses         = mergeById(analyses1, analyses2)
    const applications        = mergeById(apps1, apps2)
    const interviews          = mergeById(interviews1, interviews2)
    const cvProfiles          = mergeById(cvProfiles1, cvProfiles2)
    const evidenceEntries     = mergeById(evidence1, evidence2)
    const certificates        = mergeById(certs1, certs2)
    const competencies        = mergeById(comps1, comps2)
    const interviewVaultEntries = mergeById(ivault1, ivault2)
    const referenceEntries    = mergeById(refs1, refs2)
    const abTests             = mergeById(abTests1, abTests2)
    const criteriaExplorations = mergeById(criteria1, criteria2)
    const mentorshipThreads   = mergeById(threads1, threads2)

    const analyses = rawAnalyses.map((a: any) => ({
      id:                   a.id,
      jobTitle:             a.jobTitle,
      createdAt:            a.createdAt,
      sourceUrl:            a.sourceUrl ?? null,
      overallScore:         (a.result as any)?.overallScore ?? null,
      verdict:              (a.result as any)?.verdict      ?? null,
      interviewProbability: typeof a.interviewProbability === 'object'
        ? (a.interviewProbability as any)?.probability ?? null
        : a.interviewProbability ?? null,
    }))

    // Momentum
    const submitted     = (applications as any[]).filter(a => a.submittedAt).length
    const withInterview = (applications as any[]).filter(a => a.outcome === 'interview' || a.interviewDate).length
    const withOffer     = (applications as any[]).filter(a => a.outcome === 'offer').length
    const momentum = {
      totalApplications: applications.length,
      totalSubmitted:    submitted,
      interviews:        withInterview,
      offers:            withOffer,
      interviewRate:     submitted > 0 ? Math.round((withInterview / submitted) * 100) : 0,
    }

    // Audit log — always from primary DB (that's where admin logs are stored)
    const auditLog = await prisma.adminAuditLog.findMany({
      where:   { targetId: id },
      orderBy: { createdAt: 'desc' },
      take:    20,
    }).catch(() => [])

    return Response.json({
      success: true,
      user,
      analyses,
      applications,
      interviews,
      cvProfiles,
      evidenceVault: {
        evidenceEntries,
        certificates,
        competencies,
        interviewVaultEntries,
        referenceEntries,
        counts: {
          evidenceEntries:  evidenceEntries.length,
          certificates:     certificates.length,
          competencies:     competencies.length,
          interviewVault:   interviewVaultEntries.length,
          referenceEntries: referenceEntries.length,
        },
      },
      abTests,
      criteriaExplorations,
      mentorshipThreads,
      momentum,
      careerGps: (user as any).careerGpsData ?? null,
      auditLog,
      _shard: shard,
    })
  } catch (err: any) {
    console.error('[admin/users/[id] GET]', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
})

// ── PATCH: tier / suspend / role ──────────────────────────────────────────────

export const PATCH = withAdminAuth(async (req: Request, admin: any, ctx: any) => {
  try {
    const { id }        = await ctx.params
    const body          = await req.json()
    const { db }        = await resolveDb(id)
    const user          = await db.user.findUnique({ where: { id } })
    if (!user) return Response.json({ error: 'User not found' }, { status: 404 })

    const data: any = {}
    if (body.tier !== undefined) {
      data.tier         = body.tier
      data.analysisLimit = body.tier === 'elite' ? -1 : body.tier === 'pro' ? 50 : 3
      data.analysisUsed  = 0
    }
    if (body.suspended !== undefined) {
      data.suspended      = body.suspended
      data.suspendedAt    = body.suspended ? new Date() : null
      data.suspendedReason = body.suspended ? (body.reason ?? null) : null
    }
    if (body.role !== undefined) data.role = body.role

    await db.user.update({ where: { id }, data })

    await prisma.adminAuditLog.create({
      data: {
        adminId:    admin.id,
        adminEmail: admin.email,
        action:     body.tier ? 'tier_change' : body.suspended !== undefined ? (body.suspended ? 'suspend' : 'unsuspend') : 'edit_record',
        targetType: 'user',
        targetId:   id,
        targetEmail: (user as any).email ?? undefined,
        before:     { tier: (user as any).tier, suspended: (user as any).suspended },
        after:      data,
        notes:      body.reason,
      },
    }).catch(() => {})

    return Response.json({ success: true })
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 })
  }
})

// ── DELETE: remove user ───────────────────────────────────────────────────────

export const DELETE = withAdminAuth(async (_req: Request, admin: any, ctx: any) => {
  try {
    const { id }  = await ctx.params
    const { db }  = await resolveDb(id)
    const user    = await db.user.findUnique({ where: { id }, select: { email: true } })
    if (!user) return Response.json({ error: 'User not found' }, { status: 404 })

    await db.user.delete({ where: { id } })

    await prisma.adminAuditLog.create({
      data: {
        adminId:    admin.id,
        adminEmail: admin.email,
        action:     'delete_user',
        targetType: 'user',
        targetId:   id,
        targetEmail: (user as any).email ?? undefined,
      },
    }).catch(() => {})

    return Response.json({ success: true })
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 })
  }
})