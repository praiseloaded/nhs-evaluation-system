'use client'

import { useState, useEffect } from 'react'
import { Navbar } from '@/components/navbar'
import Link       from 'next/link'
import {
  FlaskConical, Flame, Globe, ChevronRight,
  Loader2, Trophy, Clock, RotateCcw,
  TrendingUp, AlertTriangle, CheckCircle2,
  FileText,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Types ──────────────────────────────────────────────────────────────────────

type ABTestRow = {
  id: string; jobTitle: string; scoreA: number; scoreB: number
  winner: string | null; createdAt: string
}

type ExplorationRow = {
  id: string; jobTitle: string; createdAt: string
}

type Tab = 'ab' | 'criteria'

// ── Score ring (small) ─────────────────────────────────────────────────────────

function MiniRing({ score, color }: { score: number; color: string }) {
  const r    = 16
  const circ = 2 * Math.PI * r
  const off  = circ - (score / 100) * circ
  return (
    <svg width="40" height="40" viewBox="0 0 40 40">
      <circle cx="20" cy="20" r={r} fill="none" stroke="currentColor" className="text-muted/40" strokeWidth="3.5" />
      <circle cx="20" cy="20" r={r} fill="none" stroke={color} strokeWidth="3.5"
        strokeDasharray={circ} strokeDashoffset={off}
        strokeLinecap="round" transform="rotate(-90 20 20)" />
      <text x="20" y="20" textAnchor="middle" dominantBaseline="middle"
        className="fill-foreground font-bold" fontSize="9">{score}</text>
    </svg>
  )
}

// ── AB Test card ───────────────────────────────────────────────────────────────

function ABCard({ test, onView }: { test: ABTestRow; onView: () => void }) {
  const winA  = test.winner === 'A'
  const winB  = test.winner === 'B'
  const tied  = test.winner === 'tied'
  const diff  = Math.abs(test.scoreA - test.scoreB)

  return (
    <div className="rounded-2xl border border-border bg-card hover:border-primary/30 transition-all group">
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[12px] font-bold text-foreground truncate">{test.jobTitle}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {new Date(test.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>
          {tied ? (
            <span className="text-[9px] font-black uppercase tracking-wider bg-muted text-muted-foreground px-2 py-0.5 rounded-full shrink-0">Tied</span>
          ) : (
            <span className={cn(
              'flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0',
              'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
            )}>
              <Trophy className="w-2.5 h-2.5" /> Statement {test.winner} wins
            </span>
          )}
        </div>

        {/* Score comparison */}
        <div className="flex items-center gap-3">
          <div className={cn('flex items-center gap-2 flex-1 p-2.5 rounded-xl border',
            winA ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20' : 'border-border bg-muted/20'
          )}>
            <MiniRing score={test.scoreA} color={winA ? '#22c55e' : '#60a5fa'} />
            <div>
              <p className="text-[9px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Statement A</p>
              <p className="text-[11px] font-black text-foreground">{test.scoreA}/100</p>
            </div>
          </div>

          <div className="text-[10px] text-muted-foreground font-bold shrink-0">
            {diff > 0 ? `+${diff}` : '='}
          </div>

          <div className={cn('flex items-center gap-2 flex-1 p-2.5 rounded-xl border',
            winB ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20' : 'border-border bg-muted/20'
          )}>
            <MiniRing score={test.scoreB} color={winB ? '#22c55e' : '#a78bfa'} />
            <div>
              <p className="text-[9px] font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider">Statement B</p>
              <p className="text-[11px] font-black text-foreground">{test.scoreB}/100</p>
            </div>
          </div>
        </div>

        <button onClick={onView}
          className="w-full text-[12px] font-semibold text-primary hover:underline text-center py-1">
          View full comparison →
        </button>
      </div>
    </div>
  )
}

// ── Criteria Explorer card ─────────────────────────────────────────────────────

function ExplorationCard({ exp, onView }: { exp: ExplorationRow; onView: () => void }) {
  return (
    <div className="rounded-2xl border border-border bg-card hover:border-primary/30 transition-all">
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[12px] font-bold text-foreground truncate">{exp.jobTitle}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {new Date(exp.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-950/30 flex items-center justify-center shrink-0">
            <Flame className="w-4 h-4 text-red-500" />
          </div>
        </div>
        <button onClick={onView}
          className="w-full text-[12px] font-semibold text-primary hover:underline text-center py-1">
          View heat map & scoring guide →
        </button>
      </div>
    </div>
  )
}

// ── Result modal ───────────────────────────────────────────────────────────────

function ResultModal({ type, id, onClose }: { type: Tab; id: string; onClose: () => void }) {
  const [data,    setData]    = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const url = type === 'ab' ? `/api/ab-test/${id}` : `/api/criteria-explorer/${id}`
    fetch(url).then(r => r.json()).then(d => { setData(d); setLoading(false) })
  }, [id, type])

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        className="w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-2xl border border-border bg-background shadow-2xl">

        <div className="sticky top-0 flex items-center justify-between px-5 py-4 border-b border-border bg-background/95 backdrop-blur">
          <p className="text-[14px] font-black text-foreground">
            {type === 'ab' ? 'A/B Test Results' : 'Criteria Explorer'}
          </p>
          <button onClick={onClose} className="text-[11px] text-muted-foreground hover:text-foreground border border-border rounded-lg px-3 py-1.5">
            Close
          </button>
        </div>

        <div className="p-5">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : type === 'ab' && data?.test ? (
            <ABResultView test={data.test} />
          ) : type === 'criteria' && data?.result ? (
            <CriteriaResultView result={data.result} jobTitle={data.jobTitle} />
          ) : (
            <p className="text-center text-muted-foreground py-8">Result not found.</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ── AB result inline view ──────────────────────────────────────────────────────

function ABResultView({ test }: { test: any }) {
  const resultA   = test.resultA as any
  const resultB   = test.resultB as any
  const comparison = test.comparison as any

  return (
    <div className="space-y-5">
      {/* Winner banner */}
      <div className={cn('rounded-xl p-4 border',
        test.winner === 'A' ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800' :
        test.winner === 'B' ? 'bg-violet-50 dark:bg-violet-950/30 border-violet-200 dark:border-violet-800' :
        'bg-muted border-border'
      )}>
        <div className="flex items-center gap-3">
          <Trophy className="w-5 h-5 text-emerald-500" />
          <div>
            <p className="text-[13px] font-black text-foreground">
              {test.winner === 'tied' ? 'Statements tied' : `Submit Statement ${test.winner}`}
            </p>
            <p className="text-[11px] text-muted-foreground">{comparison?.winnerReason}</p>
          </div>
        </div>
      </div>

      {/* Scores */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Statement A', result: resultA, winner: test.winner === 'A', color: 'blue' },
          { label: 'Statement B', result: resultB, winner: test.winner === 'B', color: 'violet' },
        ].map(({ label, result, winner, color }) => (
          <div key={label} className={cn('rounded-xl border p-4 space-y-2',
            winner ? 'border-emerald-300 dark:border-emerald-700' : 'border-border'
          )}>
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-bold uppercase tracking-wider text-${color}-600 dark:text-${color}-400`}>{label}</span>
              {winner && <span className="text-[9px] font-black bg-emerald-500 text-white px-1.5 py-0.5 rounded-full">Winner</span>}
            </div>
            <p className="text-2xl font-black text-foreground">{result?.overallScore}<span className="text-sm text-muted-foreground font-normal">/100</span></p>
            {[
              ['Criteria', result?.criteriaCoverage],
              ['NHS Values', result?.nhsValues],
              ['STAR', result?.starQuality],
            ].map(([l, v]: any) => (
              <div key={l} className="space-y-0.5">
                <div className="flex justify-between text-[10px]">
                  <span className="text-muted-foreground">{l}</span>
                  <span className="font-semibold">{v}%</span>
                </div>
                <div className="h-1 bg-muted rounded-full overflow-hidden">
                  <div className={`h-full bg-${color}-500 rounded-full`} style={{ width: `${v}%` }} />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Quick wins */}
      {comparison?.quickWins?.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Quick wins for the winner</p>
          {comparison.quickWins.map((w: string, i: number) => (
            <div key={i} className="flex items-start gap-2.5 text-[12px] text-foreground/80">
              <span className="w-4 h-4 rounded-full bg-primary/10 text-primary text-[9px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i+1}</span>
              {w}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Criteria result inline view ────────────────────────────────────────────────

function CriteriaResultView({ result, jobTitle }: { result: any; jobTitle: string }) {
  const essential = result?.explicitCriteria?.essential ?? []
  const critical  = essential.filter((c: any) => c.heatLevel === 'critical')
  const hidden    = result?.hiddenCriteria ?? []

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Critical criteria',  value: critical.length,  color: 'text-red-500'                              },
          { label: 'Hidden criteria',    value: hidden.length,    color: 'text-blue-500'                             },
          { label: 'Total essential',    value: essential.length, color: 'text-foreground'                           },
        ].map(({ label, value, color }) => (
          <div key={label} className="text-center bg-muted/30 rounded-xl p-3">
            <div className={cn('text-xl font-black', color)}>{value}</div>
            <div className="text-[10px] text-muted-foreground">{label}</div>
          </div>
        ))}
      </div>

      {result?.heatMapSummary?.criticalNote && (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
          <p className="text-[12px] text-red-700 dark:text-red-300">{result.heatMapSummary.criticalNote}</p>
        </div>
      )}

      <div className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Critical criteria</p>
        {critical.slice(0, 5).map((c: any) => (
          <div key={c.id} className="flex items-start gap-2 text-[12px] text-foreground/80 border border-red-200 dark:border-red-900/40 rounded-lg px-3 py-2">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0 mt-1.5" />
            {c.text}
          </div>
        ))}
      </div>

      {result?.quickWins?.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Quick wins</p>
          {result.quickWins.slice(0, 3).map((w: string, i: number) => (
            <div key={i} className="flex items-start gap-2 text-[12px] text-foreground/80">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />{w}
            </div>
          ))}
        </div>
      )}

      <p className="text-[11px] text-muted-foreground text-center">
        Run the Criteria Explorer again to get a full interactive heat map.
      </p>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function IntelligenceHistoryPage() {
  const [tab,         setTab]         = useState<Tab>('ab')
  const [abTests,     setAbTests]     = useState<ABTestRow[]>([])
  const [explorations,setExplorations]= useState<ExplorationRow[]>([])
  const [loading,     setLoading]     = useState(true)
  const [modal,       setModal]       = useState<{ type: Tab; id: string } | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/ab-test').then(r => r.json()),
      fetch('/api/criteria-explorer').then(r => r.json()),
    ]).then(([ab, ce]) => {
      setAbTests(ab.tests ?? [])
      setExplorations(ce.explorations ?? [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const tabs = [
    { id: 'ab' as Tab,       label: 'A/B Tests',            icon: FlaskConical, count: abTests.length       },
    { id: 'criteria' as Tab, label: 'Criteria Explorer',    icon: Flame,        count: explorations.length  },
  ]

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-10 space-y-8">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link href="/dashboard" className="hover:text-foreground">Dashboard</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-foreground font-medium">Intelligence History</span>
        </div>

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-black tracking-tight text-foreground">Intelligence History</h1>
            <p className="text-sm text-muted-foreground mt-1">All your past A/B tests and criteria explorations</p>
          </div>
          <div className="flex gap-2">
            <Link href="/dashboard/ab-test"
              className="flex items-center gap-1.5 text-[12px] font-semibold border border-border rounded-xl px-3 py-2 hover:bg-muted transition-colors">
              <FlaskConical className="w-3.5 h-3.5 text-violet-500" /> New A/B test
            </Link>
            <Link href="/dashboard/criteria-explorer"
              className="flex items-center gap-1.5 text-[12px] font-semibold border border-border rounded-xl px-3 py-2 hover:bg-muted transition-colors">
              <Flame className="w-3.5 h-3.5 text-red-500" /> New exploration
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-muted/40 rounded-xl p-1">
          {tabs.map(({ id, label, icon: Icon, count }) => (
            <button key={id} onClick={() => setTab(id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold transition-all flex-1 justify-center',
                tab === id ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              )}>
              <Icon className="w-3.5 h-3.5" />
              {label}
              {count > 0 && (
                <span className="text-[9px] font-black bg-muted-foreground/20 px-1.5 py-0.5 rounded-full tabular-nums">
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : tab === 'ab' ? (
          abTests.length === 0 ? (
            <div className="text-center py-16 space-y-4">
              <FlaskConical className="w-10 h-10 text-muted-foreground mx-auto" />
              <div>
                <p className="font-bold text-foreground">No A/B tests yet</p>
                <p className="text-sm text-muted-foreground mt-1">Run your first test to see which statement scores higher</p>
              </div>
              <Link href="/dashboard/ab-test"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-foreground text-background text-[13px] font-bold hover:opacity-90 transition-opacity">
                Run A/B test →
              </Link>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {abTests.map(test => (
                <ABCard key={test.id} test={test} onView={() => setModal({ type: 'ab', id: test.id })} />
              ))}
            </div>
          )
        ) : (
          explorations.length === 0 ? (
            <div className="text-center py-16 space-y-4">
              <Flame className="w-10 h-10 text-muted-foreground mx-auto" />
              <div>
                <p className="font-bold text-foreground">No explorations yet</p>
                <p className="text-sm text-muted-foreground mt-1">Analyse a job spec to uncover hidden criteria and scoring weights</p>
              </div>
              <Link href="/dashboard/criteria-explorer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-foreground text-background text-[13px] font-bold hover:opacity-90 transition-opacity">
                Run exploration →
              </Link>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {explorations.map(exp => (
                <ExplorationCard key={exp.id} exp={exp} onView={() => setModal({ type: 'criteria', id: exp.id })} />
              ))}
            </div>
          )
        )}
      </main>

      {modal && (
        <ResultModal type={modal.type} id={modal.id} onClose={() => setModal(null)} />
      )}
    </div>
  )
}