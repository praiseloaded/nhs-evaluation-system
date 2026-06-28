// components/impersonation-banner.tsx
// Shows a persistent banner when an admin is viewing as another user.
// Sits at the top of the dashboard layout.
'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, X, Eye } from 'lucide-react'

export function ImpersonationBanner() {
  const [state, setState] = useState<{
    isImpersonating: boolean
    user?: { name: string | null; email: string | null; tier: string }
  } | null>(null)

  useEffect(() => {
    fetch('/api/effective-user')
      .then(r => r.json())
      .then(d => {
        if (d.isImpersonating) setState({ isImpersonating: true, user: d.user })
        else setState({ isImpersonating: false })
      })
      .catch(() => {})
  }, [])

  const stopImpersonating = async () => {
    await fetch('/api/admin/impersonate', { method: 'DELETE' })
    window.location.href = '/admin/users'
  }

  if (!state?.isImpersonating) return null

  return (
    <div className="bg-amber-500 text-amber-950 px-4 py-2.5 flex items-center justify-between gap-3 text-[13px] font-semibold sticky top-0 z-50 shadow-md">
      <div className="flex items-center gap-2.5">
        <Eye className="w-4 h-4 shrink-0" />
        <span>
          Admin view — viewing dashboard as{' '}
          <strong>{state.user?.name ?? state.user?.email ?? 'user'}</strong>
          {state.user?.tier && (
            <span className="ml-1.5 text-[10px] font-black uppercase bg-amber-950/20 px-1.5 py-0.5 rounded-full">
              {state.user.tier}
            </span>
          )}
        </span>
      </div>
      <button onClick={stopImpersonating}
        className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-950 text-amber-50 text-[12px] font-bold hover:opacity-85 transition-opacity shrink-0">
        <X className="w-3.5 h-3.5" /> Stop & return to admin
      </button>
    </div>
  )
}