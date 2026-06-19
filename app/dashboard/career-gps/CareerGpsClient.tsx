// app/dashboard/career-gps/page.tsx
// MOAT 10 — NHS Career GPS™
'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2, Sparkles, Target, TrendingUp, Clock, MapPin, CheckCircle2, AlertTriangle, ExternalLink } from 'lucide-react'

const BANDS = [2, 3, 4, 5, 6, 7, 8]

const BAND_ROLES: Record<number, string[]> = {
  2: ['Healthcare Support Worker', 'Porter', 'Domestic Assistant', 'Ward Clerk'],
  3: ['Phlebotomist', 'Healthcare Assistant Band 3', 'Medical Laboratory Assistant', 'Pharmacy Assistant'],
  4: ['Senior Phlebotomist', 'Healthcare Assistant Band 4', 'Dental Nurse', 'Pharmacy Technician'],
  5: ['Staff Nurse', 'Occupational Therapist', 'Radiographer', 'Biomedical Scientist'],
  6: ['Senior Nurse', 'Senior OT', 'Team Leader', 'Specialist Practitioner'],
  7: ['Advanced Nurse Practitioner', 'Service Manager', 'Head of Department'],
  8: ['Consultant Practitioner', 'Head of Service', 'Director of Nursing'],
}

interface Milestone { month: number; achievement: string }
interface RouteStep { step: number; action: string; why: string; timeMonths: number; cost: string; provider: string; providerUrl?: string; priority: string }
interface TrainingRec { name: string; provider: string; duration: string; cost: string; url: string; bandImpact: string }
interface GPSResult {
  currentBandScore: number; applicationReadiness: number; gapSummary: string
  gapAnalysis: { missingSkills: string[]; missingExperience: string[]; missingQualifications: string[]; strengths: string[] }
  fastestRoute: RouteStep[]
  projectedTimeline: { readyForBand: number; totalMonths: number; milestones: Milestone[] }
  trainingRecommendations: TrainingRec[]
  quickWins: string[]
  currentBand: number; targetBand: number; targetRole: string
}

function ReadinessGauge({ score }: { score: number }) {
  const color = score >= 75 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444'
  const label = score >= 75 ? 'Ready to apply' : score >= 50 ? 'Getting close' : 'Keep building'
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-32 h-32 flex items-center justify-center">
        <svg className="-rotate-90 absolute" width="128" height="128">
          <circle cx="64" cy="64" r="52" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/20" />
          <circle cx="64" cy="64" r="52" fill="none" stroke={color} strokeWidth="8"
            strokeDasharray={2 * Math.PI * 52} strokeDashoffset={2 * Math.PI * 52 * (1 - score / 100)}
            strokeLinecap="round" className="transition-all duration-1000" />
        </svg>
        <div className="text-center">
          <p className="text-2xl font-bold text-foreground">{score}%</p>
          <p className="text-[10px] text-muted-foreground">ready</p>
        </div>
      </div>
      <p className="text-sm font-semibold" style={{ color }}>{label}</p>
    </div>
  )
}

export function CareerGpsClient() {
  const [currentBand, setCurrentBand]         = useState(3)
  const [targetBand, setTargetBand]           = useState(5)
  const [targetRole, setTargetRole]           = useState('')
  const [currentEvidence, setCurrentEvidence] = useState('')
  const [yearsExp, setYearsExp]               = useState(1)
  const [result, setResult]                   = useState<GPSResult | null>(null)
  const [loading, setLoading]                 = useState(false)
  const [error, setError]                     = useState<string | null>(null)
  const [activeTab, setActiveTab]             = useState<'route' | 'training' | 'gaps' | 'timeline'>('route')

  // Load saved GPS data on mount
  useEffect(() => {
    fetch('/api/career-gps')
      .then(r => { if (!r.ok) throw new Error('not ok'); return r.json() })
      .then(d => {
        if (d?.data) {
          setResult(d.data)
          if (d.data.currentBand) setCurrentBand(d.data.currentBand)
          if (d.data.targetBand) setTargetBand(d.data.targetBand)
        }
      })
      .catch(() => {}) // no saved data — start fresh
  }, [])

  const generate = async () => {
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/career-gps', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentBand, targetBand, targetRole: targetRole || `Band ${targetBand} NHS role`, currentEvidence, yearsExperience: yearsExp }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      setResult(data)
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  const tabs = [
    { key: 'route', label: 'Fastest Route' },
    { key: 'training', label: 'Training' },
    { key: 'gaps', label: 'Skill Gaps' },
    { key: 'timeline', label: 'Timeline' },
  ]

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">
      {/* Header */}
      <div>
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-5 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
        </Link>
        <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
          <MapPin className="w-6 h-6 text-primary" /> NHS Career GPS™
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Enter your current band and target — get a personalised route, training plan, and projected timeline.
        </p>
      </div>

      {/* Input card */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
        <h2 className="text-sm font-semibold text-foreground">Your Career Position</h2>
        <div className="grid sm:grid-cols-2 gap-5">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground">Current Band</label>
            <div className="flex gap-1.5 flex-wrap">
              {BANDS.map(b => (
                <button key={b} onClick={() => setCurrentBand(b)}
                  className={`w-10 h-10 rounded-xl text-sm font-bold transition-colors border ${currentBand === b ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-muted-foreground border-border hover:border-primary/50'}`}>
                  {b}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">{BAND_ROLES[currentBand]?.[0] ?? 'NHS role'}</p>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground">Target Band</label>
            <div className="flex gap-1.5 flex-wrap">
              {BANDS.filter(b => b > currentBand).map(b => (
                <button key={b} onClick={() => setTargetBand(b)}
                  className={`w-10 h-10 rounded-xl text-sm font-bold transition-colors border ${targetBand === b ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-muted-foreground border-border hover:border-primary/50'}`}>
                  {b}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">{BAND_ROLES[targetBand]?.[0] ?? 'NHS role'}</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Target role (optional)</label>
            <select value={targetRole} onChange={e => setTargetRole(e.target.value)}
              className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30">
              <option value="">Any Band {targetBand} role</option>
              {(BAND_ROLES[targetBand] ?? []).map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Years of experience</label>
            <input type="number" value={yearsExp} onChange={e => setYearsExp(Number(e.target.value))} min={0} max={30}
              className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground">Your current skills and evidence</label>
          <textarea value={currentEvidence} onChange={e => setCurrentEvidence(e.target.value)} rows={3}
            placeholder="e.g. Venepuncture competent, 1 year phlebotomy, TRAK trained, ILS completed..."
            className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder-muted-foreground/40 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button onClick={generate} disabled={loading || targetBand <= currentBand}
          className="w-full py-3.5 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground font-semibold flex items-center justify-center gap-2">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Calculating your route...</> : <><MapPin className="w-4 h-4" /> Generate My Career GPS</>}
        </button>
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-5">
          {(result as any).updatedAt && (
            <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              Saved {new Date((result as any).updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
          {/* Summary */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center gap-6 flex-wrap">
              <ReadinessGauge score={result.applicationReadiness} />
              <div className="flex-1 space-y-3">
                <div>
                  <p className="text-lg font-bold text-foreground">Band {result.currentBand} → Band {result.targetBand}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{result.gapSummary}</p>
                </div>
                <div className="flex items-center gap-4 flex-wrap text-sm">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <strong className="text-foreground">{result.projectedTimeline.totalMonths} months</strong> projected
                  </span>
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Target className="w-4 h-4" />
                    <strong className="text-foreground">{result.fastestRoute.length} steps</strong> to target
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick wins */}
          {result.quickWins?.length > 0 && (
            <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 p-4 space-y-2">
              <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                <Sparkles className="w-4 h-4" /> Do these in the next 30 days
              </p>
              <ul className="space-y-1.5">
                {result.quickWins.map((w, i) => (
                  <li key={i} className="text-xs text-emerald-700 dark:text-emerald-300 flex items-start gap-2">
                    <span className="shrink-0 font-bold">{i + 1}.</span> {w}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1.5 flex-wrap border-b border-border pb-0">
            {tabs.map(t => (
              <button key={t.key} onClick={() => setActiveTab(t.key as any)}
                className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${activeTab === t.key ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Route tab */}
          {activeTab === 'route' && (
            <div className="space-y-3">
              {result.fastestRoute.map((step, i) => (
                <div key={i} className="flex gap-4 rounded-xl border border-border bg-card p-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-bold ${step.priority === 'critical' ? 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300' : 'bg-primary/10 text-primary'}`}>
                    {step.step}
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-semibold text-foreground">{step.action}</p>
                    <p className="text-xs text-muted-foreground">{step.why}</p>
                    <div className="flex gap-3 flex-wrap text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {step.timeMonths} month{step.timeMonths !== 1 ? 's' : ''}</span>
                      <span>{step.cost}</span>
                      {step.provider && (
                        (step as any).providerUrl ? (
                          <a href={(step as any).providerUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium flex items-center gap-1">
                            {step.provider} <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-primary">{step.provider}</span>
                        )
                      )}
                    </div>
                  </div>
                  {step.priority === 'critical' && (
                    <span className="text-[10px] font-bold text-red-600 dark:text-red-400 shrink-0">CRITICAL</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Training tab */}
          {activeTab === 'training' && (
            <div className="space-y-3">
              {result.trainingRecommendations?.map((t, i) => (
                <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground">{t.name}</p>
                    <span className="text-[10px] font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full shrink-0">{t.bandImpact}</span>
                  </div>
                  <div className="flex gap-4 flex-wrap text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" /> {t.provider}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {t.duration}</span>
                    <span>{t.cost}</span>
                  </div>
                  {t.url && (
                    <a href={t.url} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                      <ExternalLink className="w-3 h-3" /> Visit provider
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Gaps tab */}
          {activeTab === 'gaps' && (
            <div className="space-y-4">
              {[
                { label: 'Missing Skills', items: result.gapAnalysis.missingSkills, color: 'text-red-600 dark:text-red-400', icon: AlertTriangle },
                { label: 'Missing Experience', items: result.gapAnalysis.missingExperience, color: 'text-amber-600 dark:text-amber-400', icon: AlertTriangle },
                { label: 'Missing Qualifications', items: result.gapAnalysis.missingQualifications, color: 'text-blue-600 dark:text-blue-400', icon: AlertTriangle },
                { label: 'Your Strengths', items: result.gapAnalysis.strengths, color: 'text-emerald-600 dark:text-emerald-400', icon: CheckCircle2 },
              ].map(section => section.items?.length > 0 && (
                <div key={section.label} className="space-y-2">
                  <p className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${section.color}`}>
                    <section.icon className="w-3.5 h-3.5" /> {section.label}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {section.items.map((item, i) => (
                      <span key={i} className={`text-xs px-3 py-1.5 rounded-full border font-medium ${section.color} bg-current/5 border-current/20`}>
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Timeline tab */}
          {activeTab === 'timeline' && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Estimated <strong className="text-foreground">{result.projectedTimeline.totalMonths} months</strong> to Band {result.targetBand} readiness
              </p>
              <div className="space-y-2 mt-4">
                {result.projectedTimeline.milestones?.map((m, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <div className="shrink-0 w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex flex-col items-center justify-center">
                      <p className="text-xs font-bold text-primary">{m.month}</p>
                      <p className="text-[9px] text-muted-foreground">mo</p>
                    </div>
                    <div className="flex-1 rounded-xl border border-border bg-card p-3">
                      <p className="text-sm font-medium text-foreground">{m.achievement}</p>
                    </div>
                  </div>
                ))}
                <div className="flex items-start gap-4">
                  <div className="shrink-0 w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 flex flex-col items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="flex-1 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 p-3">
                    <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Ready to apply for Band {result.targetBand}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <button onClick={generate} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> Recalculate
          </button>
        </div>
      )}
    </div>
  )
}