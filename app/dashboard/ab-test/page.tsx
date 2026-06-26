'use client'

import { useState } from 'react'
import { Navbar }   from '@/components/navbar'
import Link         from 'next/link'
import {
  FlaskConical, ChevronRight, Loader2, Trophy,
  CheckCircle2, XCircle, MinusCircle, Sparkles,
  ArrowRight, RotateCcw, ChevronDown, ChevronUp,
  FileText, Zap,
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────────

type StatementScore = {
  overallScore:         number
  criteriaCoverage:     number
  nhsValues:            number
  starQuality:          number
  languageMirroring:    number
  specificity:          number
  verdict:              string
  wordCount:            number
  strengths:            string[]
  weaknesses:           string[]
  missingElements:      string[]
  openingQuality:       string
  starExamplesCount:    number
  hasQuantifiedOutcomes: boolean
  usesWeLanguage:       boolean
}

type Comparison = {
  winner:           string
  winnerReason:     string
  scoreDiff:        number
  dimensionWinners: Record<string, string>
  whatADoesBetter:  string[]
  whatBDoesBetter:  string[]
  bestElementsToKeep: { fromA: string[]; fromB: string[] }
  idealStatement:   string
  quickWins:        string[]
}

// ── Score ring ─────────────────────────────────────────────────────────────────

function ScoreRing({ score, size = 88, winner }: { score: number; size?: number; winner?: boolean }) {
  const r    = size * 0.38
  const circ = 2 * Math.PI * r
  const off  = circ - (score / 100) * circ
  const color = winner ? '#22c55e' : score >= 70 ? '#3b82f6' : score >= 50 ? '#f59e0b' : '#ef4444'

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="currentColor"
        className="text-muted/30" strokeWidth={size * 0.065} />
      <circle cx={size/2} cy={size/2} r={r} fill="none"
        stroke={color} strokeWidth={size * 0.065}
        strokeDasharray={circ} strokeDashoffset={off}
        strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{ transition: 'stroke-dashoffset 1s ease' }}
      />
      <text x={size/2} y={size/2 - 4} textAnchor="middle" dominantBaseline="middle"
        className="fill-foreground font-black" fontSize={size * 0.22}>{score}</text>
      <text x={size/2} y={size/2 + size*0.16} textAnchor="middle" dominantBaseline="middle"
        className="fill-muted-foreground" fontSize={size * 0.1}>/100</text>
    </svg>
  )
}

// ── Dimension bar ─────────────────────────────────────────────────────────────

function DimBar({ label, a, b, winner }: { label: string; a: number; b: number; winner: string }) {
  const aWins = winner === 'A'
  const bWins = winner === 'B'
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px]">
        <span className="font-semibold text-foreground/70">{label}</span>
        <div className="flex items-center gap-3">
          <span className={`font-bold tabular-nums ${aWins ? 'text-emerald-500' : 'text-foreground/60'}`}>{a}</span>
          <span className="text-muted-foreground">vs</span>
          <span className={`font-bold tabular-nums ${bWins ? 'text-emerald-500' : 'text-foreground/60'}`}>{b}</span>
        </div>
      </div>
      <div className="flex gap-1 h-1.5">
        <div className="flex-1 bg-muted rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-700 ${aWins ? 'bg-emerald-500' : 'bg-blue-400'}`}
            style={{ width: `${a}%` }} />
        </div>
        <div className="flex-1 bg-muted rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-700 ${bWins ? 'bg-emerald-500' : 'bg-violet-400'}`}
            style={{ width: `${b}%` }} />
        </div>
      </div>
    </div>
  )
}

// ── Verdict badge ─────────────────────────────────────────────────────────────

function VerdictBadge({ verdict }: { verdict: string }) {
  const map: Record<string, string> = {
    strong:      'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    competitive: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    needs_work:  'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    at_risk:     'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
  }
  const label: Record<string, string> = { strong: 'Strong', competitive: 'Competitive', needs_work: 'Needs Work', at_risk: 'At Risk' }
  return (
    <span className={`text-[10px] font-bold uppercase tracking-wider border px-2.5 py-1 rounded-full ${map[verdict] ?? map.needs_work}`}>
      {label[verdict] ?? verdict}
    </span>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ABTestPage() {
  const [jobTitle,    setJobTitle]    = useState('')
  const [jobSpec,     setJobSpec]     = useState('')
  const [statementA,  setStatementA]  = useState('')
  const [statementB,  setStatementB]  = useState('')
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState<string | null>(null)
  const [results,     setResults]     = useState<{ resultA: StatementScore; resultB: StatementScore; comparison: Comparison; winner: string } | null>(null)
  const [showDetails, setShowDetails] = useState(false)

  const wordCount = (text: string) => text.trim().split(/\s+/).filter(Boolean).length

  async function runTest() {
    if (!jobTitle.trim()) { setError('Please enter the job title'); return }
    if (!jobSpec.trim())  { setError('Please enter the job specification or person spec'); return }
    if (wordCount(statementA) < 50) { setError('Statement A needs at least 50 words'); return }
    if (wordCount(statementB) < 50) { setError('Statement B needs at least 50 words'); return }

    setLoading(true)
    setError(null)
    setResults(null)

    try {
      const res  = await fetch('/api/ab-test', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ jobTitle, jobSpec, statementA, statementB }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Test failed')
      setResults(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10 space-y-8">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link href="/dashboard/saved-analyses" className="hover:text-foreground transition-colors">Dashboard</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-foreground font-medium">Statement A/B Testing</span>
        </div>

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800 flex items-center justify-center">
              <FlaskConical className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-foreground">Statement A/B Testing</h1>
              <p className="text-xs text-muted-foreground mt-0.5">Score two versions — know which one to submit</p>
            </div>
          </div>
          {results && (
            <button onClick={() => { setResults(null); setStatementA(''); setStatementB('') }}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-lg px-3 py-2 transition-colors">
              <RotateCcw className="w-3.5 h-3.5" /> New test
            </button>
          )}
        </div>

        {!results ? (
          /* ── Input form ── */
          <div className="space-y-6">

            {/* Job details */}
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
                  Job Specification / Person Spec
                </label>
                <textarea value={jobSpec} onChange={e => setJobSpec(e.target.value)}
                  placeholder="Paste the job description or person specification here..."
                  rows={6}
                  className="w-full bg-muted/40 border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all resize-none" />
              </div>
            </div>

            {/* Statements */}
            <div className="grid md:grid-cols-2 gap-4">
              {[
                { label: 'Statement A', value: statementA, set: setStatementA, color: 'blue' },
                { label: 'Statement B', value: statementB, set: setStatementB, color: 'violet' },
              ].map(({ label, value, set, color }) => (
                <div key={label} className="rounded-2xl border border-border bg-card p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className={`text-[11px] font-bold uppercase tracking-widest text-${color}-600 dark:text-${color}-400`}>{label}</span>
                    <span className="text-[11px] text-muted-foreground tabular-nums">{wordCount(value)} words</span>
                  </div>
                  <textarea value={value} onChange={e => set(e.target.value)}
                    placeholder={`Paste ${label.toLowerCase()} here...`}
                    rows={12}
                    className="w-full bg-muted/30 border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all resize-none" />
                </div>
              ))}
            </div>

            {error && (
              <div className="flex items-center gap-2.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
                <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                <p className="text-[12px] text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <button onClick={runTest} disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 disabled:opacity-50 text-white rounded-2xl py-3.5 text-[14px] font-bold transition-all active:scale-[0.99] shadow-lg shadow-violet-500/20">
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Scoring both statements — takes ~20 seconds…</>
              ) : (
                <><Zap className="w-4 h-4" /> Run A/B Test</>
              )}
            </button>

          </div>
        ) : (
          /* ── Results ── */
          <div className="space-y-6">

            {/* Winner banner */}
            <div className={`rounded-2xl p-6 border ${
              results.winner === 'A' ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800' :
              results.winner === 'B' ? 'bg-violet-50 dark:bg-violet-950/30 border-violet-200 dark:border-violet-800' :
              'bg-muted/40 border-border'
            }`}>
              <div className="flex items-start gap-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${
                  results.winner === 'tied' ? 'bg-muted' : 'bg-emerald-100 dark:bg-emerald-950/40'
                }`}>
                  {results.winner === 'tied'
                    ? <MinusCircle className="w-7 h-7 text-muted-foreground" />
                    : <Trophy className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
                  }
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Recommendation</span>
                  </div>
                  <h2 className="text-lg font-black text-foreground mb-1">
                    {results.winner === 'tied'
                      ? 'Statements are closely matched'
                      : `Submit Statement ${results.winner}`
                    }
                  </h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">{results.comparison?.winnerReason}</p>
                </div>
                {results.winner !== 'tied' && (
                  <div className="text-right shrink-0">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Score gap</div>
                    <div className="text-2xl font-black text-foreground">+{results.comparison?.scoreDiff ?? Math.abs(results.resultA.overallScore - results.resultB.overallScore)}</div>
                    <div className="text-[11px] text-muted-foreground">points</div>
                  </div>
                )}
              </div>
            </div>

            {/* Score comparison */}
            <div className="grid md:grid-cols-2 gap-4">
              {[
                { label: 'Statement A', result: results.resultA, isWinner: results.winner === 'A', color: 'blue' },
                { label: 'Statement B', result: results.resultB, isWinner: results.winner === 'B', color: 'violet' },
              ].map(({ label, result, isWinner, color }) => (
                <div key={label} className={`rounded-2xl border bg-card p-5 space-y-4 ${isWinner ? 'border-emerald-300 dark:border-emerald-700 ring-2 ring-emerald-500/20' : 'border-border'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[11px] font-bold uppercase tracking-widest text-${color}-600 dark:text-${color}-400`}>{label}</span>
                        {isWinner && (
                          <span className="text-[9px] font-bold uppercase tracking-wider bg-emerald-500 text-white px-2 py-0.5 rounded-full">Winner</span>
                        )}
                      </div>
                      <VerdictBadge verdict={result.verdict} />
                    </div>
                    <ScoreRing score={result.overallScore} winner={isWinner} />
                  </div>

                  {/* Quick flags */}
                  <div className="flex flex-wrap gap-2">
                    {[
                      { ok: result.starExamplesCount >= 2,    label: `${result.starExamplesCount} STAR examples` },
                      { ok: result.hasQuantifiedOutcomes,      label: 'Quantified outcomes' },
                      { ok: !result.usesWeLanguage,            label: 'No "we" language' },
                      { ok: result.openingQuality === 'strong', label: 'Strong opening' },
                    ].map(({ ok, label }) => (
                      <span key={label} className={`flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full border ${
                        ok ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                           : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400'
                      }`}>
                        {ok ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {label}
                      </span>
                    ))}
                  </div>

                  {/* Top strength */}
                  {result.strengths[0] && (
                    <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-xl px-3 py-2.5">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-0.5">Top strength</p>
                      <p className="text-[12px] text-emerald-700 dark:text-emerald-300 leading-snug">{result.strengths[0]}</p>
                    </div>
                  )}

                  {/* Top weakness */}
                  {result.weaknesses[0] && (
                    <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl px-3 py-2.5">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-red-500 mb-0.5">Main gap</p>
                      <p className="text-[12px] text-red-600 dark:text-red-400 leading-snug">{result.weaknesses[0]}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Dimension breakdown */}
            <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Dimension Breakdown</p>
                <div className="flex items-center gap-4 text-[11px]">
                  <span className="flex items-center gap-1.5"><span className="w-3 h-1.5 rounded-full bg-blue-400 inline-block" /> A</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-1.5 rounded-full bg-violet-400 inline-block" /> B</span>
                </div>
              </div>
              <div className="space-y-3">
                {[
                  { label: 'Criteria Coverage', key: 'criteriaCoverage' },
                  { label: 'NHS Values',         key: 'nhsValues'        },
                  { label: 'STAR Quality',        key: 'starQuality'      },
                  { label: 'Language Mirroring',  key: 'languageMirroring'},
                  { label: 'Specificity',         key: 'specificity'      },
                ].map(({ label, key }) => (
                  <DimBar
                    key={key}
                    label={label}
                    a={(results.resultA as any)[key] ?? 0}
                    b={(results.resultB as any)[key] ?? 0}
                    winner={results.comparison?.dimensionWinners?.[key] ?? 'tied'}
                  />
                ))}
              </div>
            </div>

            {/* Detailed comparison */}
            <button onClick={() => setShowDetails(d => !d)}
              className="w-full flex items-center justify-between px-5 py-4 rounded-2xl border border-border bg-card hover:bg-muted/30 transition-colors">
              <span className="text-sm font-bold text-foreground">Full comparison analysis</span>
              {showDetails ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </button>

            {showDetails && results.comparison && (
              <div className="rounded-2xl border border-border bg-card p-6 space-y-6">

                {/* What each does better */}
                <div className="grid md:grid-cols-2 gap-4">
                  {[
                    { label: 'What A does better', items: results.comparison.whatADoesBetter, color: 'blue' },
                    { label: 'What B does better', items: results.comparison.whatBDoesBetter, color: 'violet' },
                  ].map(({ label, items, color }) => (
                    <div key={label}>
                      <p className={`text-[10px] font-bold uppercase tracking-wider text-${color}-600 dark:text-${color}-400 mb-2`}>{label}</p>
                      <ul className="space-y-1.5">
                        {(items ?? []).map((item, i) => (
                          <li key={i} className="flex items-start gap-2 text-[12px] text-foreground/80">
                            <ArrowRight className={`w-3 h-3 text-${color}-500 shrink-0 mt-0.5`} />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>

                {/* Best elements to keep */}
                <div className="bg-muted/30 rounded-xl p-4 space-y-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Best elements to keep</p>
                  <div className="grid md:grid-cols-2 gap-3">
                    {[
                      { label: 'Keep from A', items: results.comparison.bestElementsToKeep?.fromA ?? [] },
                      { label: 'Keep from B', items: results.comparison.bestElementsToKeep?.fromB ?? [] },
                    ].map(({ label, items }) => (
                      <div key={label}>
                        <p className="text-[11px] font-semibold text-foreground mb-1.5">{label}</p>
                        <ul className="space-y-1">
                          {items.map((item, i) => (
                            <li key={i} className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                              <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0 mt-0.5" />{item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Ideal statement */}
                {results.comparison.idealStatement && (
                  <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-4 h-4 text-primary" />
                      <p className="text-[10px] font-bold uppercase tracking-wider text-primary">What the ideal merged version looks like</p>
                    </div>
                    <p className="text-[13px] text-foreground/80 leading-relaxed">{results.comparison.idealStatement}</p>
                  </div>
                )}

                {/* Quick wins */}
                {results.comparison.quickWins?.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Quick wins for the winner</p>
                    <ul className="space-y-2">
                      {results.comparison.quickWins.map((win, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-[12px] text-foreground/80">
                          <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">{i + 1}</div>
                          {win}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-3">
              <button onClick={() => { setResults(null); setStatementA(''); setStatementB('') }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border bg-card hover:bg-muted text-sm font-semibold text-foreground transition-colors">
                <RotateCcw className="w-4 h-4" /> Run another test
              </button>
              <Link href="/dashboard/new-analysis"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-foreground text-background text-sm font-semibold hover:opacity-90 transition-opacity">
                <FileText className="w-4 h-4" /> Full analysis
              </Link>
            </div>

          </div>
        )}

      </main>
    </div>
  )
}