// components/homepage-pricing.tsx
// Drop-in replacement for the hardcoded pricing section on the homepage.
// Fetches live from /api/pricing + /api/feature-flags — same source as the
// upgrade page and admin settings, so they stay in sync automatically.
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Check, ArrowRight, Loader2, Shield, Zap, Crown, Star } from 'lucide-react'

// Human-readable labels — mirrors UpgradeClient FEATURES map
const FEATURE_LABELS: Record<string, string> = {
  evidence_vault:               'EvidenceVault™',
  cv_builder:                   'CV Builder',
  shortlist_probability:        'Shortlist Probability™',
  momentum_score:               'Momentum Score™',
  mentorship:                   'Direct mentorship messaging',
  interview_simulator:          'Interview Simulator AI',
  career_gps:                   'Career GPS™ roadmap',
  recruiter_simulator:          'Recruiter Simulator™',
  interview_probability:        'Interview Probability™',
  score_star:                   'STAR completeness score',
  score_language:               'Language mirroring score',
  score_specificity:            'Specificity score',
  score_ats:                    'ATS keyword match',
  rejection_risk:               'Rejection risk analysis',
  band_gap_alert:               'Band gap alerts',
  statement_flags:              'Statement quality flags',
  weaknesses:                   'Full weaknesses list',
  band_match_advanced:          'Band Match DNA™ — all 7 bands',
  shortlist_factors_pro:        'Full 7-factor shortlist breakdown',
  insights_recommendations:     'Personalised recommendations',
  insights_weaknesses:          'Full gap analysis',
  insights_missing_criteria:    'Missing criteria list',
  insights_rejection_risk:      'Rejection risk analysis',
  insights_operational_realism: 'Operational realism scoring',
  insights_band_coaching:       'Band coaching & panel tips',
  full_report:                  'Full PDF report',
  dashboard_distribution:       'Score distribution chart',
  dashboard_ats_kpi:            'Average ATS KPI',
  dashboard_trend:              'Score trend indicator',
  insights_advanced:            'Advanced insights suite',
  job_ready:                    'Job Ready™ — full application packages',
  nhs_jobs:                     'NHS Jobs — all 5 nations',
  ab_test:                      'A/B Statement Test',
  cover_letter:                 'Cover Letter AI',
  cv_templates:                 'NHS CV Templates (35 designs)',
  criteria_explorer:            'Shortlist Intelligence™',
  heatmap:                      'Application Heat Map™',
  career_twin:                  'Omni Career Twin™',
  evolution:                    'Personal Statement Evolution™',
  skills_passport:              'NHS Skills Passport™',
  employer_intelligence:        'Employer Intelligence™',
  radar:                        'Opportunity Radar™',
  marketplace:                  'Career Marketplace™',
  salary_predictor:             'Salary Predictor',
  coach:                        'AI Career Coach',
  auto_match_evidence:          'Auto-Match Evidence',
}

const FREE_BASELINE = [
  '1 analysis per month',
  '5-dimension scoring',
  'Criteria & values check',
  'Shortlist Probability™',
  'NHS Jobs browser',
  'Salary Predictor',
  'CV Builder (1 profile)',
  'Momentum Score™',
]

interface TierCardProps {
  tier: 'free' | 'pro' | 'elite' | 'premium'
  price: number | null
  features: string[]
  loading: boolean
}

const CONFIG = {
  free: {
    label: 'Free', period: 'forever',
    badge: null,
    tagline: 'No card required',
    icon: Shield,
    accentText: 'text-muted-foreground',
    borderClass: 'border-border',
    bgClass: 'bg-card',
    checkBg: 'bg-muted',
    checkIcon: 'text-muted-foreground',
    cta: 'Get started free',
    ctaClass: 'border border-border text-foreground hover:bg-muted',
    featuresLabel: 'Includes',
  },
  pro: {
    label: 'Pro', period: '/month',
    badge: 'Most popular',
    tagline: 'For active NHS applicants',
    icon: Zap,
    accentText: 'text-blue-600 dark:text-blue-400',
    borderClass: 'border-blue-600 dark:border-blue-500',
    bgClass: 'bg-blue-50/40 dark:bg-blue-950/20',
    checkBg: 'bg-blue-100 dark:bg-blue-950/50',
    checkIcon: 'text-blue-600 dark:text-blue-400',
    cta: 'Start Pro',
    ctaClass: 'bg-gradient-to-br from-red-500 to-amber-500 text-white shadow-md shadow-blue-500/20',
    featuresLabel: 'Everything in Free, plus',
  },
  elite: {
    label: 'Elite', period: '/month',
    badge: 'Full access',
    tagline: 'Full platform, nothing locked',
    icon: Crown,
    accentText: 'text-amber-600 dark:text-amber-400',
    borderClass: 'border-amber-300 dark:border-amber-700',
    bgClass: 'bg-amber-50/40 dark:bg-amber-950/10',
    checkBg: 'bg-amber-100 dark:bg-amber-950/40',
    checkIcon: 'text-amber-600 dark:text-amber-400',
    cta: 'Start Elite',
    ctaClass: 'bg-amber-500 hover:bg-amber-600 text-white',
    featuresLabel: 'Everything in Pro, plus',
  },
  premium: {
    label: 'Premium', period: '/month',
    badge: '✦ Most powerful',
    tagline: 'The full Career Twin experience',
    icon: Star,
    accentText: 'text-violet-600 dark:text-violet-400',
    borderClass: 'border-violet-500 dark:border-violet-600',
    bgClass: 'bg-violet-50/40 dark:bg-violet-950/20',
    checkBg: 'bg-violet-100 dark:bg-violet-950/40',
    checkIcon: 'text-violet-600 dark:text-violet-400',
    cta: 'Get Premium',
    ctaClass: 'bg-gradient-to-br from-violet-600 to-indigo-600 text-white',
    featuresLabel: 'Everything in Elite, plus',
  },
}

function TierCard({ tier, price, features, loading }: TierCardProps) {
  const c    = CONFIG[tier]
  const Icon = c.icon
  const isFree = tier === 'free'

  return (
    <div className={`rounded-2xl border-2 ${c.borderClass} ${c.bgClass} p-7 flex flex-col relative`}
      style={{ boxShadow: tier !== 'free' ? undefined : 'none' }}>

      {c.badge && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
          <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-sm ${
            tier === 'premium'
              ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white'
              : tier === 'elite'
              ? 'bg-amber-500 text-white'
              : 'bg-gradient-to-br from-red-500 to-amber-500 text-white'
          }`}>{c.badge}</span>
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <div className={`w-8 h-8 rounded-lg ${c.checkBg} flex items-center justify-center`}>
            <Icon className={`w-4 h-4 ${c.checkIcon}`} />
          </div>
          <p className={`text-[11px] font-black uppercase tracking-widest ${c.accentText}`}>{c.label}</p>
        </div>
        <div className="flex items-baseline gap-1 mb-1">
          {price === null ? (
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          ) : (
            <>
              <span className="text-4xl font-black text-foreground">£{price}</span>
              <span className="text-[12px] text-muted-foreground">{c.period}</span>
            </>
          )}
        </div>
        <p className="text-[12px] text-muted-foreground">{c.tagline}</p>
      </div>

      {/* CTA */}
      <Link href="/upgrade"
        className={`block w-full py-2.5 rounded-xl font-bold text-[13px] text-center transition-colors mb-6 ${c.ctaClass}`}>
        {c.cta}
      </Link>

      {/* Features */}
      <div className="flex-1 space-y-2.5">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{c.featuresLabel}</p>

        {loading ? (
          <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading from admin settings…
          </div>
        ) : features.length === 0 && !isFree ? (
          <p className="text-[12px] text-muted-foreground italic">No features assigned — set in Admin → Settings</p>
        ) : (
          features.map((f, i) => (
            <div key={i} className="flex items-start gap-2.5 text-[12.5px] text-foreground">
              <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${c.checkBg}`}>
                <Check className={`w-2.5 h-2.5 ${c.checkIcon}`} />
              </div>
              {f}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export function HomepagePricing() {
  const [prices,    setPrices]    = useState<Record<string,number>>({ free:0, pro:9, elite:29, premium:49 })
  const [priceLoad, setPriceLoad] = useState(true)
  const [flagLoad,  setFlagLoad]  = useState(true)
  const [proF,      setProF]      = useState<string[]>([])
  const [eliteF,    setEliteF]    = useState<string[]>([])
  const [premiumF,  setPremiumF]  = useState<string[]>([])

  useEffect(() => {
    fetch('/api/pricing')
      .then(r => r.json())
      .then(d => { if (d.prices) setPrices(d.prices) })
      .catch(() => {})
      .finally(() => setPriceLoad(false))

    fetch('/api/feature-flags')
      .then(r => r.ok ? r.json() : { flags: [] })
      .then(({ flags = [] }) => {
        const pro: string[] = [], elite: string[] = [], premium: string[] = []
        for (const f of flags) {
          if (!f.enabled) continue
          const label = FEATURE_LABELS[f.key]
          if (!label) continue
          if (f.minTier === 'pro')     pro.push(label)
          if (f.minTier === 'elite')   elite.push(label)
          if (f.minTier === 'premium') premium.push(label)
        }
        setProF(pro); setEliteF(elite); setPremiumF(premium)
      })
      .catch(() => {})
      .finally(() => setFlagLoad(false))
  }, [])

  const p = (tier: string) => priceLoad ? null : prices[tier] ?? 0

  return (
    <section id="pricing" className="py-24 sm:py-32 bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <p className="text-[12px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-3">Pricing</p>
          <h2 className="text-4xl sm:text-5xl font-black text-foreground tracking-tight mb-4">
            Start free. Upgrade when it counts.
          </h2>
          <p className="text-lg text-muted-foreground">No hidden fees. Cancel any time. Features reflect live admin configuration.</p>
        </div>

        {/* 2×2 grid */}
        <div className="grid sm:grid-cols-2 gap-5 max-w-3xl mx-auto">
          <TierCard tier="free"    price={p('free')}    features={FREE_BASELINE} loading={false} />
          <TierCard tier="pro"     price={p('pro')}     features={proF}          loading={flagLoad} />
          <TierCard tier="elite"   price={p('elite')}   features={eliteF}        loading={flagLoad} />
          <TierCard tier="premium" price={p('premium')} features={premiumF}      loading={flagLoad} />
        </div>

        <p className="text-center text-[12px] text-muted-foreground mt-6">
          All plans include NHS Jobs search, CV Builder, and Application Tracker.{' '}
          <Link href="/upgrade" className="text-blue-600 dark:text-blue-400 hover:underline">
            See full feature comparison →
          </Link>
        </p>
      </div>
    </section>
  )
}