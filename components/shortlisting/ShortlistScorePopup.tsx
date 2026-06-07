'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter }                   from 'next/navigation'
import type { ShortlistProbabilityBreakdown } from '@/lib/billing/evidence-vault'

interface Props {
  data:    ShortlistProbabilityBreakdown
  isPro:   boolean
  onClose: () => void
}

const FACTORS: Array<{
  key:     keyof ShortlistProbabilityBreakdown['factors']
  label:   string
  proOnly: boolean
}> = [
  { key: 'essentialCriteriaMatch',      label: 'Essential criteria match',      proOnly: false },
  { key: 'nhsValuesEvidence',           label: 'NHS values evidence',           proOnly: false },
  { key: 'atsCompatibility',            label: 'ATS compatibility',             proOnly: false },
  { key: 'desirableCriteriaMatch',      label: 'Desirable criteria match',      proOnly: true  },
  { key: 'clinicalCompetencies',        label: 'Clinical competencies',         proOnly: true  },
  { key: 'supportingStatementStrength', label: 'Statement strength',            proOnly: true  },
  { key: 'evidenceDepth',               label: 'Evidence depth',                proOnly: true  },
]

function barColor(score: number) {
  if (score >= 75) return '#22c55e'
  if (score >= 55) return '#f59e0b'
  return '#ef4444'
}

function bandColors(band: string): [string, string] {
  const map: Record<string, [string, string]> = {
    'Highly Competitive': ['#dcfce7', '#166534'],
    'Strong':             ['#dcfce7', '#166534'],
    'Competitive':        ['#dbeafe', '#1e40af'],
    'Weak':               ['#fef9c3', '#854d0e'],
    'Unlikely':           ['#fee2e2', '#991b1b'],
  }
  return map[band] ?? ['#f3f4f6', '#374151']
}

export function ShortlistScorePopup({ data, isPro, onClose }: Props) {
  const router     = useRouter()
  const overlayRef = useRef<HTMLDivElement>(null)
  const [animScore, setAnimScore] = useState(0)
  const [barsReady, setBarsReady] = useState(false)

  useEffect(() => {
    const target = data.overall
    let current  = 0
    const id = setInterval(() => {
      current = Math.min(current + 2, target)
      setAnimScore(current)
      if (current >= target) clearInterval(id)
    }, 18)
    return () => clearInterval(id)
  }, [data.overall])

  useEffect(() => {
    const id = setTimeout(() => setBarsReady(true), 150)
    return () => clearTimeout(id)
  }, [])

  const [bandBg, bandText] = bandColors(data.band)

  // factors to render
  const visibleFactors = isPro ? FACTORS : FACTORS.filter(f => !f.proOnly)
  const lockedFactors  = isPro ? [] : FACTORS.filter(f => f.proOnly)

  return (
    <div
      ref={overlayRef}
      onClick={e => { if (e.target === overlayRef.current) onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        backgroundColor: 'rgba(0,0,0,0.65)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
      }}
      role="dialog"
      aria-modal="true"
    >
      <div style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: 16,
        width: '100%',
        maxWidth: 520,
        maxHeight: '90vh',
        overflowY: 'auto',
        position: 'relative',
      }}>

        {/* ── Header ── */}
        <div style={{ padding: '1.5rem 1.5rem 1rem', borderBottom: '1px solid #f3f4f6' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#9ca3af', marginBottom: 4 }}>
                Shortlist probability
              </p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 8 }}>
                <span style={{ fontSize: 56, fontWeight: 700, color: '#111827', lineHeight: 1 }}>{animScore}</span>
                <span style={{ fontSize: 24, color: '#6b7280', fontWeight: 400 }}>%</span>
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 20, backgroundColor: bandBg, color: bandText }}>
                {data.band}
              </span>
            </div>
            <button
              onClick={onClose}
              style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid #e5e7eb', backgroundColor: '#f9fafb', cursor: 'pointer', color: '#6b7280', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
            >✕</button>
          </div>
        </div>

        {/* ── Body ── */}
        <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', backgroundColor: '#ffffff' }}>

          {/* Column headers */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#9ca3af', width: 210, flexShrink: 0 }}>Factor</span>
            <span style={{ flex: 1 }} />
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#9ca3af', width: 40, textAlign: 'right' }}>Score</span>
          </div>

          <div style={{ borderTop: '1px solid #f3f4f6' }} />

          {/* Visible factor rows */}
          {visibleFactors.map(({ key, label }) => {
            const score = data.factors[key]
            return (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 13, color: '#374151', width: 210, flexShrink: 0 }}>{label}</span>
                <div style={{ flex: 1, height: 6, backgroundColor: '#f3f4f6', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 3, backgroundColor: barColor(score), width: barsReady ? `${score}%` : '0%', transition: 'width 0.9s cubic-bezier(0.4,0,0.2,1)' }} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#111827', width: 40, textAlign: 'right' }}>{score}%</span>
              </div>
            )
          })}

          {/* Locked rows — free only */}
          {lockedFactors.length > 0 && (
            <>
              {lockedFactors.map(({ key, label }) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10, filter: 'blur(3px)', opacity: 0.4, pointerEvents: 'none', userSelect: 'none' }}>
                  <span style={{ fontSize: 13, color: '#374151', width: 210, flexShrink: 0 }}>{label}</span>
                  <div style={{ flex: 1, height: 6, backgroundColor: '#f3f4f6', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 3, backgroundColor: '#94a3b8', width: '62%' }} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#111827', width: 40, textAlign: 'right' }}>—</span>
                </div>
              ))}

              {/* Lock notice */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', backgroundColor: '#f9fafb', borderRadius: 8, border: '1px solid #e5e7eb' }}>
                <span style={{ fontSize: 14 }}>🔒</span>
                <span style={{ fontSize: 12, color: '#6b7280' }}>
                  {lockedFactors.length} more factors unlocked with <strong style={{ color: '#111827' }}>Pro</strong>
                </span>
              </div>
            </>
          )}

          <div style={{ borderTop: '1px solid #f3f4f6' }} />

          {/* Why not 90%? */}
          {data.missingEvidence.length > 0 && (
            <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 10, padding: '12px 14px' }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#92400e', marginBottom: 6 }}>
                ⚠ Why not 90%? — missing evidence
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: isPro ? 0 : 8 }}>
                {data.missingEvidence.map(item => (
                  <span key={item} style={{ fontSize: 12, padding: '3px 10px', borderRadius: 20, backgroundColor: '#fef3c7', color: '#92400e' }}>
                    ○ {item}
                  </span>
                ))}
              </div>
              {!isPro && (
                <p style={{ fontSize: 12, color: '#b45309', marginTop: 8, lineHeight: 1.5 }}>
                  Upgrade to Pro to see exactly how to fix each gap with targeted recommendations.
                </p>
              )}
            </div>
          )}

          {/* ── Free upsell ── */}
          {!isPro && (
            <div style={{ backgroundColor: '#1e1b4b', backgroundImage: 'linear-gradient(135deg, #1e1b4b 0%, #4c1d95 100%)', borderRadius: 12, padding: '1.25rem', color: '#ffffff' }}>
              <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 4, color: '#ffffff' }}>
                Want to push this to 90%+?
              </p>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', marginBottom: 14, lineHeight: 1.6 }}>
                You're seeing 3 of 7 scored factors. Upgrade to Pro to unlock the full breakdown, see exactly what's holding you back, and get targeted recommendations to get shortlisted.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
                {[
                  'Full 7-factor score breakdown',
                  'Targeted fix for every gap',
                  'Panel chair recruiter view',
                  'Clinical & evidence depth scoring',
                  'Unlimited analyses',
                ].map(item => (
                  <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#ffffff' }}>
                    <span style={{ color: '#86efac', fontWeight: 700 }}>✓</span> {item}
                  </div>
                ))}
              </div>
              <button
                onClick={() => router.push('/upgrade')}
                style={{ width: '100%', padding: '11px 16px', backgroundColor: '#ffffff', color: '#4c1d95', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Unlock Full Analysis → Upgrade to Pro
              </button>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginTop: 8 }}>
                Cancel anytime · Instant access
              </p>
            </div>
          )}

          {/* ── Pro footer ── */}
          {isPro && (
            <button
              onClick={onClose}
              style={{ width: '100%', padding: '10px 16px', backgroundColor: '#111827', color: '#ffffff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Close
            </button>
          )}

        </div>
      </div>
    </div>
  )
}