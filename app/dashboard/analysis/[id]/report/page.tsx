import { auth }                 from '@/auth'
import { prisma }               from '@/lib/prisma'
import { getDb }                from '@/lib/db-router'
import { notFound, redirect }   from 'next/navigation'
import { getUserTier }          from '@/lib/billing/tier'
import { ReportDownloadClient } from './ReportClient'

type Params = { params: Promise<{ id: string }> }

export default async function ReportPage({ params }: Params) {
  const { id }  = await params
  const session = await auth()
  if (!session?.user?.id) notFound()

  const userTier = await getUserTier(session.user.id as string)
  // Elite also gets full report access
  if (!['pro', 'elite'].includes(userTier)) redirect('/upgrade')

  const db     = await getDb(session.user.id as string)
  const record = await db.analysis.findUnique({ where: { id } })
  if (!record || record.userId !== session.user.id) notFound()

  const result = (record.result as any) ?? {}

  return (
    <ReportDownloadClient
      analysisId={id}
      jobTitle={record.jobTitle ?? 'Analysis'}
      analysis={{
        id,
        jobTitle:          record.jobTitle          ?? '',
        jobDescription:    record.jobDescription    ?? '',
        essentialCriteria: record.essentialCriteria ?? '',
        desirableCriteria: record.desirableCriteria ?? '',
        personSpec:        record.personSpec        ?? '',
        createdAt:         record.createdAt.toISOString(),
        band:              (record as any).band     ?? null,
        location:          (record as any).location ?? null,
      }}
      result={result}
    />
  )
}