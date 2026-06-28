'use client'

import { useState } from 'react'
import Link         from 'next/link'
import {
  ChevronRight, Loader2, Globe, AlertTriangle,
  CheckCircle2, XCircle, Clock, ArrowRight,
  Sparkles, FileText, ExternalLink, ShieldCheck,
  TrendingUp, AlertCircle, Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Select } from 'react-day-picker'
import { Button } from '@/components/ui/button'

// ── Types ──────────────────────────────────────────────────────────────────────

type Likelihood = 'high' | 'medium' | 'low' | 'very_low'

type Result = {
  overallLikelihood:  Likelihood
  likelihoodScore:    number
  likelihoodReason:   string
  visaRoutes:         any[]
  shortageOccupation: any
  salaryCheck:        any
  employerSponsorshipProfile: any
  registrationRequirements:   any
  actionPlan:         any[]
  redFlags:           string[]
  encouragingFactors: string[]
  estimatedTimeline:  any
  keyResources:       any[]
}

// ── Likelihood config ─────────────────────────────────────────────────────────

const LIKELIHOOD: Record<Likelihood, { label: string; color: string; bg: string; border: string; ring: string }> = {
  high:     { label: 'High likelihood',     color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/30',  border: 'border-emerald-200 dark:border-emerald-800', ring: 'ring-emerald-500/20' },
  medium:   { label: 'Medium likelihood',   color: 'text-amber-600 dark:text-amber-400',    bg: 'bg-amber-50 dark:bg-amber-950/30',      border: 'border-amber-200 dark:border-amber-800',    ring: 'ring-amber-500/20'   },
  low:      { label: 'Low likelihood',      color: 'text-red-600 dark:text-red-400',         bg: 'bg-red-50 dark:bg-red-950/30',          border: 'border-red-200 dark:border-red-800',        ring: 'ring-red-500/20'     },
  very_low: { label: 'Very low likelihood', color: 'text-red-700 dark:text-red-400',         bg: 'bg-red-50 dark:bg-red-950/30',          border: 'border-red-200 dark:border-red-800',        ring: 'ring-red-500/20'     },
}

const inp = "w-full bg-muted/40 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
const sel = "w-full bg-muted/40 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CosNavigatorPage() {
  const [jobTitle,          setJobTitle]          = useState('')
  const [band,              setBand]              = useState('')
  const [employer,          setEmployer]          = useState('')
  const [salary,            setSalary]            = useState('')
  const [jobSpec,           setJobSpec]           = useState('')
  const [nationality,       setNationality]       = useState('')
  const [currentVisa,       setCurrentVisa]       = useState('')
  const [registrationBody,  setRegistrationBody]  = useState('')
  const [loading,           setLoading]           = useState(false)
  const [error,             setError]             = useState<string | null>(null)
  const [result,            setResult]            = useState<Result | null>(null)

  async function runAnalysis() {
    if (!jobTitle.trim() || !employer.trim()) {
      setError('Job title and employer are required'); return
    }
    setLoading(true); setError(null); setResult(null)
    try {
      const res  = await fetch('/api/cos-navigator', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ jobTitle, band, employer, salary, jobSpec, nationality, currentVisa, registrationBody }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Analysis failed')
      setResult(data.result)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const lCfg = result ? LIKELIHOOD[result.overallLikelihood] ?? LIKELIHOOD.low : null

  return (
    <div className="min-h-screen bg-background">
   

      <main className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-10 space-y-8">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link href="/dashboard" className="hover:text-foreground">Dashboard</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-foreground font-medium">COS & Sponsorship Navigator</span>
        </div>

        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500 to-amber-500 flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20">
            <Globe className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl font-black tracking-tight text-foreground">COS & Sponsorship Navigator</h1>
              <span className="text-[9px] font-black bg-gradient-to-r from-blue-600 to-cyan-500 text-white px-2 py-0.5 rounded-full uppercase tracking-wider">Intelligence™</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Sponsorship likelihood, visa route suitability, salary thresholds and full action plan for overseas NHS applicants
            </p>
          </div>
        </div>

        {/* Input form */}
        {!result && (
          <div className="space-y-5">
            <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Job Details</p>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Job Title <span className="text-red-500">*</span></label>
                  <input value={jobTitle} onChange={e => setJobTitle(e.target.value)} placeholder="e.g. Staff Nurse" className={inp} />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">NHS Band</label>
                  <Select value={band} onChange={e => setBand(e.target.value)} className={sel}>
                    <option value="">Select band</option>
                    {['2','3','4','5','6','7','8a','8b','8c','8d','9'].map(b => <option key={b} value={b}>Band {b}</option>)}
                  </Select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">NHS Trust / Employer <span className="text-red-500">*</span></label>
                  <input value={employer} onChange={e => setEmployer(e.target.value)} placeholder="e.g. NHS Greater Glasgow & Clyde" className={inp} />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Advertised Salary</label>
                  <input value={salary} onChange={e => setSalary(e.target.value)} placeholder="e.g. £28,407 - £34,581" className={inp} />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Job Spec <span className="text-muted-foreground/60 normal-case font-normal">(optional — improves accuracy)</span>
                </label>
                <textarea value={jobSpec} onChange={e => setJobSpec(e.target.value)}
                  placeholder="Paste the job description or person spec..."
                  rows={4} className={cn(inp, 'resize-none')} />
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Your Details</p>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Nationality</label>
                  <input value={nationality} onChange={e => setNationality(e.target.value)} placeholder="e.g. Nigerian, Indian, Filipino" className={inp} />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Current Visa Status</label>
                  <Select value={currentVisa} onChange={e => setCurrentVisa(e.target.value)} className={sel}>
                    <option value="">Select status</option>
                    <option value="no_visa">No UK visa — applying from overseas</option>
                    <option value="skilled_worker">Skilled Worker visa</option>
                    <option value="health_care">Health & Care Worker visa</option>
                    <option value="student">Student visa</option>
                    <option value="graduate">Graduate visa</option>
                    <option value="spouse">Spouse / Family visa</option>
                    <option value="ilr">ILR / Settled Status</option>
                    <option value="british">British / Irish citizen</option>
                    <option value="other">Other</option>
                  </Select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Professional Registration Body</label>
                  <Select value={registrationBody} onChange={e => setRegistrationBody(e.target.value)} className={sel}>
                    <option value="">Select body</option>
                    <option value="NMC">NMC (Nurse / Midwife)</option>
                    <option value="HCPC">HCPC (Allied Health Professional)</option>
                    <option value="GMC">GMC (Doctor)</option>
                    <option value="GPhC">GPhC (Pharmacist)</option>
                    <option value="GOC">GOC (Optometrist)</option>
                    <option value="GDC">GDC (Dental)</option>
                    <option value="none">No registration required for this role</option>
                    <option value="other">Other</option>
                  </Select>
                </div>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
                <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                <p className="text-[12px] text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <Button onClick={runAnalysis} disabled={loading}
              className="w-full flex items-center justify-center gap-2 text-white rounded-2xl py-3.5 text-[14px] font-bold transition-all active:scale-[0.99] shadow-lg disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #2563eb, #06b6d4)' }}>
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Analysing sponsorship likelihood…</>
                : <><Globe className="w-4 h-4" /> Run Sponsorship Intelligence™</>
              }
            </Button>
          </div>
        )}

        {/* Results */}
        {result && lCfg && (
          <div className="space-y-6">

            {/* Overall verdict */}
            <div className={cn('rounded-2xl border p-6 ring-2', lCfg.bg, lCfg.border, lCfg.ring)}>
              <div className="flex items-start gap-5">
                <div className="relative shrink-0">
                  <svg width="80" height="80" viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r="30" fill="none" stroke="currentColor" className="text-border" strokeWidth="6" />
                    <circle cx="40" cy="40" r="30" fill="none" strokeWidth="6"
                      stroke={result.overallLikelihood === 'high' ? '#22c55e' : result.overallLikelihood === 'medium' ? '#f59e0b' : '#ef4444'}
                      strokeDasharray={`${2 * Math.PI * 30}`}
                      strokeDashoffset={`${2 * Math.PI * 30 * (1 - result.likelihoodScore / 100)}`}
                      strokeLinecap="round" transform="rotate(-90 40 40)" />
                    <text x="40" y="38" textAnchor="middle" dominantBaseline="middle" className="fill-foreground font-black" fontSize="16">{result.likelihoodScore}</text>
                    <text x="40" y="52" textAnchor="middle" dominantBaseline="middle" className="fill-muted-foreground" fontSize="9">/ 100</text>
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Sponsorship Assessment</p>
                  <h2 className={cn('text-xl font-black mb-2', lCfg.color)}>{lCfg.label}</h2>
                  <p className="text-[13px] text-foreground/80 leading-relaxed">{result.likelihoodReason}</p>
                </div>
              </div>
            </div>

            {/* Quick signals */}
            <div className="grid sm:grid-cols-2 gap-3">
              {/* Shortage occupation */}
              <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
                <div className="flex items-center gap-2">
                  {result.shortageOccupation?.onList
                    ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    : <XCircle className="w-4 h-4 text-red-400" />
                  }
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Shortage Occupation List</p>
                </div>
                <p className="text-sm font-semibold text-foreground">
                  {result.shortageOccupation?.onList ? `✓ On the list` : 'Not on shortage list'}
                </p>
                {result.shortageOccupation?.listName && (
                  <p className="text-[11px] text-muted-foreground">{result.shortageOccupation.listName}</p>
                )}
                <p className="text-[11px] text-muted-foreground leading-snug">{result.shortageOccupation?.benefit}</p>
              </div>

              {/* Salary check */}
              <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
                <div className="flex items-center gap-2">
                  {result.salaryCheck?.meetsThreshold === true
                    ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    : result.salaryCheck?.meetsThreshold === false
                    ? <XCircle className="w-4 h-4 text-red-400" />
                    : <AlertTriangle className="w-4 h-4 text-amber-400" />
                  }
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Salary Threshold</p>
                </div>
                <p className="text-sm font-semibold text-foreground">
                  {result.salaryCheck?.advertisedSalary || 'Salary not specified'}
                </p>
                <p className="text-[11px] text-muted-foreground">Min required: {result.salaryCheck?.minimumRequired}</p>
                {result.salaryCheck?.advice && (
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 leading-snug">{result.salaryCheck.advice}</p>
                )}
              </div>
            </div>

            {/* Visa routes */}
            {result.visaRoutes?.length > 0 && (
              <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Visa Routes</p>
                {result.visaRoutes.map((v: any, i: number) => (
                  <div key={i} className={cn('rounded-xl p-4 border', v.eligible ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20' : 'border-border bg-muted/20')}>
                    <div className="flex items-center gap-2 mb-2">
                      {v.eligible ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-muted-foreground" />}
                      <p className="text-[13px] font-bold text-foreground">{v.route}</p>
                    </div>
                    <p className="text-[12px] text-muted-foreground mb-2 leading-snug">{v.reason}</p>
                    {v.eligible && v.requirements?.length > 0 && (
                      <ul className="space-y-1">
                        {v.requirements.map((r: string, j: number) => (
                          <li key={j} className="flex items-start gap-2 text-[11px] text-foreground/70">
                            <ArrowRight className="w-3 h-3 text-primary shrink-0 mt-0.5" />{r}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Employer profile */}
            {result.employerSponsorshipProfile && (
              <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Employer Sponsorship Profile</p>
                <div className="flex items-center gap-2">
                  {result.employerSponsorshipProfile.isLikelySponsor
                    ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    : <AlertTriangle className="w-4 h-4 text-amber-400" />
                  }
                  <p className="text-sm font-semibold text-foreground">
                    {result.employerSponsorshipProfile.isLikelySponsor ? 'Likely to sponsor' : 'Sponsorship uncertain'}
                  </p>
                  <span className="text-[10px] bg-muted text-muted-foreground border border-border px-2 py-0.5 rounded-full">
                    {result.employerSponsorshipProfile.sponsorshipHistory}
                  </span>
                </div>
                <p className="text-[12px] text-muted-foreground leading-relaxed">{result.employerSponsorshipProfile.reason}</p>
                {result.employerSponsorshipProfile.redFlags?.length > 0 && (
                  <div className="space-y-1">
                    {result.employerSponsorshipProfile.redFlags.map((f: string, i: number) => (
                      <p key={i} className="flex items-start gap-2 text-[11px] text-red-600 dark:text-red-400">
                        <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />{f}
                      </p>
                    ))}
                  </div>
                )}
                {result.employerSponsorshipProfile.positiveSignals?.length > 0 && (
                  <div className="space-y-1">
                    {result.employerSponsorshipProfile.positiveSignals.map((s: string, i: number) => (
                      <p key={i} className="flex items-start gap-2 text-[11px] text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-3 h-3 shrink-0 mt-0.5" />{s}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Registration requirements */}
            {result.registrationRequirements && result.registrationRequirements.body !== 'None' && (
              <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-500" />
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    {result.registrationRequirements.body} Registration
                  </p>
                </div>
                <div className="flex flex-wrap gap-3 text-[12px]">
                  <span className={cn('px-2.5 py-1 rounded-full border text-[11px] font-semibold',
                    result.registrationRequirements.requiredBeforeStart
                      ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                      : 'bg-muted text-muted-foreground border-border'
                  )}>
                    {result.registrationRequirements.requiredBeforeStart ? 'Required before start' : 'Can apply while unregistered'}
                  </span>
                  <span className="px-2.5 py-1 rounded-full border border-border bg-muted text-[11px] text-muted-foreground">
                    ~{result.registrationRequirements.estimatedTimeToRegister}
                  </span>
                  <span className="px-2.5 py-1 rounded-full border border-border bg-muted text-[11px] text-muted-foreground">
                    English: {result.registrationRequirements.englishTestRequired}
                  </span>
                </div>
                {result.registrationRequirements.keySteps?.length > 0 && (
                  <ul className="space-y-1.5">
                    {result.registrationRequirements.keySteps.map((s: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-[12px] text-foreground/80">
                        <div className="w-4 h-4 rounded-full bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-[9px] font-black flex items-center justify-center shrink-0 mt-0.5">{i+1}</div>
                        {s}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Timeline */}
            {result.estimatedTimeline && (
              <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Estimated Timeline</p>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  {[
                    { label: 'Application → Offer',      value: result.estimatedTimeline.jobApplicationToOffer },
                    { label: 'CoS → Visa Decision',      value: result.estimatedTimeline.cosToVisaDecision     },
                    { label: 'Registration (if needed)', value: result.estimatedTimeline.registrationIfNeeded  },
                    { label: 'Total from now',            value: result.estimatedTimeline.totalFromNow, bold: true },
                  ].map(({ label, value, bold }) => value && (
                    <div key={label} className={cn('rounded-xl bg-muted/30 px-4 py-3', bold && 'sm:col-span-2 bg-primary/5 border border-primary/20')}>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
                      <p className={cn('text-[13px] mt-0.5', bold ? 'font-black text-foreground' : 'font-semibold text-foreground/80')}>{value}</p>
                    </div>
                  ))}
                </div>
                {result.estimatedTimeline.criticalPath && (
                  <p className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                    <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
                    Critical path: {result.estimatedTimeline.criticalPath}
                  </p>
                )}
              </div>
            )}

            {/* Action plan */}
            {result.actionPlan?.length > 0 && (
              <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Action Plan</p>
                </div>
                {result.actionPlan.map((a: any, i: number) => (
                  <div key={i} className="flex items-start gap-3 border-b border-border/50 last:border-0 pb-3 last:pb-0">
                    <span className={cn('text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-full shrink-0',
                      a.priority === 'immediate' ? 'bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300' :
                      a.priority === 'soon'      ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300' :
                      'bg-muted text-muted-foreground'
                    )}>
                      {a.priority}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-foreground">{a.action}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{a.reason}</p>
                    </div>
                    {a.link && (
                      <a href={a.link} target="_blank" rel="noopener noreferrer"
                        className="text-primary hover:underline shrink-0">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Red flags + encouraging */}
            <div className="grid sm:grid-cols-2 gap-4">
              {result.redFlags?.length > 0 && (
                <div className="rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 p-4 space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400">Red flags</p>
                  {result.redFlags.map((f: string, i: number) => (
                    <p key={i} className="flex items-start gap-2 text-[12px] text-red-700 dark:text-red-300">
                      <XCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />{f}
                    </p>
                  ))}
                </div>
              )}
              {result.encouragingFactors?.length > 0 && (
                <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/20 p-4 space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">In your favour</p>
                  {result.encouragingFactors.map((f: string, i: number) => (
                    <p key={i} className="flex items-start gap-2 text-[12px] text-emerald-700 dark:text-emerald-300">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />{f}
                    </p>
                  ))}
                </div>
              )}
            </div>

            {/* Key resources */}
            {result.keyResources?.length > 0 && (
              <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Key Resources</p>
                <div className="space-y-2">
                  {result.keyResources.map((r: any, i: number) => (
                    <a key={i} href={r.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-start gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors group">
                      <ExternalLink className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[13px] font-semibold text-primary group-hover:underline">{r.title}</p>
                        <p className="text-[11px] text-muted-foreground">{r.relevance}</p>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Reset */}
            <button onClick={() => setResult(null)}
              className="text-[12px] text-muted-foreground hover:text-foreground transition-colors">
              ← Analyse a different role
            </button>
          </div>
        )}

      </main>
    </div>
  )
}