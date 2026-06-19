// app/dashboard/interview-probability/page.tsx
// MOAT 9 — Interview Probability Engine™ standalone page
// Lets the user pick a saved analysis, then shows the probability breakdown for it.

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2, Target, ChevronDown, FileText, Calendar } from 'lucide-react'
import { InterviewProbability } from '@/components/interview-probability'

interface AnalysisSummary {
  id: string
  jobTitle: string
  band: string | null
  createdAt: string
}

export function InterviewProbabilityClient() {
  const [analyses, setAnalyses] = useState<AnalysisSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)

  useEffect(() => {
    fetch('/api/analysis/list?page=1&limit=50')
      .then(r => r.ok ? r.json() : { results: [] })
      .then(d => {
        const list = (d.results ?? []).map((a: any) => ({
          id: a.id,
          jobTitle: a.jobTitle,
          band: a.band ?? null,
          createdAt: a.createdAt,
        }))
        setAnalyses(list)
        if (list.length > 0) setSelectedId(list[0].id)
      })
      .catch(() => setAnalyses([]))
      .finally(() => setLoading(false))
  }, [])

  const selected = analyses.find(a => a.id === selectedId)

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
      <div>
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-4 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
        </Link>
        <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
          <Target className="w-6 h-6 text-primary" /> Interview Probability™
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          A calculated score combining your essential criteria coverage, EvidenceVault™ strength, band fit, and application track record.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 text-primary animate-spin" /></div>
      ) : analyses.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center space-y-3">
          <FileText className="w-8 h-8 text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">You don't have any saved analyses yet.</p>
          <Link href="/dashboard/analysis/new" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold">
            Start a new analysis
          </Link>
        </div>
      ) : (
        <>
          {/* Analysis picker */}
          <div className="relative">
            <button onClick={() => setPickerOpen(o => !o)}
              className="w-full flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left hover:border-primary/40 transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{selected?.jobTitle ?? 'Select an analysis'}</p>
                  {selected && (
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                      {selected.band && <span>{selected.band}</span>}
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(selected.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </p>
                  )}
                </div>
              </div>
              <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${pickerOpen ? 'rotate-180' : ''}`} />
            </button>

            {pickerOpen && (
              <div className="absolute z-10 mt-1 w-full rounded-xl border border-border bg-card shadow-lg max-h-72 overflow-y-auto">
                {analyses.map(a => (
                  <button key={a.id} onClick={() => { setSelectedId(a.id); setPickerOpen(false) }}
                    className={`w-full text-left px-4 py-2.5 hover:bg-accent transition-colors ${a.id === selectedId ? 'bg-primary/5' : ''}`}>
                    <p className="text-sm font-medium text-foreground truncate">{a.jobTitle}</p>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                      {a.band && <span>{a.band}</span>}
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(a.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Probability breakdown for selected analysis */}
          {selectedId && <InterviewProbability analysisId={selectedId} />}
        </>
      )}
    </div>
  )
}