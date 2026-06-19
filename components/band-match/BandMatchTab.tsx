'use client'
import { useFeatureAccess } from '@/components/providers/feature-access-provider'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface BandResult {
  band:            string
  label:           string
  matchPct:        number
  status:          'exceeds' | 'strong' | 'match' | 'stretch' | 'gap'
  metCount:        number
  totalCount:      number
  gaps:            string[]
  strengths:       string[]
  keyMissing:      string[]
  developmentPlan: string[]
  verdict:         string
  suitability:     string
  timeToReady:     number | null
}

interface Props {
  analysisId: string
  jobTitle:   string
  result:     any
  record: {
    essentialCriteria: string
    desirableCriteria: string
    personSpec:        string
    jobDescription:    string
    band:              string | null
  }
}

const STATUS = {
  exceeds: { label: 'Exceeds',  color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0', bar: '#22c55e', dot: '#16a34a' },
  strong:  { label: 'Strong',   color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe', bar: '#3b82f6', dot: '#2563eb' },
  match:   { label: 'Match',    color: '#0f766e', bg: '#f0fdfa', border: '#99f6e4', bar: '#14b8a6', dot: '#0d9488' },
  stretch: { label: 'Stretch',  color: '#b45309', bg: '#fffbeb', border: '#fde68a', bar: '#f59e0b', dot: '#d97706' },
  gap:     { label: 'Gap',      color: '#991b1b', bg: '#fef2f2', border: '#fecaca', bar: '#ef4444', dot: '#dc2626' },
}

function CircleScore({ pct, status }: { pct: number; status: keyof typeof STATUS }) {
  const s   = STATUS[status]
  const r   = 30
  const circ= 2 * Math.PI * r
  return (
    <svg width="76" height="76" viewBox="0 0 76 76" style={{ flexShrink: 0 }}>
      <circle cx="38" cy="38" r={r} fill="none" stroke={s.border} strokeWidth="5" />
      <circle
        cx="38" cy="38" r={r} fill="none"
        stroke={s.bar} strokeWidth="5"
        strokeDasharray={circ}
        strokeDashoffset={circ * (1 - pct / 100)}
        strokeLinecap="round"
        transform="rotate(-90 38 38)"
        style={{ transition: 'stroke-dashoffset 1s ease' }}
      />
      <text x="38" y="34" textAnchor="middle" fontSize="15" fontWeight="600" fill={s.color}>{pct}%</text>
      <text x="38" y="48" textAnchor="middle" fontSize="9" fill={s.color} opacity="0.8">{s.label}</text>
    </svg>
  )
}

function Tag({ text, type }: { text: string; type: 'strength' | 'gap' | 'missing' | 'plan' }) {
  const styles = {
    strength: { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0', icon: '✓' },
    gap:      { bg: '#fef2f2', color: '#991b1b', border: '#fecaca', icon: '✗' },
    missing:  { bg: '#fffbeb', color: '#b45309', border: '#fde68a', icon: '!' },
    plan:     { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe', icon: '→' },
  }
  const s = styles[type]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'flex-start', gap: 5,
      fontSize: 12, lineHeight: 1.4, color: s.color,
      background: s.bg, border: `0.5px solid ${s.border}`,
      borderRadius: 6, padding: '4px 8px',
    }}>
      <span style={{ flexShrink: 0, marginTop: 1, fontWeight: 600 }}>{s.icon}</span>
      {text}
    </span>
  )
}

function BandCard({ band, isTarget, isPro, expanded, onToggle }: {
  band: BandResult; isTarget: boolean; isPro: boolean; expanded: boolean; onToggle: () => void
}) {
  const s      = STATUS[band.status]
  const isLocked = !isPro && !['2', '3', '4'].includes(band.band)

  return (
    <div style={{
      borderRadius: 12,
      border: `${isTarget ? '2px' : '1px'} solid ${isTarget ? s.border : '#e5e7eb'}`,
      overflow: 'hidden',
      opacity: isLocked ? 0.4 : 1,
      filter: isLocked ? 'blur(2.5px)' : 'none',
      pointerEvents: isLocked ? 'none' : 'auto',
      userSelect: isLocked ? 'none' : 'auto',
      transition: 'box-shadow 0.2s',
    }}>

      {/* Card header */}
      <div
        onClick={onToggle}
        style={{
          display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px',
          cursor: 'pointer', background: expanded ? s.bg : '#fff',
          borderBottom: expanded ? `1px solid ${s.border}` : 'none',
        }}
      >
        <CircleScore pct={band.matchPct} status={band.status} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>{band.label}</span>
            {isTarget && (
              <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: '#1e40af', color: '#fff', letterSpacing: '0.04em' }}>
                APPLIED FOR
              </span>
            )}
            {band.suitability && (
              <span style={{ fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 20, background: s.bg, color: s.color, border: `0.5px solid ${s.border}`, marginLeft: 'auto' }}>
                {band.suitability}
              </span>
            )}
          </div>

          <p style={{ fontSize: 13, color: '#374151', margin: '0 0 8px', fontStyle: 'italic', lineHeight: 1.4 }}>
            "{band.verdict}"
          </p>

          {/* Mini progress bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1, height: 5, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${(band.metCount / Math.max(band.totalCount, 1)) * 100}%`, background: s.bar, borderRadius: 3, transition: 'width 1s ease' }} />
            </div>
            <span style={{ fontSize: 11, color: '#6b7280', whiteSpace: 'nowrap' }}>
              {band.metCount}/{band.totalCount} criteria
            </span>
          </div>
        </div>

        <div style={{ color: '#9ca3af', fontSize: 20, transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}>
          ⌄
        </div>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div style={{ padding: '20px', background: '#fff' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: (band.keyMissing?.length || band.developmentPlan?.length) ? 20 : 0 }}>

            {/* Strengths */}
            {(band.strengths?.length ?? 0) > 0 && (
              <div>
                <p style={{ fontSize: 11, fontWeight: 600, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                  Evidence found
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {(band.strengths ?? []).map((s, i) => <Tag key={i} text={s} type="strength" />)}
                </div>
              </div>
            )}

            {/* Gaps */}
            {(band.gaps?.length ?? 0) > 0 && (
              <div>
                <p style={{ fontSize: 11, fontWeight: 600, color: '#991b1b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                  Evidence gaps
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {(band.gaps ?? []).map((g, i) => <Tag key={i} text={g} type="gap" />)}
                </div>
              </div>
            )}
          </div>

          {/* Key missing + development plan */}
          {((band.keyMissing?.length ?? 0) > 0 || (band.developmentPlan?.length ?? 0) > 0) && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, paddingTop: 16, borderTop: '1px solid #f3f4f6' }}>
              {(band.keyMissing?.length ?? 0) > 0 && (
                <div>
                  <p style={{ fontSize: 11, fontWeight: 600, color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                    Critical missing
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {(band.keyMissing ?? []).map((m, i) => <Tag key={i} text={m} type="missing" />)}
                  </div>
                </div>
              )}
              {(band.developmentPlan?.length ?? 0) > 0 && (
                <div>
                  <p style={{ fontSize: 11, fontWeight: 600, color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                    Development plan
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {(band.developmentPlan ?? []).map((d, i) => <Tag key={i} text={d} type="plan" />)}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Time to ready */}
          {(band.timeToReady ?? 0) > 0 && (
            <div style={{ marginTop: 14, padding: '8px 12px', background: '#f9fafb', borderRadius: 8, border: '0.5px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16 }}>⏱</span>
              <span style={{ fontSize: 12, color: '#6b7280' }}>
                Estimated <strong style={{ color: '#374151' }}>{band.timeToReady} months</strong> of development needed to be competitive at this level
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function BandMatchTab({ analysisId, jobTitle, result, record }: Props) {
  const isPro = useFeatureAccess('band_match_advanced')
  const router = useRouter()

  const [loading,  setLoading]  = useState(false)
  const [bandData, setBandData] = useState<BandResult[] | null>(result?.bandMatch ?? null)
  const [error,    setError]    = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

const targetBand = record?.band?.replace(/band\s*/i, '').trim() ?? null

  async function runAnalysis() {
    setLoading(true)
    setError(null)
    try {
      const res  = await fetch(`/api/analysis/${analysisId}/band-match`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Band match failed')
      setBandData(data.bands)
      const target = data.bands?.find((b: BandResult) => b.band === targetBand)
      setExpanded(target?.band ?? data.bands?.[0]?.band ?? null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function handleToggle(band: string) {
    setExpanded(prev => prev === band ? null : band)
  }

  const visibleBands = bandData
    ? isPro ? bandData : bandData.filter(b => ['2', '3', '4'].includes(b.band))
    : []
  const lockedCount = bandData ? bandData.filter(b => !['2', '3', '4'].includes(b.band)).length : 0

  // ── Empty state ──────────────────────────────────────────────────────────
  if (!bandData && !loading) {
    return (
      <div style={{ padding: '48px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>
          📊
        </div>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: '#111827', margin: '0 0 6px' }}>
            Person Spec DNA™ — Band Match
          </h3>
          <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 4px' }}>
            See how your application scores across every NHS band level from 2 to 8a.
          </p>
          <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>
            Includes evidence gaps, development plan, and time-to-ready estimate.
          </p>
        </div>
        {error && (
          <p style={{ fontSize: 13, color: '#991b1b', background: '#fef2f2', border: '0.5px solid #fecaca', borderRadius: 8, padding: '8px 16px', margin: 0 }}>
            {error}
          </p>
        )}
        <button
          onClick={runAnalysis}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '12px 28px', background: '#1e40af', color: '#fff',
            border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          <span style={{ fontSize: 16 }}>📊</span>
          Run Band Match Analysis
        </button>
      </div>
    )
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ padding: '48px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {[0, 1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} style={{
              width: 10, height: 10, borderRadius: '50%',
              background: ['#22c55e', '#3b82f6', '#14b8a6', '#f59e0b', '#ef4444', '#8b5cf6', '#f97316'][i],
              opacity: 0.4,
              animation: `bmPulse 1.4s ease-in-out ${i * 0.1}s infinite`,
            }} />
          ))}
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 14, color: '#374151', fontWeight: 500, margin: '0 0 4px' }}>
            Analysing across Band 2–8a…
          </p>
          <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>
            This takes 15–30 seconds
          </p>
        </div>
        <style>{`@keyframes bmPulse{0%,100%{opacity:.2;transform:scale(.7)}50%{opacity:1;transform:scale(1)}}`}</style>
      </div>
    )
  }

  // ── Results ───────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: '#111827', margin: '0 0 3px' }}>
            Person Spec DNA™
          </h2>
          <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>
            Band-level match analysis{targetBand ? ` · Applied for Band ${targetBand}` : ''}
          </p>
        </div>
        <button
          onClick={runAnalysis}
          style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', fontSize: 12, color: '#6b7280', background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          ↻ Re-analyse
        </button>
      </div>

      {/* Overview grid — all 7 bands at a glance */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
        {bandData!.map(b => {
          const s        = STATUS[b.status]
          const isLocked = !isPro && !['2', '3', '4'].includes(b.band)
          const isActive = expanded === b.band
          return (
            <button
              key={b.band}
              onClick={() => !isLocked && handleToggle(b.band)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                padding: '10px 6px',
                borderRadius: 10,
                border: `${isActive ? '2px' : '1px'} solid ${isActive ? s.border : '#e5e7eb'}`,
                background: isActive ? s.bg : '#fff',
                cursor: isLocked ? 'default' : 'pointer',
                filter: isLocked ? 'blur(2px)' : 'none',
                opacity: isLocked ? 0.35 : 1,
                transition: 'all 0.15s',
                fontFamily: 'inherit',
              }}
            >
              <span style={{ fontSize: 15, fontWeight: 700, color: s.color }}>{b.matchPct}%</span>
              <span style={{ fontSize: 11, color: '#6b7280' }}>{b.label}</span>
              <div style={{ width: '80%', height: 3, background: '#e5e7eb', borderRadius: 2 }}>
                <div style={{ height: '100%', width: `${b.matchPct}%`, background: s.bar, borderRadius: 2 }} />
              </div>
              {b.band === targetBand && (
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#1e40af' }} />
              )}
            </button>
          )
        })}
      </div>

      {/* Band cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {visibleBands.map(b => (
          <BandCard
            key={b.band}
            band={b}
            isTarget={b.band === targetBand}
            isPro={isPro}
            expanded={expanded === b.band}
            onToggle={() => handleToggle(b.band)}
          />
        ))}
      </div>

      {/* Pro upsell */}
      {!isPro && lockedCount > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '16px 20px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12 }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: '0 0 2px' }}>
              🔒 {lockedCount} band levels hidden
            </p>
            <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>
              Pro unlocks Band 5, 6, 7 and 8a — including development plans and time-to-ready estimates
            </p>
          </div>
          <button
            onClick={() => router.push('/upgrade')}
            style={{ flexShrink: 0, padding: '9px 18px', background: '#1e40af', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}
          >
            Upgrade to Pro
          </button>
        </div>
      )}

    </div>
  )
}