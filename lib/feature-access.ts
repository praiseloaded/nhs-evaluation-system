// lib/feature-access.ts
import { prisma } from '@/lib/prisma'

const TIER_RANK: Record<string, number> = { free: 0, pro: 1, elite: 2, premium: 3 }

export async function hasFeatureAccess(userTier: string, featureKey: string): Promise<boolean> {
  const flag = await prisma.featureFlag.findUnique({ where: { key: featureKey } })
  if (!flag)          return true
  if (!flag.enabled)  return false
  return (TIER_RANK[userTier] ?? 0) >= (TIER_RANK[flag.minTier] ?? 0)
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

// ── Feature catalog ───────────────────────────────────────────────────────────

export const FEATURE_CATALOG: {
  key: string
  label: string
  description: string
  defaultMinTier: string
  group: 'page' | 'score' | 'analysis' | 'dashboard'
}[] = [

  // ── Page-level gates ────────────────────────────────────────────────────────
  // Original features
  { key: 'mentorship',              label: 'Mentorship',                description: 'Direct messaging with the team',                                defaultMinTier: 'pro',     group: 'page' },
  { key: 'interview_simulator',     label: 'Interview Simulator AI',    description: 'NHS panel interview practice with scoring',                      defaultMinTier: 'pro',     group: 'page' },
  { key: 'career_gps',              label: 'Career GPS™',               description: 'Band-by-band promotion roadmap',                                 defaultMinTier: 'pro',     group: 'page' },
  { key: 'recruiter_simulator',     label: 'Recruiter Simulator™',      description: 'Three-panel shortlisting assessment',                            defaultMinTier: 'pro',     group: 'page' },
  { key: 'interview_probability',   label: 'Interview Probability™',    description: 'Predicted interview likelihood per analysis',                    defaultMinTier: 'pro',     group: 'page' },
  { key: 'evidence_vault',          label: 'EvidenceVault™',            description: 'STAR example and certificate storage',                           defaultMinTier: 'free',    group: 'page' },
  { key: 'cv_builder',              label: 'CV Builder',                description: 'NHS-format CV builder with export',                              defaultMinTier: 'free',    group: 'page' },
  { key: 'shortlist_probability',   label: 'Shortlist Probability™',    description: '7-factor shortlisting outcome prediction',                       defaultMinTier: 'free',    group: 'page' },
  { key: 'momentum_score',          label: 'Momentum Score™',           description: 'Application activity and outcome tracking',                      defaultMinTier: 'free',    group: 'page' },

  // New features — Apply
  { key: 'job_ready',               label: 'Job Ready™',                description: 'Full application package from a job advert in 30 seconds',      defaultMinTier: 'pro',     group: 'page' },
  { key: 'nhs_jobs',                label: 'NHS Jobs Browser',          description: 'Live vacancies across England, Scotland, Wales, NI & Sponsorship', defaultMinTier: 'free',  group: 'page' },
  { key: 'ab_test',                 label: 'A/B Statement Test',        description: 'Compare two statement versions — AI picks the stronger one',     defaultMinTier: 'pro',     group: 'page' },
  { key: 'cover_letter',            label: 'Cover Letter AI',           description: 'NHS-specific cover letters in 4 professional tones',             defaultMinTier: 'pro',     group: 'page' },
  { key: 'cv_templates',            label: 'NHS CV Templates',          description: '35 visual templates with AI-generated personal statement',       defaultMinTier: 'pro',     group: 'page' },

  // New features — Intelligence
  { key: 'criteria_explorer',       label: 'Shortlist Intelligence™',   description: 'Deep breakdown of every person spec criterion',                  defaultMinTier: 'pro',     group: 'page' },
  { key: 'heatmap',                 label: 'Application Heat Map™',     description: 'Ranks vacancies by interview odds, salary, competition & more',  defaultMinTier: 'pro',     group: 'page' },
  { key: 'cos_navigator',           label: 'COS Navigator™',            description: 'Browse NHS roles with Skilled Worker visa sponsorship',          defaultMinTier: 'free',    group: 'page' },

  // New features — Career
  { key: 'coach',                   label: 'AI Career Coach',           description: 'Chat AI that knows your CV, applications & career goals',        defaultMinTier: 'pro',     group: 'page' },
  { key: 'salary_predictor',        label: 'Salary Predictor',          description: '2024/25 AfC take-home calculator for all 4 UK nations',          defaultMinTier: 'free',    group: 'page' },
  { key: 'auto_match_evidence',     label: 'Auto-Match Evidence',       description: 'AI matches stored evidence to job criteria automatically',        defaultMinTier: 'pro',     group: 'page' },
  { key: 'marketplace',             label: 'Career Marketplace™',       description: 'Courses, coaching, mentors and employer connections',             defaultMinTier: 'free',    group: 'page' },

  // New features — Premium tier flagship
  { key: 'career_twin',             label: 'Omni Career Twin™',         description: 'AI assembles applications from your real vault evidence',        defaultMinTier: 'premium', group: 'page' },
  { key: 'evolution',               label: 'Statement Evolution™',      description: 'Visual timeline of every analysis score over time',               defaultMinTier: 'elite',   group: 'page' },
  { key: 'skills_passport',         label: 'NHS Skills Passport™',      description: 'Visual competency tracker for venepuncture, ECG, IPC & more',    defaultMinTier: 'elite',   group: 'page' },
  { key: 'employer_intelligence',   label: 'Employer Intelligence™',    description: 'Research any NHS Trust — values, themes, criteria, culture',     defaultMinTier: 'elite',   group: 'page' },
  { key: 'radar',                   label: 'Opportunity Radar™',        description: 'Daily personalised job feed with high-match & closing-soon alerts', defaultMinTier: 'elite', group: 'page' },
  { key: 'star_builder',            label: 'Auto STAR Builder™',        description: 'Conversational AI interviews you and writes polished STAR examples', defaultMinTier: 'pro',  group: 'page' },
  { key: 'ats_simulator',           label: 'NHS ATS Simulator™',        description: 'Pre-submission ATS compatibility check with keyword gaps',        defaultMinTier: 'pro',     group: 'page' },
  { key: 'cpd_tracker',             label: 'CPD Tracker',               description: 'Log CPD hours for NMC / HCPC / GMC revalidation',                defaultMinTier: 'free',    group: 'page' },

  // ── Score sub-dimensions ────────────────────────────────────────────────────
  { key: 'score_star',              label: 'STAR Completeness score',   description: 'STAR structure scoring shown on analysis report',                defaultMinTier: 'pro',     group: 'score' },
  { key: 'score_language',          label: 'Language Mirroring score',  description: 'Language mirroring sub-score on analysis report',                defaultMinTier: 'pro',     group: 'score' },
  { key: 'score_specificity',       label: 'Specificity score',         description: 'Specificity sub-score on analysis report',                       defaultMinTier: 'pro',     group: 'score' },
  { key: 'score_ats',               label: 'ATS Match score',           description: 'ATS keyword match score shown in analysis and dashboard',        defaultMinTier: 'pro',     group: 'score' },

  // ── Analysis report elements ────────────────────────────────────────────────
  { key: 'rejection_risk',              label: 'Rejection Risk badge',         description: 'High/medium/low rejection risk indicator',                   defaultMinTier: 'pro',  group: 'analysis' },
  { key: 'band_gap_alert',              label: 'Band Gap alert',               description: 'Band gap warning on analysis rows',                          defaultMinTier: 'pro',  group: 'analysis' },
  { key: 'statement_flags',             label: 'Statement flags',              description: '"We language", "No results" and other quality flags',        defaultMinTier: 'pro',  group: 'analysis' },
  { key: 'weaknesses',                  label: 'Weaknesses list',              description: 'Specific weakness text on analysis rows',                    defaultMinTier: 'pro',  group: 'analysis' },
  { key: 'band_match_advanced',         label: 'Band Match — all bands',       description: 'Band 5, 6, 7 and 8a in Band Match tab',                     defaultMinTier: 'pro',  group: 'analysis' },
  { key: 'shortlist_factors_pro',       label: 'Shortlist factors (full)',     description: '4 additional factors in Shortlist Probability popup',        defaultMinTier: 'pro',  group: 'analysis' },
  { key: 'insights_advanced',           label: 'Advanced insights (all)',      description: 'Master key — enables all insight sections below',            defaultMinTier: 'pro',  group: 'analysis' },
  { key: 'insights_recommendations',    label: 'Recommendations',             description: 'Personalised improvement directives on analysis report',     defaultMinTier: 'pro',  group: 'analysis' },
  { key: 'insights_weaknesses',         label: 'Weaknesses (insights)',        description: 'Full gap analysis — every unmet criterion',                  defaultMinTier: 'pro',  group: 'analysis' },
  { key: 'insights_missing_criteria',   label: 'Missing Criteria list',        description: 'Criteria not evidenced in the application',                 defaultMinTier: 'pro',  group: 'analysis' },
  { key: 'insights_rejection_risk',     label: 'Rejection Risk analysis',     description: 'Risk level across ATS, shortlisting, values, interview gates', defaultMinTier: 'pro', group: 'analysis' },
  { key: 'insights_operational_realism',label: 'Operational Realism',         description: 'Whether the statement reflects NHS environment awareness',   defaultMinTier: 'pro',  group: 'analysis' },
  { key: 'insights_band_coaching',      label: 'Band Coaching',               description: 'Band-specific coaching tailored to the target role',         defaultMinTier: 'pro',  group: 'analysis' },
  { key: 'full_report',                 label: 'Generate Full Report',        description: 'Full PDF report with all dimensions, criteria and coaching', defaultMinTier: 'pro',  group: 'analysis' },

  // ── Dashboard elements ──────────────────────────────────────────────────────
  { key: 'dashboard_distribution', label: 'Score Distribution chart',  description: 'Verdict distribution bar on main dashboard',                     defaultMinTier: 'pro',     group: 'dashboard' },
  { key: 'dashboard_ats_kpi',      label: 'Average ATS KPI',           description: 'Average ATS score card on dashboard',                            defaultMinTier: 'pro',     group: 'dashboard' },
  { key: 'dashboard_trend',        label: 'Score trend indicator',     description: 'Score trend on average score KPI card',                          defaultMinTier: 'pro',     group: 'dashboard' },
]

// ── Limit catalog ─────────────────────────────────────────────────────────────

export const LIMIT_CATALOG: {
  key: string
  label: string
  defaults: Record<string, number>
}[] = [
  { key: 'analysisLimit',      label: 'Analyses per month',    defaults: { free: 1,  pro: -1, elite: -1, premium: -1 } },
  { key: 'cvProfileLimit',     label: 'CV profiles',           defaults: { free: 1,  pro: 5,  elite: -1, premium: -1 } },
  { key: 'evidenceEntryLimit', label: 'EvidenceVault entries', defaults: { free: 3,  pro: 50, elite: -1, premium: -1 } },
  { key: 'starBuilderLimit',   label: 'STAR Builder sessions per month', defaults: { free: 2, pro: 20, elite: -1, premium: -1 } },
  { key: 'atsSimulatorLimit',  label: 'ATS Simulator runs per month',   defaults: { free: 1, pro: 20, elite: -1, premium: -1 } },
  { key: 'cpdEntryLimit',      label: 'CPD log entries',                defaults: { free: -1, pro: -1, elite: -1, premium: -1 } },
  { key: 'monthlyPrice',       label: 'Monthly price (£)',              defaults: { free: 0, pro: 9,  elite: 29, premium: 49 } },
]