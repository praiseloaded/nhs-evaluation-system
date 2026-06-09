'use client'

import { useState, useEffect } from 'react'
import { useRouter }           from 'next/navigation'

interface BandResult {
  band:        string
  label:       string
  matchPct:    number
  status:      'exceeds' | 'strong' | 'match' | 'stretch' | 'gap'
  metCount:    number
  totalCount:  number
  gaps:        string[]
  strengths:   string[]
  verdict:     string
}

interface Props {
  analysisId:  string
  isPro:       boolean
  jobTitle:    string
  result:      any
  record: {
    essentialCriteria: string
    desirableCriteria: string
    personSpec:        string
    jobDescription:    string
    band:              string | null
  }
}

const STATUS_MAP = {
  exceeds: { bg: 'var(--color-background-success)', border: 'var(--color-border-success)', text: 'var(--color-text-success)', label: 'Exceeds',  bar: '#22c55e' },
  strong:  { bg: 'var(--color-background-info)',    border: 'var(--color-border-info)',    text: 'var(--color-text-info)',    label: 'Strong',   bar: '#3b82f6' },
  match:   { bg: 'var(--color-background-success)', border: 'var(--color-border-success)', text: 'var(--color-text-success)', label: 'Match',    bar: '#22c55e' },
  stretch: { bg: 'var(--color-background-warning)', border: 'var(--color-border-warning)', text: 'var(--color-text-warning)', label: 'Stretch',  bar: '#f59e0b' },
  gap:     { bg: 'var(--color-background-danger)',  border: 'var(--color-border-danger)',  text: 'var(--color-text-danger)',  label: 'Gap',      bar: '#ef4444' },
}

function MiniBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div style={{ height: 4, background: 'var(--color-border-tertiary)', borderRadius: 2, overflow: 'hidden', marginTop: 4 }}>
      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 2, transition: 'width 1s ease' }} />
    </div>
  )
}

function BandCard({ band, isPro, targetBand, expanded, onToggle }: {
  band: BandResult; isPro: boolean; targetBand: string | null; expanded: boolean; onToggle: () => void
}) {
  const cfg      = STATUS_MAP[band.status]
  const isTarget = band.band === targetBand
  const isLocked = !isPro && !['2', '3', '4'].includes(band.band)

  return (
    <div style={{
      borderRadius: 'var(--border-radius-lg)',
      border: `${isTarget ? '1.5px' : '0.5px'} solid ${isTarget ? 'var(--color-border-info)' : 'var(--color-border-tertiary)'}`,
      overflow: 'hidden',
      opacity: isLocked ? 0.45 : 1,
      filter: isLocked ? 'blur(2px)' : 'none',
      pointerEvents: isLocked ? 'none' : 'auto',
      userSelect: isLocked ? 'none' : 'auto',
      background: 'var(--color-background-primary)',
    }}>
      {/* Header row */}
      <div
        onClick={onToggle}
        style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', cursor: 'pointer', background: expanded ? 'var(--color-background-secondary)' : 'transparent' }}
      >
        {/* Score circle */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <svg width="52" height="52" viewBox="0 0 52 52">
            <circle cx="26" cy="26" r="22" fill="none" stroke="var(--color-border-tertiary)" strokeWidth="4" />
            <circle
              cx="26" cy="26" r="22" fill="none"
              stroke={cfg.bar} strokeWidth="4"
              strokeDasharray={`${2 * Math.PI * 22}`}
              strokeDashoffset={`${2 * Math.PI * 22 * (1 - band.matchPct / 100)}`}
              strokeLinecap="round"
              transform="rotate(-90 26 26)"
              style={{ transition: 'stroke-dashoffset 1s ease' }}
            />
            <text x="26" y="26" textAnchor="middle" dominantBaseline="central" fontSize="12" fontWeight="500" fill={cfg.bar}>
              {band.matchPct}%
            </text>
          </svg>
        </div>

        {/* Label + verdict */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
            <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)' }}>{band.label}</span>
            {isTarget && (
              <span style={{ fontSize: 10, fontWeight: 500, padding: '2px 7px', borderRadius: 20, background: 'var(--color-background-info)', color: 'var(--color-text-info)', letterSpacing: '0.03em' }}>
                applied
              </span>
            )}
            <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 20, background: cfg.bg, color: cfg.text, border: `0.5px solid ${cfg.border}` }}>
              {cfg.label}
            </span>
          </div>
          <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.4 }}>{band.verdict}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
            <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>{band.metCount} of {band.totalCount} criteria evidenced</span>
          </div>
          <MiniBar pct={band.matchPct} color={cfg.bar} />
        </div>

        {/* Chevron */}
        <div style={{ color: 'var(--color-text-tertiary)', fontSize: 18, transition: 'transform 0.2s', transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
          ⌄
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div style={{ padding: '12px 16px 16px', borderTop: '0.5px solid var(--color-border-tertiary)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {band.strengths.length > 0 && (
              <div>
                <p style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-text-success)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                  Evidence found
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {band.strengths.map((s, i) => (
                    <div key={i} style={{ display: 'flex', gap: 6, fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
                      <span style={{ color: 'var(--color-text-success)', flexShrink: 0, marginTop: 1 }}>✓</span>
                      {s}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {band.gaps.length > 0 && (
              <div>
                <p style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-text-danger)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                  Missing evidence
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {band.gaps.map((g, i) => (
                    <div key={i} style={{ display: 'flex', gap: 6, fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
                      <span style={{ color: 'var(--color-text-danger)', flexShrink: 0, marginTop: 1 }}>✗</span>
                      {g}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export function BandMatchTab({ analysisId, isPro, jobTitle, result, record }: Props) {
  const router = useRouter()
  const [loading,  setLoading]  = useState(false)
  const [bandData, setBandData] = useState<BandResult[] | null>(result?.bandMatch ?? null)
  const [error,    setError]    = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [animated, setAnimated] = useState(false)

  const targetBand = record.band?.replace(/band\s*/i, '').trim() ?? null

  // Auto-run if not stored
  useEffect(() => {
    if (!bandData) runAnalysis()
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  // Trigger bar animations after data loads
  useEffect(() => {
    if (bandData) {
      setTimeout(() => setAnimated(true), 100)
      if (!expanded) {
        const target = bandData.find(b => b.band === targetBand)
        setExpanded(target?.band ?? bandData[0]?.band ?? null)
      }
    }
  }, [bandData])  // eslint-disable-line react-hooks/exhaustive-deps

  async function runAnalysis() {
    setLoading(true)
    setError(null)
    try {
      const res  = await fetch(`/api/analysis/${analysisId}/band-match`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Band match failed')
      setBandData(data.bands)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const visibleBands = bandData
    ? isPro ? bandData : bandData.filter(b => ['2', '3', '4'].includes(b.band))
    : []

  const lockedCount = bandData
    ? bandData.filter(b => !['2', '3', '4'].includes(b.band)).length
    : 0

  // Loading skeleton
  if (loading) {
    return (
      <div style={{ padding: '32px 0' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '48px 0' }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {[0,1,2].map(i => (
              <div key={i} style={{
                width: 8, height: 8, borderRadius: '50%',
                background: 'var(--color-border-secondary)',
                animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
              }} />
            ))}
          </div>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: 0 }}>
            Analysing across NHS Band 2–8a…
          </p>
        </div>
        <style>{`@keyframes pulse { 0%,100%{opacity:.3;transform:scale(.8)} 50%{opacity:1;transform:scale(1)} }`}</style>
      </div>
    )
  }

  // Error
  if (error) {
    return (
      <div style={{ padding: '24px 0' }}>
        <div style={{ display: 'flex', gap: 10, padding: '14px 16px', background: 'var(--color-background-danger)', border: '0.5px solid var(--color-border-danger)', borderRadius: 'var(--border-radius-md)' }}>
          <span style={{ color: 'var(--color-text-danger)', flexShrink: 0 }}>⚠</span>
          <div>
            <p style={{ fontSize: 13, color: 'var(--color-text-danger)', margin: '0 0 4px', fontWeight: 500 }}>{error}</p>
            <button onClick={runAnalysis} style={{ fontSize: 12, color: 'var(--color-text-info)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
              Try again
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!bandData) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 500, color: 'var(--color-text-primary)', margin: '0 0 4px' }}>
            Person Spec DNA™
          </h2>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: 0 }}>
            How your application scores across NHS Band 2–8a
            {targetBand && ` · You applied for Band ${targetBand}`}
          </p>
        </div>
        <button
          onClick={runAnalysis}
          style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', fontSize: 12, color: 'var(--color-text-secondary)', background: 'transparent', border: '0.5px solid var(--color-border-secondary)', borderRadius: 'var(--border-radius-md)', cursor: 'pointer', fontFamily: 'inherit' }}
        >
          ↻ Re-run
        </button>
      </div>

      {/* Summary bar — all 7 bands as mini cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
        {bandData.map(b => {
          const cfg      = STATUS_MAP[b.status]
          const isLocked = !isPro && !['2', '3', '4'].includes(b.band)
          const isActive = expanded === b.band
          return (
            <div
              key={b.band}
              onClick={() => !isLocked && setExpanded(expanded === b.band ? null : b.band)}
              style={{
                padding: '8px 6px',
                textAlign: 'center',
                borderRadius: 'var(--border-radius-md)',
                border: `${isActive ? '1.5px' : '0.5px'} solid ${isActive ? cfg.border : 'var(--color-border-tertiary)'}`,
                background: isActive ? cfg.bg : 'var(--color-background-primary)',
                cursor: isLocked ? 'default' : 'pointer',
                filter: isLocked ? 'blur(2px)' : 'none',
                opacity: isLocked ? 0.4 : 1,
                transition: 'all 0.15s',
                userSelect: 'none',
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 500, color: cfg.bar }}>{b.matchPct}%</div>
              <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)', marginTop: 2 }}>{b.label}</div>
              {b.band === targetBand && (
                <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--color-text-info)', margin: '3px auto 0' }} />
              )}
            </div>
          )
        })}
      </div>

      {/* Band cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {visibleBands.map(b => (
          <BandCard
            key={b.band}
            band={b}
            isPro={isPro}
            targetBand={targetBand}
            expanded={expanded === b.band}
            onToggle={() => setExpanded(expanded === b.band ? null : b.band)}
          />
        ))}
      </div>

      {/* Pro upsell */}
      {!isPro && lockedCount > 0 && (
        <div style={{ background: 'var(--color-background-secondary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-lg)', padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)', margin: '0 0 3px' }}>
                🔒 {lockedCount} band levels hidden
              </p>
              <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: 0 }}>
                Upgrade to Pro to see Band 5, 6, 7 and 8a match scores
              </p>
            </div>
            <button
              onClick={() => router.push('/upgrade')}
              style={{ flexShrink: 0, padding: '8px 16px', background: 'var(--color-text-primary)', color: 'var(--color-background-primary)', border: 'none', borderRadius: 'var(--border-radius-md)', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}
            >
              Upgrade to Pro
            </button>
          </div>
        </div>
      )}

    </div>
  )
}