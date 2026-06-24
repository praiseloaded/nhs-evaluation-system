// app/dashboard/application/[id]/page.tsx
'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, ArrowRight, CheckCircle2, Loader2,
  FileText, Target, ChevronDown, ChevronUp,
  Copy, AlertTriangle, Sparkles, Clock,
  Send, Users, Award, XCircle, Calendar, StickyNote,
  Shield, User, RefreshCw, Info, Brain, TrendingUp,
  BarChart3, Zap, Heart, BookOpen, Pen, Activity,
} from 'lucide-react'
import { CvOptimiser } from '@/components/cv-optimiser'
import { ShortlistIntelligence } from '@/components/shortlist-intelligence'
import { MissingEvidenceReport } from '@/components/missing-evidence-report'
import { InterviewQuestionsPanel } from '@/components/interview-questions-panel'

// ─── Types ────────────────────────────────────────────────────────────────────

type Criterion = {
  id: string; criterionText: string; type: string; category: string | null; order: number
  situation: string | null; task: string | null; action: string | null; result: string | null
  metrics: string | null; mdtContext: string | null; reflection: string | null; nhsValues: string | null
  generatedParagraph: string | null; paragraphScore: number | null; status: string
}

type NHSNation = 'scotland' | 'england' | 'wales' | 'northern_ireland' | 'unknown'

const SCOTLAND_SIGNALS = ['nhs scotland','nhs lothian','nhs ggc','nhs grampian','nhs tayside','nhs highland','nhs lanarkshire','nhs fife','nhs borders','nhs ayrshire','nhs forth valley','nhs dumfries','nhs western isles','nhs orkney','nhs shetland','nhs 24','scottish ambulance','public health scotland','nhs education for scotland']
const WALES_SIGNALS    = ['nhs wales','cardiff and vale','aneurin bevan','swansea bay','betsi cadwaladr','hywel dda','cwm taf','powys teaching','velindre','cymru','uhb']
const NI_SIGNALS       = ['hsc trust','health and social care trust','belfast trust','south eastern trust','northern trust','southern trust','western trust','northern ireland','hscni']

function detectNation(employer: string | null): NHSNation {
  if (!employer || employer.trim().length < 2) return 'unknown'
  const l = employer.toLowerCase()
  if (SCOTLAND_SIGNALS.some(s => l.includes(s))) return 'scotland'
  if (NI_SIGNALS.some(s => l.includes(s))) return 'northern_ireland'
  if (WALES_SIGNALS.some(s => l.includes(s))) return 'wales'
  if (l.includes('nhs') || l.includes('hospital') || l.includes('trust') || l.includes('icb')) return 'england'
  return 'unknown'
}

const NATION_VALUES: Record<NHSNation, { label: string; flag: string; coreValues: string[] }> = {
  scotland:         { label: 'NHS Scotland',        flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', coreValues: ['Care and Compassion','Dignity and Respect','Openness, Honesty and Responsibility','Quality and Teamwork','Fairness'] },
  england:          { label: 'NHS England',          flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', coreValues: ['Working together for patients','Respect and dignity','Commitment to quality of care','Compassion','Improving lives','Everyone counts'] },
  wales:            { label: 'NHS Wales',            flag: '🏴󠁧󠁢󠁷󠁬󠁳󠁿', coreValues: ['Working Together','With Respect','Always Improving','Striving to Excel','Caring for Each Other','Keeping People Safe'] },
  northern_ireland: { label: 'HSC Northern Ireland', flag: '🇬🇧',        coreValues: ['Working Together','Excellence and Innovation','Openness and Honesty','Respect and Dignity','Best Use of Resources'] },
  unknown:          { label: 'NHS',                  flag: '🏥',         coreValues: ['Compassion','Respect and dignity','Working together','Commitment to quality'] },
}

type AppData = {
  id: string; jobTitle: string; band: string | null; employer: string | null
  completeness: number; status: string; parsedSpec: any
  introduction: string | null; closing: string | null
  fullStatement: string | null; wordCount: number | null
  statementQ1: string | null; wordCountQ1: number | null
  statementQ2: string | null; wordCountQ2: number | null
  statementQ3: string | null; wordCountQ3: number | null
  q3Context: any | null
  liveScore: any; cvScore: any; cvText: string | null; criteria: Criterion[]
  notes: string | null; deadlineDate: string | null; interviewDate: string | null; submittedAt: string | null
}

type View = 'statement' | 'score' | 'interview' | 'cv' | 'shortlist'

// ─── Status Config ────────────────────────────────────────────────────────────

const STATUSES = [
  { value: 'draft',       label: 'Draft',       icon: FileText,     cls: 'text-gray-500',    bg: 'bg-gray-100 dark:bg-gray-800' },
  { value: 'in_progress', label: 'Building',    icon: Sparkles,     cls: 'text-blue-500',    bg: 'bg-blue-50 dark:bg-blue-950' },
  { value: 'complete',    label: 'Ready',       icon: CheckCircle2, cls: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950' },
  { value: 'submitted',   label: 'Submitted',   icon: Send,         cls: 'text-indigo-500',  bg: 'bg-indigo-50 dark:bg-indigo-950' },
  { value: 'shortlisted', label: 'Shortlisted', icon: Target,       cls: 'text-purple-500',  bg: 'bg-purple-50 dark:bg-purple-950' },
  { value: 'interview',   label: 'Interview',   icon: Users,        cls: 'text-amber-500',   bg: 'bg-amber-50 dark:bg-amber-950' },
  { value: 'offer',       label: 'Offer',       icon: Award,        cls: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950' },
  { value: 'rejected',    label: 'Rejected',    icon: XCircle,      cls: 'text-red-500',     bg: 'bg-red-50 dark:bg-red-950' },
]

// ─── Word Counter ─────────────────────────────────────────────────────────────

function WordCounter({ text, target, hard, label }: { text: string | null; target: number; hard: number; label: string }) {
  const count = text ? text.trim().split(/\s+/).filter(Boolean).length : 0
  const pct = Math.min((count / hard) * 100, 100)
  const status = count === 0 ? 'empty' : count > hard ? 'over' : count > target ? 'warning' : count >= target * 0.8 ? 'good' : 'low'
  const colors = {
    empty:   { bar: 'bg-gray-200 dark:bg-gray-700', text: 'text-gray-400' },
    low:     { bar: 'bg-blue-400',                  text: 'text-blue-600 dark:text-blue-400' },
    good:    { bar: 'bg-emerald-500',               text: 'text-emerald-600 dark:text-emerald-400' },
    warning: { bar: 'bg-amber-400',                 text: 'text-amber-600 dark:text-amber-400' },
    over:    { bar: 'bg-red-500',                   text: 'text-red-600 dark:text-red-400' },
  }[status]
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className={`text-xs font-mono font-semibold ${colors.text}`}>{count} / {hard}</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden relative">
        <div className={`h-full rounded-full transition-all duration-300 ${colors.bar}`} style={{ width: `${pct}%` }} />
        <div className="absolute top-0 bottom-0 w-px bg-gray-400/60" style={{ left: `${(target / hard) * 100}%` }} />
      </div>
      {status === 'over'    && <p className="text-[10px] text-red-500">⚠ {count - hard} words over limit — Jobtrain will truncate</p>}
      {status === 'warning' && <p className="text-[10px] text-amber-500">{hard - count} words remaining</p>}
    </div>
  )
}

// ─── Score Ring ───────────────────────────────────────────────────────────────

function ScoreRing({ score, size = 80, label, color }: { score: number; size?: number; label?: string; color?: string }) {
  const r = (size - 8) / 2; const circ = 2 * Math.PI * r; const offset = circ * (1 - Math.min(score, 100) / 100)
  const c = color ?? (score >= 80 ? '#10b981' : score >= 65 ? '#3b82f6' : score >= 45 ? '#f59e0b' : '#ef4444')
  const trackColor = color ?? (score >= 80 ? '#d1fae5' : score >= 65 ? '#dbeafe' : score >= 45 ? '#fef3c7' : '#fee2e2')
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" viewBox={`0 0 ${size} ${size}`}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={trackColor} strokeWidth="6" className="dark:opacity-20" />
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={c} strokeWidth="6"
            strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.9s cubic-bezier(0.4,0,0.2,1)' }} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-black tabular-nums" style={{ fontSize: size * 0.26, color: c }}>{Math.round(score)}</span>
        </div>
      </div>
      {label && <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold text-center">{label}</span>}
    </div>
  )
}

// ─── Dimension Card ───────────────────────────────────────────────────────────

function DimensionCard({ label, score, weight, description, icon: Icon, color }: {
  label: string; score: number; weight?: number; description?: string
  icon: React.ElementType; color: string
}) {
  const pct = Math.min(score, 100)
  const verdict = score >= 80 ? 'Strong' : score >= 65 ? 'Good' : score >= 45 ? 'Developing' : 'Weak'
  const verdictCls = score >= 80 ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950'
    : score >= 65 ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950'
    : score >= 45 ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950'
    : 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950'

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3 hover:border-foreground/10 transition-colors">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: color + '20' }}>
            <Icon className="w-4 h-4" style={{ color }} />
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground leading-tight">{label}</p>
            {weight && <p className="text-[10px] text-muted-foreground">Weight: {weight}%</p>}
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xl font-black tabular-nums" style={{ color }}>{Math.round(score)}%</p>
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${verdictCls}`}>{verdict}</span>
        </div>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
      </div>
      {description && <p className="text-[11px] text-muted-foreground leading-relaxed">{description}</p>}
    </div>
  )
}

// ─── Status Panel ─────────────────────────────────────────────────────────────

function StatusPanel({ app, onStatusChange, onNotesChange, onDateChange, saving }: {
  app: AppData; onStatusChange: (s: string) => void; onNotesChange: (n: string) => void
  onDateChange: (f: string, d: string) => void; saving: boolean
}) {
  const [showDropdown, setShowDropdown] = useState(false)
  const [notes, setNotes] = useState(app.notes ?? '')
  const currentStatus = STATUSES.find(s => s.value === app.status) ?? STATUSES[0]
  const Icon = currentStatus.icon
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <Clock className="w-4 h-4 text-muted-foreground" /> Application Status
      </h3>
      <div className="relative">
        <button onClick={() => setShowDropdown(d => !d)}
          className={`w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl border border-border ${currentStatus.bg} transition-colors`}>
          <div className="flex items-center gap-2">
            <Icon className={`w-4 h-4 ${currentStatus.cls}`} />
            <span className={`text-sm font-semibold ${currentStatus.cls}`}>{currentStatus.label}</span>
          </div>
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
        </button>
        {showDropdown && (
          <div className="absolute top-full left-0 right-0 mt-1 rounded-xl border border-border bg-card shadow-lg z-20 overflow-hidden">
            {STATUSES.map(s => {
              const SIcon = s.icon
              return (
                <button key={s.value} onClick={() => { onStatusChange(s.value); setShowDropdown(false) }}
                  disabled={saving}
                  className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-sm hover:bg-accent transition-colors ${s.value === app.status ? 'bg-primary/5 font-semibold' : ''}`}>
                  <SIcon className={`w-4 h-4 ${s.cls}`} />
                  <span className="text-foreground">{s.label}</span>
                  {s.value === app.status && <CheckCircle2 className="w-3 h-3 text-primary ml-auto" />}
                </button>
              )
            })}
          </div>
        )}
      </div>
      <div className="flex items-center gap-1">
        {STATUSES.map((s, i) => {
          const isActive = STATUSES.findIndex(x => x.value === app.status) >= i
          return (
            <div key={s.value} className="flex items-center gap-1 flex-1">
              <div className={`w-2.5 h-2.5 rounded-full transition-colors ${isActive ? s.cls.replace('text-', 'bg-') : 'bg-muted'}`} title={s.label} />
              {i < STATUSES.length - 1 && <div className={`h-0.5 flex-1 ${isActive ? 'bg-muted-foreground/30' : 'bg-muted'}`} />}
            </div>
          )
        })}
      </div>
      {app.status === 'interview' && (
        <Link href="/dashboard/interview"
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-white text-sm font-semibold transition-colors">
          <Users className="w-4 h-4" /> Practice Interview
        </Link>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1"><Calendar className="w-3 h-3" /> Deadline</label>
          <input type="date" value={app.deadlineDate?.split('T')[0] ?? ''} onChange={e => onDateChange('deadlineDate', e.target.value)}
            className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1"><Users className="w-3 h-3" /> Interview</label>
          <input type="date" value={app.interviewDate?.split('T')[0] ?? ''} onChange={e => onDateChange('interviewDate', e.target.value)}
            className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1"><StickyNote className="w-3 h-3" /> Notes</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)}
          onBlur={() => { if (notes !== (app.notes ?? '')) onNotesChange(notes) }}
          placeholder="Add notes..." rows={3}
          className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder-muted-foreground/50 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30" />
      </div>
    </div>
  )
}

// ─── Statement View ───────────────────────────────────────────────────────────

function UnifiedStatementView({ app, onRefresh }: { app: AppData; onRefresh: () => void }) {
  const parsed    = app.parsedSpec as any
  const rawNation = detectNation(app.employer)
  const nation: NHSNation = rawNation !== 'unknown' ? rawNation : (parsed?.detectedNation ?? detectNation(parsed?.resolvedBoard ?? ''))
  const nationMeta = NATION_VALUES[nation] ?? NATION_VALUES['unknown']
  const isScotland = nation === 'scotland' || nation === 'unknown'
  const totalLimit: number = parsed?.statementWordLimit ?? (nation === 'northern_ireland' ? 1200 : !isScotland ? 1500 : 500)

  const q1Hard = isScotland ? 500 : Math.round(totalLimit * 0.50)
  const q2Hard = isScotland ? 500 : Math.round(totalLimit * 0.35)
  const q3Hard = isScotland ? 250 : Math.round(totalLimit * 0.15)
  const q1Target = isScotland ? 480 : Math.round(q1Hard * 0.96)
  const q2Target = isScotland ? 450 : Math.round(q2Hard * 0.96)
  const q3Target = isScotland ? 200 : Math.round(q3Hard * 0.90)

  const [genQ1, setGenQ1] = useState(false)
  const [qualifications, setQualifications] = useState('')
  const [systemsKnowledge, setSystemsKnowledge] = useState('')
  const [careerMotivation, setCareerMotivation] = useState('')
  const [q1Error, setQ1Error] = useState<string | null>(null)
  const [q1Warning, setQ1Warning] = useState<string | null>(null)
  const [q1Open, setQ1Open] = useState(true)
  const [genQ2, setGenQ2] = useState(false)
  const [personalMotivation, setPersonalMotivation] = useState('')
  const [valuesExample, setValuesExample] = useState('')
  const [careerGoals, setCareerGoals] = useState('')
  const [q2Error, setQ2Error] = useState<string | null>(null)
  const [q2Open, setQ2Open] = useState(!app.statementQ2)
  const [genQ3, setGenQ3] = useState(false)
  const [q3Open, setQ3Open] = useState(!app.statementQ3)
  const [q3Error, setQ3Error] = useState<string | null>(null)
  const [q3Context, setQ3Context] = useState({
    hasCareerGap: false, careerGapExplanation: '',
    applyingUnderGIS: false, gisDisabilityType: '',
    preferPartTime: false, preferredHours: '',
    isRelocating: false, relocationDetails: '',
    hasQualificationsPending: false, qualificationsPendingDetails: '',
    hasLongNoticePeriod: false, noticePeriodDetails: '',
    additionalFreeText: '',
  })
  const [copiedQ, setCopiedQ] = useState<string | null>(null)
  const copyQ = (text: string, q: string) => { navigator.clipboard.writeText(text); setCopiedQ(q); setTimeout(() => setCopiedQ(null), 2000) }
  const copyAll = () => {
    const combined = [app.statementQ1, app.statementQ2, app.statementQ3].filter(Boolean).join('\n\n')
    navigator.clipboard.writeText(combined); setCopiedQ('all'); setTimeout(() => setCopiedQ(null), 2000)
  }

  // ── Layer 4: check competency evidence instead of generatedParagraph ────────
  const competencyEvidence = (parsed?.competencyEvidence ?? {}) as Record<string, any>
  const competencyCount = Object.keys(competencyEvidence).length
  const answeredCompetencies = Object.values(competencyEvidence).filter((ce: any) => !ce.noExperience && ce.evidence?.trim()).length
  const hasEvidence = competencyCount > 0

  // Also check legacy criterion evidence as fallback
  const legacyEssentialCount = app.criteria.filter(c => c.type === 'essential' && c.generatedParagraph).length
  const totalEssential = app.criteria.filter(c => c.type === 'essential').length
  const hasAnyEvidence = hasEvidence || legacyEssentialCount > 0

  const q1Done = !!app.statementQ1
  const q2Done = !!app.statementQ2
  const q3Done = !!app.statementQ3
  const allDone = q1Done && q2Done && q3Done
  const hasValuesDoc = !!(parsed?.nhsValuesLoaded || (app as any).nhsValuesText)

  const generateQ1 = async () => {
    setGenQ1(true); setQ1Error(null); setQ1Warning(null)
    try {
      const res = await fetch('/api/application/generate-statement', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId: app.id, nation, wordLimit: totalLimit, qualifications, systemsKnowledge, careerMotivation }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      if (data.warning) setQ1Warning(data.warning)
      await onRefresh(); setQ1Open(false); setQ2Open(true)
    } catch (e: any) { setQ1Error(e.message) }
    finally { setGenQ1(false) }
  }

  const generateQ2 = async () => {
    setGenQ2(true); setQ2Error(null)
    try {
      const res = await fetch('/api/application/generate-q2', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId: app.id, nation, wordLimit: totalLimit, personalMotivation, valuesExample, careerGoals }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      await onRefresh(); setQ2Open(false); setQ3Open(true)
    } catch (e: any) { setQ2Error(e.message) }
    finally { setGenQ2(false) }
  }

  const generateQ3 = async () => {
    setGenQ3(true); setQ3Error(null)
    try {
      const res = await fetch('/api/application/generate-q3', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId: app.id, nation, wordLimit: totalLimit, context: q3Context }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      await onRefresh(); setQ3Open(false)
    } catch (e: any) { setQ3Error(e.message) }
    finally { setGenQ3(false) }
  }

  function QPanel({ q, label, limitLabel, description, badge, status, isOpen, onToggle, statement, targetWords, hardLimit, children }: {
    q: string; label: string; limitLabel: string; description: string; badge: string
    status: 'done'|'empty'; isOpen: boolean; onToggle: () => void
    statement: string|null; targetWords: number; hardLimit: number; children: React.ReactNode
  }) {
    const [localCopied, setLocalCopied] = useState(false)
    const copyLocal = () => { if (statement) { navigator.clipboard.writeText(statement); setLocalCopied(true); setTimeout(() => setLocalCopied(false), 2000) } }
    return (
      <div className={`rounded-xl border ${status === 'done' ? 'border-emerald-200 dark:border-emerald-800' : 'border-border'} bg-card overflow-hidden`}>
        <button onClick={onToggle} className="w-full flex items-center justify-between px-5 py-4 hover:bg-accent/30 transition-colors">
          <div className="flex items-center gap-3">
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badge}`}>{q}</span>
            <div className="text-left">
              <p className="text-sm font-semibold text-foreground">{label}</p>
              <p className="text-xs text-muted-foreground">{limitLabel} · {description}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {statement && <div className="w-28"><WordCounter text={statement} target={targetWords} hard={hardLimit} label="" /></div>}
            {status === 'done' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
            {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </div>
        </button>
        {isOpen && (
          <div className="px-5 pb-5 pt-2 space-y-4 border-t border-border">
            {statement && (
              <div className="rounded-lg bg-muted p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Current answer</p>
                  <button onClick={copyLocal} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                    {localCopied ? <><CheckCircle2 className="w-3 h-3 text-emerald-500" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
                  </button>
                </div>
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{statement}</p>
              </div>
            )}
            {children}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-base">{nationMeta.flag}</span>
            <div>
              <p className="text-sm font-semibold text-foreground">{isScotland ? 'NHS Scotland' : nationMeta.label} — Supporting Statement</p>
              <p className="text-xs text-muted-foreground">
                {isScotland ? '3 separate Jobtrain boxes — paste each individually into NHS Scotland Jobs' : `Single statement · ${totalLimit} words total`}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {hasValuesDoc && <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">✓ Values doc loaded</span>}
            {hasEvidence && <span className="text-[10px] bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full font-semibold">{answeredCompetencies}/{competencyCount} competencies answered</span>}
            {allDone && <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2.5 py-1 rounded-full flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> All sections complete</span>}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <WordCounter text={app.statementQ1} target={q1Target} hard={q1Hard} label={isScotland ? 'Q1 · 500w limit' : `Q1 (${q1Hard}w)`} />
          <WordCounter text={app.statementQ2} target={q2Target} hard={q2Hard} label={isScotland ? 'Q2 · 500w limit' : `Q2 (${q2Hard}w)`} />
          <WordCounter text={app.statementQ3} target={q3Target} hard={q3Hard} label={isScotland ? 'Q3 · open' : `Q3 (${q3Hard}w)`} />
        </div>
      </div>

      {/* Q1 */}
      <QPanel q="Q1" label="Why are you suitable for this role?"
        limitLabel={isScotland ? '500 words (aim 400–480)' : `${q1Hard} words`} description="All STAR evidence goes here"
        badge="bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
        status={q1Done ? 'done' : 'empty'} isOpen={q1Open} onToggle={() => setQ1Open(o => !o)}
        statement={app.statementQ1 ?? null} targetWords={q1Target} hardLimit={q1Hard}>
        {!hasAnyEvidence ? (
          <div className="rounded-xl border-2 border-dashed border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/30 p-6 text-center space-y-4">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900 flex items-center justify-center mx-auto">
              <Brain className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">No competency evidence yet</p>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                Answer the competency questions first. The AI writes Q1 around your evidence — {totalEssential} criteria clustered into competency groups.
              </p>
            </div>
            <Link href={`/dashboard/application?id=${app.id}&step=4`}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold transition-colors">
              <ArrowLeft className="w-4 h-4" /> Answer Competency Questions
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {hasEvidence && (
              <div className="rounded-lg bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900 p-3">
                <p className="text-xs text-blue-700 dark:text-blue-300 flex items-start gap-1.5">
                  <Info className="w-3 h-3 shrink-0 mt-0.5" />
                  <span>
                    <span className="font-semibold">{answeredCompetencies} of {competencyCount}</span> competencies answered.
                    {answeredCompetencies < competencyCount && <> <Link href={`/dashboard/application?id=${app.id}&step=4`} className="underline font-semibold">Answer remaining {competencyCount - answeredCompetencies}</Link> for a stronger statement.</>}
                  </span>
                </p>
              </div>
            )}
            <div className="grid md:grid-cols-3 gap-3">
              {[
                { label: 'Qualifications / training', val: qualifications, set: setQualifications, ph: 'e.g. NMC registered, ILS trained...' },
                { label: 'Systems / clinical skills',  val: systemsKnowledge, set: setSystemsKnowledge, ph: 'e.g. TRAKCARE, EMIS, SystmOne...' },
                { label: 'Why this role / band?',       val: careerMotivation, set: setCareerMotivation, ph: 'e.g. Ready for Band 6 leadership...' },
              ].map(f => (
                <div key={f.label} className="space-y-1">
                  <label className="text-xs font-medium text-foreground">{f.label}</label>
                  <textarea value={f.val} onChange={e => f.set(e.target.value)} rows={2} placeholder={f.ph}
                    className="w-full bg-muted border border-border rounded-lg p-2 text-xs text-foreground placeholder-muted-foreground/50 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
              ))}
            </div>
            {q1Error   && <p className="text-xs text-red-500">{q1Error}</p>}
            {q1Warning && <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> {q1Warning}</p>}
            <button onClick={generateQ1} disabled={genQ1}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-semibold flex items-center justify-center gap-2">
              {genQ1 ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating Q1…</> : q1Done ? <><RefreshCw className="w-4 h-4" /> Regenerate Q1</> : <><Sparkles className="w-4 h-4" /> Generate Q1 — Why You're Suitable</>}
            </button>
          </div>
        )}
      </QPanel>

      {/* Q2 */}
      <QPanel q="Q2" label={`Why do you want to work for ${app.employer ?? 'this organisation'}?`}
        limitLabel={isScotland ? '500 words (aim 350–450)' : `${q2Hard} words`}
        description={hasValuesDoc ? `Using uploaded values doc` : 'Values registry'}
        badge="bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
        status={q2Done ? 'done' : 'empty'} isOpen={q2Open} onToggle={() => setQ2Open(o => !o)}
        statement={app.statementQ2 ?? null} targetWords={q2Target} hardLimit={q2Hard}>
        <div className={`rounded-lg border p-3 ${hasValuesDoc ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-100 dark:border-emerald-900' : 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-100 dark:border-indigo-900'}`}>
          <p className={`text-xs flex items-start gap-1.5 ${hasValuesDoc ? 'text-emerald-700 dark:text-emerald-300' : 'text-indigo-700 dark:text-indigo-300'}`}>
            <Info className="w-3 h-3 shrink-0 mt-0.5" />
            {hasValuesDoc ? `Using the values document you uploaded — exact language from ${app.employer ?? 'this employer'}'s own framework.` : `Using our built-in values registry for ${app.employer ?? 'this employer'}. Upload a NHS Values Document in the launcher for stronger results.`}
          </p>
        </div>
        <div className="space-y-3">
          {[
            { label: 'Personal values connection to patient care', val: personalMotivation, set: setPersonalMotivation, ph: 'e.g. After caring for a family member, I saw first-hand...', required: true },
            { label: 'Example of values in action', val: valuesExample, set: setValuesExample, ph: 'e.g. When a patient was distressed before a procedure, I...' },
            { label: 'Long-term career goals within this organisation', val: careerGoals, set: setCareerGoals, ph: 'e.g. I aim to develop into a specialist role over 3 years...' },
          ].map(f => (
            <div key={f.label} className="space-y-1">
              <label className="text-xs font-medium text-foreground flex items-center gap-1">{f.label}{f.required && <span className="text-[10px] text-red-500">*</span>}</label>
              <textarea value={f.val} onChange={e => f.set(e.target.value)} rows={2} placeholder={f.ph}
                className="w-full bg-muted border border-border rounded-lg p-2.5 text-xs text-foreground placeholder-muted-foreground/50 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          ))}
        </div>
        {q2Error && <p className="text-xs text-red-500">{q2Error}</p>}
        <button onClick={generateQ2} disabled={genQ2 || !personalMotivation.trim()}
          className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-semibold flex items-center justify-center gap-2">
          {genQ2 ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating Q2…</> : q2Done ? <><RefreshCw className="w-4 h-4" /> Regenerate Q2</> : <><Sparkles className="w-4 h-4" /> Generate Q2</>}
        </button>
      </QPanel>

      {/* Q3 */}
      <QPanel q="Q3" label="Any other relevant information?"
        limitLabel={isScotland ? 'No stated limit' : `${q3Hard} words`}
        description={isScotland ? '100–200 words, or "None." if nothing applies' : `~${q3Hard} words or "None."`}
        badge="bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
        status={q3Done ? 'done' : 'empty'} isOpen={q3Open} onToggle={() => setQ3Open(o => !o)}
        statement={app.statementQ3 ?? null} targetWords={q3Target} hardLimit={q3Hard}>
        <div className="rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-100 dark:border-amber-900 p-3">
          <p className="text-xs text-amber-700 dark:text-amber-300 flex items-start gap-1.5">
            <Info className="w-3 h-3 shrink-0 mt-0.5" />
            Q3 is for career gaps, GIS declaration, part-time preferences, relocation, pending qualifications, or long notice periods. Leaving it blank looks like an oversight.
          </p>
        </div>
        <div className="space-y-3">
          {[
            { key: 'hasCareerGap', label: 'Career gap to explain', fKey: 'careerGapExplanation', fPh: 'e.g. 12-month break to care for a parent' },
            { key: 'applyingUnderGIS', label: 'Applying under the Guaranteed Interview Scheme', fKey: 'gisDisabilityType', fPh: 'e.g. long-term health condition', gis: true },
            { key: 'preferPartTime', label: 'Part-time / flexible working preference', fKey: 'preferredHours', fPh: 'e.g. 0.8 WTE' },
            { key: 'isRelocating', label: 'Relocating to take this role', fKey: 'relocationDetails', fPh: 'e.g. relocating from London, August 2026' },
            { key: 'hasQualificationsPending', label: 'Qualifications / registrations pending', fKey: 'qualificationsPendingDetails', fPh: 'e.g. HCPC registration, July 2026' },
            { key: 'hasLongNoticePeriod', label: 'Notice period longer than 4 weeks', fKey: 'noticePeriodDetails', fPh: 'e.g. 3-month notice, negotiable' },
          ].map(row => (
            <div key={row.key} className="space-y-1.5">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input type="checkbox" checked={(q3Context as any)[row.key]} onChange={e => setQ3Context(c => ({ ...c, [row.key]: e.target.checked }))} className="w-4 h-4 rounded accent-primary" />
                <span className="text-sm text-foreground">{row.label}</span>
                {(row as any).gis && <span className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 px-1.5 py-0.5 rounded font-semibold">GIS</span>}
              </label>
              {(q3Context as any)[row.key] && (
                <textarea value={(q3Context as any)[row.fKey]} onChange={e => setQ3Context(c => ({ ...c, [row.fKey]: e.target.value }))} placeholder={row.fPh} rows={2}
                  className="w-full ml-6 bg-muted border border-border rounded-lg p-2.5 text-xs text-foreground placeholder-muted-foreground/50 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30" />
              )}
            </div>
          ))}
          <p className="text-[10px] text-muted-foreground">If none apply, click Generate — we write "None." so the box is not left blank.</p>
        </div>
        {q3Error && <p className="text-xs text-red-500">{q3Error}</p>}
        <button onClick={generateQ3} disabled={genQ3}
          className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white font-semibold flex items-center justify-center gap-2">
          {genQ3 ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating Q3…</> : q3Done ? <><RefreshCw className="w-4 h-4" /> Regenerate Q3</> : <><Sparkles className="w-4 h-4" /> Generate Q3</>}
        </button>
      </QPanel>

      {/* Complete actions */}
      {allDone && (
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/30 p-4 space-y-3">
          <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
            {isScotland ? 'All three questions ready — paste each one into the Jobtrain form' : 'All three sections ready — copy as one combined statement'}
          </p>
          <div className={`grid gap-2 ${isScotland ? 'grid-cols-3' : 'grid-cols-2'}`}>
            {isScotland ? (
              [{ q: 'Q1', t: app.statementQ1 }, { q: 'Q2', t: app.statementQ2 }, { q: 'Q3', t: app.statementQ3 }].map(({ q, t }) => (
                <button key={q} onClick={() => { if (t) copyQ(t, q) }}
                  className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-white dark:bg-gray-900 border border-emerald-200 dark:border-emerald-800 text-xs font-medium text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 transition-colors">
                  {copiedQ === q ? <><CheckCircle2 className="w-3 h-3" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy {q}</>}
                </button>
              ))
            ) : (
              <>
                <button onClick={copyAll} className="col-span-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-colors">
                  {copiedQ === 'all' ? <><CheckCircle2 className="w-4 h-4" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy Full Statement</>}
                </button>
                <div className="grid grid-cols-3 gap-1.5">
                  {[{ q: 'Q1', t: app.statementQ1 }, { q: 'Q2', t: app.statementQ2 }, { q: 'Q3', t: app.statementQ3 }].map(({ q, t }) => (
                    <button key={q} onClick={() => { if (t) copyQ(t, q) }}
                      className="flex items-center justify-center gap-1 py-1.5 rounded-lg bg-white dark:bg-gray-900 border border-emerald-200 dark:border-emerald-800 text-[11px] font-medium text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 transition-colors">
                      {copiedQ === q ? '✓' : <Copy className="w-3 h-3" />} {q}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Score View ───────────────────────────────────────────────────────────────

function ScoreView({ app }: { app: AppData }) {
  const score = app.liveScore as any
  const parsed = app.parsedSpec as any

  if (!score) return (
    <div className="mt-2 text-center py-20">
      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
        <Target className="w-7 h-7 text-muted-foreground" />
      </div>
      <p className="text-sm font-semibold text-foreground mb-1">No score yet</p>
      <p className="text-sm text-muted-foreground mb-6">Generate Q1 first — the score is calculated automatically after generation.</p>
      <p className="text-xs text-muted-foreground">Go to the Statement tab → Q1 → Generate</p>
    </div>
  )

  const overall = Math.round(score.overall ?? 0)
  const verdict = overall >= 80 ? { label: 'Strong', cls: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800' }
    : overall >= 65 ? { label: 'Competitive', cls: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800' }
    : overall >= 45 ? { label: 'Developing', cls: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800' }
    : { label: 'Needs work', cls: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800' }

  // Map dimension keys to display config
  const DIMENSION_CONFIG: Record<string, { label: string; icon: any; color: string; weight: number; desc: string }> = {
    criteriaCoverage:  { label: 'Criteria Coverage',     icon: Target,    color: '#3b82f6', weight: 35, desc: 'How well your statement addresses essential and desirable criteria from the person spec' },
    starCompleteness:  { label: 'STAR Completeness',      icon: Zap,       color: '#8b5cf6', weight: 25, desc: 'Quality and completeness of Situation, Task, Action, Result structure in your examples' },
    valuesAlignment:   { label: 'NHS Values Alignment',   icon: Heart,     color: '#10b981', weight: 20, desc: 'How authentically NHS values are demonstrated through specific behavioural examples' },
    languageMirroring: { label: 'Language Mirroring',     icon: Pen,       color: '#ec4899', weight: 12, desc: 'How closely your language mirrors the terminology and phrasing from the job description' },
    specificity:       { label: 'Evidence Specificity',   icon: BookOpen,  color: '#f59e0b', weight: 8,  desc: 'Depth and specificity of examples — quantified outcomes, named procedures, exact dates' },
  }

  const dimensions = score.dimensions ?? {}

  return (
    <div className="mt-2 space-y-6">
      {/* Overall score hero */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-6 flex-wrap">
          <ScoreRing score={overall} size={120} />
          <div className="flex-1 space-y-3">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <p className="text-2xl font-black text-foreground">{overall}%</p>
                <span className={`text-xs font-bold px-3 py-1 rounded-full border ${verdict.cls}`}>{verdict.label}</span>
                {score.grade && <span className="text-xs font-semibold text-muted-foreground capitalize bg-muted px-2 py-0.5 rounded-full">{score.grade}</span>}
              </div>
              <p className="text-sm text-muted-foreground">Overall application score across 5 weighted dimensions</p>
            </div>
            {/* Quick stats */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Essential coverage', value: `${Math.round(score.essentialCoverage ?? 0)}%`, color: '#3b82f6' },
                { label: 'Desirable coverage', value: `${Math.round(score.desirableCoverage ?? 0)}%`, color: '#8b5cf6' },
                { label: 'Total words', value: ((app.wordCountQ1 ?? 0) + (app.wordCountQ2 ?? 0) + (app.wordCountQ3 ?? 0)).toString(), color: '#10b981' },
              ].map(stat => (
                <div key={stat.label} className="rounded-xl bg-muted/50 p-3 text-center">
                  <p className="text-lg font-black tabular-nums" style={{ color: stat.color }}>{stat.value}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Statement health */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
          <Activity className="w-3.5 h-3.5" /> Statement Health
        </h3>
        <div className="grid grid-cols-3 gap-4">
          {[
            { q: 'Q1 — Suitability', wc: app.wordCountQ1, target: 480, color: '#3b82f6' },
            { q: 'Q2 — Values', wc: app.wordCountQ2, target: 450, color: '#6366f1' },
            { q: 'Q3 — Other', wc: app.wordCountQ3, target: 200, color: '#f59e0b' },
          ].map(({ q, wc, target, color }) => {
            const count = wc ?? 0
            const pct = Math.min((count / target) * 100, 100)
            const status = count === 0 ? 'empty' : count > target * 1.05 ? 'over' : count >= target * 0.85 ? 'good' : 'low'
            return (
              <div key={q} className="space-y-2">
                <div className="flex justify-between items-baseline">
                  <p className="text-xs font-medium text-foreground">{q}</p>
                  <p className="text-sm font-black tabular-nums" style={{ color: status === 'over' ? '#ef4444' : status === 'empty' ? '#9ca3af' : color }}>{count}w</p>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: status === 'over' ? '#ef4444' : color }} />
                </div>
                <p className="text-[10px] text-muted-foreground">Target ~{target}w</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Dimension breakdown */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
          <BarChart3 className="w-3.5 h-3.5" /> Score Dimensions
        </h3>
        <div className="grid md:grid-cols-2 gap-3">
          {Object.entries(dimensions).map(([key, val]) => {
            const config = DIMENSION_CONFIG[key]
            if (!config) return null
            const dimScore = typeof val === 'number' ? val : 0
            return (
              <DimensionCard
                key={key}
                label={config.label}
                score={dimScore}
                weight={config.weight}
                description={config.desc}
                icon={config.icon}
                color={config.color}
              />
            )
          })}
        </div>
      </div>

      {/* Coverage bars */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">Criteria Coverage</h3>
        <div className="space-y-4">
          {[
            { label: 'Essential criteria', pct: score.essentialCoverage ?? 0, color: '#3b82f6', note: 'Must address all essential criteria to be shortlisted' },
            { label: 'Desirable criteria', pct: score.desirableCoverage ?? 0, color: '#8b5cf6', note: 'Addressing desirable criteria gives you a competitive edge' },
          ].map(({ label, pct, color, note }) => (
            <div key={label} className="space-y-2">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-foreground">{label}</p>
                  <p className="text-[11px] text-muted-foreground">{note}</p>
                </div>
                <span className="text-2xl font-black tabular-nums" style={{ color }}>{Math.round(pct)}%</span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(pct, 100)}%`, background: color }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Missing Evidence Report */}
      {app.criteria.length > 0 && (
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
            <Shield className="w-3.5 h-3.5" /> Missing Evidence Report
          </h3>
          <MissingEvidenceReport
            applicationId={app.id}
            competencyEvidence={(app.parsedSpec as any)?.competencyEvidence ?? {}}
            criteria={app.criteria.map(c => ({ id: c.id, criterionText: c.criterionText, type: c.type }))}
          />
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════

export default function StatementBuilderPage() {
  const params = useParams()
  const applicationId = params.id as string

  const [app, setApp]             = useState<AppData | null>(null)
  const [loading, setLoading]     = useState(true)
  const [view, setView]           = useState<View>('statement')
  const [statusSaving, setStatusSaving] = useState(false)
  const [error, setError]         = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/application/${applicationId}`)
      if (!res.ok) throw new Error('Failed to load')
      const data = await res.json()
      setApp(data.application)
    } catch (err: any) { setError(err.message) }
    finally { setLoading(false) }
  }, [applicationId])

  useEffect(() => { load() }, [load])

  const updateStatus = useCallback(async (status: string) => {
    setStatusSaving(true)
    try { await fetch(`/api/application/${applicationId}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) }); await load() }
    catch (err: any) { setError(err.message) }
    finally { setStatusSaving(false) }
  }, [applicationId, load])

  const updateNotes = useCallback(async (notes: string) => {
    try { await fetch(`/api/application/${applicationId}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notes }) }); await load() } catch {}
  }, [applicationId, load])

  const updateDate = useCallback(async (field: string, date: string) => {
    try { await fetch(`/api/application/${applicationId}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ [field]: date || null }) }); await load() } catch {}
  }, [applicationId, load])

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
  if (!app) return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-muted-foreground">Application not found</p></div>

  // Layer 4: count saved competencies for the status strip
  const competencyEvidence = (app.parsedSpec as any)?.competencyEvidence as Record<string, any> ?? {}
  const savedCompetencies  = Object.values(competencyEvidence).filter((ce: any) => ce.evidence || ce.noExperience).length
  const totalCompetencies  = Object.keys(competencyEvidence).length

  const views: { key: View; label: string; icon: any }[] = [
    { key: 'statement', label: 'Statement',      icon: FileText   },
    { key: 'score',     label: 'Score & Gaps',   icon: Target     },
    { key: 'interview', label: 'Interview Prep', icon: Brain      },
    { key: 'cv',        label: 'CV Optimiser',   icon: User       },
    { key: 'shortlist', label: 'Shortlist Intel',icon: Shield     },
  ]

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link href="/dashboard/application" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-2">
              <ArrowLeft className="w-4 h-4" /> My Statements
            </Link>
            <h1 className="text-xl font-bold text-foreground">{app.jobTitle}</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{app.band ?? ''} {app.employer ? `· ${app.employer}` : ''} · {app.criteria.length} criteria</p>
          </div>
          <div className="flex gap-1.5 flex-wrap justify-end">
            {views.map(v => {
              const VIcon = v.icon
              return (
                <button key={v.key} onClick={() => setView(v.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${view === v.key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
                  <VIcon className="w-3 h-3" /> {v.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Status strip */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          {(() => {
            const s = STATUSES.find(x => x.value === app.status) ?? STATUSES[0]
            const SIcon = s.icon
            return <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${s.bg} ${s.cls}`}><SIcon className="w-3.5 h-3.5" /> {s.label}</span>
          })()}
          {totalCompetencies > 0 && (
            <span className="text-xs text-muted-foreground">{savedCompetencies} of {totalCompetencies} competencies evidenced</span>
          )}
          {app.deadlineDate && (() => {
            const days = Math.ceil((new Date(app.deadlineDate).getTime() - Date.now()) / (1000*60*60*24))
            if (days >= 0 && days <= 7) return <span className="text-[10px] font-semibold text-red-500 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{days === 0 ? 'Today!' : `${days}d left`}</span>
            return null
          })()}
        </div>

        {error && <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 p-3"><p className="text-xs text-red-600 dark:text-red-400">{error}</p></div>}

        {/* Statement */}
        {view === 'statement' && (
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-1 min-w-0"><UnifiedStatementView app={app} onRefresh={load} /></div>
            <div className="lg:w-72 shrink-0"><StatusPanel app={app} onStatusChange={updateStatus} onNotesChange={updateNotes} onDateChange={updateDate} saving={statusSaving} /></div>
          </div>
        )}

        {/* Score & Gaps */}
        {view === 'score' && <ScoreView app={app} />}

        {/* Interview Prep */}
        {view === 'interview' && (
          <div className="mt-2 max-w-4xl">
            <InterviewQuestionsPanel
              applicationId={app.id}
              cached={(app.parsedSpec as any)?.predictedQuestions ?? null}
            />
          </div>
        )}

        {/* CV Optimiser */}
        {view === 'cv' && (
          <div className="mt-2 max-w-4xl">
            <CvOptimiser applicationId={app.id} existingCvText={app.cvText} existingCvScore={app.cvScore} onScoreUpdate={() => load()} />
          </div>
        )}

        {/* Shortlist Intelligence */}
        {view === 'shortlist' && (
          <div className="mt-2 max-w-4xl">
            <ShortlistIntelligence applicationId={app.id} existingAssessment={(app as any).shortlistAssessment ?? null} />
          </div>
        )}

      </div>
    </div>
  )
}