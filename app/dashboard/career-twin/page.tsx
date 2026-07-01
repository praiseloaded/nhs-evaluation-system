// app/dashboard/career-twin/page.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Loader2, Sparkles, CheckCircle2, AlertTriangle, Copy, CheckCheck,
  TrendingUp, Database, FileText, Target,
} from 'lucide-react'

export default function CareerTwinPage() {
  const [jobText, setJobText] = useState('')
  const [loading, setLoading] = useState(false)
  const [result,  setResult]  = useState<any>(null)
  const [error,   setError]   = useState<string | null>(null)
  const [copied,  setCopied]  = useState<string | null>(null)

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopied(key); setTimeout(() => setCopied(null), 1500)
  }

  const generate = async () => {
    if (!jobText.trim()) return
    setLoading(true); setError(null); setResult(null)
    try {
      const res  = await fetch('/api/career-twin', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobText }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResult(data)
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  const readinessColor = (score: number) =>
    score >= 75 ? 'text-emerald-600' : score >= 50 ? 'text-amber-600' : 'text-red-500'

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div>
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-3 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
        </Link>
        <h1 className="text-2xl font-black text-foreground flex items-center gap-2">🧬 Omni Career Twin™</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your AI twin knows your CV, evidence vault, skills passport and application history. Paste a job — it assembles your application using your real evidence, not generic content.
        </p>
      </div>

      {!result && (
        <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <textarea
            value={jobText}
            onChange={e => setJobText(e.target.value)}
            placeholder="Paste the full NHS job advert here…"
            rows={10}
            className="w-full bg-muted/30 border border-border rounded-xl px-4 py-3 text-sm text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <button onClick={generate} disabled={loading || !jobText.trim()}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 text-white text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Your twin is working…</> : <><Sparkles className="w-4 h-4" /> Apply Me For This Job</>}
          </button>
        </div>
      )}

      {error && <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</div>}

      {result?.insufficientVault && (
        <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 p-6 text-center space-y-3">
          <Database className="w-8 h-8 text-amber-600 mx-auto" />
          <p className="text-sm font-bold text-amber-800 dark:text-amber-300">Your Career Twin needs more data</p>
          <p className="text-xs text-amber-700 dark:text-amber-400">{result.message}</p>
          <div className="flex gap-2 justify-center pt-2">
            <Link href="/dashboard/evidence-vault" className="px-4 py-2 rounded-xl bg-amber-600 text-white text-xs font-bold">Build Evidence Vault</Link>
            <Link href="/dashboard/cv-builder" className="px-4 py-2 rounded-xl border border-amber-300 text-amber-700 text-xs font-bold">Complete CV Profile</Link>
          </div>
        </div>
      )}

      {result && !result.insufficientVault && (
        <div className="space-y-5">
          {/* Readiness header */}
          <div className="rounded-2xl border border-border bg-card p-6 flex items-center gap-5">
            <div className="relative w-20 h-20 shrink-0">
              <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
                <circle cx="18" cy="18" r="15" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="3"
                  className={readinessColor(result.overallReadiness)}
                  strokeDasharray={2*Math.PI*15} strokeDashoffset={2*Math.PI*15*(1-result.overallReadiness/100)} strokeLinecap="round" />
              </svg>
              <div className={`absolute inset-0 flex items-center justify-center text-lg font-black ${readinessColor(result.overallReadiness)}`}>
                {result.overallReadiness}%
              </div>
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Application Readiness</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{result.readinessVerdict}</p>
              <button onClick={() => setResult(null)} className="text-xs text-primary underline mt-2">Try another job</button>
            </div>
          </div>

          {/* Matched evidence */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Matched Evidence ({result.matchedEvidence?.length ?? 0})
            </p>
            <div className="space-y-3">
              {(result.matchedEvidence ?? []).map((m: any, i: number) => (
                <div key={i} className="rounded-xl border border-border bg-muted/20 p-4">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <p className="text-xs font-bold text-foreground">{m.criterion}</p>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                      m.confidence === 'high' ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300' :
                      m.confidence === 'medium' ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300' :
                                                   'bg-muted text-muted-foreground'
                    }`}>{m.confidence} confidence</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mb-2">Source: {m.evidenceSource}</p>
                  <p className="text-sm text-foreground/80 leading-relaxed">{m.starAnswer}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Gaps */}
          {result.gaps?.length > 0 && (
            <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/10 p-5">
              <p className="text-sm font-bold text-amber-800 dark:text-amber-300 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Gaps Needing Attention ({result.gaps.length})
              </p>
              <div className="space-y-3">
                {result.gaps.map((g: any, i: number) => (
                  <div key={i} className="text-sm">
                    <p className="font-bold text-foreground">{g.criterion}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{g.whyGap}</p>
                    <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">→ {g.suggestion}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Personal statement */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-bold text-foreground flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-500" /> Generated Personal Statement
              </p>
              <button onClick={() => copy(result.personalStatement, 'ps')} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                {copied === 'ps' ? <CheckCheck className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />} Copy
              </button>
            </div>
            <p className="text-sm text-foreground/80 leading-relaxed bg-muted/30 rounded-xl p-4">{result.personalStatement}</p>
            <span className={`inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${
              result.statementQuality === 'strong' ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300' :
              result.statementQuality === 'adequate' ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300' :
                                                        'bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-300'
            }`}>
              {result.statementQuality}
            </span>
          </div>

          {/* Next steps */}
          {result.nextSteps?.length > 0 && (
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
              <p className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" /> Recommended Next Steps
              </p>
              <ul className="space-y-1.5">
                {result.nextSteps.map((s: string, i: number) => (
                  <li key={i} className="text-sm text-foreground flex items-start gap-2">
                    <span className="text-primary mt-0.5">→</span> {s}
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