// components/evidence-gaps.tsx
// MOAT 4 — Missing Evidence Detector™ Tab Component
'use client'
import { useState } from 'react'
import { Loader2, XCircle, AlertTriangle, CheckCircle2, Sparkles, Search, ChevronDown, ChevronUp } from 'lucide-react'

type Severity = 'critical' | 'moderate' | 'low' | 'none'
type EvidenceStatus = 'strong' | 'moderate' | 'weak' | 'missing'

interface Gap {
  criterion: string; type: 'essential' | 'desirable'
  evidenceStatus: EvidenceStatus; severity: Severity
  whatWasFound: string; gapDescription: string; howToFix: string; exampleLanguage: string
}

interface GapResult {
  overallGapScore: number; summary: string; criticalGapCount: number
  grouped: { critical: Gap[]; moderate: Gap[]; low: Gap[]; strong: Gap[] }
  counts: { critical: number; moderate: number; low: number; strong: number; total: number }
}

const SEVERITY_CONFIG: Record<Severity, { label: string; color: string; bg: string; icon: any; border: string }> = {
  critical: { label: 'CRITICAL',  color: 'text-red-700 dark:text-red-300',    bg: 'bg-red-50 dark:bg-red-950/50',       border: 'border-red-200 dark:border-red-800',     icon: XCircle       },
  moderate: { label: 'MODERATE',  color: 'text-amber-700 dark:text-amber-300',bg: 'bg-amber-50 dark:bg-amber-950/50',   border: 'border-amber-200 dark:border-amber-800', icon: AlertTriangle  },
  low:      { label: 'LOW',       color: 'text-blue-700 dark:text-blue-300',  bg: 'bg-blue-50 dark:bg-blue-950/50',     border: 'border-blue-200 dark:border-blue-800',   icon: AlertTriangle  },
  none:     { label: 'STRONG',    color: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-50 dark:bg-emerald-950/50', border: 'border-emerald-200 dark:border-emerald-800', icon: CheckCircle2 },
}

function GapCard({ gap }: { gap: Gap }) {
  const [expanded, setExpanded] = useState(gap.severity === 'critical')
  const cfg = SEVERITY_CONFIG[gap.severity]
  const Icon = cfg.icon

  return (
    <div className={`rounded-xl border ${cfg.border} ${cfg.bg} overflow-hidden`}>
      <button onClick={() => setExpanded(e => !e)} className="w-full flex items-start gap-3 p-4 text-left hover:opacity-90 transition-opacity">
        <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${cfg.color}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${cfg.color}`}>{cfg.label}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${gap.type === 'essential' ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300' : 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300'}`}>
              {gap.type}
            </span>
          </div>
          <p className="text-sm font-semibold text-foreground mt-1 leading-snug">{gap.criterion}</p>
          {!expanded && gap.severity !== 'none' && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{gap.gapDescription}</p>
          )}
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-current/10">
          {gap.whatWasFound && gap.whatWasFound !== 'Nothing found' && (
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">What was found</p>
              <p className="text-xs text-foreground/80">{gap.whatWasFound}</p>
            </div>
          )}
          {gap.gapDescription && gap.severity !== 'none' && (
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">What's missing</p>
              <p className="text-xs text-foreground/80">{gap.gapDescription}</p>
            </div>
          )}
          {gap.howToFix && gap.severity !== 'none' && (
            <div className={`rounded-lg p-3 ${cfg.bg} border ${cfg.border}`}>
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-1 ${cfg.color}">→ How to fix</p>
              <p className={`text-xs font-medium ${cfg.color}`}>{gap.howToFix}</p>
            </div>
          )}
          {gap.exampleLanguage && gap.severity !== 'none' && (
            <div className="rounded-lg bg-muted p-3">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Example language to add</p>
              <p className="text-xs text-foreground italic">"{gap.exampleLanguage}"</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function EvidenceGaps({ analysisId }: { analysisId: string }) {
  const [result, setResult] = useState<GapResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'critical' | 'moderate' | 'strong'>('all')

  const run = async () => {
    setLoading(true); setError(null)
    try {
      const res = await fetch(`/api/analysis/${analysisId}/evidence-gaps`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      setResult(data)
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  if (!result && !loading) return (
    <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center space-y-4">
      <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
        <Search className="w-7 h-7 text-primary" />
      </div>
      <div>
        <p className="text-base font-semibold text-foreground">Missing Evidence Detector™</p>
        <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
          Scan every essential and desirable criterion. See exactly what's missing, how severe it is, and what to add.
        </p>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <button onClick={run} className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
        <Search className="w-4 h-4" /> Detect Evidence Gaps
      </button>
    </div>
  )

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 space-y-3">
      <Loader2 className="w-8 h-8 text-primary animate-spin" />
      <p className="text-sm text-muted-foreground">Analysing every criterion for evidence gaps...</p>
    </div>
  )

  if (!result) return null

  const allGaps = [...result.grouped.critical, ...result.grouped.moderate, ...result.grouped.low, ...result.grouped.strong]
  const displayed = filter === 'critical' ? result.grouped.critical
    : filter === 'moderate' ? result.grouped.moderate
    : filter === 'strong' ? result.grouped.strong
    : allGaps

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-lg font-bold text-foreground">Evidence Gap Report</p>
            <p className="text-sm text-muted-foreground mt-0.5">{result.summary}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-3xl font-bold text-foreground">{result.overallGapScore}<span className="text-base font-normal text-muted-foreground">/100</span></p>
            <p className="text-xs text-muted-foreground">Evidence coverage</p>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Critical gaps', count: result.counts.critical, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-950' },
            { label: 'Moderate gaps', count: result.counts.moderate, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950' },
            { label: 'Minor gaps', count: result.counts.low, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950' },
            { label: 'Strong evidence', count: result.counts.strong, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950' },
          ].map(s => (
            <div key={s.label} className={`rounded-xl ${s.bg} p-3 text-center`}>
              <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: 'all', label: `All (${allGaps.length})` },
          { key: 'critical', label: `Critical (${result.counts.critical})` },
          { key: 'moderate', label: `Moderate (${result.counts.moderate})` },
          { key: 'strong', label: `Strong (${result.counts.strong})` },
        ].map(tab => (
          <button key={tab.key} onClick={() => setFilter(tab.key as any)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${filter === tab.key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Gap cards */}
      <div className="space-y-2">
        {displayed.length === 0
          ? <p className="text-sm text-muted-foreground text-center py-8">No gaps in this category.</p>
          : displayed.map((gap, i) => <GapCard key={i} gap={gap} />)
        }
      </div>

      <button onClick={run} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
        <Sparkles className="w-3 h-3" /> Re-run analysis
      </button>
    </div>
  )
}