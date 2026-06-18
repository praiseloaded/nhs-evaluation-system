// app/admin/layout.tsx
// Server component — runs the admin check before anything renders.
// Non-admins are redirected to /dashboard with no indication an admin
// area exists (no flash of admin UI, no informative 403 page).

import { redirect } from 'next/navigation'
import { isAdminSession } from '@/lib/admin-auth'
import { AdminShell } from './AdminShell'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const ok = await isAdminSession()
  if (!ok) redirect('/dashboard/admin')

  return <AdminShell>{children}</AdminShell>
}