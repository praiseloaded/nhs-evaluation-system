
'use client'
import { useState, useEffect } from 'react'
import { Loader2, CheckCircle2, XCircle, AlertTriangle, Sparkles, TrendingUp, Info } from 'lucide-react'

type KWStatus = 'present_evidenced' | 'present_mentioned' | 'absent_required' | 'absent_optional' | 'not_applicable'

interface Keyword {
  keyword: string; status: KWStatus; weight: number; group: string
  definition: string; evidence: string; recommendation: string
}

interface KWResult {
  overallKeywordScore: number
  criticalMissing: string[]
  quickWins: string[]
  updatedAt?: string
  summary: { presentEvidenced: number; presentMentioned: number; absentRequired: number; total: number }
  grouped: { presentEvidenced: Keyword[]; presentMentioned: Keyword[]; absentRequired: Keyword[]; absentOptional: Keyword[] }
}

const STATUS_CONFIG: Record<KWStatus, { label: string; color: string; bg: string; icon: any }> = {
  present_evidenced: { label: 'Evidenced',   color: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800', icon: CheckCircle2 },
  present_mentioned: { label: 'Mentioned',   color: 'text-blue-700 dark:text-blue-300',       bg: 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800',             icon: Info         },
  absent_required:   { label: 'Missing ⚠',  color: 'text-red-700 dark:text-red-300',         bg: 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800',                 icon: XCircle      },
  absent_optional:   { label: 'Not present', color: 'text-gray-600 dark:text-gray-400',       bg: 'bg-muted border-border',                                                       icon: AlertTriangle },
  not_applicable:    { label: 'N/A',          color: 'text-gray-400',                          bg: 'bg-muted border-border',                                                       icon: Info         },
}

// Transform flat API response into the grouped shape the component expects
function normalise(raw: any): KWResult {
  const keywords: Keyword[] = raw.keywords ?? []

  // Promote keywords listed in criticalMissing to absent_required if the AI
  // returned them as absent_optional (common model inconsistency)
  const criticalSet = new Set((raw.criticalMissing ?? []).map((k: string) => k.toLowerCase()))
  const normalised = keywords.map(k => ({
    ...k,
    status: (
      k.status === 'absent_optional' && criticalSet.has(k.keyword.toLowerCase())
        ? 'absent_required'
        : k.status
    ) as KWStatus,
  }))

  return {
    overallKeywordScore: raw.overallKeywordScore ?? 0,
    criticalMissing: raw.criticalMissing ?? [],
    quickWins: raw.quickWins ?? [],
    updatedAt: raw.updatedAt,
    summary: {
      presentEvidenced: normalised.filter(k => k.status === 'present_evidenced').length,
      presentMentioned:  normalised.filter(k => k.status === 'present_mentioned').length,
      absentRequired:    normalised.filter(k => k.status === 'absent_required').length,
      total: normalised.length,
    },
    grouped: {
      presentEvidenced: normalised.filter(k => k.status === 'present_evidenced'),
      presentMentioned:  normalised.filter(k => k.status === 'present_mentioned'),
      absentRequired:    normalised.filter(k => k.status === 'absent_required'),
      absentOptional:    normalised.filter(k => k.status === 'absent_optional'),
    },
  }
}

function ScoreRing({ score }: { score: number }) {
  const r = 36; const circ = 2 * Math.PI * r
  const offset = circ * (1 - score / 100)
  const color = score >= 75 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444'
  return (
    <div className="relative w-24 h-24 flex items-center justify-center">
      <svg className="-rotate-90 absolute inset-0" width="96" height="96">
        <circle cx="48" cy="48" r={r} fill="none" stroke="currentColor" strokeWidth="6" className="text-muted/30" />
        <circle cx="48" cy="48" r={r} fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-700" />
      </svg>
      <div className="text-center">
        <p className="text-xl font-bold text-foreground">{score}</p>
        <p className="text-[9px] text-muted-foreground uppercase tracking-wide">/ 100</p>
      </div>
    </div>
  )
}

export function KeywordIntelligence({ analysisId }: { analysisId: string }) {
  const [result, setResult] = useState<KWResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingSaved, setLoadingSaved] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeGroup, setActiveGroup] = useState<'all' | 'missing' | 'present'>('all')

  // Load previously saved result on mount
  useEffect(() => {
    fetch(`/api/analysis/${analysisId}/keyword-intelligence`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) return
        // Handle both { data: {...} } and flat response shapes
        const raw = d.data ?? d
        if (raw?.keywords || raw?.grouped) {
          setResult(raw.keywords ? normalise(raw) : raw)
        }
      })
      .catch(() => {})
      .finally(() => setLoadingSaved(false))
  }, [analysisId])

  const run = async () => {
    setLoading(true); setError(null)
    try {
      const res = await fetch(`/api/analysis/${analysisId}/keyword-intelligence`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      setResult(normalise(data))
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  if (loadingSaved) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-5 h-5 text-primary animate-spin" />
    </div>
  )

  if (!result && !loading) return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
          <TrendingUp className="w-7 h-7 text-primary" />
        </div>
        <div>
          <p className="text-base font-semibold text-foreground">NHS Keyword Intelligence™</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            Detect which NHS-specific keywords are present, evidenced, or missing from your application — each tracked against 30 high-impact NHS terms.
          </p>
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button onClick={run} className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
          <Sparkles className="w-4 h-4" /> Run Keyword Analysis
        </button>
      </div>
    </div>
  )

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 space-y-3">
      <Loader2 className="w-8 h-8 text-primary animate-spin" />
      <p className="text-sm text-muted-foreground">Scanning for NHS keywords...</p>
    </div>
  )

  if (!result) return null

  // Safety guard — should not happen after normalise, but just in case
  if (!result.grouped) return (
    <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-4 space-y-2">
      <p className="text-sm font-semibold text-red-700 dark:text-red-300">
        Analysis returned an unexpected format. Please re-run.
      </p>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <button onClick={run} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
        <Sparkles className="w-3 h-3" /> Re-run analysis
      </button>
    </div>
  )

  const allKeywords = [
    ...(result.grouped.absentRequired   ?? []),
    ...(result.grouped.presentMentioned ?? []),
    ...(result.grouped.presentEvidenced ?? []),
    ...(result.grouped.absentOptional   ?? []),
  ]

  const displayed = activeGroup === 'missing'
    ? result.grouped.absentRequired
    : activeGroup === 'present'
      ? [...result.grouped.presentEvidenced, ...result.grouped.presentMentioned]
      : allKeywords

  // Group by category
  const byGroup: Record<string, typeof allKeywords> = {}
  displayed.forEach(k => {
    if (!byGroup[k.group]) byGroup[k.group] = []
    byGroup[k.group].push(k)
  })

  return (
    <div className="space-y-6">
      {/* Score header */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-6 flex-wrap">
          <ScoreRing score={result.overallKeywordScore} />
          <div className="flex-1 space-y-3">
            <div>
              <p className="text-lg font-bold text-foreground">NHS Keyword Score</p>
              <p className="text-sm text-muted-foreground">Based on {result.summary.total} high-impact NHS terms</p>
            </div>
            <div className="flex gap-3 flex-wrap">
              {[
                { label: 'Evidenced',        count: result.summary.presentEvidenced, color: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300' },
                { label: 'Mentioned only',   count: result.summary.presentMentioned,  color: 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300' },
                { label: 'Missing (required)', count: result.summary.absentRequired,  color: 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300' },
              ].map(s => (
                <span key={s.label} className={`text-xs font-semibold px-3 py-1.5 rounded-full ${s.color}`}>
                  {s.count} {s.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Critical missing */}
      {result.criticalMissing.length > 0 && (
        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-4 space-y-2">
          <p className="text-sm font-semibold text-red-700 dark:text-red-300 flex items-center gap-2">
            <XCircle className="w-4 h-4" /> Critical Missing Keywords — likely to hurt shortlisting
          </p>
          <div className="flex flex-wrap gap-2">
            {result.criticalMissing.map(k => (
              <span key={k} className="text-xs font-medium bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 px-2.5 py-1 rounded-full">
                ⚠ {k}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Quick wins */}
      {result.quickWins.length > 0 && (
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 p-4 space-y-2">
          <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
            <Sparkles className="w-4 h-4" /> Quick Wins — add these now
          </p>
          <ul className="space-y-1">
            {result.quickWins.map((w, i) => (
              <li key={i} className="text-xs text-emerald-700 dark:text-emerald-300 flex items-start gap-2">
                <span className="shrink-0 mt-0.5">→</span> {w}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: 'all',     label: `All (${allKeywords.length})` },
          { key: 'missing', label: `Missing (${result.grouped.absentRequired.length})` },
          { key: 'present', label: `Present (${result.grouped.presentEvidenced.length + result.grouped.presentMentioned.length})` },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveGroup(tab.key as any)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${activeGroup === tab.key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Keyword groups */}
      {Object.entries(byGroup).map(([group, keywords]) => (
        <div key={group} className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{group}</p>
          <div className="space-y-2">
            {keywords.map(k => {
              const cfg = STATUS_CONFIG[k.status] ?? STATUS_CONFIG.absent_optional
              const Icon = cfg.icon
              return (
                <div key={k.keyword} className={`rounded-xl border p-4 ${cfg.bg}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${cfg.color}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className={`text-sm font-semibold ${cfg.color}`}>{k.keyword}</p>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${cfg.color} opacity-70`}>
                            {cfg.label}
                          </span>
                          <span className="text-[10px] text-muted-foreground">Impact: {k.weight}%</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{k.definition}</p>
                        {k.evidence && k.evidence !== 'Nothing found' && (
                          <p className="text-xs text-foreground/70 mt-1 italic">Found: {k.evidence}</p>
                        )}
                        {(k.status === 'absent_required' || k.status === 'present_mentioned') && k.recommendation && (
                          <p className={`text-xs mt-1.5 font-medium ${cfg.color}`}>→ {k.recommendation}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      <div className="flex items-center justify-between">
        <button onClick={run} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
          <Sparkles className="w-3 h-3" /> Re-run analysis
        </button>
        {result.updatedAt && (
          <p className="text-[10px] text-muted-foreground">
            Saved {new Date(result.updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </div>
    </div>
  )
}