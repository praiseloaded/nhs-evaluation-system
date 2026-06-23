'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle2, Zap, Crown, Shield, Sparkles, ArrowLeft, Loader2 } from 'lucide-react'

// Human-readable labels for every feature key in the catalog.
// Matches the keys in FEATURE_CATALOG / FeatureFlag table.
const FEATURE_LABELS: Record<string, string> = {
  evidence_vault:               'EvidenceVault™ (up to limit)',
  cv_builder:                   'CV Builder (up to limit)',
  shortlist_probability:        'Shortlist Probability™',
  momentum_score:               'Momentum Score™',
  mentorship:                   'Direct mentorship messaging',
  interview_simulator:          'Interview Simulator AI',
  career_gps:                   'Career GPS™ promotion roadmap',
  recruiter_simulator:          'Recruiter Simulator™',
  interview_probability:        'Interview Probability™',
  score_star:                   'STAR completeness score',
  score_language:               'Language mirroring score',
  score_specificity:            'Specificity score',
  score_ats:                    'ATS keyword match score',
  rejection_risk:               'Rejection risk analysis',
  band_gap_alert:               'Band gap alerts',
  statement_flags:              'Statement quality flags',
  weaknesses:                   'Full weaknesses list',
  band_match_advanced:          'Band Match DNA™ — all 7 bands',
  shortlist_factors_pro:        'Full 7-factor shortlist breakdown',
  insights_recommendations:     'Personalised recommendations',
  insights_weaknesses:          'Full gap analysis',
  insights_missing_criteria:    'Missing criteria list',
  insights_rejection_risk:      'Rejection risk gate analysis',
  insights_operational_realism: 'Operational realism scoring',
  insights_band_coaching:       'Band coaching & panel tips',
  full_report:                  'Full PDF report download',
  dashboard_distribution:       'Score distribution chart',
  dashboard_ats_kpi:            'Average ATS KPI',
  dashboard_trend:              'Score trend indicator',
  insights_advanced:            'Advanced insights suite',
}

// Free features are always the same — they don't come from the flag table
// (they're the baseline every user gets regardless).
const FREE_FEATURES = [
  '1 analysis per month',
  'Criteria & Values scoring',
  'Shortlist Probability™ (3 factors)',
  'EvidenceVault™ (3 entries)',
  'CV Builder (1 profile)',
  'Momentum Score™',
]

function Check({ color }: { color: string }) {
  return (
    <div style={{ width: 20, height: 20, borderRadius: '50%', background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
      <CheckCircle2 size={12} color={color} />
    </div>
  )
}

function FeatureList({ items, color, dimmed }: { items: string[]; color: string; dimmed?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {items.map(item => (
        <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <Check color={dimmed ? '#9ca3af' : color} />
          <span style={{ fontSize: 13.5, color: dimmed ? '#9ca3af' : '#374151', lineHeight: 1.45 }}>{item}</span>
        </div>
      ))}
    </div>
  )
}

function UpgradeClientInner() {
  const router      = useRouter()
  const searchParams = useSearchParams()
  const cancelled   = searchParams.get('cancelled') === '1'

  const [loadingTier, setLoadingTier] = useState<'pro' | 'elite' | null>(null)
  const [error, setError]             = useState<string | null>(null)
  const [flagsLoading, setFlagsLoading] = useState(true)

  // Features pulled live from the FeatureFlag table via /api/feature-flags
  const [proFeatures,   setProFeatures]   = useState<string[]>([])
  const [eliteFeatures, setEliteFeatures] = useState<string[]>([])

  useEffect(() => {
    fetch('/api/feature-flags')
      .then(r => r.ok ? r.json() : { flags: [] })
      .then(({ flags }) => {
        const pro: string[]   = []
        const elite: string[] = []
        for (const flag of flags) {
          if (!flag.enabled) continue
          const label = FEATURE_LABELS[flag.key]
          if (!label) continue
          if (flag.minTier === 'pro')   pro.push(label)
          if (flag.minTier === 'elite') elite.push(label)
        }
        setProFeatures(pro)
        setEliteFeatures(elite)
      })
      .catch(() => {})
      .finally(() => setFlagsLoading(false))
  }, [])

  async function checkout(tier: 'pro' | 'elite') {
    setLoadingTier(tier)
    setError(null)
    const priceId = tier === 'pro'
      ? process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID
      : process.env.NEXT_PUBLIC_STRIPE_ELITE_PRICE_ID
    try {
      const res  = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Checkout failed')
      window.location.href = data.url
    } catch (err: any) {
      setError(err.message)
      setLoadingTier(null)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: 'system-ui, -apple-system, sans-serif', padding: '3rem 1.5rem' }}>

      {/* Back */}
      <button onClick={() => router.back()} style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, marginBottom: 40, padding: 0 }}>
        <ArrowLeft size={14} /> Back
      </button>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 52 }}>
        <h1 style={{ fontSize: 34, fontWeight: 800, color: '#111827', marginBottom: 12, lineHeight: 1.15 }}>
          Choose your plan
        </h1>
        <p style={{ fontSize: 15, color: '#6b7280', margin: 0, lineHeight: 1.6 }}>
          Pro includes everything in Free · Elite includes everything in Pro
        </p>
      </div>

      {cancelled && (
        <div style={{ maxWidth: 480, margin: '0 auto 28px', padding: '10px 18px', background: '#fefce8', border: '1px solid #fde68a', borderRadius: 10, fontSize: 13, color: '#92400e', textAlign: 'center' }}>
          Payment cancelled — no charge was made.
        </div>
      )}

      {error && (
        <div style={{ maxWidth: 480, margin: '0 auto 28px', padding: '10px 18px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, fontSize: 13, color: '#991b1b', textAlign: 'center' }}>
          {error}
        </div>
      )}

      {/* Cards */}
      <div style={{ display: 'flex', gap: 24, maxWidth: 980, margin: '0 auto', alignItems: 'stretch', flexWrap: 'wrap', justifyContent: 'center' }}>

        {/* FREE */}
        <div style={{ flex: '1 1 270px', maxWidth: 310, background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 20, padding: '32px 28px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ marginBottom: 28 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <Shield size={20} color="#9ca3af" />
            </div>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Free</p>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, marginBottom: 6 }}>
              <span style={{ fontSize: 42, fontWeight: 800, color: '#111827', lineHeight: 1 }}>£0</span>
            </div>
            <p style={{ fontSize: 13, color: '#9ca3af', margin: 0 }}>Get started today</p>
          </div>
          <div style={{ flex: 1, marginBottom: 28 }}>
            <FeatureList items={FREE_FEATURES} color="#9ca3af" dimmed />
          </div>
          <div style={{ padding: '12px', border: '1.5px solid #e5e7eb', borderRadius: 12, textAlign: 'center', fontSize: 13, color: '#9ca3af', fontWeight: 500 }}>
            Current plan
          </div>
        </div>

        {/* PRO */}
        <div style={{ flex: '1 1 290px', maxWidth: 330, background: '#fff', border: '2px solid #2563eb', borderRadius: 20, padding: '32px 28px', display: 'flex', flexDirection: 'column', boxShadow: '0 8px 30px rgba(37,99,235,0.12)', position: 'relative' }}>
          <div style={{ position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)', background: '#2563eb', color: '#fff', fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', padding: '4px 14px', borderRadius: 20, whiteSpace: 'nowrap' }}>
            Most popular
          </div>
          <div style={{ marginBottom: 28 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <Zap size={20} color="#2563eb" />
            </div>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Pro</p>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, marginBottom: 6 }}>
              <span style={{ fontSize: 42, fontWeight: 800, color: '#111827', lineHeight: 1 }}>£9</span>
              <span style={{ fontSize: 14, color: '#6b7280', marginBottom: 6 }}>/mo</span>
            </div>
            <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Everything in Free, plus:</p>
          </div>
          <div style={{ flex: 1, marginBottom: 28 }}>
            {flagsLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#9ca3af', fontSize: 13 }}>
                <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Loading features…
              </div>
            ) : proFeatures.length > 0 ? (
              <FeatureList items={proFeatures} color="#2563eb" />
            ) : (
              <FeatureList items={['Unlimited analyses', 'Full score breakdown', 'All analysis tools', 'Band Match & Simulators', 'Full PDF report']} color="#2563eb" />
            )}
          </div>
          <button onClick={() => checkout('pro')} disabled={!!loadingTier}
            style={{ width: '100%', padding: '14px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: loadingTier ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, opacity: loadingTier === 'pro' ? 0.7 : 1, transition: 'opacity 0.15s' }}>
            {loadingTier === 'pro' ? <><Loader2 size={15} /> Redirecting…</> : <><Sparkles size={15} /> Upgrade to Pro — £9/mo</>}
          </button>
          <p style={{ textAlign: 'center', fontSize: 11, color: '#9ca3af', marginTop: 10, marginBottom: 0 }}>Cancel anytime · Instant access</p>
        </div>

        {/* ELITE */}
        <div style={{ flex: '1 1 290px', maxWidth: 330, background: '#fff', border: '2px solid #d97706', borderRadius: 20, padding: '32px 28px', display: 'flex', flexDirection: 'column', boxShadow: '0 8px 30px rgba(217,119,6,0.1)', position: 'relative' }}>
          <div style={{ position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)', background: '#d97706', color: '#fff', fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', padding: '4px 14px', borderRadius: 20, whiteSpace: 'nowrap' }}>
            Full access
          </div>
          <div style={{ marginBottom: 28 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <Crown size={20} color="#d97706" />
            </div>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Elite</p>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, marginBottom: 6 }}>
              <span style={{ fontSize: 42, fontWeight: 800, color: '#111827', lineHeight: 1 }}>£29</span>
              <span style={{ fontSize: 14, color: '#6b7280', marginBottom: 6 }}>/mo</span>
            </div>
            <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Everything in Pro, plus:</p>
          </div>
          <div style={{ flex: 1, marginBottom: 28 }}>
            {flagsLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#9ca3af', fontSize: 13 }}>
                <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Loading features…
              </div>
            ) : eliteFeatures.length > 0 ? (
              <FeatureList items={eliteFeatures} color="#d97706" />
            ) : (
              <FeatureList items={['Direct mentorship messaging', 'Priority support', 'Unlimited EvidenceVault™', 'Unlimited CV profiles', 'Early feature access']} color="#d97706" />
            )}
          </div>
          <button onClick={() => checkout('elite')} disabled={!!loadingTier}
            style={{ width: '100%', padding: '14px', background: '#d97706', color: '#fff', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: loadingTier ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, opacity: loadingTier === 'elite' ? 0.7 : 1, transition: 'opacity 0.15s' }}>
            {loadingTier === 'elite' ? <><Loader2 size={15} /> Redirecting…</> : <><Crown size={15} /> Upgrade to Elite — £29/mo</>}
          </button>
          <p style={{ textAlign: 'center', fontSize: 11, color: '#9ca3af', marginTop: 10, marginBottom: 0 }}>Cancel anytime · Instant access</p>
        </div>

      </div>

      <p style={{ textAlign: 'center', fontSize: 12, color: '#9ca3af', marginTop: 40 }}>
        Secured by Stripe · No hidden fees · Feature list reflects current admin configuration
      </p>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

export default function UpgradeClient() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#f8fafc' }} />}>
      <UpgradeClientInner />
    </Suspense>
  )
}