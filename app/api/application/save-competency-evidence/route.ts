// app/api/application/save-competency-evidence/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { auth }  from '@/auth'
import { getDb } from '@/lib/db-router'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const db = await getDb(session.user.id)

    const { applicationId, competencyId, competencyLabel, criteriaIds, criteriaTexts, evidence, noExperience } = await req.json()
    if (!applicationId || !competencyId) {
      return NextResponse.json({ error: 'applicationId and competencyId required' }, { status: 400 })
    }

    const app = await db.application.findUnique({ where: { id: applicationId } })
    if (!app || app.userId !== session.user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const parsedSpec         = (app.parsedSpec as any) ?? {}
    const competencyEvidence = parsedSpec.competencyEvidence ?? {}
    competencyEvidence[competencyId] = {
      label:         competencyLabel,
      criteriaIds:   criteriaIds   ?? [],
      criteriaTexts: criteriaTexts ?? [],
      evidence:      evidence      ?? null,
      noExperience:  noExperience  ?? false,
      savedAt:       new Date().toISOString(),
    }

    await db.application.update({
      where: { id: applicationId },
      data: {
        parsedSpec:   { ...parsedSpec, competencyEvidence },
        completeness: Math.min(100, Math.round((Object.keys(competencyEvidence).length / Math.max(1, parsedSpec.expectedCompetencies ?? 12)) * 100)),
      },
    })

    if (criteriaIds?.length && evidence) {
      await db.applicationCriterion.updateMany({
        where: { applicationId, id: { in: criteriaIds } },
        data:  { situation: evidence },
      })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[save-competency-evidence]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
