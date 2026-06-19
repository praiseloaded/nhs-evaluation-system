'use client'
import { useFeatureAccess } from '@/components/providers/feature-access-provider'
import Link from 'next/link'
import { Lock } from 'lucide-react'

// Sentinel key — not in the feature catalog, so hasAccess() returns true (no block).
// Used when featureKey is not supplied so we can call the hook unconditionally
// (React rules forbid conditional hook calls).
const NO_GATE_KEY = '__no_gate__'

interface PremiumGateProps {
  label:       string
  children:    React.ReactNode
  isPro?:      boolean      // legacy — still works; featureKey takes priority
  featureKey?: string       // preferred — reads from FeatureFlag table via admin Settings
  reason?:     string
  preview?:    React.ReactNode
}

export function PremiumGate({
  label,
  children,
  isPro,
  featureKey,
  reason = 'limit_reached',
  preview,
}: PremiumGateProps) {
  // Always call the hook unconditionally (React rules).
  // When featureKey is supplied → use the admin-configurable FeatureFlag table.
  // When only isPro is supplied → fall back to that boolean.
  const featureAccessResult = useFeatureAccess(featureKey ?? NO_GATE_KEY)
  const hasAccess = featureKey !== undefined ? featureAccessResult : (isPro ?? false)

  if (hasAccess) return <>{children}</>

  return (
    <div className="relative rounded-lg overflow-hidden">
      <div className="blur-sm pointer-events-none select-none opacity-60">
        {preview ?? children}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/70 dark:bg-black/70">
        <div className="flex items-center gap-2 rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950 px-4 py-2.5 shadow-sm">
          <Lock className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          <div>
            <p className="text-sm font-semibold text-purple-800 dark:text-purple-200">Pro feature</p>
            <p className="text-xs text-purple-600 dark:text-purple-400">{label}</p>
          </div>
        </div>
        <Link
          href={`/upgrade?reason=${reason}`}
          className="bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
        >
          Upgrade to Pro
        </Link>
      </div>
    </div>
  )
}