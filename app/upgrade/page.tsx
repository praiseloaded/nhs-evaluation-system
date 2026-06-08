'use client'

// app/upgrade/page.tsx

import { useState }     from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle2, Zap, Shield, FileText, Mic, BarChart3, BookOpen } from 'lucide-react'

const PRO_FEATURES = [
  { icon: FileText,  label: 'Unlimited analyses'                       },
  { icon: BarChart3, label: 'Full 7-factor shortlist probability score' },
  { icon: Shield,    label: 'Targeted gap recommendations'             },
  { icon: BookOpen,  label: 'Full PDF report download'                 },
  { icon: Mic,       label: 'NHS Recruiter Simulator™'                 },
  { icon: Zap,       label: 'EvidenceVault™ auto-detection'            },
  { icon: BarChart3, label: 'Band coaching & panel chair view'         },
  { icon: Shield,    label: 'Rejection risk gate analysis'             },
]

export default function UpgradePage() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const cancelled    = searchParams.get('cancelled') === '1'

  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  async function handleUpgrade() {
    setLoading(true)
    setError(null)
    try {
      const res  = await fetch('/api/stripe/checkout', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to start checkout')
      window.location.href = data.url
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', fontFamily: 'system-ui, sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>

      {cancelled && (
        <div style={{ marginBottom: 20, padding: '10px 20px', backgroundColor: '#fef9c3', border: '1px solid #fde68a', borderRadius: 8, fontSize: 13, color: '#854d0e' }}>
          Payment cancelled — no charge was made.
        </div>
      )}

      <div style={{ maxWidth: 460, width: '100%' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, backgroundColor: '#dbeafe', padding: '6px 16px', borderRadius: 20, marginBottom: 16 }}>
            <Zap size={14} color="#1e40af" />
            <span style={{ fontSize: 13, fontWeight: 600, color: '#1e40af' }}>NHS JobReady AI Pro</span>
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#111827', marginBottom: 8, lineHeight: 1.2 }}>
            Get shortlisted more often
          </h1>
          <p style={{ fontSize: 15, color: '#6b7280', lineHeight: 1.6 }}>
            Full analysis, evidence vault, and every tool you need to compete for NHS roles.
          </p>
        </div>

        {/* Pricing card */}
        <div style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>

          {/* Price header */}
          <div style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #1e40af 100%)', padding: '32px 32px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 13, color: '#93c5fd', marginBottom: 8, fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Pro Plan
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', gap: 4 }}>
              <span style={{ fontSize: 20, color: '#fff', marginTop: 8, fontWeight: 500 }}>£</span>
              <span style={{ fontSize: 52, fontWeight: 800, color: '#fff', lineHeight: 1 }}>9</span>
              <span style={{ fontSize: 16, color: '#93c5fd', marginTop: 14 }}>/month</span>
            </div>
            <p style={{ fontSize: 13, color: '#93c5fd', marginTop: 8 }}>Cancel anytime · Instant access</p>
          </div>

          {/* Features */}
          <div style={{ padding: '24px 28px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
              {PRO_FEATURES.map(({ icon: Icon, label }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', backgroundColor: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <CheckCircle2 size={13} color="#15803d" />
                  </div>
                  <span style={{ fontSize: 14, color: '#374151' }}>{label}</span>
                </div>
              ))}
            </div>

            {error && (
              <div style={{ marginBottom: 14, padding: '10px 14px', backgroundColor: '#fee2e2', border: '1px solid #fecaca', borderRadius: 8, fontSize: 13, color: '#991b1b' }}>
                {error}
              </div>
            )}

            <button
              onClick={handleUpgrade}
              disabled={loading}
              style={{ width: '100%', padding: '14px', backgroundColor: loading ? '#93c5fd' : '#1e40af', color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', transition: 'opacity 0.2s' }}
            >
              {loading ? 'Redirecting to checkout…' : 'Upgrade to Pro — £9/month'}
            </button>

            <p style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', marginTop: 12 }}>
              Secured by Stripe · No hidden fees
            </p>
          </div>
        </div>

        {/* Back link */}
        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <button
            onClick={() => router.back()}
            style={{ fontSize: 13, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
          >
            ← Go back
          </button>
        </div>

      </div>
    </div>
  )
}