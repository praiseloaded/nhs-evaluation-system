// app/dashboard/evolution/page.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, TrendingUp, TrendingDown, Minus, Calendar, BarChart3, Eye } from 'lucide-react'

interface AnalysisEntry {
  id: string; jobTitle: string; createdAt: string
  overallScore: number; criteriaScore: number; valuesScore: number
  starScore: number; languageScore: number; wordCount: number
  statement: string
}

export default function EvolutionPage() {
  const [entries,   setEntries]   = useState<AnalysisEntry[]>([])
  const [loading,   setLoading]   = useState(true)
  const [comparing, setComparing] = useState<[string|null, string|null]>([null, null])
  const [view,      setView]      = useState<'timeline'|'compare'>('timeline')

  useEffect(() => {
    fetch('/api/evolution')
      .then(r => r.json())
      .then(d => setEntries(d.entries ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const trend = (a: number, b: number) =>
    a > b ? 'up' : a < b ? 'down' : 'flat'

  const maxScore = Math.max(...entries.map(e => e.overallScore), 1)

  const toggleCompare = (id: string) => {
    setComparing(prev => {
      if (prev[0] === id) return [null, prev[1]]
      if (prev[1] === id) return [prev[0], null]
      if (!prev[0]) return [id, prev[1]]
      if (!prev[1]) return [prev[0], id]
      return [id, prev[1]]
    })
  }

  const [entryA, entryB] = [
    entries.find(e => e.id === comparing[0]),
    entries.find(e => e.id === comparing[1]),
  ]

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div>
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-3 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
        </Link>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
              📈 Personal Statement Evolution™
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Track how your supporting statements improve with every application.</p>
          </div>
          <div className="flex gap-2">
            {(['timeline','compare'] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${view===v ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
                {v === 'timeline' ? '📊 Timeline' : '⚖️ Compare'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center text-muted-foreground">Loading your history…</div>
      ) : entries.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center space-y-3">
          <BarChart3 className="w-10 h-10 text-muted-foreground/30 mx-auto" />
          <p className="text-sm text-muted-foreground">No analyses yet. Run your first analysis to start tracking your evolution.</p>
          <Link href="/dashboard/new-analysis" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-bold">
            Start New Analysis
          </Link>
        </div>
      ) : view === 'timeline' ? (
        <div className="space-y-5">
          {/* Score chart */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-sm font-bold text-foreground mb-4">Overall Score Over Time</p>
            <div className="flex items-end gap-2 h-32">
              {entries.slice().reverse().map((e, i) => {
                const h = Math.round((e.overallScore / maxScore) * 100)
                const prev = entries.slice().reverse()[i - 1]
                const t = prev ? trend(e.overallScore, prev.overallScore) : 'flat'
                return (
                  <div key={e.id} className="flex-1 flex flex-col items-center gap-1 group">
                    <span className="text-[9px] text-muted-foreground font-bold opacity-0 group-hover:opacity-100 transition-opacity">{e.overallScore}</span>
                    <div className="w-full relative flex items-end" style={{ height: 100 }}>
                      <div
                        className={`w-full rounded-t-lg transition-all ${t==='up' ? 'bg-emerald-500' : t==='down' ? 'bg-red-400' : 'bg-blue-400'}`}
                        style={{ height: `${h}%` }}
                      />
                    </div>
                    <span className="text-[8px] text-muted-foreground text-center truncate w-full">
                      {new Date(e.createdAt).toLocaleDateString('en-GB', { day:'numeric', month:'short' })}
                    </span>
                  </div>
                )
              })}
            </div>
            <div className="flex items-center gap-4 mt-3 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block"/> Improved</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-red-400 inline-block"/> Declined</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-blue-400 inline-block"/> First/Flat</span>
            </div>
          </div>

          {/* Entry list */}
          <div className="space-y-3">
            {entries.map((e, i) => {
              const prev = entries[i + 1]
              const diff = prev ? e.overallScore - prev.overallScore : null
              return (
                <div key={e.id} className="rounded-2xl border border-border bg-card p-4 flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center shrink-0">
                    <span className="text-lg font-black text-foreground">{e.overallScore}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-foreground truncate">{e.jobTitle || 'Untitled analysis'}</p>
                      {diff !== null && (
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-0.5 ${diff > 0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : diff < 0 ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' : 'bg-muted text-muted-foreground'}`}>
                          {diff > 0 ? <TrendingUp className="w-2.5 h-2.5"/> : diff < 0 ? <TrendingDown className="w-2.5 h-2.5"/> : <Minus className="w-2.5 h-2.5"/>}
                          {diff > 0 ? '+' : ''}{diff}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1.5 flex-wrap">
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3 h-3"/> {new Date(e.createdAt).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})}
                      </span>
                      <span className="text-[11px] text-muted-foreground">{e.wordCount} words</span>
                    </div>
                    {/* Mini dimension bars */}
                    <div className="grid grid-cols-4 gap-2 mt-2.5">
                      {[
                        { label: 'Criteria',  val: e.criteriaScore },
                        { label: 'Values',    val: e.valuesScore   },
                        { label: 'STAR',      val: e.starScore     },
                        { label: 'Language',  val: e.languageScore },
                      ].map(d => (
                        <div key={d.label}>
                          <div className="flex justify-between text-[9px] text-muted-foreground mb-0.5">
                            <span>{d.label}</span><span>{d.val}</span>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${d.val}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Link href={`/dashboard/analysis/${e.id}`}
                      className="p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                      <Eye className="w-3.5 h-3.5" />
                    </Link>
                    <button onClick={() => { toggleCompare(e.id); setView('compare') }}
                      className={`p-2 rounded-lg border transition-colors text-xs font-bold ${comparing.includes(e.id) ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted'}`}>
                      ⚖
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        /* Compare view */
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Select two analyses from the timeline to compare side by side.</p>
          {comparing[0] && comparing[1] && entryA && entryB ? (
            <div className="grid md:grid-cols-2 gap-4">
              {[entryA, entryB].map((e, i) => (
                <div key={e.id} className="rounded-2xl border border-border bg-card p-5 space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-black text-muted-foreground uppercase tracking-wider">{i === 0 ? 'Earlier' : 'Later'}</p>
                      <p className="text-sm font-bold text-foreground mt-0.5">{e.jobTitle || 'Untitled'}</p>
                      <p className="text-[11px] text-muted-foreground">{new Date(e.createdAt).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}</p>
                    </div>
                    <div className="text-2xl font-black text-foreground">{e.overallScore}</div>
                  </div>
                  <div className="space-y-2">
                    {[
                      { label:'Criteria',  a: entryA.criteriaScore, b: entryB.criteriaScore, val: e.criteriaScore  },
                      { label:'Values',    a: entryA.valuesScore,   b: entryB.valuesScore,   val: e.valuesScore    },
                      { label:'STAR',      a: entryA.starScore,     b: entryB.starScore,     val: e.starScore      },
                      { label:'Language',  a: entryA.languageScore, b: entryB.languageScore, val: e.languageScore  },
                    ].map(d => {
                      const better = i === 0 ? d.a >= d.b : d.b >= d.a
                      return (
                        <div key={d.label}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-muted-foreground">{d.label}</span>
                            <span className={`font-bold ${better ? 'text-emerald-600' : 'text-red-500'}`}>{d.val}</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${better ? 'bg-emerald-500' : 'bg-red-400'}`} style={{ width:`${d.val}%` }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <div className="bg-muted/30 rounded-xl p-3">
                    <p className="text-[10px] font-bold text-muted-foreground mb-1">Statement excerpt</p>
                    <p className="text-xs text-foreground leading-relaxed line-clamp-4">{e.statement?.slice(0, 300) || 'Not available'}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
              <p className="text-sm text-muted-foreground">Select two analyses from the Timeline view using the ⚖ button.</p>
              <button onClick={() => setView('timeline')} className="mt-3 text-xs text-primary underline">Go to Timeline</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}