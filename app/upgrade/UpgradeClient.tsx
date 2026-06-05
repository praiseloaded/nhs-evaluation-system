'use client'

import { Check, X, ShieldCheck, RefreshCw, Users, Lock } from 'lucide-react'
import { Navbar } from '@/components/navbar'
import { useSearchParams } from 'next/navigation'
import { useState } from 'react'

// ─── Plans ─────────────────────────────

const freePlan = {
  label: 'Current',
  name: 'Free',
  price: '£0',
  desc: 'Basic scores and keyword detection to get you started.',
  included: [
    'ATS match score',
    'NHS values analysis',
    'Missing keywords detection',
    'Shortlist readiness meter',
    'NHS role match suggestions',
    '1 analysis / day',
  ],
  excluded: [
    'Full statement rewrite',
    'Rejection risk analysis',
    'Language mirroring',
    'Interview coach',
  ],
}

const proPlan = {
  label: 'Recommended',
  name: 'Pro',
  price: '£14.99',
  desc: 'Everything you need to get shortlisted — rewrites, analysis, and unlimited scans.',
  included: [
    'Everything in Free',
    'Unlimited analyses',
    'Full statement rewrite',
    'Language mirroring',
    'Rejection risk analysis',
    'Interview prep AI',
    'Application tracking',
  ],
}

// ─── Feature Row ─────────────────────────

function FeatureRow({
  text,
  included,
  isPro,
}: {
  text: string
  included: boolean
  isPro?: boolean
}) {
  return (
    <li className="flex items-start gap-2 text-sm">
      {included ? (
        <Check className={`w-4 h-4 mt-0.5 ${isPro ? 'text-purple-600' : 'text-green-600'}`} />
      ) : (
        <X className="w-4 h-4 mt-0.5 text-muted-foreground/40" />
      )}
      <span className={included ? 'text-foreground' : 'text-muted-foreground'}>
        {text}
      </span>
    </li>
  )
}

// ─── PAGE ─────────────────────────────

export default function UpgradeClient() {
  const searchParams = useSearchParams()
  const reason = searchParams.get('reason')

  const [loading, setLoading] = useState(false)

  const isLimitReached = reason === 'limit_reached'

  const handleUpgrade = async () => {
    try {
      setLoading(true)

      const res = await fetch('/api/billing/upgrade', {
        method: 'POST',
      })

      const data = await res.json()

      if (!data.success || !data.url) {
        throw new Error(data.error || 'Stripe checkout failed')
      }

      window.location.href = data.url
    } catch (err) {
      console.error(err)
      alert('Upgrade failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-muted/40">
      <Navbar />

      <div className="py-16 px-4">

        {/* Header */}
        <div className="text-center mb-10 max-w-md mx-auto">
          <span className="inline-block text-xs font-medium text-purple-700 bg-purple-50 px-3 py-1 rounded-full mb-4">
            Plans
          </span>

          <h1 className="text-2xl font-semibold mb-2">
            {isLimitReached
              ? "You've used your free analysis"
              : "Unlock your full potential"}
          </h1>

          <p className="text-sm text-muted-foreground">
            {isLimitReached
              ? "Upgrade to continue using AI analysis tools."
              : "Choose a plan that boosts your NHS application success."}
          </p>
        </div>

        {/* Plans */}
        <div className="grid md:grid-cols-2 gap-4 max-w-4xl mx-auto">

          {/* Free */}
          <div className="border rounded-xl p-6 bg-white">
            <p className="text-sm">{freePlan.name}</p>
            <p className="text-2xl font-bold">{freePlan.price}</p>

            <ul className="mt-4 space-y-2">
              {freePlan.included.map(f => (
                <FeatureRow key={f} text={f} included />
              ))}
              {freePlan.excluded.map(f => (
                <FeatureRow key={f} text={f} included={false} />
              ))}
            </ul>

            <button disabled className="mt-4 w-full border py-2 rounded-lg text-sm">
              Current plan
            </button>
          </div>

          {/* Pro */}
          <div className="border-2 border-purple-500 rounded-xl p-6 bg-white">
            <p className="text-sm">{proPlan.name}</p>
            <p className="text-2xl font-bold">{proPlan.price}</p>

            <ul className="mt-4 space-y-2">
              {proPlan.included.map(f => (
                <FeatureRow key={f} text={f} included isPro />
              ))}
            </ul>

            <button
              onClick={handleUpgrade}
              disabled={loading}
              className="mt-4 w-full bg-purple-600 text-white py-2 rounded-lg text-sm"
            >
              {loading ? 'Redirecting...' : 'Upgrade with Stripe'}
            </button>
          </div>
        </div>

        {/* Trust */}
        <div className="grid md:grid-cols-4 gap-3 max-w-4xl mx-auto mt-10 text-center">
          {[
            { icon: ShieldCheck, t: 'Secure payments' },
            { icon: RefreshCw, t: 'Instant access' },
            { icon: Users, t: 'Built for NHS' },
            { icon: Lock, t: 'Data protected' },
          ].map(({ icon: Icon, t }) => (
            <div key={t} className="border rounded-lg p-4">
              <Icon className="mx-auto mb-2 text-purple-600" />
              <p className="text-sm">{t}</p>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}