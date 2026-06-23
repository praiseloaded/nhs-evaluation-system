// lib/feature-access.ts
//
// Central source of truth for feature gating. Two kinds of keys:
//
// PAGE-LEVEL keys — gate entire pages (used by FeatureGate server component)
// COMPONENT-LEVEL keys — gate UI elements within pages (used by useFeatureAccess hook)
//
// All keys are configurable from the admin Settings page. Admin changing
// a key's minTier takes effect on the next page load — no redeploy needed.

import { prisma } from "@/lib/prisma"

const TIER_RANK: Record<string, number> = { free: 0, pro: 1, elite: 2 }

export async function hasFeatureAccess(userTier: string, featureKey: string): Promise<boolean> {
  const flag = await prisma.featureFlag.findUnique({ where: { key: featureKey } })
  if (!flag) return true       // no flag configured → don't block
  if (!flag.enabled) return false // global kill switch

  const userRank = TIER_RANK[userTier] ?? 0
  const requiredRank = TIER_RANK[flag.minTier] ?? 0
  return userRank >= requiredRank
}

export async function getRequiredTier(featureKey: string): Promise<string | null> {
  const flag = await prisma.featureFlag.findUnique({ where: { key: featureKey } })
  if (!flag || flag.minTier === 'free') return null
  return flag.minTier
}

export async function getTierLimit(tier: string, key: string, fallback = 0): Promise<number> {
  const row = await prisma.tierLimit.findUnique({ where: { tier_key: { tier, key } } })
  if (!row) return fallback
  return row.value === -1 ? Infinity : row.value
}

// ── Feature catalog ─────────────────────────────────────────────────────────
//
// PAGE-LEVEL features — gate entire dashboard pages
// COMPONENT-LEVEL features — gate UI elements within pages
//
// Admin sees all of these in the Settings grid and can set minTier for each.

export const FEATURE_CATALOG: {
  key: string
  label: string
  description: string
  defaultMinTier: string
  group: 'page' | 'score' | 'analysis' | 'dashboard'
}[] = [
  // ── Page-level gates ──────────────────────────────────────────────────────
  { key: 'mentorship',            label: 'Mentorship',              description: 'Direct messaging with the team',                          defaultMinTier: 'pro',  group: 'page' },
  { key: 'interview_simulator',   label: 'Interview Simulator AI',  description: 'NHS panel interview practice with scoring',               defaultMinTier: 'pro',  group: 'page' },
  { key: 'career_gps',            label: 'Career GPS™',             description: 'Band-by-band promotion roadmap',                          defaultMinTier: 'pro',  group: 'page' },
  { key: 'recruiter_simulator',   label: 'Recruiter Simulator™',    description: 'Three-panel shortlisting assessment',                     defaultMinTier: 'pro',  group: 'page' },
  { key: 'interview_probability', label: 'Interview Probability™',  description: 'Predicted interview likelihood per analysis',             defaultMinTier: 'pro',  group: 'page' },
  { key: 'evidence_vault',        label: 'EvidenceVault™',          description: 'STAR example and certificate storage',                    defaultMinTier: 'free', group: 'page' },
  { key: 'cv_builder',            label: 'CV Builder',              description: 'NHS-format CV builder with export',                       defaultMinTier: 'free', group: 'page' },
  { key: 'shortlist_probability', label: 'Shortlist Probability™',  description: '7-factor shortlisting outcome prediction',               defaultMinTier: 'free', group: 'page' },
  { key: 'momentum_score',        label: 'Momentum Score™',         description: 'Application activity and outcome tracking',              defaultMinTier: 'free', group: 'page' },

  // ── Score sub-dimensions (within the analysis report) ─────────────────────
  { key: 'score_star',            label: 'STAR Completeness score',  description: 'STAR structure scoring shown on analysis report',        defaultMinTier: 'pro',  group: 'score' },
  { key: 'score_language',        label: 'Language Mirroring score', description: 'Language mirroring sub-score on analysis report',        defaultMinTier: 'pro',  group: 'score' },
  { key: 'score_specificity',     label: 'Specificity score',        description: 'Specificity sub-score on analysis report',               defaultMinTier: 'pro',  group: 'score' },
  { key: 'score_ats',             label: 'ATS Match score',          description: 'ATS keyword match score shown in analysis and dashboard', defaultMinTier: 'pro',  group: 'score' },

  // ── Analysis report elements ───────────────────────────────────────────────
  { key: 'rejection_risk',        label: 'Rejection Risk badge',     description: 'High/medium/low rejection risk indicator',              defaultMinTier: 'pro',  group: 'analysis' },
  { key: 'band_gap_alert',        label: 'Band Gap alert',           description: 'Band gap warning (B5→B6) on analysis rows',             defaultMinTier: 'pro',  group: 'analysis' },
  { key: 'statement_flags',       label: 'Statement flags',          description: '"We language", "No results" and other quality flags',   defaultMinTier: 'pro',  group: 'analysis' },
  { key: 'weaknesses',            label: 'Weaknesses list',          description: 'Specific weakness text on analysis rows',               defaultMinTier: 'pro',  group: 'analysis' },
  { key: 'band_match_advanced',   label: 'Band Match — all bands',   description: 'Band 5, 6, 7 and 8a in Band Match tab',                defaultMinTier: 'pro',  group: 'analysis' },
  { key: 'shortlist_factors_pro', label: 'Shortlist factors (full)', description: '4 additional factors in Shortlist Probability popup',   defaultMinTier: 'pro',  group: 'analysis' },
  { key: 'insights_advanced',           label: 'Advanced insights (all)',      description: 'Master key — enables all insight sections below',              defaultMinTier: 'pro',  group: 'analysis' },
  { key: 'insights_recommendations',    label: 'Recommendations',              description: 'Personalised improvement directives on analysis report',         defaultMinTier: 'pro',  group: 'analysis' },
  { key: 'insights_weaknesses',         label: 'Weaknesses list',              description: 'Full gap analysis — every unmet criterion',                      defaultMinTier: 'pro',  group: 'analysis' },
  { key: 'insights_missing_criteria',   label: 'Missing Criteria list',        description: 'Criteria not evidenced in the application',                      defaultMinTier: 'pro',  group: 'analysis' },
  { key: 'insights_rejection_risk',     label: 'Rejection Risk analysis',      description: 'Risk level across ATS, shortlisting, values, interview gates',   defaultMinTier: 'pro',  group: 'analysis' },
  { key: 'insights_operational_realism',label: 'Operational Realism',          description: 'Whether the statement reflects NHS environment awareness',        defaultMinTier: 'pro',  group: 'analysis' },
  { key: 'insights_band_coaching',      label: 'Band Coaching',                description: 'Band-specific coaching tailored to the target role',             defaultMinTier: 'pro',  group: 'analysis' },
  { key: 'full_report',                 label: 'Generate Full Report',         description: 'Full PDF report with all dimensions, criteria and coaching',    defaultMinTier: 'pro',  group: 'analysis' },

  // ── Dashboard elements ─────────────────────────────────────────────────────
  { key: 'dashboard_distribution',label: 'Score Distribution chart', description: 'Verdict distribution bar on main dashboard',           defaultMinTier: 'pro',  group: 'dashboard' },
  { key: 'dashboard_ats_kpi',     label: 'Average ATS KPI',          description: 'Average ATS score card on dashboard',                  defaultMinTier: 'pro',  group: 'dashboard' },
  { key: 'dashboard_trend',       label: 'Score trend indicator',    description: 'Score trend (+2.4%) on average score KPI card',        defaultMinTier: 'pro',  group: 'dashboard' },
]

export const LIMIT_CATALOG: { key: string; label: string; defaults: Record<string, number> }[] = [
  { key: 'analysisLimit',      label: 'Analyses per month',   defaults: { free: 1,  pro: -1, elite: -1 } },
  { key: 'cvProfileLimit',     label: 'CV profiles',          defaults: { free: 1,  pro: 5,  elite: -1 } },
  { key: 'evidenceEntryLimit', label: 'EvidenceVault entries', defaults: { free: 3,  pro: 50, elite: -1 } },
]