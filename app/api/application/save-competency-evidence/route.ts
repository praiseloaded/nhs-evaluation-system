// app/api/application/save-competency-evidence/route.ts
// Stores competency-level evidence against the application.
// Called once per competency cluster from the Step 4 wizard.
//
// Storage strategy: we write the evidence into the Application's parsedSpec
// JSON under a `competencyEvidence` key, AND we update the raw evidence on
// every Criterion in the cluster so the existing generate-statement pipeline
// can still read individual criterion rows if needed.

import { NextRequest, NextResponse } from 'next/server'
import { auth }   from '@/auth'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const {
      applicationId,
      competencyId,
      competencyLabel,
      criteriaIds,
      criteriaTexts,   // criterion text strings for reliable cross-session matching
      evidence,
      noExperience,
    } = await req.json()

    if (!applicationId || !competencyId) {
      return NextResponse.json({ error: 'applicationId and competencyId required' }, { status: 400 })
    }

    // Verify ownership
    const app = await db.application.findUnique({ where: { id: applicationId } })
    if (!app || app.userId !== session.user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const parsedSpec = (app.parsedSpec as any) ?? {}

    // Merge this competency into the competencyEvidence map
    const competencyEvidence = parsedSpec.competencyEvidence ?? {}
    competencyEvidence[competencyId] = {
      label:         competencyLabel,
      criteriaIds:   criteriaIds  ?? [],
      criteriaTexts: criteriaTexts ?? [],  // stored for text-based matching in MissingEvidenceReport
      evidence:      evidence ?? null,
      noExperience:  noExperience ?? false,
      savedAt:       new Date().toISOString(),
    }

    // Persist back to parsedSpec
    await db.application.update({
      where: { id: applicationId },
      data:  {
        parsedSpec: { ...parsedSpec, competencyEvidence },
        // bump completeness — each saved competency counts as progress
        completeness: Math.min(
          100,
          Math.round(
            (Object.keys(competencyEvidence).length /
              Math.max(1, parsedSpec.expectedCompetencies ?? 12)) * 100
          )
        ),
      },
    })

    // Also write evidence text against each Criterion in the cluster
    // so the existing scoring pipeline still has data to work with
    if (criteriaIds?.length && evidence) {
      await db.applicationCriterion.updateMany({
        where: {
          applicationId,
          id: { in: criteriaIds },
        },
        data: {
          // Store the competency evidence in the situation field so it flows
          // into generate-statement as raw evidence
          situation:    evidence,
          noExperience: noExperience ?? false,
        },
      })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[save-competency-evidence]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}