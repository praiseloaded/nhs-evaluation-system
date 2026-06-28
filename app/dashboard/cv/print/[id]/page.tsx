// app/dashboard/cv/print/[id]/page.tsx
// Opens the CV in a clean print layout — user hits Ctrl+P / Cmd+P to save as PDF
// This perfectly matches the live preview since it uses the same template components

import { auth }    from '@/auth'
import { getDb }   from '@/lib/db-router'
import { redirect } from 'next/navigation'
import { CvPrintClient } from './client'

export default async function CvPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id }  = await params
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const db      = await getDb(session.user.id)
  const profile = await db.cvProfile.findUnique({ where: { id } }).catch(() => null)
  if (!profile || profile.userId !== session.user.id) redirect('/dashboard/cv-builder')

  return <CvPrintClient profile={JSON.parse(JSON.stringify(profile))} />
}