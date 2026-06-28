'use client'

import { useState } from 'react'
import Link         from 'next/link'
import {
  ChevronRight, Loader2, Flame, AlertTriangle,
  CheckCircle2, XCircle, Star, Lightbulb,
  Target, ChevronDown, ChevronUp, Sparkles,
  Eye, BookOpen, Trophy, Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Types ──────────────────────────────────────────────────────────────────────

type HeatLevel = 'critical' | 'important' | 'low'

type Criterion = {
  id: string; text: string; category: string
  heatLevel: HeatLevel; weight: number; maxPoints: number
}

type HiddenCriterion = {
  id: string; text: string; reason: string
  heatLevel: HeatLevel; examples: string[]
}

type ScoringGuide = {
  criterionId: string; criterionText: string; maxPoints: number
  whatScoresHigh: string[]; whatScoresLow: string[]
  idealSTAR: string; keyPhrasesToInclude: string[]
}

type StarOpportunity = {
  experienceRef: string; suggestedFor: string[]
  starSuggestion: string; strengthLevel: string
}

type ExplorerResult = {
  jobTitle: string; band: string | null; employer: string | null
  explicitCriteria: { essential: Criterion[]; desirable: Criterion[] }
  hiddenCriteria: HiddenCriterion[]
  heatMapSummary: { critical: string[]; important: string[]; low: string[]; criticalNote: string }
  scoringGuide: ScoringGuide[]
  starOpportunities: StarOpportunity[]
  shortlistingPrediction: {
    totalAvailablePoints: number; criticalCriteriaCount: number
    estimatedTimeToComplete: string; topThreePriorities: string[]
    shortlistLikelihood: { ifAllCriteriaMet: string; ifCriticalOnly: string }
  }
  quickWins: string[]
}

// ── Heat config ────────────────────────────────────────────────────────────────

const HEAT = {
  critical: {
    label: 'Critical',
    dot:   'bg-red-500',
    badge: 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
    icon:  Flame,
    color: 'text-red-500',
  },
  important: {
    label: 'Important',
    dot:   'bg-amber-400',
    badge: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    icon:  AlertTriangle,
    color: 'text-amber-500',
  },
  low: {
    label: 'Low Value',
    dot:   'bg-muted-foreground/40',
    badge: 'bg-muted text-muted-foreground border-border',
    icon:  CheckCircle2,
    color: 'text-muted-foreground',
  },
}

// ── Heat badge ─────────────────────────────────────────────────────────────────

function HeatBadge({ level }: { level: HeatLevel }) {
  const cfg = HEAT[level]
  return (
    <span className={cn('flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider border px-2 py-0.5 rounded-full', cfg.badge)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dot)} />
      {cfg.label}
    </span>
  )
}

// ── Weight bar ─────────────────────────────────────────────────────────────────

function WeightBar({ weight, maxPoints }: { weight: number; maxPoints: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5">
        {[1,2,3,4,5,6,7,8,9,10].map(i => (
          <div key={i} className={cn(
            'w-1.5 h-3 rounded-sm transition-all',
            i <= weight
              ? weight >= 8 ? 'bg-red-500' : weight >= 5 ? 'bg-amber-400' : 'bg-blue-400'
              : 'bg-muted'
          )} />
        ))}
      </div>
      {maxPoints > 0 && (
        <span className="text-[10px] text-muted-foreground tabular-nums">{maxPoints} pts</span>
      )}
    </div>
  )
}

// ── Expandable criterion row ───────────────────────────────────────────────────

function CriterionRow({
  criterion, guide, index,
}: { criterion: Criterion; guide?: ScoringGuide; index: number }) {
  const [open, setOpen] = useState(false)
  const heatCfg = HEAT[criterion.heatLevel]
  const Icon    = heatCfg.icon

  return (
    <div className={cn(
      'rounded-xl border overflow-hidden transition-all',
      criterion.heatLevel === 'critical' ? 'border-red-200 dark:border-red-900/50' :
      criterion.heatLevel === 'important' ? 'border-amber-200 dark:border-amber-900/50' :
      'border-border'
    )}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
      >
        <span className={cn('text-[11px] font-black tabular-nums shrink-0 mt-0.5 w-5', heatCfg.color)}>
          {index + 1}
        </span>
        <div className="flex-1 min-w-0 space-y-1.5">
          <p className="text-sm text-foreground leading-snug">{criterion.text}</p>
          <WeightBar weight={criterion.weight} maxPoints={criterion.maxPoints} />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <HeatBadge level={criterion.heatLevel} />
          {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>

      {open && guide && (
        <div className="px-4 pb-4 pt-1 border-t border-border space-y-4 bg-muted/10">

          {/* Ideal STAR */}
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-1 flex items-center gap-1.5">
              <Star className="w-3 h-3" /> Ideal STAR example
            </p>
            <p className="text-[12px] text-foreground/80 leading-relaxed">{guide.idealSTAR}</p>
          </div>

          {/* What scores high vs low */}
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-2 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Scores high
              </p>
              <ul className="space-y-1.5">
                {(guide.whatScoresHigh ?? []).map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-[12px] text-foreground/80">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-red-500 mb-2 flex items-center gap-1">
                <XCircle className="w-3 h-3" /> Scores low
              </p>
              <ul className="space-y-1.5">
                {(guide.whatScoresLow ?? []).map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-[12px] text-muted-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0 mt-1.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Key phrases */}
          {guide.keyPhrasesToInclude?.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Mirror these phrases</p>
              <div className="flex flex-wrap gap-2">
                {guide.keyPhrasesToInclude.map((phrase, i) => (
                  <span key={i} className="text-[11px] bg-background border border-border rounded-lg px-2.5 py-1 text-foreground/80 font-mono">
                    "{phrase}"
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      {open && !guide && (
        <p className="px-4 pb-3 text-[12px] text-muted-foreground italic">No scoring guide available for this criterion.</p>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CriteriaExplorerPage() {
  const [jobTitle,  setJobTitle]  = useState('')
  const [jobSpec,   setJobSpec]   = useState('')
  const [cvText,    setCvText]    = useState('')
  const [showCv,    setShowCv]    = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [result,    setResult]    = useState<ExplorerResult | null>(null)
  const [activeTab, setActiveTab] = useState<'heatmap' | 'hidden' | 'scoring' | 'star' | 'wins'>('heatmap')

  async function runAnalysis() {
    if (!jobTitle.trim()) { setError('Please enter the job title'); return }
    if (jobSpec.trim().split(/\s+/).length < 30) { setError('Please paste the full job specification or person spec'); return }
    setLoading(true); setError(null); setResult(null)
    try {
      const res  = await fetch('/api/criteria-explorer', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ jobTitle, jobSpec, cvText: cvText || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Analysis failed')
      setResult(data.result)
      setActiveTab('heatmap')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const tabs = [
    { id: 'heatmap', label: 'Heat Map',       icon: Flame      },
    { id: 'hidden',  label: 'Hidden Criteria', icon: Eye        },
    { id: 'scoring', label: 'Scoring Guide',   icon: Target     },
    { id: 'star',    label: 'STAR Finder',     icon: Star       },
    { id: 'wins',    label: 'Quick Wins',      icon: Zap        },
  ] as const

  const essential = result?.explicitCriteria?.essential ?? []
  const desirable = result?.explicitCriteria?.desirable ?? []
  const critical  = [...essential, ...desirable].filter(c => c.heatLevel === 'critical')
  const important = [...essential, ...desirable].filter(c => c.heatLevel === 'important')
  const low       = [...essential, ...desirable].filter(c => c.heatLevel === 'low')

  return (
    <div className="min-h-screen bg-background">

      <main className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10 space-y-8">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-foreground font-medium">Criteria Explorer</span>
        </div>

        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500 to-amber-500 flex items-center justify-center shrink-0 shadow-md shadow-red-500/20">
            <Flame className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl font-black tracking-tight text-foreground">Omni Shortlist Intelligence™</h1>
              <span className="text-[9px] font-black bg-gradient-to-r from-red-500 to-amber-500 text-white px-2 py-0.5 rounded-full uppercase tracking-wider">Deep Mode</span>
            </div>
            <p className="text-sm text-muted-foreground">Reveals how recruiters actually score your application — not just what the criteria are</p>
          </div>
        </div>

        {!result ? (
          /* ── Input form ── */
          <div className="space-y-5">
            <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Job Details</p>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Job Title</label>
                <input value={jobTitle} onChange={e => setJobTitle(e.target.value)}
                  placeholder="e.g. Advanced Nurse Practitioner Band 7"
                  className="w-full bg-muted/40 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Job Specification / Person Spec <span className="text-muted-foreground/60 normal-case font-normal">(paste the full spec for best results)</span>
                </label>
                <textarea value={jobSpec} onChange={e => setJobSpec(e.target.value)}
                  placeholder="Paste the full job description and person specification here..."
                  rows={8}
                  className="w-full bg-muted/40 border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all resize-none" />
                <p className="text-[11px] text-muted-foreground mt-1 tabular-nums">{jobSpec.trim().split(/\s+/).filter(Boolean).length} words</p>
              </div>

              {/* Optional CV */}
              <div>
                <button onClick={() => setShowCv(s => !s)}
                  className="flex items-center gap-1.5 text-[12px] text-blue-600 dark:text-blue-400 hover:underline">
                  <Sparkles className="w-3.5 h-3.5" />
                  {showCv ? 'Hide' : 'Add your CV / experience'} for STAR matching (optional)
                </button>
                {showCv && (
                  <textarea value={cvText} onChange={e => setCvText(e.target.value)}
                    placeholder="Paste your CV or list your relevant experiences..."
                    rows={6} className="w-full mt-3 bg-muted/40 border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all resize-none" />
                )}
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
                <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                <p className="text-[12px] text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <button onClick={runAnalysis} disabled={loading}
              className="w-full flex items-center justify-center gap-2 text-white rounded-2xl py-3.5 text-[14px] font-bold transition-all active:scale-[0.99] shadow-lg disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #ef4444, #f59e0b)' }}>
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Analysing — reveals hidden scoring in ~20 seconds…</>
                : <><Flame className="w-4 h-4" /> Run Shortlist Intelligence™</>
              }
            </button>

            {/* What this does */}
            <div className="grid sm:grid-cols-3 gap-3">
              {[
                { icon: Flame,     title: 'Recruiter Heat Map',    desc: 'See which criteria carry most shortlisting points'     },
                { icon: Eye,       title: 'Hidden Criteria',        desc: 'Criteria panels always score but never explicitly state' },
                { icon: Target,    title: 'Scoring Guide',          desc: 'Exactly what evidence earns high vs low marks'         },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="rounded-xl border border-border bg-card p-4 space-y-2">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                  <p className="text-[12px] font-bold text-foreground">{title}</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>

        ) : (
          /* ── Results ── */
          <div className="space-y-6">

            {/* Summary strip */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Critical criteria',  value: critical.length,  color: 'text-red-600 dark:text-red-400'   },
                { label: 'Important criteria', value: important.length, color: 'text-amber-600 dark:text-amber-400' },
                { label: 'Hidden criteria',    value: (result.hiddenCriteria ?? []).length, color: 'text-blue-600 dark:text-blue-400' },
              ].map(({ label, value, color }) => (
                <div key={label} className="rounded-2xl border border-border bg-card px-4 py-4 text-center">
                  <div className={`text-2xl font-black ${color}`}>{value}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">{label}</div>
                </div>
              ))}
            </div>

            {/* Critical note */}
            {result.heatMapSummary?.criticalNote && (
              <div className="flex items-start gap-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-2xl px-5 py-4">
                <Flame className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-[13px] text-red-700 dark:text-red-300 leading-relaxed">{result.heatMapSummary.criticalNote}</p>
              </div>
            )}

            {/* Tabs */}
            <div className="flex gap-1 bg-muted/40 rounded-xl p-1 overflow-x-auto">
              {tabs.map(({ id, label, icon: Icon }) => (
                <button key={id} onClick={() => setActiveTab(id)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-semibold whitespace-nowrap transition-all flex-1 justify-center',
                    activeTab === id
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}>
                  <Icon className="w-3.5 h-3.5 shrink-0" /> {label}
                </button>
              ))}
            </div>

            {/* ── Heat Map tab ── */}
            {activeTab === 'heatmap' && (
              <div className="space-y-6">
                {[
                  { label: '🔴 Critical', sublabel: 'Most shortlisting points — address these first', items: critical },
                  { label: '🟡 Important', sublabel: 'Significant weight — include if possible', items: important },
                  { label: '⚪ Low Value', sublabel: 'Pass/fail checks — mention briefly', items: low },
                ].map(({ label, sublabel, items }) => items.length > 0 && (
                  <div key={label} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-black text-foreground">{label}</h3>
                      <span className="text-[11px] text-muted-foreground">{sublabel}</span>
                    </div>
                    <div className="space-y-2">
                      {items.map((c, i) => (
                        <CriterionRow
                          key={c.id} criterion={c} index={i}
                          guide={result.scoringGuide?.find(g => g.criterionId === c.id)}
                        />
                      ))}
                    </div>
                  </div>
                ))}

                {/* Desirable section */}
                {desirable.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-black text-foreground">Desirable criteria</h3>
                    <div className="space-y-2">
                      {desirable.map((c, i) => (
                        <CriterionRow
                          key={c.id} criterion={c} index={i}
                          guide={result.scoringGuide?.find(g => g.criterionId === c.id)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Hidden Criteria tab ── */}
            {activeTab === 'hidden' && (
              <div className="space-y-3">
                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl px-4 py-3">
                  <p className="text-[12px] text-blue-700 dark:text-blue-300 leading-relaxed">
                    These criteria are not stated in the job spec but NHS panels consistently assess them.
                    Candidates who address them score significantly higher.
                  </p>
                </div>
                {(result.hiddenCriteria ?? []).map((h, i) => (
                  <div key={h.id} className="rounded-2xl border border-border bg-card p-5 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-[11px] font-black flex items-center justify-center shrink-0">{i + 1}</div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">{h.text}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{h.reason}</p>
                        </div>
                      </div>
                      <HeatBadge level={h.heatLevel} />
                    </div>
                    {h.examples?.length > 0 && (
                      <div className="pl-9 space-y-1">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">What impresses panels</p>
                        {h.examples.map((ex, j) => (
                          <p key={j} className="flex items-start gap-2 text-[12px] text-foreground/80">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0 mt-0.5" />{ex}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* ── Scoring Guide tab ── */}
            {activeTab === 'scoring' && (
              <div className="space-y-3">
                <p className="text-[12px] text-muted-foreground">Expand each criterion to see exactly what earns full marks vs zero.</p>
                {(result.scoringGuide ?? []).map((guide, i) => {
                  const criterion = [...essential, ...desirable].find(c => c.id === guide.criterionId)
                  if (!criterion) return null
                  return <CriterionRow key={guide.criterionId} criterion={criterion} guide={guide} index={i} />
                })}
              </div>
            )}

            {/* ── STAR Finder tab ── */}
            {activeTab === 'star' && (
              <div className="space-y-4">
                {(result.starOpportunities ?? []).length === 0 ? (
                  <div className="text-center py-10 space-y-3">
                    <BookOpen className="w-8 h-8 text-muted-foreground mx-auto" />
                    <p className="text-sm text-muted-foreground">Add your CV or experience above and re-run to get personalised STAR suggestions.</p>
                    <button onClick={() => setResult(null)} className="text-[12px] text-blue-600 dark:text-blue-400 hover:underline">
                      Start over with CV →
                    </button>
                  </div>
                ) : (result.starOpportunities).map((opp, i) => (
                  <div key={i} className="rounded-2xl border border-border bg-card p-5 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Your experience</p>
                        <p className="text-sm font-semibold text-foreground">{opp.experienceRef}</p>
                      </div>
                      <span className={cn('text-[10px] font-bold uppercase tracking-wider border px-2 py-0.5 rounded-full shrink-0',
                        opp.strengthLevel === 'strong'   ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' :
                        opp.strengthLevel === 'moderate' ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800' :
                        'bg-muted text-muted-foreground border-border'
                      )}>
                        {opp.strengthLevel}
                      </span>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl px-4 py-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-1">How to frame as STAR</p>
                      <p className="text-[12px] text-foreground/80 leading-relaxed">{opp.starSuggestion}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Use for criteria</p>
                      <div className="flex flex-wrap gap-1.5">
                        {opp.suggestedFor.map(id => {
                          const c = [...essential, ...desirable].find(cr => cr.id === id)
                          return c ? (
                            <span key={id} className="text-[11px] bg-muted border border-border rounded-lg px-2.5 py-1 text-foreground/80 line-clamp-1 max-w-[200px]">
                              {c.text.slice(0, 50)}{c.text.length > 50 ? '…' : ''}
                            </span>
                          ) : null
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── Quick Wins tab ── */}
            {activeTab === 'wins' && (
              <div className="space-y-4">
                {/* Priorities */}
                {result.shortlistingPrediction?.topThreePriorities?.length > 0 && (
                  <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-amber-500" />
                      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Top 3 priorities</p>
                    </div>
                    {result.shortlistingPrediction.topThreePriorities.map((p, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-[11px] font-black flex items-center justify-center shrink-0">{i + 1}</div>
                        <p className="text-[13px] text-foreground/80 leading-snug">{p}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Quick wins list */}
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Quick wins</p>
                  {(result.quickWins ?? []).map((win, i) => (
                    <div key={i} className="flex items-start gap-3 rounded-xl border border-border bg-card px-4 py-3">
                      <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <p className="text-[13px] text-foreground/80 leading-snug">{win}</p>
                    </div>
                  ))}
                </div>

                {/* Shortlisting likelihood */}
                {result.shortlistingPrediction && (
                  <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Shortlisting outlook</p>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: 'If all criteria addressed', value: result.shortlistingPrediction.shortlistLikelihood.ifAllCriteriaMet },
                        { label: 'Critical criteria only',    value: result.shortlistingPrediction.shortlistLikelihood.ifCriticalOnly   },
                      ].map(({ label, value }) => (
                        <div key={label} className="text-center p-3 bg-muted/30 rounded-xl">
                          <div className={cn('text-lg font-black capitalize',
                            value === 'high'   ? 'text-emerald-600 dark:text-emerald-400' :
                            value === 'medium' ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'
                          )}>{value}</div>
                          <div className="text-[11px] text-muted-foreground mt-0.5">{label}</div>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                      <span className="font-semibold">{result.shortlistingPrediction.totalAvailablePoints}</span> total available points ·
                      <span className="font-semibold">{result.shortlistingPrediction.estimatedTimeToComplete}</span> to complete
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Reset */}
            <button onClick={() => setResult(null)}
              className="flex items-center gap-2 text-[12px] text-muted-foreground hover:text-foreground transition-colors">
              ← Analyse a different role
            </button>
          </div>
        )}

      </main>
    </div>
  )
}