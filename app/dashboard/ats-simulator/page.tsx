// app/dashboard/ats-simulator/page.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2, AlertTriangle, CheckCircle2, XCircle, Zap, TrendingUp, Search } from 'lucide-react'

interface KeywordFound    { keyword: string; count: number; inJobSpec: boolean }
interface KeywordMissing  { keyword: string; importance: string; suggestion: string }
interface FormattingIssue { issue: string; impact: string; severity: string }
interface MissingTerm     { term: string; context: string }

interface Result {
  atsScore: number; verdict: string
  keywordsFound: KeywordFound[]; keywordsMissing: KeywordMissing[]
  formattingIssues: FormattingIssue[]; missingTerminology: MissingTerm[]
  quickWins: string[]; strengthsFound: string[]
}

function ScoreDial({ score }: { score: number }) {
  const color = score >= 75 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444'
  const r = 54, c = 2 * Math.PI * r
  return (
    <div className="relative w-36 h-36">
      <svg viewBox="0 0 120 120" className="w-36 h-36 -rotate-90">
        <circle cx="60" cy="60" r={r} stroke="#e5e7eb" strokeWidth="10" fill="none" />
        <circle cx="60" cy="60" r={r} stroke={color} strokeWidth="10" fill="none"
          strokeDasharray={c} strokeDashoffset={c - (score / 100) * c} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-black text-foreground">{score}</span>
        <span className="text-[10px] text-muted-foreground font-bold">ATS Score</span>
      </div>
    </div>
  )
}

export default function AtsSimulatorPage() {
  const [jobDescription, setJobDescription] = useState('')
  const [statement,      setStatement]      = useState('')
  const [loading,        setLoading]        = useState(false)
  const [result,         setResult]         = useState<Result | null>(null)
  const [error,          setError]          = useState<string | null>(null)

  const analyse = async () => {
    if (!jobDescription.trim() || !statement.trim()) return
    setLoading(true); setError(null); setResult(null)
    try {
      const res  = await fetch('/api/ats-simulator', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobDescription, statement }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResult(data)
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  const severityColor = (s: string) =>
    s === 'high' ? 'text-red-600 bg-red-50 dark:bg-red-950/30' :
    s === 'medium' ? 'text-amber-600 bg-amber-50 dark:bg-amber-950/30' :
    'text-blue-600 bg-blue-50 dark:bg-blue-950/30'

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div>
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-3 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
        </Link>
        <h1 className="text-2xl font-black text-foreground flex items-center gap-2">🎯 NHS ATS Simulator™</h1>
        <p className="text-sm text-muted-foreground mt-1">Check your statement's ATS compatibility before submission — keyword gaps, missing terminology, formatting issues.</p>
      </div>

      {/* Input form */}
      {!result && (
        <div className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Job Description / Person Spec *</label>
              <textarea value={jobDescription} onChange={e => setJobDescription(e.target.value)}
                rows={12} placeholder="Paste the full job description and person specification here…"
                aria-label="Job description"
                className="w-full bg-card border border-border rounded-xl px-4 py-3 text-sm text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Your Supporting Statement *</label>
              <textarea value={statement} onChange={e => setStatement(e.target.value)}
                rows={12} placeholder="Paste your supporting statement here…"
                aria-label="Supporting statement"
                className="w-full bg-card border border-border rounded-xl px-4 py-3 text-sm text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>
          {error && <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>}
          <button onClick={analyse} disabled={loading || !jobDescription.trim() || !statement.trim()}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Simulating ATS…</> : <><Search className="w-4 h-4" /> Run ATS Simulation</>}
          </button>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-5">
          {/* Score header */}
          <div className="rounded-2xl border border-border bg-card p-6 flex items-center gap-6 flex-wrap">
            <ScoreDial score={result.atsScore} />
            <div className="flex-1 min-w-0">
              <p className="text-lg font-black text-foreground">{result.verdict}</p>
              <div className="flex flex-wrap gap-3 mt-3">
                <div className="text-center">
                  <p className="text-xl font-black text-emerald-600">{result.keywordsFound?.length ?? 0}</p>
                  <p className="text-[10px] text-muted-foreground">Keywords found</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-black text-red-500">{result.keywordsMissing?.length ?? 0}</p>
                  <p className="text-[10px] text-muted-foreground">Keywords missing</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-black text-amber-500">{result.formattingIssues?.length ?? 0}</p>
                  <p className="text-[10px] text-muted-foreground">Format issues</p>
                </div>
              </div>
            </div>
            <button onClick={() => setResult(null)}
              className="px-4 py-2 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0">
              Re-run
            </button>
          </div>

          {/* Quick wins */}
          {result.quickWins?.length > 0 && (
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
              <p className="text-sm font-bold text-foreground mb-3 flex items-center gap-2"><Zap className="w-4 h-4 text-primary" /> Quick wins</p>
              <ul className="space-y-2">
                {result.quickWins.map((w, i) => (
                  <li key={i} className="text-sm text-foreground flex items-start gap-2">
                    <span className="text-primary mt-0.5">→</span> {w}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            {/* Missing keywords */}
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="text-xs font-bold text-foreground/70 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <XCircle className="w-3.5 h-3.5 text-red-500" /> Missing keywords
              </p>
              {result.keywordsMissing?.length === 0
                ? <p className="text-sm text-emerald-600">No critical keywords missing 🎉</p>
                : <div className="space-y-3">
                    {result.keywordsMissing.map((k, i) => (
                      <div key={i}>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-bold text-foreground">{k.keyword}</span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${k.importance === 'critical' ? 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300' : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'}`}>
                            {k.importance}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">{k.suggestion}</p>
                      </div>
                    ))}
                  </div>
              }
            </div>

            {/* Keywords found */}
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="text-xs font-bold text-foreground/70 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Keywords detected
              </p>
              <div className="flex flex-wrap gap-1.5">
                {result.keywordsFound?.map((k, i) => (
                  <span key={i} className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${k.inJobSpec ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300' : 'bg-muted text-muted-foreground'}`}>
                    {k.keyword} ×{k.count}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Formatting issues */}
          {result.formattingIssues?.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="text-xs font-bold text-foreground/70 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Formatting issues
              </p>
              <div className="space-y-3">
                {result.formattingIssues.map((f, i) => (
                  <div key={i} className={`rounded-xl p-3 ${severityColor(f.severity)}`}>
                    <p className="text-xs font-bold">{f.issue}</p>
                    <p className="text-xs mt-0.5 opacity-80">{f.impact}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Missing terminology */}
          {result.missingTerminology?.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="text-xs font-bold text-foreground/70 uppercase tracking-wider mb-3">NHS Terminology gaps</p>
              <div className="space-y-2">
                {result.missingTerminology.map((t, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="text-xs font-bold text-foreground bg-muted px-2 py-0.5 rounded shrink-0">{t.term}</span>
                    <p className="text-xs text-muted-foreground">{t.context}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Strengths */}
          {result.strengthsFound?.length > 0 && (
            <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/20 p-5">
              <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" /> What's working
              </p>
              <ul className="space-y-1.5">
                {result.strengthsFound.map((s, i) => (
                  <li key={i} className="text-sm text-emerald-800 dark:text-emerald-200 flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" /> {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
