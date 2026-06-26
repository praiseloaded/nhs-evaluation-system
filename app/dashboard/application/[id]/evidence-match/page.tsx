'use client'

import { useState, useEffect, use } from 'react'
import { Navbar }   from '@/components/navbar'
import Link         from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ChevronRight, Loader2, Sparkles, CheckCircle2,
  XCircle, AlertTriangle, ArrowRight, FolderOpen,
  RefreshCw, Check, X, ChevronDown, ChevronUp,
  Zap, BookOpen,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

// ── Types ──────────────────────────────────────────────────────────────────────

type VaultEntry = {
  id: string; title: string
  situation: string; task: string; action: string; result: string
}

type Match = {
  criterionId:     string
  criterionText:   string
  criterionType:   'essential' | 'desirable'
  vaultEntryId:    string | null
  vaultTitle:      string | null
  vaultEntry:      VaultEntry | null
  matchStrength:   number
  matchReason:     string
  suggestedFraming: string
  missingElements: string[]
}

type Summary = {
  strongMatches:   number
  weakMatches:     number
  noMatch:         number
  recommendation:  string
}

// ── Strength badge ─────────────────────────────────────────────────────────────

function StrengthBadge({ score }: { score: number }) {
  const cfg = score >= 7
    ? { label: 'Strong match',  cls: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' }
    : score >= 4
    ? { label: 'Partial match', cls: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800' }
    : { label: 'Weak match',    cls: 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800' }

  return (
    <span className={cn('text-[10px] font-bold uppercase tracking-wider border px-2 py-0.5 rounded-full flex items-center gap-1', cfg.cls)}>
      <span className="font-black tabular-nums">{score}/10</span> {cfg.label}
    </span>
  )
}

// ── Match card ─────────────────────────────────────────────────────────────────

function MatchCard({
  match, approved, onApprove, onReject,
}: {
  match: Match
  approved: boolean | null  // null = pending, true = approved, false = rejected
  onApprove: () => void
  onReject: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const hasMatch = !!match.vaultEntry && match.matchStrength >= 4

  return (
    <div className={cn(
      'rounded-2xl border overflow-hidden transition-all',
      approved === true  ? 'border-emerald-300 dark:border-emerald-700 ring-2 ring-emerald-500/15' :
      approved === false ? 'border-border opacity-50' :
      !hasMatch          ? 'border-dashed border-border' :
      'border-border'
    )}>
      <div className="px-4 py-3 bg-card">
        <div className="flex items-start gap-3">

          {/* Approve/reject buttons */}
          <div className="flex flex-col gap-1 shrink-0 mt-0.5">
            {hasMatch ? (
              <>
                <Button onClick={onApprove}
                  className={cn('w-7 h-7 rounded-lg flex items-center justify-center transition-all',
                    approved === true
                      ? 'bg-emerald-500 text-white'
                      : 'bg-muted hover:bg-emerald-100 dark:hover:bg-emerald-950/40 text-muted-foreground hover:text-emerald-600')}>
                  <Check className="w-3.5 h-3.5" />
                </Button>
                <Button onClick={onReject}
                  className={cn('w-7 h-7 rounded-lg flex items-center justify-center transition-all',
                    approved === false
                      ? 'bg-red-500 text-white'
                      : 'bg-muted hover:bg-red-100 dark:hover:bg-red-950/40 text-muted-foreground hover:text-red-500')}>
                  <X className="w-3.5 h-3.5" />
                </Button>
              </>
            ) : (
              <div className="w-7 h-7 rounded-lg bg-muted/50 flex items-center justify-center">
                <AlertTriangle className="w-3.5 h-3.5 text-muted-foreground/50" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0 space-y-2">
            {/* Criterion */}
            <div className="flex items-start justify-between gap-2">
              <p className="text-[12.5px] font-semibold text-foreground leading-snug">{match.criterionText}</p>
              <span className={cn('text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0',
                match.criterionType === 'essential'
                  ? 'bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
                  : 'bg-muted text-muted-foreground'
              )}>
                {match.criterionType}
              </span>
            </div>

            {/* Match info */}
            {hasMatch ? (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 text-[12px] font-semibold text-foreground/80">
                    <FolderOpen className="w-3.5 h-3.5 text-blue-500" />
                    {match.vaultTitle}
                  </div>
                  <StrengthBadge score={match.matchStrength} />
                </div>
                <p className="text-[11px] text-muted-foreground leading-snug">{match.matchReason}</p>
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground italic">
                No matching evidence in vault — you'll need to write this manually
              </p>
            )}
          </div>

          {/* Expand button */}
          {hasMatch && (
            <button onClick={() => setExpanded(e => !e)}
              className="shrink-0 text-muted-foreground hover:text-foreground transition-colors mt-1">
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && match.vaultEntry && (
        <div className="px-4 pb-4 pt-1 border-t border-border bg-muted/10 space-y-3">

          {/* Suggested framing */}
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-1 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> How to frame this for the criterion
            </p>
            <p className="text-[12px] text-foreground/80 leading-relaxed">{match.suggestedFraming}</p>
          </div>

          {/* STAR preview */}
          <div className="grid sm:grid-cols-2 gap-2">
            {[
              { label: 'S', full: 'Situation', text: match.vaultEntry.situation },
              { label: 'T', full: 'Task',      text: match.vaultEntry.task      },
              { label: 'A', full: 'Action',    text: match.vaultEntry.action    },
              { label: 'R', full: 'Result',    text: match.vaultEntry.result    },
            ].map(({ label, full, text }) => (
              <div key={label} className="bg-background rounded-lg px-3 py-2 border border-border">
                <span className="text-[9px] font-black text-primary mr-1">{label}</span>
                <span className="text-[9px] text-muted-foreground uppercase tracking-wider">{full}</span>
                <p className="text-[11px] text-foreground/80 mt-1 leading-snug line-clamp-3">{text}</p>
              </div>
            ))}
          </div>

          {/* Missing elements */}
          {match.missingElements?.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <span className="text-[10px] text-muted-foreground font-semibold">Gaps:</span>
              {match.missingElements.map((m, i) => (
                <span key={i} className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <AlertTriangle className="w-2.5 h-2.5" />{m}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function EvidenceMatchPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: applicationId } = use(params)
  const router = useRouter()

  const [jobTitle,   setJobTitle]   = useState('')
  const [matches,    setMatches]    = useState<Match[]>([])
  const [summary,    setSummary]    = useState<Summary | null>(null)
  const [approvals,  setApprovals]  = useState<Record<string, boolean | null>>({})
  const [loading,    setLoading]    = useState(false)
  const [applying,   setApplying]   = useState(false)
  const [error,      setError]      = useState<string | null>(null)
  const [vaultCount, setVaultCount] = useState(0)
  const [done,       setDone]       = useState(false)
  const [ran,        setRan]        = useState(false)

  // Load application info on mount
  useEffect(() => {
    fetch(`/api/evidence-vault/match?applicationId=${applicationId}`)
      .then(r => r.json())
      .then(d => {
        setJobTitle(d.jobTitle ?? '')
        setVaultCount(d.vaultCount ?? 0)
      })
      .catch(() => {})
  }, [applicationId])

  async function runMatching() {
    setLoading(true); setError(null); setMatches([]); setSummary(null)
    try {
      const res  = await fetch('/api/evidence-vault/match', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ applicationId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Matching failed')
      setMatches(data.matches ?? [])
      setSummary(data.summary ?? null)
      // Auto-approve strong matches
      const auto: Record<string, boolean | null> = {}
      for (const m of data.matches ?? []) {
        auto[m.criterionId] = m.matchStrength >= 7 ? true : null
      }
      setApprovals(auto)
      setRan(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function applyMatches() {
    const approved = matches
      .filter(m => approvals[m.criterionId] === true && m.vaultEntryId)
      .map(m => ({ criterionId: m.criterionId, vaultEntryId: m.vaultEntryId }))

    if (!approved.length) { setError('No matches approved'); return }
    setApplying(true)
    try {
      const res  = await fetch('/api/evidence-vault/match', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ applicationId, approvedMatches: approved }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setDone(true)
      setTimeout(() => router.push(`/dashboard/application/${applicationId}`), 2000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setApplying(false)
    }
  }

  const approvedCount = Object.values(approvals).filter(v => v === true).length
  const essential     = matches.filter(m => m.criterionType === 'essential')
  const desirable     = matches.filter(m => m.criterionType === 'desirable')

  if (done) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/40 rounded-2xl flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8 text-emerald-500" />
        </div>
        <h2 className="text-lg font-black text-foreground">{approvedCount} evidence matches applied</h2>
        <p className="text-sm text-muted-foreground">Redirecting to your application…</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-10 space-y-8">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link href="/dashboard/applications" className="hover:text-foreground">Applications</Link>
          <ChevronRight className="w-3 h-3" />
          <Link href={`/dashboard/application/${applicationId}`} className="hover:text-foreground truncate max-w-xs">{jobTitle}</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-foreground font-medium">Evidence Auto-Pull</span>
        </div>

        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-foreground">EvidenceVault™ Auto-Pull</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              AI matches your stored STAR examples to each job criterion — one click fills your application
            </p>
          </div>
        </div>

        {/* Vault status */}
        <div className={cn(
          'rounded-2xl border p-5 flex items-center justify-between gap-4',
          vaultCount === 0 ? 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20' : 'border-border bg-card'
        )}>
          <div className="flex items-center gap-3">
            <FolderOpen className={cn('w-5 h-5', vaultCount === 0 ? 'text-amber-500' : 'text-blue-500')} />
            <div>
              <p className="text-sm font-bold text-foreground">
                {vaultCount === 0 ? 'EvidenceVault is empty' : `${vaultCount} STAR examples in your vault`}
              </p>
              <p className="text-[12px] text-muted-foreground">
                {vaultCount === 0
                  ? 'Add STAR examples first — then come back to auto-pull'
                  : 'AI will scan all entries and match the best ones to each criterion'}
              </p>
            </div>
          </div>
          {vaultCount === 0 ? (
            <Link href="/dashboard/evidence-vault"
              className="flex items-center gap-1.5 text-[12px] font-bold text-amber-700 dark:text-amber-300 hover:underline shrink-0">
              Add evidence <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          ) : !ran ? (
            <button onClick={runMatching} disabled={loading || vaultCount === 0}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 disabled:opacity-50 text-white text-[13px] font-bold transition-all shadow-md shadow-blue-500/20 shrink-0">
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Matching…</>
                : <><Sparkles className="w-4 h-4" /> Auto-Match Evidence</>
              }
            </button>
          ) : (
            <button onClick={runMatching} disabled={loading}
              className="flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors shrink-0">
              <RefreshCw className="w-3.5 h-3.5" /> Re-run
            </button>
          )}
        </div>

        {error && (
          <div className="flex items-center gap-2.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
            <XCircle className="w-4 h-4 text-red-500 shrink-0" />
            <p className="text-[12px] text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Summary strip */}
        {summary && (
          <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Strong matches',   value: summary.strongMatches, color: 'text-emerald-600 dark:text-emerald-400' },
                { label: 'Partial matches',  value: summary.weakMatches,   color: 'text-amber-600 dark:text-amber-400'     },
                { label: 'No match found',   value: summary.noMatch,       color: 'text-red-500'                           },
              ].map(({ label, value, color }) => (
                <div key={label} className="text-center">
                  <div className={cn('text-2xl font-black', color)}>{value}</div>
                  <div className="text-[11px] text-muted-foreground">{label}</div>
                </div>
              ))}
            </div>
            {summary.recommendation && (
              <p className="text-[12px] text-muted-foreground border-t border-border pt-3 leading-relaxed">
                {summary.recommendation}
              </p>
            )}
          </div>
        )}

        {/* Matches list */}
        {matches.length > 0 && (
          <div className="space-y-6">

            {/* Instructions */}
            <div className="flex items-center gap-3 text-[12px] text-muted-foreground bg-muted/30 rounded-xl px-4 py-3">
              <Check className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Strong matches are auto-approved. Review each one — approve ✓ or reject ✗ — then apply.</span>
            </div>

            {/* Essential */}
            {essential.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Essential criteria</h3>
                {essential.map(m => (
                  <MatchCard key={m.criterionId} match={m}
                    approved={approvals[m.criterionId] ?? null}
                    onApprove={() => setApprovals(p => ({ ...p, [m.criterionId]: true  }))}
                    onReject={() =>  setApprovals(p => ({ ...p, [m.criterionId]: false }))}
                  />
                ))}
              </div>
            )}

            {/* Desirable */}
            {desirable.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Desirable criteria</h3>
                {desirable.map(m => (
                  <MatchCard key={m.criterionId} match={m}
                    approved={approvals[m.criterionId] ?? null}
                    onApprove={() => setApprovals(p => ({ ...p, [m.criterionId]: true  }))}
                    onReject={() =>  setApprovals(p => ({ ...p, [m.criterionId]: false }))}
                  />
                ))}
              </div>
            )}

            {/* Apply bar */}
            <div className="sticky bottom-4 rounded-2xl border border-border bg-card/95 backdrop-blur px-5 py-4 flex items-center justify-between gap-4 shadow-lg shadow-black/10">
              <div>
                <p className="text-sm font-bold text-foreground">{approvedCount} matches approved</p>
                <p className="text-[12px] text-muted-foreground">These will be applied to your application criteria</p>
              </div>
              <button onClick={applyMatches} disabled={applying || approvedCount === 0}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-foreground hover:bg-foreground/90 disabled:opacity-50 text-background text-[13px] font-bold transition-all shrink-0">
                {applying
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Applying…</>
                  : <><CheckCircle2 className="w-4 h-4" /> Apply {approvedCount} matches</>
                }
              </button>
            </div>
          </div>
        )}

        {/* Empty state — vault has entries but not run yet */}
        {!ran && !loading && vaultCount > 0 && (
          <div className="text-center py-12 space-y-4">
            <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto">
              <BookOpen className="w-8 h-8 text-muted-foreground" />
            </div>
            <div>
              <p className="font-black text-lg text-foreground">Ready to match</p>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-1">
                Click "Auto-Match Evidence" above — AI will scan your {vaultCount} vault entries and suggest the best evidence for each criterion
              </p>
            </div>
          </div>
        )}

      </main>
    </div>
  )
}