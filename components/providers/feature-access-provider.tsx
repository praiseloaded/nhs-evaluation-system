// components/providers/feature-access-provider.tsx
//
// Wrap this around your dashboard layout (app/dashboard/layout.tsx).
// It fetches the feature flags once and the user's tier once, then
// exposes them via context so any client component in the dashboard
// can call useFeatureAccess(key) without making its own API call.
'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useSession } from 'next-auth/react'

const TIER_RANK: Record<string, number> = { free: 0, pro: 1, elite: 2 }

interface FlagData {
  key: string
  minTier: string
  enabled: boolean
}

interface FeatureAccessContextValue {
  // Returns true if the current user's tier meets the feature's minTier.
  hasAccess: (featureKey: string) => boolean
  // Returns the minTier string for a feature key ('free'|'pro'|'elite'),
  // or 'free' if unconfigured. Use this to render the correct upgrade label.
  getMinTier: (featureKey: string) => string
  // The user's current tier string ('free' | 'pro' | 'elite')
  userTier: string
  // Whether the flags have been loaded yet
  loaded: boolean
}

const FeatureAccessContext = createContext<FeatureAccessContextValue>({
  hasAccess: () => true,
  getMinTier: () => 'free',
  userTier: 'free',
  loaded: false,
})

export function FeatureAccessProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession()
  const userTier = (session?.user as any)?.tier ?? 'free'
  const userRank = TIER_RANK[userTier] ?? 0

  const [flags, setFlags] = useState<FlagData[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    // Fetch from the public flags endpoint (no auth required)
    fetch('/api/feature-flags')
      .then(r => r.ok ? r.json() : { flags: [] })
      .then(d => {
        setFlags(d.flags ?? [])
        setLoaded(true)
      })
      .catch(() => setLoaded(true)) // fail open on error
  }, [])

  const hasAccess = (featureKey: string): boolean => {
    if (!loaded) return true // fail open while loading
    const flag = flags.find(f => f.key === featureKey)
    if (!flag) return true       // not configured → don't block
    if (!flag.enabled) return false // global kill switch
    return userRank >= (TIER_RANK[flag.minTier] ?? 0)
  }

  // Returns the actual minTier stored in the FeatureFlag table for a key.
  // Components use this to render "Upgrade to Pro" vs "Upgrade to Elite"
  // based on what admin has configured, not a hardcoded string.
  const getMinTier = (featureKey: string): string => {
    const flag = flags.find(f => f.key === featureKey)
    return flag?.minTier ?? 'free'
  }

  return (
    <FeatureAccessContext.Provider value={{ hasAccess, getMinTier, userTier, loaded }}>
      {children}
    </FeatureAccessContext.Provider>
  )
}

// The hook every component calls — no props drilling needed
export function useFeatureAccess(featureKey: string): boolean {
  const { hasAccess } = useContext(FeatureAccessContext)
  return hasAccess(featureKey)
}

// Lower-level hook when a component needs both access + tier
export function useFeatureContext() {
  return useContext(FeatureAccessContext)
}