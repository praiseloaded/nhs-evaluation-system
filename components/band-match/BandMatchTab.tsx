'use client'

// components/band-match/BandMatchTab.tsx

import { useState, useEffect } from 'react'
import { useRouter }           from 'next/navigation'
import { Lock, TrendingUp, AlertCircle, CheckCircle2, XCircle, MinusCircle, Zap, ChevronDown, ChevronUp } from 'lucide-react'

interface Props {
  analysisId: string
  isPro:      boolean
  jobTitle:   string
  result:     any    // full result object — criteria, values, scoredBreakdown etc.
  record:     {      // raw DB record fields
    essentialCriteria: string
    desirableCriteria: string
    personSpec:        string
    jobDescription:    string
    band:              string | null
  }
}

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

// ── Band definitions ──────────────────────────────────────────────────────────
const BAND_LEVELS = [
  { band: '2',   label: 'Band 2',   description: 'Healthcare Support Worker'       },
  { band: '3',   label: 'Band 3',   description: 'Senior Support / Technician'     },
  { band: '4',   label: 'Band 4',   description: 'Associate Practitioner'          },
  { band: '5',   label: 'Band 5',   description: 'Qualified Practitioner / Staff Nurse' },
  { band: '6',   label: 'Band 6',   description: 'Specialist / Senior Practitioner' },
  { band: '7',   label: 'Band 7',   description: 'Advanced Practitioner / Manager' },
  { band: '8a',  label: 'Band 8a',  description: 'Consultant / Senior Manager'     },
]

function statusConfig(status: BandResult['status']) {
  const map = {
    exceeds: { bg: '#dcfce7', border: '#86efac', text: '#166534', label: 'Exceeds',  dot: '#22c55e' },
    strong:  { bg: '#dbeafe', border: '#93c5fd', text: '#1e40af', label: 'Strong',   dot: '#3b82f6' },
    match:   { bg: '#f0fdf4', border: '#bbf7d0', text: '#15803d', label: 'Match',    dot: '#22c55e' },
    stretch: { bg: '#fef9c3', border: '#fde68a', text: '#854d0e', label: 'Stretch',  dot: '#f59e0b' },
    gap:     { bg: '#fee2e2', border: '#fecaca', text: '#991b1b', label: 'Gap',      dot: '#ef4444' },
  }
  return map[status]
}

function ScoreArc({ pct, color }: { pct: number; color: string }) {
  const r  = 28
  const cx = 36
  const cy = 36
  const circumference = 2 * Math.PI * r
  const offset = circumference - (pct / 100) * circumference

  return (
    <svg width="72" height="72" viewBox="0 0 72 72">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e5e7eb" strokeWidth="6" />
      <circle
        cx={cx} cy={cy} r={r} fill="none"
        stroke={color} strokeWidth="6"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{ transition: 'stroke-dashoffset 1s ease' }}
      />
      <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle" fontSize="13" fontWeight="700" fill={color}>
        {pct}%
      </text>
    </svg>
  )
}

function BandCard({ band, isPro, targetBand, expanded, onToggle }: {
  band: BandResult
  isPro: boolean
  targetBand: string | null
  expanded: boolean
  onToggle: () => void
}) {
  const cfg       = statusConfig(band.status)
  const isTarget  = band.band === targetBand
  const isLocked  = !isPro && !['2','3','4'].includes(band.band)

  return (
    <div style={{
      border: `1.5px solid ${isTarget ? '#1e40af' : cfg.border}`,
      borderRadius: 12,
      overflow: 'hidden',
      opacity: isLocked ? 0.6 : 1,
      filter: isLocked ? 'blur(1.5px)' : 'none',
      pointerEvents: isLocked ? 'none' : 'auto',
    }}>
      {/* Card header */}
      <div
        onClick={onToggle}
        style={{ background: cfg.bg, padding: '12px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}
      >
        <ScoreArc pct={band.matchPct} color={cfg.dot} />

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{band.label}</span>
            {isTarget && (
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, backgroundColor: '#1e40af', color: '#fff', letterSpacing: '0.04em' }}>
                APPLIED
              </span>
            )}
            <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 10, backgroundColor: cfg.bg, color: cfg.text, border: `1px solid ${cfg.border}`, marginLeft: 'auto' }}>
              {cfg.label}
            </span>
          </div>
          <div style={{ fontSize: 12, color: '#6b7280' }}>
            {band.metCount} of {band.totalCount} criteria evidenced
          </div>
          <div style={{ fontSize: 12, color: '#374151', marginTop: 3, fontStyle: 'italic' }}>
            {band.verdict}
          </div>
        </div>

        <div style={{ color: '#9ca3af' }}>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div style={{ padding: '14px 16px', backgroundColor: '#fff', borderTop: `1px solid ${cfg.border}` }}>
          {band.strengths.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                ✓ Evidenced
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {band.strengths.map((s, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, fontSize: 12, color: '#374151' }}>
                    <CheckCircle2 size={13} color="#22c55e" style={{ flexShrink: 0, marginTop: 1 }} />
                    {s}
                  </div>
                ))}
              </div>
            </div>
          )}
          {band.gaps.length > 0 && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#991b1b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                ✗ Missing evidence
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {band.gaps.map((g, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, fontSize: 12, color: '#374151' }}>
                    <XCircle size={13} color="#ef4444" style={{ flexShrink: 0, marginTop: 1 }} />
                    {g}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export function BandMatchTab({ analysisId, isPro, jobTitle, result, record }: Props) {
  const router = useRouter()
  const [loading,    setLoading]    = useState(false)
  const [bandData,   setBandData]   = useState<BandResult[] | null>(null)
  const [error,      setError]      = useState<string | null>(null)
  const [expanded,   setExpanded]   = useState<string | null>(null)

  const targetBand = record.band?.replace(/band\s*/i, '').trim() ?? null

  async function runAnalysis() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/analysis/${analysisId}/band-match`, {
        method: 'POST',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Band match analysis failed')
      setBandData(data.bands)
      // Auto-expand target band
      if (data.bands?.length) {
        const target = data.bands.find((b: BandResult) => b.band === targetBand)
        setExpanded(target?.band ?? data.bands[0].band)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Visible bands based on tier
  const visibleBands = bandData
    ? isPro
      ? bandData
      : bandData.filter(b => ['2','3','4'].includes(b.band))
    : []

  const lockedCount = bandData
    ? bandData.filter(b => !['2','3','4'].includes(b.band)).length
    : 0

  return (
    <div style={{ padding: '24px 0', display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 4 }}>
            Person Spec DNA™
          </h2>
          <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.5 }}>
            How well does your application match each NHS band level?
            {targetBand && ` You applied for Band ${targetBand}.`}
          </p>
        </div>
        {!bandData && !loading && (
          <button
            onClick={runAnalysis}
            style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 18px', backgroundColor: '#1e40af', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            <TrendingUp size={15} />
            Analyse Band Match
          </button>
        )}
      </div>

      {/* Loading state */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '48px 0' }}>
          <div style={{ width: 40, height: 40, border: '3px solid #dbeafe', borderTopColor: '#1e40af', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <p style={{ fontSize: 13, color: '#6b7280' }}>Analysing your application across all NHS band levels…</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ display: 'flex', gap: 10, padding: '12px 16px', backgroundColor: '#fee2e2', border: '1px solid #fecaca', borderRadius: 10 }}>
          <AlertCircle size={16} color="#ef4444" style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <p style={{ fontSize: 13, color: '#991b1b', fontWeight: 500 }}>{error}</p>
            <button onClick={runAnalysis} style={{ fontSize: 12, color: '#1e40af', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 4, textDecoration: 'underline' }}>Try again</button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!bandData && !loading && !error && (
        <div style={{ textAlign: 'center', padding: '48px 24px', backgroundColor: '#f9fafb', borderRadius: 12, border: '1px dashed #e5e7eb' }}>
          <TrendingUp size={32} color="#9ca3af" style={{ margin: '0 auto 12px' }} />
          <p style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
            Band Match not yet run
          </p>
          <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
            Click "Analyse Band Match" to see how your application scores across NHS Band 2–8a.
          </p>
          <button
            onClick={runAnalysis}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 20px', backgroundColor: '#1e40af', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            <Zap size={14} /> Run Band Match Analysis
          </button>
        </div>
      )}

      {/* Results */}
      {bandData && !loading && (
        <>
          {/* Summary bar */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 8 }}>
            {bandData.map(b => {
              const cfg = statusConfig(b.status)
              const isLocked = !isPro && !['2','3','4'].includes(b.band)
              return (
                <div
                  key={b.band}
                  onClick={() => !isLocked && setExpanded(expanded === b.band ? null : b.band)}
                  style={{
                    padding: '10px 8px',
                    textAlign: 'center',
                    backgroundColor: b.band === expanded ? cfg.bg : '#f9fafb',
                    border: `1.5px solid ${b.band === expanded ? cfg.border : '#e5e7eb'}`,
                    borderRadius: 10,
                    cursor: isLocked ? 'not-allowed' : 'pointer',
                    filter: isLocked ? 'blur(2px)' : 'none',
                    opacity: isLocked ? 0.5 : 1,
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ fontSize: 15, fontWeight: 700, color: cfg.dot }}>{b.matchPct}%</div>
                  <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{b.label}</div>
                  {b.band === targetBand && <div style={{ fontSize: 9, fontWeight: 700, color: '#1e40af', marginTop: 2 }}>APPLIED</div>}
                </div>
              )
            })}
          </div>

          {/* Band cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
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

          {/* Pro upsell for locked bands */}
          {!isPro && lockedCount > 0 && (
            <div style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #4c1d95 100%)', borderRadius: 12, padding: '20px 24px', color: '#fff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Lock size={16} color="#c4b5fd" />
                <span style={{ fontSize: 14, fontWeight: 700 }}>{lockedCount} band levels hidden</span>
              </div>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', marginBottom: 14, lineHeight: 1.5 }}>
                Upgrade to Pro to see Band 5, 6, 7, and 8a match scores — including exactly what evidence is missing to qualify for senior NHS roles.
              </p>
              <button
                onClick={() => router.push('/upgrade')}
                style={{ padding: '10px 20px', backgroundColor: '#fff', color: '#4c1d95', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Unlock All Bands → Upgrade to Pro
              </button>
            </div>
          )}

          {/* Re-run button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={runAnalysis}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', backgroundColor: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              <TrendingUp size={13} /> Re-run analysis
            </button>
          </div>
        </>
      )}
    </div>
  )
}