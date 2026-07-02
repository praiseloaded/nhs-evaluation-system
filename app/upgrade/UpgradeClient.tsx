'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle2, ArrowLeft, Loader2, Sparkles, Zap, Crown, Star, Shield, ChevronDown, ChevronUp } from 'lucide-react'

// ── Feature catalogue with descriptions ──────────────────────────────────────
const FEATURES: Record<string, { label: string; desc: string }> = {
  // Analysis
  evidence_vault:               { label: 'EvidenceVault™',             desc: 'Store unlimited STAR examples, achievements and CPD records tied to NHS competencies' },
  cv_builder:                   { label: 'CV Builder',                  desc: '35 professional NHS CV templates with photo upload and one-click Word export' },
  shortlist_probability:        { label: 'Shortlist Probability™',      desc: 'AI predicts your % chance of being shortlisted based on how well your statement matches the person spec' },
  momentum_score:               { label: 'Momentum Score™',             desc: 'Tracks your application activity over time and shows whether your career trajectory is improving' },
  mentorship:                   { label: 'Direct Mentorship',           desc: 'Message experienced NHS professionals directly — by band, specialty and region' },
  interview_simulator:          { label: 'Interview Simulator AI',      desc: 'Practice NHS panel questions specific to your band with scored answers and improvement tips' },
  career_gps:                   { label: 'Career GPS™',                 desc: 'Personalised promotion roadmap from your current band to your target role — skills gaps, timelines and next steps' },
  recruiter_simulator:          { label: 'Recruiter Simulator™',        desc: 'Three-panel shortlisting simulation — AI scores your statement exactly as NHS recruiters would' },
  interview_probability:        { label: 'Interview Probability™',      desc: 'Predicts your likelihood of reaching interview stage based on statement quality and criteria coverage' },
  score_star:                   { label: 'STAR Completeness Score',     desc: 'Measures how well you use the Situation-Task-Action-Result structure throughout your supporting statement' },
  score_language:               { label: 'Language Mirroring Score',    desc: 'Checks how well your statement mirrors the exact terminology and phrases used in the job description' },
  score_specificity:            { label: 'Specificity Score',           desc: 'Detects generic filler phrases and flags where you need concrete examples with numbers and outcomes' },
  score_ats:                    { label: 'ATS Keyword Match',           desc: 'Scores how many ATS-critical NHS keywords from the job spec appear in your statement' },
  rejection_risk:               { label: 'Rejection Risk Analysis',     desc: 'Identifies the specific reasons a shortlisting panel might reject your application before interview' },
  band_gap_alert:               { label: 'Band Gap Alerts',             desc: 'Warns when you are applying above or below your experience level and explains the point deduction' },
  statement_flags:              { label: 'Statement Quality Flags',     desc: 'Highlights overused phrases, passive voice, missing evidence, and compliance issues in your statement' },
  weaknesses:                   { label: 'Full Weaknesses List',        desc: 'Every gap a shortlisting panel would flag — not just the top three, but the full picture' },
  band_match_advanced:          { label: 'Band Match DNA™',             desc: 'Shows your percentage match against every NHS band from 2 to 8a so you know your real level' },
  shortlist_factors_pro:        { label: 'Full Shortlist Breakdown',    desc: '7-factor shortlisting analysis showing exactly how each dimension of your application was scored' },
  insights_recommendations:     { label: 'Personalised Recommendations',desc: 'Specific directives to improve your score — not generic advice but targeted to your actual gaps' },
  insights_weaknesses:          { label: 'Full Gap Analysis',           desc: 'Complete analysis of every weakness in your application versus the person specification' },
  insights_missing_criteria:    { label: 'Missing Criteria List',       desc: 'Every essential and desirable criterion from the person spec that is absent from your statement' },
  insights_rejection_risk:      { label: 'Rejection Risk Gate',         desc: 'ATS, shortlisting, values and interview gate analysis — which stage you are most at risk of failing' },
  insights_operational_realism: { label: 'Operational Realism',         desc: 'Checks whether your statement reflects genuine NHS clinical reality or generic corporate language' },
  insights_band_coaching:       { label: 'Band Coaching & Panel Tips',  desc: 'Panel-specific tips based on the exact band you are applying for and the type of NHS setting' },
  full_report:                  { label: 'Full PDF Report',             desc: 'Download a formatted PDF of your complete analysis to share with a mentor or keep for your portfolio' },
  dashboard_distribution:       { label: 'Score Distribution Chart',    desc: 'See how your scores are distributed across dimensions and track which areas are improving over time' },
  dashboard_ats_kpi:            { label: 'Average ATS KPI',             desc: 'Your average ATS keyword match rate across all analyses shown as a live dashboard metric' },
  dashboard_trend:              { label: 'Score Trend Indicator',       desc: 'Arrow indicator showing whether your overall application quality is trending up or down' },
  insights_advanced:            { label: 'Advanced Insights Suite',     desc: 'All insight panels unlocked: recommendations, weaknesses, missing criteria, rejection risk and operational realism' },
  // New features
  job_ready:                    { label: 'Job Ready™',                  desc: 'Paste any NHS job advert — get your personal statement, cover letter, 5 STAR criteria, interview prep and 7-day action plan in 30 seconds' },
  nhs_jobs:                     { label: 'NHS Jobs Browser',            desc: 'Live vacancies across England, Scotland, Wales, Northern Ireland and Sponsorship roles — all in one dashboard' },
  ab_test:                      { label: 'A/B Statement Test',          desc: 'Write two versions of your supporting statement and let AI tell you which one scores higher against the person spec' },
  cover_letter:                 { label: 'Cover Letter AI',             desc: 'NHS-specific cover letters generated in four professional tones — formal, warm, confident or concise' },
  cv_templates:                 { label: 'NHS CV Templates',            desc: '3-step flow: pick a visual design, choose your NHS role, and get AI-generated personal statement and key skills auto-populated' },
  criteria_explorer:            { label: 'Shortlist Intelligence™',     desc: 'Deep breakdown of every criterion in the person spec showing exactly which you meet, partially meet or miss' },
  heatmap:                      { label: 'Application Heat Map™',       desc: 'Ranks live NHS vacancies by interview probability, salary, competition level, sponsorship and career progression' },
  career_twin:                  { label: 'Omni Career Twin™',           desc: 'AI knows your entire vault — paste a job and say "apply me for this". It assembles your application using your real evidence and flags gaps' },
  evolution:                    { label: 'Statement Evolution™',        desc: 'Visual timeline of every analysis score over time with side-by-side comparison between any two statements' },
  skills_passport:              { label: 'NHS Skills Passport™',        desc: 'Visual competency tracker for venepuncture, ECG, vital signs, infection control, safeguarding and more' },
  employer_intelligence:        { label: 'Employer Intelligence™',      desc: 'Research any NHS Trust: values, common interview themes, typical essential criteria and working environment' },
  radar:                        { label: 'Opportunity Radar™',          desc: 'Daily personalised job feed: high-match vacancies, jobs closing soon, new postings and your top 5 recommended applications' },
  marketplace:                  { label: 'Career Marketplace™',         desc: 'Access phlebotomy courses, ECG training, interview coaching, mock interviews and employer connections in one place' },
  salary_predictor:             { label: 'Salary Predictor',            desc: '2024/25 AfC take-home calculator for all 4 UK nations with pension, income tax, NI and enhancement options' },
  coach:                        { label: 'AI Career Coach',             desc: 'Chat AI that knows your CV, applications, evidence vault and career goals — ask anything about your NHS career' },
  auto_match_evidence:          { label: 'Auto-Match Evidence',         desc: 'AI automatically matches your stored EvidenceVault™ entries to the criteria of any job you are analysing' },
}

const FREE_BASELINE = [
  { label: '1 analysis per month',            desc: 'Analyse one supporting statement per month against a job description to get your overall score and criteria breakdown' },
  { label: 'Criteria & Values scoring',       desc: 'See how well your statement covers the essential criteria and NHS values from the person specification' },
  { label: 'Shortlist Probability™ (3 factors)', desc: 'Preview of your shortlisting probability based on the three most impactful factors in your statement' },
  { label: 'EvidenceVault™ (3 entries)',      desc: 'Store up to 3 STAR examples in your personal evidence vault to reuse across applications' },
  { label: 'CV Builder (1 profile)',          desc: 'Build and download one professional NHS CV from 35 visual templates' },
  { label: 'Momentum Score™',                desc: 'Track your application activity and see whether your career momentum is building' },
  { label: 'NHS Jobs browser',               desc: 'Browse live NHS vacancies across England, Scotland, Wales, Northern Ireland and Sponsorship roles' },
  { label: 'Salary Predictor',               desc: 'Calculate your full take-home pay at any AfC band across all four UK nations' },
]

// ── Collapsible feature row ───────────────────────────────────────────────────
function FeatureRow({
  label, desc, color, faded, dark,
}: { label: string; desc: string; color: string; faded?: boolean; dark?: boolean }) {
  const [open, setOpen] = useState(false)
  const textCol  = dark ? '#e0e7ff' : faded ? '#9ca3af' : '#1f2937'
  const descCol  = dark ? '#a5b4fc' : '#6b7280'
  const checkBg  = faded ? '#f3f4f633' : color + '22'

  return (
    <div>
      <button onClick={() => setOpen(o => !o)}
        style={{ width: '100%', background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 10, textAlign: 'left' }}>
        <div style={{ width: 20, height: 20, borderRadius: '50%', background: checkBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
          <CheckCircle2 size={12} color={faded ? '#9ca3af' : color} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: textCol, lineHeight: 1.4 }}>{label}</span>
            {open
              ? <ChevronUp size={12} color={color} style={{ flexShrink: 0 }} />
              : <ChevronDown size={12} color={descCol} style={{ flexShrink: 0 }} />
            }
          </div>
          {open && <p style={{ fontSize: 12, color: descCol, margin: '4px 0 0', lineHeight: 1.5 }}>{desc}</p>}
        </div>
      </button>
    </div>
  )
}

function FeatureSection({
  items, color, faded, dark, loading,
}: { items: {label:string;desc:string}[]; color: string; faded?: boolean; dark?: boolean; loading?: boolean }) {
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: dark ? '#a78bfa' : '#9ca3af', fontSize: 13 }}>
      <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Loading from admin settings…
    </div>
  )
  if (items.length === 0) return (
    <p style={{ fontSize: 12, color: dark ? '#6366f1' : '#9ca3af', fontStyle: 'italic' }}>
      No features assigned — set in Admin → Settings
    </p>
  )
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {items.map(f => <FeatureRow key={f.label} label={f.label} desc={f.desc} color={color} faded={faded} dark={dark} />)}
    </div>
  )
}

// ── Card component ────────────────────────────────────────────────────────────
function PlanCard({
  tier, price, label, tagline, badge, icon: Icon, accentColor, borderColor,
  bgStyle, textColor, subtextColor, btnStyle,
  features, loading, onCheckout, loadingTier,
}: any) {
  const dark = tier === 'premium' || tier === 'pro'

  return (
    <div style={{
      borderRadius: 24, border: `2px solid ${borderColor}`,
      padding: '36px 28px', display: 'flex', flexDirection: 'column',
      position: 'relative', ...(bgStyle ?? { background: '#fff' }),
      boxShadow: dark
        ? '0 20px 60px rgba(124,58,237,0.35)'
        : tier !== 'free' ? `0 8px 32px ${borderColor}28` : 'none',
    }}>
      {badge && (
        <div style={{
          position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)',
          padding: '5px 16px', borderRadius: 99, fontSize: 11, fontWeight: 800,
          letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap',
          ...(dark
            ? { background: 'linear-gradient(90deg,#7c3aed,#6366f1)', color: '#fff' }
            : { background: borderColor, color: '#fff' }),
        }}>{badge}</div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ width: 44, height: 44, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18,
          background: dark ? 'rgba(139,92,246,0.2)' : accentColor + '18' }}>
          <Icon size={22} color={accentColor} />
        </div>
        <p style={{ fontSize: 12, fontWeight: 700, color: accentColor, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>{label}</p>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, marginBottom: 6 }}>
          {price === null
            ? <Loader2 size={28} color={dark ? '#a78bfa' : '#6b7280'} style={{ animation: 'spin 1s linear infinite', marginBottom: 4 }} />
            : <>
                <span style={{ fontSize: 46, fontWeight: 900, lineHeight: 1, color: textColor }}>£{price}</span>
                {price > 0 && <span style={{ fontSize: 14, color: subtextColor, marginBottom: 6 }}>/mo</span>}
              </>
          }
        </div>
        <p style={{ fontSize: 13, color: subtextColor, margin: 0 }}>{tagline}</p>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: dark ? 'rgba(255,255,255,0.08)' : '#f3f4f6', marginBottom: 20 }} />

      {/* Features */}
      <div style={{ flex: 1, marginBottom: 28 }}>
        <FeatureSection items={features} color={accentColor} faded={tier === 'free'} dark={dark} loading={loading} />
      </div>

      {/* CTA */}
      {tier === 'free' ? (
        <div style={{ padding: '13px', border: `1.5px solid #e5e7eb`, borderRadius: 14, textAlign: 'center', fontSize: 13, color: '#9ca3af', fontWeight: 600 }}>
          Current plan
        </div>
      ) : (
        <button onClick={() => onCheckout(tier)} disabled={!!loadingTier}
          style={{ width: '100%', padding: '15px', borderRadius: 14, fontSize: 14, fontWeight: 800,
            cursor: loadingTier ? 'not-allowed' : 'pointer', border: 'none', opacity: loadingTier === tier ? 0.7 : 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'opacity 0.15s',
            ...(btnStyle ?? { background: accentColor, color: '#fff' }),
          }}>
          {loadingTier === tier
            ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Redirecting…</>
            : tier === 'pro'     ? <><Zap size={15}      /> Upgrade to Pro — £{price}/mo</>
            : tier === 'elite'   ? <><Crown size={15}    /> Upgrade to Elite — £{price}/mo</>
            :                      <>✦ Get Premium — £{price}/mo</>
          }
        </button>
      )}
      {tier !== 'free' && (
        <p style={{ textAlign: 'center', fontSize: 11, color: subtextColor, marginTop: 10, marginBottom: 0 }}>
          Cancel anytime · Instant access
        </p>
      )}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
function UpgradeClientInner() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const cancelled    = searchParams.get('cancelled') === '1'

  const [loadingTier,   setLoadingTier]   = useState<string | null>(null)
  const [error,         setError]         = useState<string | null>(null)
  const [flagsLoading,  setFlagsLoading]  = useState(true)
  const [pricesLoading, setPricesLoading] = useState(true)

  const [prices,      setPrices]      = useState<Record<string,number>>({ free:0, pro:9, elite:29, premium:49 })
  const [proItems,    setProItems]    = useState<{label:string;desc:string}[]>([])
  const [eliteItems,  setEliteItems]  = useState<{label:string;desc:string}[]>([])
  const [premiumItems,setPremiumItems]= useState<{label:string;desc:string}[]>([])

  useEffect(() => {
    // Fetch prices
    fetch('/api/pricing')
      .then(r => r.json())
      .then(d => { if (d.prices) setPrices(d.prices) })
      .catch(() => {})
      .finally(() => setPricesLoading(false))

    // Fetch feature flags
    fetch('/api/feature-flags')
      .then(r => r.ok ? r.json() : { flags: [] })
      .then(({ flags = [] }) => {
        const pro: {label:string;desc:string}[]     = []
        const elite: {label:string;desc:string}[]   = []
        const premium: {label:string;desc:string}[] = []
        for (const f of flags) {
          if (!f.enabled) continue
          const meta = FEATURES[f.key]
          if (!meta) continue
          if (f.minTier === 'pro')     pro.push(meta)
          if (f.minTier === 'elite')   elite.push(meta)
          if (f.minTier === 'premium') premium.push(meta)
        }
        setProItems(pro); setEliteItems(elite); setPremiumItems(premium)
      })
      .catch(() => {})
      .finally(() => setFlagsLoading(false))
  }, [])

  async function checkout(tier: string) {
    setLoadingTier(tier); setError(null)
    const priceId =
      tier === 'premium' ? process.env.NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID :
      tier === 'elite'   ? process.env.NEXT_PUBLIC_STRIPE_ELITE_PRICE_ID   :
                           process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID
    try {
      const res  = await fetch('/api/stripe/checkout', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId, tier }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Checkout failed')
      window.location.href = data.url
    } catch (e: any) { setError(e.message); setLoadingTier(null) }
  }

  const p = pricesLoading ? null : prices

  const PLANS = [
    {
      tier: 'free', label: 'Free', price: p?.free ?? 0,
      badge: null, tagline: 'Start your journey',
      icon: Shield, accentColor: '#64748b', borderColor: '#94a3b8',
      bgStyle: { background: 'linear-gradient(145deg,#f1f5f9,#e2e8f0)' },
      textColor: '#0f172a', subtextColor: '#475569',
      btnStyle: { background: 'linear-gradient(135deg,#64748b,#475569)', color: '#fff' },
      features: FREE_BASELINE,
      freeCard: true,
    },
    {
      tier: 'pro', label: 'Pro', price: p ? p.pro : null,
      badge: 'Most popular', tagline: 'Everything in Free, plus:',
      icon: Zap, accentColor: '#60a5fa', borderColor: '#2563eb',
      bgStyle: { background: 'linear-gradient(145deg,#1e3a8a,#1d4ed8)' },
      textColor: '#fff', subtextColor: '#bfdbfe',
      btnStyle: { background: 'linear-gradient(135deg,#60a5fa,#3b82f6)', color: '#1e3a8a' },
      features: proItems,
    },
    {
      tier: 'elite', label: 'Elite', price: p ? p.elite : null,
      badge: 'Full access', tagline: 'Everything in Pro, plus:',
      icon: Crown, accentColor: '#b45309', borderColor: '#f59e0b',
      bgStyle: { background: 'linear-gradient(145deg,#fffbeb,#fef3c7)' },
      textColor: '#111827', subtextColor: '#92400e',
      btnStyle: { background: 'linear-gradient(135deg,#d97706,#b45309)', color: '#fff' },
      features: eliteItems,
    },
    {
      tier: 'premium', label: 'Premium', price: p ? p.premium : null,
      badge: '✦ Most powerful', tagline: 'Everything in Elite, plus:',
      icon: Star, accentColor: '#a78bfa', borderColor: '#7c3aed',
      bgStyle: { background: 'linear-gradient(145deg,#1e1b4b,#2e1065)' },
      textColor: '#fff', subtextColor: '#a78bfa',
      btnStyle: { background: 'linear-gradient(135deg,#7c3aed,#6366f1)', color: '#fff' },
      features: premiumItems,
    },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg,#f0f4ff 0%,#faf5ff 50%,#fff7ed 100%)', fontFamily: 'system-ui,-apple-system,sans-serif', padding: '3rem 1.5rem' }}>

      <button onClick={() => router.back()} style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, marginBottom: 48, padding: 0 }}>
        <ArrowLeft size={14} /> Back
      </button>

      {/* Hero */}
      <div style={{ textAlign: 'center', marginBottom: 60, maxWidth: 560, margin: '0 auto 60px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#ede9fe', border: '1px solid #c4b5fd', padding: '6px 16px', borderRadius: 99, fontSize: 12, fontWeight: 700, color: '#7c3aed', letterSpacing: '0.05em', marginBottom: 20 }}>
          <Sparkles size={13} /> NHS Career Platform
        </div>
        <h1 style={{ fontSize: 40, fontWeight: 900, color: '#0f172a', marginBottom: 14, lineHeight: 1.1, letterSpacing: '-0.02em' }}>
          Invest in your<br />NHS career
        </h1>
        <p style={{ fontSize: 16, color: '#64748b', lineHeight: 1.65, margin: 0 }}>
          Every feature is driven by your admin settings. Click any feature to see what it does. Cancel anytime.
        </p>
      </div>

      {cancelled && (
        <div style={{ maxWidth: 480, margin: '0 auto 32px', padding: '12px 20px', background: '#fefce8', border: '1px solid #fde68a', borderRadius: 12, fontSize: 13, color: '#92400e', textAlign: 'center' }}>
          Payment cancelled — no charge was made.
        </div>
      )}
      {error && (
        <div style={{ maxWidth: 480, margin: '0 auto 32px', padding: '12px 20px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, fontSize: 13, color: '#991b1b', textAlign: 'center' }}>
          {error}
        </div>
      )}

      {/* 2×2 grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 20, maxWidth: 1360, margin: '0 auto' }}>
        {PLANS.map(plan => (
          <PlanCard key={plan.tier} {...plan}
            loading={flagsLoading && plan.tier !== 'free'}
            onCheckout={checkout}
            loadingTier={loadingTier}
          />
        ))}
      </div>

      <p style={{ textAlign: 'center', fontSize: 12, color: '#94a3b8', marginTop: 48 }}>
        Secured by Stripe · No hidden fees · Prices and features reflect live admin configuration · Click any feature to expand
      </p>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

export default function UpgradeClient() {
  return (
    <Suspense fallback={<div style={{ minHeight:'100vh', background:'linear-gradient(160deg,#f0f4ff,#faf5ff,#fff7ed)' }} />}>
      <UpgradeClientInner />
    </Suspense>
  )
}