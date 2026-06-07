import { auth }                 from '@/auth'
import { prisma }               from '@/lib/prisma'
import { notFound, redirect }   from 'next/navigation'
import { getUserTier }          from '@/lib/billing/tier'
import { ReportDownloadClient } from './ReportClient'

type Params = { params: Promise<{ id: string }> }

export default async function ReportPage({ params }: Params) {
  const { id }  = await params
  const session = await auth()
  if (!session?.user?.id) notFound()

  const userTier = await getUserTier(session.user.id as string)
  if (userTier !== 'pro') redirect('/upgrade')

  const record = await prisma.analysis.findUnique({ where: { id } })
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