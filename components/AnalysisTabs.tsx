'use client'

// components/AnalysisTabs.tsx
// Wraps the analysis detail page content into tabs.
// Tab 1: Analysis (all existing sections passed as children)
// Tab 2: Band Match (Person Spec DNA™)

import { useState }      from 'react'
import { TrendingUp, BarChart3 } from 'lucide-react'
import { BandMatchTab }  from '@/components/band-match/BandMatchTab'

interface Props {
  analysisId: string
  isPro:      boolean
  jobTitle:   string
  result:     any
  record: {
    essentialCriteria: string
    desirableCriteria: string
    personSpec:        string
    jobDescription:    string
    band:              string | null
  }
  children: React.ReactNode  // existing analysis sections
}

const TABS = [
  { id: 'analysis',   label: 'Analysis',          icon: BarChart3  },
  { id: 'band-match', label: 'Band Match DNA™',   icon: TrendingUp },
]

export function AnalysisTabs({ analysisId, isPro, jobTitle, result, record, children }: Props) {
  const [active, setActive] = useState<'analysis' | 'band-match'>('analysis')

  return (
    <div>
      {/* ── Tab bar ── */}
      <div style={{
        display: 'flex',
        gap: 4,
        borderBottom: '1px solid #e5e7eb',
        marginBottom: 32,
      }}>
        {TABS.map(tab => {
          const Icon    = tab.icon
          const isActive = active === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActive(tab.id as any)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '10px 18px',
                fontSize: 13,
                fontWeight: isActive ? 600 : 500,
                color: isActive ? '#1e40af' : '#6b7280',
                backgroundColor: 'transparent',
                border: 'none',
                borderBottom: isActive ? '2px solid #1e40af' : '2px solid transparent',
                cursor: 'pointer',
                fontFamily: 'inherit',
                marginBottom: -1,
                transition: 'all 0.15s',
                whiteSpace: 'nowrap',
              }}
            >
              <Icon size={14} />
              {tab.label}
              {tab.id === 'band-match' && !isPro && (
                <span style={{
                  fontSize: 9,
                  fontWeight: 700,
                  padding: '1px 5px',
                  borderRadius: 8,
                  backgroundColor: '#dbeafe',
                  color: '#1e40af',
                  letterSpacing: '0.04em',
                }}>
                  PRO
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ── Tab content ── */}
      {active === 'analysis' && (
        <div className="space-y-10">
          {children}
        </div>
      )}

      {active === 'band-match' && (
        <BandMatchTab
          analysisId={analysisId}
          isPro={isPro}
          jobTitle={jobTitle}
          result={result}
          record={record}
        />
      )}
    </div>
  )
}