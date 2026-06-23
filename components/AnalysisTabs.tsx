'use client'
import { useFeatureAccess } from '@/components/providers/feature-access-provider'
// components/AnalysisTabs.tsx
// Updated to include MOAT 7 (Keyword Intelligence™) and MOAT 4 (Evidence Gaps™) tabs

import { useState } from 'react'
import { BandMatchTab }  from '@/components/band-match/BandMatchTab'

import { KeywordIntelligence } from '@/components/keyword-intelligence'
import { EvidenceGaps } from '@/components/evidence-gaps'
import {
  BarChart2, Dna, TrendingUp, Search,
} from 'lucide-react'

interface Props {
  analysisId: string
  jobTitle: string
  result: any
  record: {
    essentialCriteria: string
    desirableCriteria: string
    personSpec: string
    jobDescription: string
    band: string | null
  }
  children: React.ReactNode  // Tab 1 content (existing analysis sections)
}

type TabKey = 'analysis' | 'band' | 'keywords' | 'gaps'

const TABS: { key: TabKey; label: string; icon: any; proOnly?: boolean }[] = [
  { key: 'analysis',  label: 'Analysis',             icon: BarChart2   },
  { key: 'band',      label: 'Band Match DNA™',       icon: Dna         },
  { key: 'keywords',  label: 'Keyword Intel™',        icon: TrendingUp  },
  { key: 'gaps',      label: 'Evidence Gaps™',        icon: Search      },
]

export function AnalysisTabs({ analysisId, jobTitle, result, record, children }: Props) {
  const isPro = useFeatureAccess('insights_advanced')
  const [activeTab, setActiveTab] = useState<TabKey>('analysis')

  return (
    <div className="space-y-6">
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-border overflow-x-auto pb-0 -mb-px">
        {TABS.map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors -mb-px ${
                activeTab === tab.key
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
              {tab.proOnly && !isPro && (
                <span className="text-[9px] font-bold bg-violet-600 text-white px-1.5 py-0.5 rounded-full ml-0.5">
                  PRO or ELITE
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      <div>
        {/* Tab 1 — existing analysis content passed as children */}
        {activeTab === 'analysis' && (
          <div className="space-y-10">{children}</div>
        )}

        {/* Tab 2 — Band Match DNA™ */}
     {activeTab === 'band' && (
  <BandMatchTab
    analysisId={analysisId}
    jobTitle={jobTitle}
    result={result}
    record={record}
  />
)}

        {/* Tab 3 — NHS Keyword Intelligence™ (MOAT 7) */}
        {activeTab === 'keywords' && (
          <KeywordIntelligence analysisId={analysisId} />
        )}

        {/* Tab 4 — Missing Evidence Detector™ (MOAT 4) */}
        {activeTab === 'gaps' && (
          <EvidenceGaps analysisId={analysisId} />
        )}
      </div>
    </div>
  )
}