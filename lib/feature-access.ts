// lib/feature-access.ts
//
// Central gate for "does this user's tier unlock this feature" — backed
// by the FeatureFlag table instead of hardcoded `tier === 'pro'` checks
// scattered across routes. When admin changes a feature's minTier on the
// Settings page, every route calling this immediately reflects it with
// no redeploy.
//
// Falls back to a sensible default if a feature key has no row yet
// (e.g. right after this is first deployed, before admin has visited
// the Settings page to seed the table) — defaults to 'free' so nothing
// breaks by being over-restrictive on a missing row.

import { prisma } from "@/lib/prisma"

const TIER_RANK: Record<string, number> = { free: 0, pro: 1, elite: 2 }

export async function hasFeatureAccess(userTier: string, featureKey: string): Promise<boolean> {
  const flag = await prisma.featureFlag.findUnique({ where: { key: featureKey } })
  if (!flag) return true // no flag configured yet — don't block
  if (!flag.enabled) return false // global kill switch

  const userRank = TIER_RANK[userTier] ?? 0
  const requiredRank = TIER_RANK[flag.minTier] ?? 0
  return userRank >= requiredRank
}

/**
 * Convenience for API routes: returns the flag's minTier label for
 * building an upgrade-prompt message, or null if the feature is
 * unrestricted / not configured.
 */
export async function getRequiredTier(featureKey: string): Promise<string | null> {
  const flag = await prisma.featureFlag.findUnique({ where: { key: featureKey } })
  if (!flag || flag.minTier === 'free') return null
  return flag.minTier
}

/**
 * Returns the numeric limit for a given tier + key, e.g.
 * getTierLimit('free', 'analysisLimit'). Falls back to `fallback` if no
 * row exists yet. -1 stored in the table means unlimited, returned as
 * Infinity for easy comparison (`used < limit`).
 */
export async function getTierLimit(tier: string, key: string, fallback = 0): Promise<number> {
  const row = await prisma.tierLimit.findUnique({ where: { tier_key: { tier, key } } })
  if (!row) return fallback
  return row.value === -1 ? Infinity : row.value
}

// The canonical list of feature keys this app gates. Used to seed the
// FeatureFlag table on first admin visit, and to render the Settings grid
// even before any rows exist.
export const FEATURE_CATALOG: { key: string; label: string; description: string; defaultMinTier: string }[] = [
  { key: 'mentorship', label: 'Mentorship', description: 'Direct messaging with the team', defaultMinTier: 'pro' },
  { key: 'interview_simulator', label: 'Interview Simulator AI', description: 'NHS panel interview practice with scoring', defaultMinTier: 'pro' },
  { key: 'career_gps', label: 'Career GPS™', description: 'Band-by-band promotion roadmap', defaultMinTier: 'pro' },
  { key: 'recruiter_simulator', label: 'Recruiter Simulator™', description: 'Three-panel shortlisting assessment', defaultMinTier: 'pro' },
  { key: 'evidence_vault', label: 'EvidenceVault™', description: 'STAR example and certificate storage', defaultMinTier: 'free' },
  { key: 'cv_builder', label: 'CV Builder', description: 'NHS-format CV builder with export', defaultMinTier: 'free' },
  { key: 'shortlist_probability', label: 'Shortlist Probability™', description: '7-factor shortlisting outcome prediction', defaultMinTier: 'free' },
  { key: 'momentum_score', label: 'Momentum Score™', description: 'Application activity and outcome tracking', defaultMinTier: 'free' },
  { key: 'interview_probability', label: 'Interview Probability™', description: 'Predicted interview likelihood per analysis', defaultMinTier: 'pro' },
]

// The canonical list of numeric limits this app enforces per tier.
export const LIMIT_CATALOG: { key: string; label: string; defaults: Record<string, number> }[] = [
  { key: 'analysisLimit', label: 'Analyses per month', defaults: { free: 1, pro: -1, elite: -1 } },
  { key: 'cvProfileLimit', label: 'CV profiles', defaults: { free: 1, pro: 5, elite: -1 } },
  { key: 'evidenceEntryLimit', label: 'EvidenceVault entries', defaults: { free: 3, pro: 50, elite: -1 } },
]