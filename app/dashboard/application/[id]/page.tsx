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
  Shield, User,
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

type AppData = {
  id: string; jobTitle: string; band: string | null; employer: string | null
  completeness: number; status: string; parsedSpec: any
  introduction: string | null; closing: string | null; fullStatement: string | null; wordCount: number | null
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

// ─── Status Workflow Panel ────────────────────────────────────────────────────

function StatusPanel({
  app, onStatusChange, onNotesChange, onDateChange, saving
}: {
  app: AppData
  onStatusChange: (status: string) => void
  onNotesChange: (notes: string) => void
  onDateChange: (field: string, date: string) => void
  saving: boolean
}) {
  const [showDropdown, setShowDropdown] = useState(false)
  const [notes, setNotes] = useState(app.notes ?? '')
  const currentStatus = STATUSES.find(s => s.value === app.status) ?? STATUSES[0]
  const Icon = currentStatus.icon
  const isLocked = ['submitted', 'shortlisted', 'interview', 'offer', 'rejected'].includes(app.status)

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" /> Application Status
        </h3>
        {isLocked && (
          <span className="text-[10px] text-amber-500 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Editing locked
          </span>
        )}
      </div>

      {/* Status selector */}
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
                  className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-sm hover:bg-accent transition-colors ${
                    s.value === app.status ? 'bg-primary/5 font-semibold' : ''
                  }`}>
                  <SIcon className={`w-4 h-4 ${s.cls}`} />
                  <span className="text-foreground">{s.label}</span>
                  {s.value === app.status && <CheckCircle2 className="w-3 h-3 text-primary ml-auto" />}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Status pipeline dots */}
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

      {/* Interview link */}
      {app.status === 'interview' && (
        <Link href="/dashboard/interview"
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-white text-sm font-semibold transition-colors">
          <Users className="w-4 h-4" /> Practice Interview
        </Link>
      )}

      {/* Dates */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <Calendar className="w-3 h-3" /> Deadline
          </label>
          <input type="date" value={app.deadlineDate?.split('T')[0] ?? ''}
            onChange={e => onDateChange('deadlineDate', e.target.value)}
            className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <Users className="w-3 h-3" /> Interview Date
          </label>
          <input type="date" value={app.interviewDate?.split('T')[0] ?? ''}
            onChange={e => onDateChange('interviewDate', e.target.value)}
            className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-1">
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
          <StickyNote className="w-3 h-3" /> Notes
        </label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)}
          onBlur={() => { if (notes !== (app.notes ?? '')) onNotesChange(notes) }}
          placeholder="Add notes about this application..."
          rows={3}
          className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder-muted-foreground/50 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30" />
      </div>

      {app.submittedAt && (
        <p className="text-[10px] text-muted-foreground">
          Submitted: {new Date(app.submittedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
        </p>
      )}
    </div>
  )
}

// ─── STAR Form ────────────────────────────────────────────────────────────────

function StarForm({
  criterion, questions, onSave, saving
}: {
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
    { key: 'task', label: 'Task', icon: '🎯', value: task, setter: setTask, prompt: questions?.taskPrompt, placeholder: 'What was YOUR specific responsibility?' },
    { key: 'action', label: 'Action', icon: '⚡', value: action, setter: setAction, prompt: questions?.actionPrompt, placeholder: 'What did YOU personally do? (Use "I", not "we")' },
    { key: 'result', label: 'Result', icon: '📊', value: result, setter: setResult, prompt: questions?.resultPrompt, placeholder: 'What was the measurable outcome?' },
  ]

  const filledCount = fields.filter(f => f.value.trim().length > 15).length

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-start gap-3">
          <span className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
            criterion.type === 'essential' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300' : 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
          }`}>{criterion.type}</span>
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
            <span key={l} className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
              fields[i].value.trim().length > 15 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-muted text-muted-foreground'
            }`}>{l}</span>
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

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════

export default function ApplicationBuilderPage() {
  const params = useParams()
  const router = useRouter()
  const applicationId = params.id as string

  const [app, setApp] = useState<AppData | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [view, setView] = useState<View>('criteria')
  const [questions, setQuestions] = useState<StarQuestions | null>(null)
  const [loadingQuestions, setLoadingQuestions] = useState(false)
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [statusSaving, setStatusSaving] = useState(false)
  const [copied, setCopied] = useState(false)
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

  const generateStatement = useCallback(async () => {
    setGenerating(true); setError(null)
    try {
      const res = await fetch('/api/application/generate-statement', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ applicationId }) })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? 'Failed') }
      await load(); setView('statement')
    } catch (err: any) { setError(err.message) }
    finally { setGenerating(false) }
  }, [applicationId, load])

  const copyStatement = useCallback(() => {
    if (app?.fullStatement) { navigator.clipboard.writeText(app.fullStatement); setCopied(true); setTimeout(() => setCopied(false), 2000) }
  }, [app?.fullStatement])

  // ── Status + notes + dates update ──────────────────────────────────────
  const updateStatus = useCallback(async (status: string) => {
    setStatusSaving(true)
    try {
      const res = await fetch(`/api/application/${applicationId}/status`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error('Status update failed')
      await load()
    } catch (err: any) { setError(err.message) }
    finally { setStatusSaving(false) }
  }, [applicationId, load])

  const updateNotes = useCallback(async (notes: string) => {
    try {
      await fetch(`/api/application/${applicationId}/status`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      })
      await load()
    } catch {}
  }, [applicationId, load])

  const updateDate = useCallback(async (field: string, date: string) => {
    try {
      await fetch(`/api/application/${applicationId}/status`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: date || null }),
      })
      await load()
    } catch {}
  }, [applicationId, load])

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
  if (!app) return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-muted-foreground">Application not found</p></div>

  const essential = app.criteria.filter(c => c.type === 'essential')
  const desirable = app.criteria.filter(c => c.type === 'desirable')
  const completedCount = app.criteria.filter(c => c.generatedParagraph).length
  const score = app.liveScore as any
  const isLocked = ['submitted', 'shortlisted', 'interview', 'offer', 'rejected'].includes(app.status)

  const views: { key: View; label: string; icon: any }[] = [
    { key: 'criteria', label: 'Build', icon: Sparkles },
    { key: 'statement', label: 'Statement', icon: FileText },
    { key: 'score', label: 'Score', icon: Target },
    { key: 'cv', label: 'CV Optimiser', icon: User },
    { key: 'shortlist', label: 'Shortlist Intel', icon: Shield },
  ]

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link href="/dashboard/applications" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-2">
              <ArrowLeft className="w-4 h-4" /> My Applications
            </Link>
            <h1 className="text-xl font-bold text-foreground">{app.jobTitle}</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{app.band ?? ''} {app.employer ? `· ${app.employer}` : ''} · {app.criteria.length} criteria</p>
          </div>
          <div className="flex gap-1.5">
            {views.map(v => {
              const VIcon = v.icon
              return (
                <button key={v.key} onClick={() => setView(v.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                    view === v.key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
                  }`}>
                  <VIcon className="w-3 h-3" /> {v.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Progress + Status side by side */}
        <div className="grid lg:grid-cols-3 gap-4 mb-6">
          <div className="lg:col-span-2">
            <ProgressBar current={completedCount} total={app.criteria.length} completeness={app.completeness} />
          </div>
          <div className="flex items-center gap-2">
            {(() => {
              const s = STATUSES.find(x => x.value === app.status) ?? STATUSES[0]
              const SIcon = s.icon
              return (
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${s.bg} ${s.cls}`}>
                  <SIcon className="w-3.5 h-3.5" /> {s.label}
                </span>
              )
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
            {/* Left sidebar: criteria list + status panel */}
            <div className="lg:w-72 shrink-0 space-y-4">
              {/* Status panel */}
              <StatusPanel app={app} onStatusChange={updateStatus} onNotesChange={updateNotes} onDateChange={updateDate} saving={statusSaving} />

              {/* Criteria list */}
              <div className="rounded-xl border border-border bg-card p-3 space-y-1 sticky top-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-2 mb-2">Essential ({essential.length})</p>
                {essential.map(c => (
                  <button key={c.id} onClick={() => setCurrentIndex(app.criteria.indexOf(c))}
                    className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-xs transition-colors ${
                      app.criteria.indexOf(c) === currentIndex ? 'bg-primary/10 border border-primary/20 text-foreground' : 'text-muted-foreground hover:bg-accent'
                    }`}>
                    {c.generatedParagraph ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> : <Circle className="w-3.5 h-3.5 shrink-0" />}
                    <span className="truncate">{c.criterionText.slice(0, 35)}...</span>
                  </button>
                ))}
                {desirable.length > 0 && (
                  <>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-2 mt-3 mb-2">Desirable ({desirable.length})</p>
                    {desirable.map(c => (
                      <button key={c.id} onClick={() => setCurrentIndex(app.criteria.indexOf(c))}
                        className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-xs transition-colors ${
                          app.criteria.indexOf(c) === currentIndex ? 'bg-primary/10 border border-primary/20 text-foreground' : 'text-muted-foreground hover:bg-accent'
                        }`}>
                        {c.generatedParagraph ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> : <Circle className="w-3.5 h-3.5 shrink-0" />}
                        <span className="truncate">{c.criterionText.slice(0, 35)}...</span>
                      </button>
                    ))}
                  </>
                )}
              </div>
            </div>

            {/* Right: STAR form */}
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
                      <button onClick={generateStatement} disabled={generating || completedCount === 0}
                        className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold disabled:opacity-40 flex items-center gap-1">
                        {generating ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</> : <><FileText className="w-4 h-4" /> Generate Statement</>}
                      </button>
                    )}
                  </div>
                </>
              ) : currentCriterion && isLocked ? (
                <div className="rounded-xl border border-border bg-card p-5">
                  <p className="text-sm font-medium text-foreground mb-2">{currentCriterion.criterionText}</p>
                  {currentCriterion.generatedParagraph && (
                    <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap bg-muted rounded-lg p-4">{currentCriterion.generatedParagraph}</p>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground">Select a criterion from the sidebar</p>
              )}
            </div>
          </div>
        )}

        {/* ═══ STATEMENT VIEW ═══ */}
        {view === 'statement' && (
          <div className="mt-2">
            {app.fullStatement ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div><h2 className="font-semibold text-foreground">Your Supporting Statement</h2><p className="text-xs text-muted-foreground">{app.wordCount} words · {completedCount}/{app.criteria.length} criteria</p></div>
                  <div className="flex gap-2">
                    <button onClick={copyStatement} className="px-3 py-1.5 rounded-lg bg-muted text-foreground text-xs font-medium flex items-center gap-1.5 hover:bg-accent">
                      {copied ? <><CheckCircle2 className="w-3 h-3 text-emerald-500" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy</>}
                    </button>
                    <button onClick={generateStatement} disabled={generating} className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium flex items-center gap-1.5 disabled:opacity-50">
                      {generating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />} Regenerate
                    </button>
                  </div>
                </div>
                <div className="rounded-xl border border-border bg-card p-6">
                  {app.fullStatement.split('\n\n').map((para, i) => <p key={i} className="text-sm text-foreground leading-relaxed mb-4">{para}</p>)}
                </div>
              </div>
            ) : (
              <div className="text-center py-16">
                <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground mb-4">Complete criteria first, then generate</p>
                <button onClick={() => setView('criteria')} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">Go to Builder</button>
              </div>
            )}
          </div>
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
                  <div className="flex justify-between"><span className="text-muted-foreground">Word count</span><span className="font-semibold">{score.wordCount ?? 0}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Completeness</span><span className="font-semibold">{score.completeness ?? 0}%</span></div>
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
            <p className="text-muted-foreground mb-4">Generate your statement first to see scores</p>
            <button onClick={() => setView('criteria')} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">Go to Builder</button>
          </div>
        )}

        {/* ═══ CV OPTIMISER VIEW ═══ */}
        {view === 'cv' && (
          <div className="mt-2 max-w-3xl">
            <CvOptimiser
              applicationId={app.id}
              existingCvText={app.cvText}
              existingCvScore={app.cvScore}
              onScoreUpdate={() => load()}
            />
          </div>
        )}

        {/* ═══ SHORTLISTING INTELLIGENCE VIEW ═══ */}
        {view === 'shortlist' && (
          <div className="mt-2 max-w-4xl">
            <ShortlistIntelligence
              applicationId={app.id}
              existingAssessment={(app as any).shortlistAssessment ?? null}
            />
          </div>
        )}

      </div>
    </div>
  )
}