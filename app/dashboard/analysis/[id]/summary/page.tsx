// app/dashboard/analysis/[id]/summary/page.tsx
import { auth }       from '@/auth'
import { prisma }     from '@/lib/prisma'
import { notFound }   from 'next/navigation'
import { getUserTier } from '@/lib/billing/tier'
import { sanitizeAnalysisForTier } from '@/lib/billing/sanitize-analysis'
import { SummaryClient } from './SummaryClient'

type Params = { params: Promise<{ id: string }> }

export default async function SummaryPage({ params }: Params) {
  const { id }  = await params
  const session = await auth()
  if (!session?.user?.id) notFound()

  const record = await prisma.analysis.findUnique({ where: { id } })
  if (!record || record.userId !== session.user.id) notFound()

  const userTier = await getUserTier(session.user.id as string)
  // Fixed: include 'elite' — previously only 'pro' was treated as paid
  const isPro    = ['pro', 'elite'].includes(userTier)
  const raw      = (record.result as any) ?? {}
  const result   = sanitizeAnalysisForTier(raw, isPro ? 'pro' : 'free')

  return (
    <SummaryClient
      analysis={{
        id:        record.id,
        jobTitle:  record.jobTitle  ?? '',
        createdAt: record.createdAt.toISOString(),
        band:      (record as any).band     ?? null,
        location:  (record as any).location ?? null,
      }}
      result={result}
      isPro={isPro}
    />
  )
}