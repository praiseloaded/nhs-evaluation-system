// app/dashboard/application/[id]/page.tsx
'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, ArrowRight, CheckCircle2, Circle, Loader2,
  FileText, Target, ChevronDown, ChevronUp,
  Copy, AlertTriangle, Sparkles, Clock,
  Send, Users, Award, XCircle, Calendar, StickyNote,
  Shield, User, RefreshCw, Info,
} from 'lucide-react'
import { CvOptimiser } from '@/components/cv-optimiser'
import { ShortlistIntelligence } from '@/components/shortlist-intelligence'

// ─── Types ────────────────────────────────────────────────────────────────────

type Criterion = {
  id: string; criterionText: string; type: string; category: string | null; order: number
  situation: string | null; task: string | null; action: string | null; result: string | null
  metrics: string | null; mdtContext: string | null; reflection: string | null; nhsValues: string | null
  generatedParagraph: string | null; paragraphScore: number | null; status: string
}

// ─── Inline nation detection ──────────────────────────────────────────────────
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
  // nation + word limit stored in parsedSpec by parse-spec route
  liveScore: any; cvScore: any; cvText: string | null; criteria: Criterion[]
  notes: string | null; deadlineDate: string | null; interviewDate: string | null; submittedAt: string | null
}

type StarQuestions = {
  situationPrompt: string; taskPrompt: string; actionPrompt: string; resultPrompt: string
  metricsPrompt: string; tip: string
}

type View = 'criteria' | 'statement' | 'score' | 'cv' | 'shortlist'

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
        {/* target marker */}
        <div className="absolute top-0 bottom-0 w-px bg-gray-400/60" style={{ left: `${(target / hard) * 100}%` }} />
      </div>
      {status === 'over' && <p className="text-[10px] text-red-500">⚠ {count - hard} words over limit — Jobtrain will truncate</p>}
      {status === 'warning' && <p className="text-[10px] text-amber-500">{hard - count} words remaining</p>}
    </div>
  )
}

// ─── Score Ring ───────────────────────────────────────────────────────────────

function ScoreRing({ score, size = 80, label }: { score: number; size?: number; label?: string }) {
  const r = (size - 8) / 2; const circ = 2 * Math.PI * r; const offset = circ * (1 - score / 100)
  const color = score >= 80 ? '#10b981' : score >= 60 ? '#3b82f6' : score >= 40 ? '#f59e0b' : '#ef4444'
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="currentColor" strokeWidth="4" className="text-muted/30" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="4" strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-700" />
      </svg>
      <span className="text-lg font-bold text-foreground -mt-[calc(50%+12px)] mb-4">{score}%</span>
      {label && <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">{label}</span>}
    </div>
  )
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────

function ProgressBar({ current, total, completeness }: { current: number; total: number; completeness: number }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{current} of {total} criteria completed</span>
        <span className="font-semibold text-foreground">{completeness}%</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${completeness}%` }} />
      </div>
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
          <input type="date" value={app.deadlineDate?.split('T')[0] ?? ''}
            onChange={e => onDateChange('deadlineDate', e.target.value)}
            className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1"><Users className="w-3 h-3" /> Interview</label>
          <input type="date" value={app.interviewDate?.split('T')[0] ?? ''}
            onChange={e => onDateChange('interviewDate', e.target.value)}
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

// ─── STAR Form ────────────────────────────────────────────────────────────────

function StarForm({ criterion, questions, onSave, saving }: {
  criterion: Criterion; questions: StarQuestions | null; onSave: (data: any) => void; saving: boolean
}) {
  const [situation, setSituation] = useState(criterion.situation ?? '')
  const [task, setTask] = useState(criterion.task ?? '')
  const [action, setAction] = useState(criterion.action ?? '')
  const [result, setResult] = useState(criterion.result ?? '')
  const [metrics, setMetrics] = useState(criterion.metrics ?? '')
  const [reflection, setReflection] = useState(criterion.reflection ?? '')
  const [showAdvanced, setShowAdvanced] = useState(false)

  useEffect(() => {
    setSituation(criterion.situation ?? ''); setTask(criterion.task ?? '')
    setAction(criterion.action ?? ''); setResult(criterion.result ?? '')
    setMetrics(criterion.metrics ?? ''); setReflection(criterion.reflection ?? '')
  }, [criterion.id])

  const fields = [
    { key: 'situation', label: 'Situation', icon: '📍', value: situation, setter: setSituation, prompt: questions?.situationPrompt, placeholder: 'Where were you working? What was the context?' },
    { key: 'task',      label: 'Task',      icon: '🎯', value: task,      setter: setTask,      prompt: questions?.taskPrompt,      placeholder: 'What was YOUR specific responsibility?' },
    { key: 'action',    label: 'Action',    icon: '⚡', value: action,    setter: setAction,    prompt: questions?.actionPrompt,    placeholder: 'What did YOU personally do? (Use "I", not "we")' },
    { key: 'result',    label: 'Result',    icon: '📊', value: result,    setter: setResult,    prompt: questions?.resultPrompt,    placeholder: 'What was the measurable outcome?' },
  ]
  const filledCount = fields.filter(f => f.value.trim().length > 15).length

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-start gap-3">
          <span className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${criterion.type === 'essential' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300' : 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'}`}>{criterion.type}</span>
          <p className="text-sm font-medium text-foreground leading-relaxed">{criterion.criterionText}</p>
        </div>
        {questions?.tip && <p className="text-xs text-primary mt-3 bg-primary/5 rounded-lg px-3 py-2 flex gap-1.5"><Sparkles className="w-3 h-3 shrink-0 mt-0.5" /> {questions.tip}</p>}
      </div>
      {fields.map(f => (
        <div key={f.key} className="space-y-1.5">
          <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <span>{f.icon}</span> {f.label}
            {f.value.trim().length > 15 && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
          </label>
          {f.prompt && <p className="text-xs text-muted-foreground italic">{f.prompt}</p>}
          <textarea value={f.value} onChange={e => f.setter(e.target.value)} placeholder={f.placeholder} rows={3}
            className="w-full bg-muted border border-border rounded-xl p-3 text-sm text-foreground placeholder-muted-foreground/50 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
      ))}
      <button onClick={() => setShowAdvanced(s => !s)} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
        {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />} {showAdvanced ? 'Hide' : 'Show'} optional enhancements
      </button>
      {showAdvanced && (
        <div className="space-y-4 pl-3 border-l-2 border-primary/20">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-foreground">📈 Metrics</label>
            <input type="text" value={metrics} onChange={e => setMetrics(e.target.value)} placeholder="e.g., Reduced DNA rates by 22%"
              className="w-full bg-muted border border-border rounded-xl p-3 text-sm text-foreground placeholder-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-foreground">🔄 Reflection</label>
            <textarea value={reflection} onChange={e => setReflection(e.target.value)} placeholder="What did you learn?" rows={2}
              className="w-full bg-muted border border-border rounded-xl p-3 text-sm text-foreground placeholder-muted-foreground/50 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
        </div>
      )}
      <div className="flex items-center gap-3">
        <div className="flex gap-1">
          {['S','T','A','R'].map((l,i) => (
            <span key={l} className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${fields[i].value.trim().length > 15 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-muted text-muted-foreground'}`}>{l}</span>
          ))}
        </div>
        <span className="text-xs text-muted-foreground">{filledCount}/4</span>
      </div>
      <button onClick={() => onSave({ criterionId: criterion.id, situation, task, action, result, metrics, reflection })}
        disabled={filledCount < 3 || saving}
        className="w-full py-3 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-40 text-primary-foreground font-semibold flex items-center justify-center gap-2">
        {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</> : <><Sparkles className="w-4 h-4" /> Generate NHS Paragraph</>}
      </button>
      {criterion.generatedParagraph && (
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/30 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Generated Paragraph</p>
            {criterion.paragraphScore !== null && <span className="text-xs font-bold text-emerald-600">{criterion.paragraphScore}%</span>}
          </div>
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{criterion.generatedParagraph}</p>
        </div>
      )}
    </div>
  )
}

// ─── Unified Statement View (all four nations — same UX, different limits) ────
//
// Scotland:         Q1 500w, Q2 500w, Q3 open → three separate copy buttons
// England/Wales/NI: Q1/Q2/Q3 proportional share of total limit → one combined copy

function UnifiedStatementView({ app, onRefresh }: { app: AppData; onRefresh: () => void }) {
  const nation     = detectNation(app.employer)
  const nationMeta = NATION_VALUES[nation]
  const parsed     = app.parsedSpec as any
  const isScotland = nation === 'scotland'
  const totalLimit: number = parsed?.statementWordLimit ?? (nation === 'northern_ireland' ? 1200 : isScotland ? 500 : 1500)

  // Per-question limits
  const q1Hard = isScotland ? 500  : Math.round(totalLimit * 0.50)
  const q2Hard = isScotland ? 500  : Math.round(totalLimit * 0.35)
  const q3Hard = isScotland ? 250  : Math.round(totalLimit * 0.15)
  const q1Target = isScotland ? 480 : Math.round(q1Hard * 0.96)
  const q2Target = isScotland ? 450 : Math.round(q2Hard * 0.96)
  const q3Target = isScotland ? 200 : Math.round(q3Hard * 0.90)

  // Q1
  const [genQ1, setGenQ1]               = useState(false)
  const [qualifications, setQualifications]     = useState('')
  const [systemsKnowledge, setSystemsKnowledge] = useState('')
  const [careerMotivation, setCareerMotivation] = useState('')
  const [q1Error, setQ1Error]           = useState<string | null>(null)
  const [q1Warning, setQ1Warning]       = useState<string | null>(null)
  const [q1Open, setQ1Open]             = useState(true)

  // Q2
  const [genQ2, setGenQ2]               = useState(false)
  const [personalMotivation, setPersonalMotivation] = useState('')
  const [valuesExample, setValuesExample]           = useState('')
  const [careerGoals, setCareerGoals]               = useState('')
  const [q2Error, setQ2Error]           = useState<string | null>(null)
  const [q2Open, setQ2Open]             = useState(!app.statementQ2)

  // Q3
  const [genQ3, setGenQ3]               = useState(false)
  const [q3Open, setQ3Open]             = useState(!app.statementQ3)
  const [q3Error, setQ3Error]           = useState<string | null>(null)
  const [q3Context, setQ3Context]       = useState({
    hasCareerGap: false, careerGapExplanation: '',
    applyingUnderGIS: false, gisDisabilityType: '',
    preferPartTime: false, preferredHours: '',
    isRelocating: false, relocationDetails: '',
    hasQualificationsPending: false, qualificationsPendingDetails: '',
    hasLongNoticePeriod: false, noticePeriodDetails: '',
    additionalFreeText: '',
  })

  const [copiedQ, setCopiedQ] = useState<string | null>(null)
  const copyQ = (text: string, q: string) => {
    navigator.clipboard.writeText(text); setCopiedQ(q); setTimeout(() => setCopiedQ(null), 2000)
  }
  const copyAll = () => {
    const combined = [app.statementQ1, app.statementQ2, app.statementQ3].filter(Boolean).join('\n\n')
    navigator.clipboard.writeText(combined); setCopiedQ('all'); setTimeout(() => setCopiedQ(null), 2000)
  }

  const nation_ = nation  // closure fix
  const generateQ1 = async () => {
    setGenQ1(true); setQ1Error(null); setQ1Warning(null)
    try {
      const res = await fetch('/api/application/generate-statement', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId: app.id, nation: nation_, wordLimit: totalLimit, qualifications, systemsKnowledge, careerMotivation }),
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
        body: JSON.stringify({ applicationId: app.id, nation: nation_, wordLimit: totalLimit, personalMotivation, valuesExample, careerGoals }),
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
        body: JSON.stringify({ applicationId: app.id, nation: nation_, wordLimit: totalLimit, context: q3Context }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      await onRefresh(); setQ3Open(false)
    } catch (e: any) { setQ3Error(e.message) }
    finally { setGenQ3(false) }
  }

  const essentialCount = app.criteria.filter(c => c.type === 'essential' && c.generatedParagraph).length
  const totalEssential = app.criteria.filter(c => c.type === 'essential').length
  const q1Done = !!app.statementQ1
  const q2Done = !!app.statementQ2
  const q3Done = !!app.statementQ3
  const allDone = q1Done && q2Done && q3Done

  // NHS values uploaded doc indicator
  const hasValuesDoc = !!(parsed?.nhsValuesLoaded || (app as any).nhsValuesText)

  // ── QPanel sub-component ──────────────────────────────────────────────────
  function QPanel({ q, label, limitLabel, description, badge, status, isOpen, onToggle, statement, targetWords, hardLimit, children }: {
    q: string; label: string; limitLabel: string; description: string; badge: string
    status: 'done'|'empty'; isOpen: boolean; onToggle: () => void
    statement: string|null; targetWords: number; hardLimit: number; children: React.ReactNode
  }) {
    const [localCopied, setLocalCopied] = useState(false)
    const copyLocal = () => { if (statement) { navigator.clipboard.writeText(statement); setLocalCopied(true); setTimeout(() => setLocalCopied(false), 2000) } }
    const borderCls = status === 'done' ? 'border-emerald-200 dark:border-emerald-800' : 'border-border'
    const badgeCls  = status === 'done' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-muted text-muted-foreground'

    return (
      <div className={`rounded-xl border ${borderCls} bg-card overflow-hidden`}>
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

      {/* ── Summary bar ─────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-base">{nationMeta.flag}</span>
            <div>
              <p className="text-sm font-semibold text-foreground">
                {nationMeta.label} — Supporting Statement
              </p>
              <p className="text-xs text-muted-foreground">
                {isScotland
                  ? '3 separate Jobtrain boxes — paste each question individually'
                  : `Single statement · ${totalLimit} words total · paste as one combined block`}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {hasValuesDoc && (
              <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                ✓ NHS values doc loaded
              </span>
            )}
            {allDone && (
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2.5 py-1 rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> All three sections complete
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <WordCounter text={app.statementQ1} target={q1Target} hard={q1Hard} label={`Q1 (${q1Hard}w limit)`} />
          <WordCounter text={app.statementQ2} target={q2Target} hard={q2Hard} label={`Q2 (${q2Hard}w limit)`} />
          <WordCounter text={app.statementQ3} target={q3Target} hard={q3Hard} label={`Q3 (${q3Hard}w limit)`} />
        </div>

        {!app.employer && (
          <p className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> No employer set — Q2 will use generic values. Upload a NHS Values Document for best results.
          </p>
        )}
      </div>

      {/* ── Q1: Suitability ──────────────────────────────────────────────── */}
      <QPanel q="Q1" label="Why are you suitable for this role?"
        limitLabel={`${q1Hard} words`} description="All STAR evidence goes here"
        badge="bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
        status={q1Done ? 'done' : 'empty'} isOpen={q1Open} onToggle={() => setQ1Open(o => !o)}
        statement={app.statementQ1 ?? null} targetWords={q1Target} hardLimit={q1Hard}>

        <div className="rounded-lg bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900 p-3">
          <p className="text-xs text-blue-700 dark:text-blue-300 flex items-start gap-1.5">
            <Info className="w-3 h-3 shrink-0 mt-0.5" />
            {essentialCount}/{totalEssential} essential criteria paragraphs ready.
            {!isScotland && ` Q1 gets ${q1Hard} of your ${totalLimit} total words (~50%).`}
          </p>
        </div>

        {essentialCount === 0 && (
          <div className="rounded-lg bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 p-3">
            <p className="text-xs text-amber-700 dark:text-amber-300">Complete at least one essential criterion in the Build tab first.</p>
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

        <button onClick={generateQ1} disabled={genQ1 || essentialCount === 0}
          className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-semibold flex items-center justify-center gap-2">
          {genQ1 ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating Q1...</> : q1Done ? <><RefreshCw className="w-4 h-4" /> Regenerate Q1</> : <><Sparkles className="w-4 h-4" /> Generate Q1 — Why You're Suitable</>}
        </button>
      </QPanel>

      {/* ── Q2: Why this employer ─────────────────────────────────────────── */}
      <QPanel q="Q2" label={`Why do you want to work for ${app.employer ?? 'this organisation'}?`}
        limitLabel={`${q2Hard} words`}
        description={hasValuesDoc ? `Using uploaded values doc · ${app.employer ?? 'NHS'}` : `Values registry · ${app.employer ?? 'NHS'}`}
        badge="bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
        status={q2Done ? 'done' : 'empty'} isOpen={q2Open} onToggle={() => setQ2Open(o => !o)}
        statement={app.statementQ2 ?? null} targetWords={q2Target} hardLimit={q2Hard}>

        <div className={`rounded-lg border p-3 ${hasValuesDoc ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-100 dark:border-emerald-900' : 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-100 dark:border-indigo-900'}`}>
          <p className={`text-xs flex items-start gap-1.5 ${hasValuesDoc ? 'text-emerald-700 dark:text-emerald-300' : 'text-indigo-700 dark:text-indigo-300'}`}>
            <Info className="w-3 h-3 shrink-0 mt-0.5" />
            {hasValuesDoc
              ? `Q2 will use the values document you uploaded — exact language from ${app.employer ?? 'this employer'}'s own values framework.`
              : `Q2 will use our built-in values registry for ${app.employer ?? 'this employer'}. Upload a NHS Values Document on the launcher for stronger results.`}
          </p>
        </div>

        <div className="space-y-3">
          {[
            { label: `Personal values connection to patient care`, val: personalMotivation, set: setPersonalMotivation, ph: 'e.g. After caring for a family member through illness, I saw first-hand...', required: true },
            { label: 'Example of values in action',               val: valuesExample,      set: setValuesExample,      ph: 'e.g. When a patient was distressed before a procedure, I...' },
            { label: 'Long-term career goals within this organisation', val: careerGoals, set: setCareerGoals, ph: 'e.g. I aim to develop into a specialist role over the next 3 years...' },
          ].map(f => (
            <div key={f.label} className="space-y-1">
              <label className="text-xs font-medium text-foreground flex items-center gap-1">
                {f.label}
                {f.required && <span className="text-[10px] text-red-500">*</span>}
              </label>
              <textarea value={f.val} onChange={e => f.set(e.target.value)} rows={2} placeholder={f.ph}
                className="w-full bg-muted border border-border rounded-lg p-2.5 text-xs text-foreground placeholder-muted-foreground/50 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          ))}
        </div>

        {q2Error && <p className="text-xs text-red-500">{q2Error}</p>}

        <button onClick={generateQ2} disabled={genQ2 || !personalMotivation.trim()}
          className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-semibold flex items-center justify-center gap-2">
          {genQ2 ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating Q2...</> : q2Done ? <><RefreshCw className="w-4 h-4" /> Regenerate Q2</> : <><Sparkles className="w-4 h-4" /> Generate Q2 — Why This Employer</>}
        </button>
      </QPanel>

      {/* ── Q3: Other information ─────────────────────────────────────────── */}
      <QPanel q="Q3" label="Any other relevant information?"
        limitLabel={isScotland ? 'No stated limit' : `${q3Hard} words`}
        description={isScotland ? '100–200 words or "None."' : `~${q3Hard} words or "None."  if nothing applies`}
        badge="bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
        status={q3Done ? 'done' : 'empty'} isOpen={q3Open} onToggle={() => setQ3Open(o => !o)}
        statement={app.statementQ3 ?? null} targetWords={q3Target} hardLimit={q3Hard}>

        <div className="rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-100 dark:border-amber-900 p-3">
          <p className="text-xs text-amber-700 dark:text-amber-300 flex items-start gap-1.5">
            <Info className="w-3 h-3 shrink-0 mt-0.5" />
            Q3 is not a filler — it is the correct place for career gaps, Guaranteed Interview Scheme declaration, part-time preferences, relocation, pending qualifications, or a long notice period. Leaving it blank looks like an oversight.
          </p>
        </div>

        <div className="space-y-3">
          {[
            { key: 'hasCareerGap',             label: 'I have a career gap to explain',              fKey: 'careerGapExplanation',         fPh: 'e.g. 12-month break to care for a parent' },
            { key: 'applyingUnderGIS',         label: 'Applying under the Guaranteed Interview Scheme (disability)', fKey: 'gisDisabilityType', fPh: 'e.g. long-term health condition', gis: true },
            { key: 'preferPartTime',           label: 'I have a part-time / flexible working preference', fKey: 'preferredHours',   fPh: 'e.g. 0.8 WTE or 30 hours per week' },
            { key: 'isRelocating',             label: 'I am relocating to take this role',           fKey: 'relocationDetails',  fPh: 'e.g. relocating from London, available August 2026' },
            { key: 'hasQualificationsPending', label: 'I have qualifications / registrations pending', fKey: 'qualificationsPendingDetails', fPh: 'e.g. HCPC registration pending, July 2026' },
            { key: 'hasLongNoticePeriod',      label: 'My notice period is longer than 4 weeks',    fKey: 'noticePeriodDetails', fPh: 'e.g. 3-month notice, negotiable with employer' },
          ].map(row => (
            <div key={row.key} className="space-y-1.5">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input type="checkbox" checked={(q3Context as any)[row.key]}
                  onChange={e => setQ3Context(c => ({ ...c, [row.key]: e.target.checked }))}
                  className="w-4 h-4 rounded accent-primary" />
                <span className="text-sm text-foreground">{row.label}</span>
                {row.gis && <span className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 px-1.5 py-0.5 rounded font-semibold">GIS</span>}
              </label>
              {(q3Context as any)[row.key] && (
                <textarea value={(q3Context as any)[row.fKey]}
                  onChange={e => setQ3Context(c => ({ ...c, [row.fKey]: e.target.value }))}
                  placeholder={row.fPh} rows={2}
                  className="w-full ml-6 bg-muted border border-border rounded-lg p-2.5 text-xs text-foreground placeholder-muted-foreground/50 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30" />
              )}
            </div>
          ))}
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">Anything else to add? (optional)</label>
            <textarea value={q3Context.additionalFreeText} onChange={e => setQ3Context(c => ({ ...c, additionalFreeText: e.target.value }))} rows={2}
              placeholder="e.g. I am available for interview at any time except..."
              className="w-full bg-muted border border-border rounded-lg p-2.5 text-xs text-foreground placeholder-muted-foreground/50 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <p className="text-[10px] text-muted-foreground">If none of the above apply, click Generate — we write "None." so the box isn't left blank.</p>
        </div>

        {q3Error && <p className="text-xs text-red-500">{q3Error}</p>}

        <button onClick={generateQ3} disabled={genQ3}
          className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white font-semibold flex items-center justify-center gap-2">
          {genQ3 ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating Q3...</> : q3Done ? <><RefreshCw className="w-4 h-4" /> Regenerate Q3</> : <><Sparkles className="w-4 h-4" /> Generate Q3 — Other Information</>}
        </button>
      </QPanel>

      {/* ── Complete actions ─────────────────────────────────────────────── */}
      {allDone && (
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/30 p-4 space-y-3">
          <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
            {isScotland ? 'All three questions ready — paste each one into the Jobtrain form' : 'All three sections ready — copy as one combined statement'}
          </p>
          <div className={`grid gap-2 ${isScotland ? 'grid-cols-3' : 'grid-cols-2'}`}>
            {isScotland ? (
              <>
                {[{ q: 'Q1', t: app.statementQ1 }, { q: 'Q2', t: app.statementQ2 }, { q: 'Q3', t: app.statementQ3 }].map(({ q, t }) => (
                  <button key={q} onClick={() => { if (t) copyQ(t, q) }}
                    className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-white dark:bg-gray-900 border border-emerald-200 dark:border-emerald-800 text-xs font-medium text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 transition-colors">
                    {copiedQ === q ? <><CheckCircle2 className="w-3 h-3" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy {q}</>}
                  </button>
                ))}
              </>
            ) : (
              <>
                <button onClick={copyAll}
                  className="col-span-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-colors">
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

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════

export default function StatementBuilderPage() {
  const params = useParams()
  const applicationId = params.id as string

  const [app, setApp] = useState<AppData | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [view, setView] = useState<View>('criteria')
  const [questions, setQuestions] = useState<StarQuestions | null>(null)
  const [loadingQuestions, setLoadingQuestions] = useState(false)
  const [saving, setSaving] = useState(false)
  const [statusSaving, setStatusSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  const currentCriterion = app?.criteria?.[currentIndex]

  useEffect(() => {
    if (!currentCriterion) return
    setLoadingQuestions(true)
    fetch('/api/application/generate-questions', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ criterionId: currentCriterion.id }),
    }).then(r => r.json()).then(data => setQuestions(data.questions ?? null))
      .catch(() => setQuestions(null)).finally(() => setLoadingQuestions(false))
  }, [currentCriterion?.id])

  const saveStar = useCallback(async (data: any) => {
    setSaving(true); setError(null)
    try {
      const res = await fetch('/api/application/submit-star', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      if (!res.ok) throw new Error('Save failed')
      await load()
    } catch (err: any) { setError(err.message) }
    finally { setSaving(false) }
  }, [load])

  const updateStatus = useCallback(async (status: string) => {
    setStatusSaving(true)
    try {
      await fetch(`/api/application/${applicationId}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
      await load()
    } catch (err: any) { setError(err.message) }
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

  const essential = app.criteria.filter(c => c.type === 'essential')
  const desirable = app.criteria.filter(c => c.type === 'desirable')
  const completedCount = app.criteria.filter(c => c.generatedParagraph).length
  const score = app.liveScore as any
  const isLocked = ['submitted', 'shortlisted', 'interview', 'offer', 'rejected'].includes(app.status)

  const views: { key: View; label: string; icon: any }[] = [
    { key: 'criteria',  label: 'Build',          icon: Sparkles  },
    { key: 'statement', label: 'Statement',       icon: FileText  },
    { key: 'score',     label: 'Score',           icon: Target    },
    { key: 'cv',        label: 'CV Optimiser',    icon: User      },
    { key: 'shortlist', label: 'Shortlist Intel', icon: Shield    },
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

        {/* Progress */}
        <div className="grid lg:grid-cols-3 gap-4 mb-6">
          <div className="lg:col-span-2">
            <ProgressBar current={completedCount} total={app.criteria.length} completeness={app.completeness} />
          </div>
          <div className="flex items-center gap-2">
            {(() => {
              const s = STATUSES.find(x => x.value === app.status) ?? STATUSES[0]
              const SIcon = s.icon
              return <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${s.bg} ${s.cls}`}><SIcon className="w-3.5 h-3.5" /> {s.label}</span>
            })()}
            {app.deadlineDate && (() => {
              const days = Math.ceil((new Date(app.deadlineDate).getTime() - Date.now()) / (1000*60*60*24))
              if (days >= 0 && days <= 7) return <span className="text-[10px] font-semibold text-red-500 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{days === 0 ? 'Today!' : `${days}d left`}</span>
              return null
            })()}
          </div>
        </div>

        {error && <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 p-3"><p className="text-xs text-red-600 dark:text-red-400">{error}</p></div>}

        {/* ═══ BUILD VIEW ═══ */}
        {view === 'criteria' && (
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="lg:w-72 shrink-0 space-y-4">
              <StatusPanel app={app} onStatusChange={updateStatus} onNotesChange={updateNotes} onDateChange={updateDate} saving={statusSaving} />
              <div className="rounded-xl border border-border bg-card p-3 space-y-1 sticky top-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-2 mb-2">Essential ({essential.length})</p>
                {essential.map(c => (
                  <button key={c.id} onClick={() => setCurrentIndex(app.criteria.indexOf(c))}
                    className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-xs transition-colors ${app.criteria.indexOf(c) === currentIndex ? 'bg-primary/10 border border-primary/20 text-foreground' : 'text-muted-foreground hover:bg-accent'}`}>
                    {c.generatedParagraph ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> : <Circle className="w-3.5 h-3.5 shrink-0" />}
                    <span className="truncate">{c.criterionText.slice(0, 35)}...</span>
                  </button>
                ))}
                {desirable.length > 0 && (
                  <>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-2 mt-3 mb-2">Desirable ({desirable.length})</p>
                    {desirable.map(c => (
                      <button key={c.id} onClick={() => setCurrentIndex(app.criteria.indexOf(c))}
                        className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-xs transition-colors ${app.criteria.indexOf(c) === currentIndex ? 'bg-primary/10 border border-primary/20 text-foreground' : 'text-muted-foreground hover:bg-accent'}`}>
                        {c.generatedParagraph ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> : <Circle className="w-3.5 h-3.5 shrink-0" />}
                        <span className="truncate">{c.criterionText.slice(0, 35)}...</span>
                      </button>
                    ))}
                  </>
                )}
              </div>

              {/* Quick jump to statement */}
              {completedCount > 0 && (
                <button onClick={() => setView('statement')}
                  className="w-full py-2.5 rounded-xl border border-primary/30 bg-primary/5 text-primary text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-primary/10 transition-colors">
                  <FileText className="w-3.5 h-3.5" /> Go to Statement Builder
                </button>
              )}
            </div>

            <div className="flex-1 min-w-0">
              {isLocked && (
                <div className="mb-4 rounded-xl bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 p-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                  <p className="text-xs text-amber-700 dark:text-amber-300">This application is <strong>{app.status}</strong> — editing is locked. Change status to Draft to edit.</p>
                </div>
              )}
              {currentCriterion && !isLocked ? (
                <>
                  {loadingQuestions && <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4"><Loader2 className="w-4 h-4 animate-spin" /> Loading guidance...</div>}
                  <StarForm criterion={currentCriterion} questions={questions} onSave={saveStar} saving={saving} />
                  <div className="flex justify-between mt-6">
                    <button onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))} disabled={currentIndex === 0}
                      className="px-4 py-2 rounded-lg bg-muted text-foreground text-sm font-medium disabled:opacity-40 flex items-center gap-1"><ArrowLeft className="w-4 h-4" /> Previous</button>
                    {currentIndex < app.criteria.length - 1 ? (
                      <button onClick={() => setCurrentIndex(currentIndex + 1)}
                        className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center gap-1">Next <ArrowRight className="w-4 h-4" /></button>
                    ) : (
                      <button onClick={() => setView('statement')} disabled={completedCount === 0}
                        className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold disabled:opacity-40 flex items-center gap-1">
                        <FileText className="w-4 h-4" /> Build Statement
                      </button>
                    )}
                  </div>
                </>
              ) : currentCriterion && isLocked ? (
                <div className="rounded-xl border border-border bg-card p-5">
                  <p className="text-sm font-medium text-foreground mb-2">{currentCriterion.criterionText}</p>
                  {currentCriterion.generatedParagraph && <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap bg-muted rounded-lg p-4">{currentCriterion.generatedParagraph}</p>}
                </div>
              ) : (
                <p className="text-muted-foreground">Select a criterion from the sidebar</p>
              )}
            </div>
          </div>
        )}

        {/* ═══ STATEMENT VIEW ═══ */}
        {view === 'statement' && (
          <StatementRouter app={app} onRefresh={load} />
        )}

        {/* ═══ SCORE VIEW ═══ */}
        {view === 'score' && score && (
          <div className="mt-2 space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="col-span-2 md:col-span-1 flex justify-center"><ScoreRing score={score.overall ?? 0} size={100} label="Overall" /></div>
              {Object.entries(score.dimensions ?? {}).map(([key, val]) => (
                <div key={key} className="rounded-xl border border-border bg-card p-4 text-center">
                  <ScoreRing score={val as number} size={60} />
                  <p className="text-[10px] text-muted-foreground mt-1 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                </div>
              ))}
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-border bg-card p-5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Coverage</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Essential</span><span className="font-semibold">{Math.round(score.essentialCoverage ?? 0)}%</span></div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden"><div className="h-full bg-blue-500 rounded-full" style={{ width: `${score.essentialCoverage ?? 0}%` }} /></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Desirable</span><span className="font-semibold">{Math.round(score.desirableCoverage ?? 0)}%</span></div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden"><div className="h-full bg-purple-500 rounded-full" style={{ width: `${score.desirableCoverage ?? 0}%` }} /></div>
                </div>
              </div>
              <div className="rounded-xl border border-border bg-card p-5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Statement Health</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Q1 words</span><span className="font-semibold">{app.wordCountQ1 ?? 0}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Q2 words</span><span className="font-semibold">{app.wordCountQ2 ?? 0}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Q3 words</span><span className="font-semibold">{app.wordCountQ3 ?? 0}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Grade</span>
                    <span className={`font-bold capitalize ${score.grade === 'excellent' ? 'text-emerald-600' : score.grade === 'strong' ? 'text-blue-600' : score.grade === 'developing' ? 'text-amber-600' : 'text-red-600'}`}>{score.grade ?? 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        {view === 'score' && !score && (
          <div className="mt-2 text-center py-16">
            <Target className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground mb-4">Generate Q1 first to see scores</p>
            <button onClick={() => setView('statement')} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">Go to Statement Builder</button>
          </div>
        )}

        {/* ═══ CV OPTIMISER ═══ */}
        {view === 'cv' && (
          <div className="mt-2 max-w-3xl">
            <CvOptimiser applicationId={app.id} existingCvText={app.cvText} existingCvScore={app.cvScore} onScoreUpdate={() => load()} />
          </div>
        )}

        {/* ═══ SHORTLISTING INTELLIGENCE ═══ */}
        {view === 'shortlist' && (
          <div className="mt-2 max-w-4xl">
            <ShortlistIntelligence applicationId={app.id} existingAssessment={(app as any).shortlistAssessment ?? null} />
          </div>
        )}

      </div>
    </div>
  )
}