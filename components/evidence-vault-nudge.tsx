// components/evidence-vault-nudge.tsx
// Shows a dismissible banner when the user has fewer than 3 EvidenceVault entries.
// Stored in localStorage so dismissal lasts 7 days.
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FolderOpen, X, ArrowRight, Sparkles } from 'lucide-react'

const DISMISS_KEY = 'evidence_vault_nudge_dismissed'
const DISMISS_DAYS = 7

// Don't show the nudge on the evidence vault page itself
const SUPPRESSED_PATHS = [
  '/dashboard/evidence-vault',
  '/dashboard/evidence-vault/match',
]

export function EvidenceVaultNudge() {
  const pathname  = usePathname()
  const [show,    setShow]    = useState(false)
  const [count,   setCount]   = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check dismissal
    try {
      const raw = localStorage.getItem(DISMISS_KEY)
      if (raw) {
        const { until } = JSON.parse(raw)
        if (Date.now() < until) { setLoading(false); return }
      }
    } catch { /* ignore */ }

    // Fetch vault count
    fetch('/api/evidence-vault/count')
      .then(r => r.ok ? r.json() : { count: null })
      .then(d => {
        setCount(d.count)
        // Show nudge if fewer than 3 entries
        if (typeof d.count === 'number' && d.count < 3) setShow(true)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const dismiss = () => {
    setShow(false)
    try {
      localStorage.setItem(DISMISS_KEY, JSON.stringify({
        until: Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000,
      }))
    } catch { /* ignore */ }
  }

  // Don't show on suppressed pages or while loading
  if (!show || loading || SUPPRESSED_PATHS.some(p => pathname.startsWith(p))) return null

  const isEmpty = count === 0

  return (
    <div className={`relative flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all ${
      isEmpty
        ? 'bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-b border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200'
        : 'bg-gradient-to-r from-blue-500/10 to-violet-500/10 border-b border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200'
    }`}>
      <FolderOpen className="w-4 h-4 shrink-0 opacity-80" />

      <p className="flex-1 text-[13px]">
        {isEmpty ? (
          <>
            <span className="font-bold">Your EvidenceVault™ is empty.</span>{' '}
            Features like Career Twin™, Auto-Match and Job Ready™ work best with your real STAR examples stored here.
          </>
        ) : (
          <>
            <span className="font-bold">You have {count} evidence {count === 1 ? 'entry' : 'entries'}.</span>{' '}
            Add more to unlock the full power of Career Twin™ and Auto-Match Evidence.
          </>
        )}
      </p>

      <div className="flex items-center gap-2 shrink-0">
        <Link href="/dashboard/evidence-vault"
          onClick={dismiss}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black transition-colors ${
            isEmpty
              ? 'bg-amber-500 hover:bg-amber-600 text-white'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}>
          {isEmpty ? 'Build your vault' : 'Add evidence'} <ArrowRight className="w-3 h-3" />
        </Link>

        {!isEmpty && (
          <Link href="/dashboard/star-builder"
            onClick={dismiss}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-bold border border-current opacity-70 hover:opacity-100 transition-opacity">
            <Sparkles className="w-3 h-3" /> Auto STAR
          </Link>
        )}

        <button onClick={dismiss} aria-label="Dismiss"
          className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors opacity-60 hover:opacity-100">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}