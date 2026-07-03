// app/dashboard/evidence-vault/match/page.tsx
// EvidenceVault™ Auto-Pull — matches stored STAR examples to job criteria

'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Loader2, Sparkles, CheckCircle2, AlertTriangle,
  ChevronDown, ChevronUp, FolderOpen, Zap, Check,
} from 'lucide-react'

interface CriterionMatch {
  id:            string
  text:          string
  type:          'essential' | 'desirable'
  currentEvidence: string | null
  matches: Array<{
    entryId:     string
    title:       string
    relevance:   number
    explanation: string
    suggestedText: string
  }>
  approved:      boolean
  approvedText:  string | null
}

interface MatchResult {
  applicationId: string
  jobTitle:      string
  criteria:      CriterionMatch[]
  vaultCount:    number
}

function scoreColor(n: number) {
  if (n >= 8) return 'text-emerald-600 dark:text-emerald-400'
  if (n >= 5) return 'text-amber-600 dark:text-amber-400'
  return 'text-red-500'
}

function scoreBg(n: number) {
  if (n >= 8) return 'bg-emerald-100 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800'
  if (n >= 5) return 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'
  return 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800'
}

function MatchContent() {
  const searchParams   = useSearchParams()
  const applicationId  = searchParams.get('applicationId')

  const [data,     setData]     = useState<MatchResult | null>(null)
  const [loading,  setLoading]  = useState(false)
  const [running,  setRunning]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [applying, setApplying] = useState(false)
  const [applied,  setApplied]  = useState(false)

  // Load initial state
  useEffect(() => {
    if (!applicationId) return
    setLoading(true)
    fetch(`/api/evidence-vault/match?applicationId=${applicationId}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) throw new Error(d.error)
        setData(d)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [applicationId])

  const runMatch = async () => {
    if (!applicationId) return
    setRunning(true); setError(null)
    try {
      const res = await fetch('/api/evidence-vault/match', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ applicationId }),
      })
      const d = await res.json()
      if (d.error) throw new Error(d.error)
      setData(d)
      // Auto-expand criteria with strong matches
      const strong = new Set<string>()
      d.criteria?.forEach((c: CriterionMatch) => {
        if (c.matches?.[0]?.relevance >= 7) strong.add(c.id)
      })
      setExpanded(strong)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setRunning(false)
    }
  }

  const toggleExpand = (id: string) =>
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const approve = (criterionId: string, text: string) => {
    setData(prev => prev ? {
      ...prev,
      criteria: prev.criteria.map(c =>
        c.id === criterionId
          ? { ...c, approved: true, approvedText: text }
          : c
      ),
    } : prev)
  }

  const applyAll = async () => {
    if (!data || !applicationId) return
    setApplying(true)
    try {
      const approved = data.criteria
        .filter(c => c.approved && c.approvedText)
        .map(c => ({ criterionId: c.id, text: c.approvedText! }))

      await fetch('/api/evidence-vault/match', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ applicationId, approved }),
      })
      setApplied(true)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setApplying(false)
    }
  }

  const approvedCount = data?.criteria.filter(c => c.approved).length ?? 0
  const matchedCount  = data?.criteria.filter(c => (c.matches?.length ?? 0) > 0).length ?? 0

  if (!applicationId) return (
    <div className="max-w-4xl mx-auto px-6 py-12 text-center">
      <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
      <p className="text-sm text-muted-foreground">No application ID provided. Open this page from an application.</p>
      <Link href="/dashboard/applications" className="text-blue-600 dark:text-blue-400 text-sm hover:underline mt-4 inline-block">
        ← View applications
      </Link>
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">

      {/* Header */}
      <div>
        <Link href={`/dashboard/application/${applicationId}`}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-4 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to application
        </Link>
        <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
          <FolderOpen className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          EvidenceVault™ Auto-Pull
        </h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-lg">
          AI matches your stored STAR examples to each job criterion. Review, approve, and apply in one click.
        </p>
      </div>

      {/* Status banner */}
      {data && (
        <div className="rounded-2xl border border-border bg-card p-5 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-2xl font-black text-foreground">{data.vaultCount}</p>
              <p className="text-[11px] text-muted-foreground">vault entries</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-black text-blue-600 dark:text-blue-400">{matchedCount}</p>
              <p className="text-[11px] text-muted-foreground">criteria matched</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{approvedCount}</p>
              <p className="text-[11px] text-muted-foreground">approved</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={runMatch} disabled={running || data.vaultCount === 0}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-br from-red-500 to-amber-500 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-bold transition-colors">
              {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {running ? 'Matching…' : 'Re-run matching'}
            </button>
            {approvedCount > 0 && !applied && (
              <button onClick={applyAll} disabled={applying}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-bold transition-colors">
                {applying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                Apply {approvedCount} approved
              </button>
            )}
            {applied && (
              <div className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400 font-semibold">
                <CheckCircle2 className="w-4 h-4" /> Applied to application
              </div>
            )}
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty vault */}
      {data && data.vaultCount === 0 && (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center space-y-3">
          <FolderOpen className="w-10 h-10 text-muted-foreground/30 mx-auto" />
          <p className="text-sm font-semibold text-foreground">Your EvidenceVault is empty</p>
          <p className="text-xs text-muted-foreground">Add STAR examples to your vault first, then come back to auto-match them.</p>
          <Link href="/dashboard/evidence-vault"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-br from-red-500 to-amber-500 text-white text-sm font-semibold hover:bg-blue-700 transition-colors mt-2">
            <FolderOpen className="w-4 h-4" /> Go to EvidenceVault
          </Link>
        </div>
      )}

      {/* No matches yet */}
      {data && data.vaultCount > 0 && matchedCount === 0 && !running && (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center space-y-3">
          <Sparkles className="w-10 h-10 text-blue-400 mx-auto" />
          <p className="text-sm font-semibold text-foreground">Ready to match</p>
          <p className="text-xs text-muted-foreground">{data.vaultCount} vault entries found. Run AI matching to find the best evidence for each criterion.</p>
          <button onClick={runMatch} disabled={running}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-br from-red-500 to-amber-500 hover:bg-blue-700 text-white text-sm font-bold transition-colors mt-2">
            <Sparkles className="w-4 h-4" /> Run AI Matching
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-2xl px-5 py-4">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-700 dark:text-red-300">Matching failed</p>
            <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Criteria list */}
      {data && matchedCount > 0 && (
        <div className="space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Criteria — {data.criteria.length} total
          </p>

          {data.criteria.map(criterion => {
            const topMatch  = criterion.matches?.[0]
            const isOpen    = expanded.has(criterion.id)

            return (
              <div key={criterion.id}
                className={`rounded-2xl border overflow-hidden transition-colors ${
                  criterion.approved
                    ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-950/10'
                    : 'border-border bg-card'
                }`}>

                {/* Criterion header */}
                <button onClick={() => toggleExpand(criterion.id)}
                  className="w-full flex items-start gap-3 px-5 py-4 text-left hover:bg-muted/30 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                        criterion.type === 'essential'
                          ? 'bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300'
                          : 'bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
                      }`}>{criterion.type}</span>
                      {criterion.approved && (
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                          <Check className="w-2.5 h-2.5" /> Approved
                        </span>
                      )}
                      {topMatch && (
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${scoreBg(topMatch.relevance)}`}>
                          Best match: {topMatch.relevance}/10
                        </span>
                      )}
                      {!criterion.matches?.length && (
                        <span className="text-[9px] font-bold text-muted-foreground/60 uppercase">No vault match</span>
                      )}
                    </div>
                    <p className="text-[13px] text-foreground/90 leading-snug">{criterion.text}</p>
                  </div>
                  {isOpen
                    ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                    : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                  }
                </button>

                {/* Expanded matches */}
                {isOpen && criterion.matches?.length > 0 && (
                  <div className="border-t border-border divide-y divide-border">
                    {criterion.matches.map((match, idx) => (
                      <div key={match.entryId} className="px-5 py-4 space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-black tabular-nums ${scoreColor(match.relevance)}`}>
                              {match.relevance}/10
                            </span>
                            <p className="text-[13px] font-semibold text-foreground">{match.title}</p>
                            {idx === 0 && (
                              <span className="text-[9px] font-black uppercase bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-full">
                                Best
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => approve(criterion.id, match.suggestedText)}
                            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                              criterion.approved && criterion.approvedText === match.suggestedText
                                ? 'bg-emerald-500 text-white'
                                : 'border border-border text-muted-foreground hover:border-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-400'
                            }`}>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {criterion.approved && criterion.approvedText === match.suggestedText ? 'Approved' : 'Approve'}
                          </button>
                        </div>
                        <p className="text-[12px] text-muted-foreground italic">{match.explanation}</p>
                        <div className="bg-muted/50 rounded-xl p-3">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Suggested evidence text</p>
                          <p className="text-[12px] text-foreground leading-relaxed">{match.suggestedText}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {isOpen && !criterion.matches?.length && (
                  <div className="border-t border-border px-5 py-4">
                    <p className="text-[12px] text-muted-foreground">
                      No vault entries matched this criterion. Add more STAR examples to your{' '}
                      <Link href="/dashboard/evidence-vault" className="text-blue-600 dark:text-blue-400 hover:underline">
                        EvidenceVault
                      </Link>.
                    </p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function EvidenceMatchPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    }>
      <MatchContent />
    </Suspense>
  )
}