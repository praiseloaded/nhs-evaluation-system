// components/interview-questions-panel.tsx
// Layer 4 output: Predicted interview questions based on competency
// evidence quality and gaps. Renders inside the Score view tab.

'use client'

import { useState } from 'react'
import { Loader2, ChevronDown, ChevronUp, AlertTriangle, Sparkles, Users, Shield } from 'lucide-react'

type Question = {
  question:   string
  competency?: string
  value?:     string
  tip:        string
}

type Questions = {
  strengthQuestions: Question[]
  gapQuestions:      Question[]
  valuesQuestions:   Question[]
}

interface Props {
  applicationId: string
  cached?:       Questions | null
}

function QuestionCard({ q, index, category }: { q: Question; index: number; category: 'strength' | 'gap' | 'values' }) {
  const [open, setOpen] = useState(false)
  const colors = {
    strength: { badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300', dot: 'bg-emerald-500' },
    gap:      { badge: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',                 dot: 'bg-red-500'     },
    values:   { badge: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',             dot: 'bg-blue-500'    },
  }[category]

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-start gap-3 px-4 py-3.5 text-left hover:bg-accent/30 transition-colors">
        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 ${colors.badge}`}>
          {index + 1}
        </span>
        <p className="flex-1 text-sm text-foreground leading-snug">{q.question}</p>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />}
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1 border-t border-border space-y-2">
          {(q.competency || q.value) && (
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              {q.competency ? `Competency: ${q.competency}` : `Value: ${q.value}`}
            </p>
          )}
          <div className="rounded-lg bg-primary/5 border border-primary/10 p-3">
            <p className="text-[11px] font-semibold text-primary mb-1">Preparation tip</p>
            <p className="text-xs text-foreground leading-relaxed">{q.tip}</p>
          </div>
        </div>
      )}
    </div>
  )
}

export function InterviewQuestionsPanel({ applicationId, cached }: Props) {
  const [questions, setQuestions] = useState<Questions | null>(cached ?? null)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  const generate = async () => {
    setLoading(true); setError(null)
    try {
      const res  = await fetch('/api/application/predict-interview-questions', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ applicationId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      setQuestions(data.questions)
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  if (!questions) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-primary/8 border border-primary/20 flex items-center justify-center mx-auto">
          <Users className="w-6 h-6 text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Interview Questions Prediction</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto leading-relaxed">
            Based on your competency evidence, we predict the questions a panel is most likely to ask —
            especially around your gap areas.
          </p>
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <button onClick={generate} disabled={loading}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground text-sm font-semibold transition-colors">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Predicting questions…</> : <><Sparkles className="w-4 h-4" /> Predict Interview Questions</>}
        </button>
      </div>
    )
  }

  const sections = [
    {
      key:       'gap'      as const,
      label:     'Gap questions — panel will probe these',
      sublabel:  'Most important to prepare for — these are the areas your evidence was weakest',
      icon:      AlertTriangle,
      iconCls:   'text-red-500',
      questions: questions.gapQuestions,
    },
    {
      key:       'strength' as const,
      label:     'Strength questions — expect follow-up depth',
      sublabel:  'Your strong competencies will attract deeper probing questions',
      icon:      Sparkles,
      iconCls:   'text-emerald-500',
      questions: questions.strengthQuestions,
    },
    {
      key:       'values'   as const,
      label:     'NHS values questions',
      sublabel:  'Values-based interview questions specific to this NHS nation',
      icon:      Shield,
      iconCls:   'text-blue-500',
      questions: questions.valuesQuestions,
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-foreground">Predicted Interview Questions</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {questions.gapQuestions.length + questions.strengthQuestions.length + questions.valuesQuestions.length} questions predicted based on your competency profile
          </p>
        </div>
        <button onClick={generate} disabled={loading}
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
          Regenerate
        </button>
      </div>

      {sections.map(({ key, label, sublabel, icon: Icon, iconCls, questions: qs }) => {
        if (!qs?.length) return null
        return (
          <div key={key} className="space-y-2">
            <div className="flex items-center gap-2 mb-3">
              <Icon className={`w-4 h-4 ${iconCls}`} />
              <div>
                <p className="text-xs font-bold text-foreground">{label}</p>
                <p className="text-[11px] text-muted-foreground">{sublabel}</p>
              </div>
            </div>
            {qs.map((q, i) => <QuestionCard key={i} q={q} index={i} category={key} />)}
          </div>
        )
      })}
    </div>
  )
}