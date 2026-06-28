// app/dashboard/cover-letter/page.tsx
'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Sparkles, Loader2, Copy, CheckCircle2,
  FileText, RefreshCw, Mail, ChevronDown,
} from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'

const TONE_OPTIONS = [
  { value: 'professional',  label: 'Professional',  desc: 'Formal, evidence-led, NHS standard'    },
  { value: 'warm',          label: 'Warm',          desc: 'Compassionate, person-centred tone'    },
  { value: 'confident',     label: 'Confident',     desc: 'Direct, achievement-forward, bold'     },
  { value: 'collaborative', label: 'Collaborative', desc: 'Team-focused, MDT and values language' },
]

interface CoverLetterResult {
  coverLetter:          string
  wordCount:            number
  keyStrengths:         string[]
  suggestedSubjectLine: string
  improvements:         string[]
}

function CoverLetterContent() {
  const searchParams = useSearchParams()
  const appId        = searchParams.get('applicationId')

  const [jobTitle,    setJobTitle]    = useState('')
  const [employer,    setEmployer]    = useState('')
  const [motivation,  setMotivation]  = useState('')
  const [tone,        setTone]        = useState('professional')
  const [generating,  setGenerating]  = useState(false)
  const [result,      setResult]      = useState<CoverLetterResult | null>(null)
  const [error,       setError]       = useState<string | null>(null)
  const [copied,      setCopied]      = useState(false)
  const [editing,     setEditing]     = useState(false)
  const [editedText,  setEditedText]  = useState('')

  // Load application data if applicationId provided
  useEffect(() => {
    if (!appId) return
    fetch(`/api/application/${appId}`)
      .then(r => r.json())
      .then(d => {
        if (d.application) {
          setJobTitle(d.application.jobTitle ?? '')
          setEmployer(d.application.employer ?? '')
        }
      })
      .catch(() => {})
  }, [appId])

  const generate = async () => {
    if (!jobTitle.trim() || !employer.trim()) {
      setError('Job title and employer are required')
      return
    }
    setGenerating(true); setError(null); setResult(null)
    try {
      const res  = await fetch('/api/cover-letter', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          applicationId: appId ?? undefined,
          jobTitle,
          employer,
          motivation,
          tone,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Generation failed')
      setResult(data)
      setEditedText(data.coverLetter)
    } catch (e: any) { setError(e.message) }
    finally { setGenerating(false) }
  }

  const copyLetter = () => {
    navigator.clipboard.writeText(editing ? editedText : (result?.coverLetter ?? ''))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const wc = (t: string) => t.trim().split(/\s+/).filter(Boolean).length

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">

      {/* Header */}
      <div>
        <Link href={appId ? `/dashboard/application/${appId}` : '/dashboard'}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-4 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> {appId ? 'Back to application' : 'Dashboard'}
        </Link>
        <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
          <Mail className="w-6 h-6 text-primary" /> Cover Letter AI
        </h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-lg">
          Evidence-led NHS cover letters in under 60 seconds — tailored to the role, employer, and your supporting statement.
        </p>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">

        {/* Left: inputs */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
            <p className="text-sm font-bold text-foreground">Role Details</p>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Job Title *</label>
              <input value={jobTitle} onChange={e => setJobTitle(e.target.value)}
                placeholder="e.g. Staff Nurse Band 5"
                className="w-full bg-muted border border-border rounded-xl p-2.5 text-sm text-foreground placeholder-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Employer *</label>
              <input value={employer} onChange={e => setEmployer(e.target.value)}
                placeholder="e.g. NHS Lothian"
                className="w-full bg-muted border border-border rounded-xl p-2.5 text-sm text-foreground placeholder-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Why this role? (optional)</label>
              <textarea value={motivation} onChange={e => setMotivation(e.target.value)} rows={3}
                placeholder="What draws you to this specific post or department? Any personal connection?"
                className="w-full bg-muted border border-border rounded-xl p-2.5 text-sm text-foreground placeholder-muted-foreground/40 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Tone</label>
              <div className="space-y-1.5">
                {TONE_OPTIONS.map(t => (
                  <label key={t.value}
                    className={`flex items-start gap-3 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                      tone === t.value ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
                    }`}>
                    <input type="radio" name="tone" value={t.value} checked={tone === t.value}
                      onChange={() => setTone(t.value)} className="mt-0.5 accent-primary" />
                    <div>
                      <p className="text-xs font-semibold text-foreground">{t.label}</p>
                      <p className="text-[10px] text-muted-foreground">{t.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {appId && (
              <div className="flex items-center gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 px-3 py-2.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <p className="text-xs text-emerald-700 dark:text-emerald-300">Linked to application — AI will use your supporting statement as evidence.</p>
              </div>
            )}

            {error && <p className="text-xs text-red-500">{error}</p>}

            <button onClick={generate} disabled={generating || !jobTitle.trim() || !employer.trim()}
              className="w-full py-3.5 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground font-bold flex items-center justify-center gap-2 transition-colors">
              {generating
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Writing your letter…</>
                : <><Sparkles className="w-4 h-4" /> Generate Cover Letter</>}
            </button>
          </div>

          {/* Tips */}
          <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
            <p className="text-xs font-bold text-foreground">Tips for a stronger letter</p>
            {[
              'Link to an application above to use your supporting statement as evidence',
              'Add your motivation to make paragraph 3 feel genuinely researched',
              'Edit the generated letter to add your name and specific achievements',
              'Aim for 300–350 words — NHS hiring managers read quickly',
            ].map((tip, i) => (
              <p key={i} className="text-[11px] text-muted-foreground flex gap-2">
                <span className="text-primary font-bold shrink-0">→</span> {tip}
              </p>
            ))}
          </div>
        </div>

        {/* Right: output */}
        <div className="lg:col-span-3 space-y-4">

          {!result && !generating && (
            <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center space-y-3">
              <Mail className="w-10 h-10 text-muted-foreground/30 mx-auto" />
              <p className="text-sm font-semibold text-foreground">Your cover letter will appear here</p>
              <p className="text-xs text-muted-foreground">Fill in the role details and click Generate.</p>
            </div>
          )}

          {generating && (
            <div className="rounded-2xl border border-border bg-card p-12 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
              <p className="text-sm text-muted-foreground">Writing an evidence-led NHS cover letter…</p>
            </div>
          )}

          {result && (
            <div className="space-y-4">
              {/* Meta bar */}
              <div className="rounded-2xl border border-border bg-card px-5 py-3 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-[10px] text-muted-foreground">Words</p>
                    <p className={`text-sm font-black ${wc(editing ? editedText : result.coverLetter) > 380 ? 'text-red-500' : 'text-foreground'}`}>
                      {wc(editing ? editedText : result.coverLetter)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Subject line</p>
                    <p className="text-xs font-medium text-foreground truncate max-w-[220px]">{result.suggestedSubjectLine}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setEditing(e => !e)}
                    className="text-xs border border-border rounded-lg px-3 py-1.5 text-muted-foreground hover:text-foreground transition-colors">
                    {editing ? 'Preview' : 'Edit'}
                  </button>
                  <button onClick={generate} disabled={generating}
                    className="text-xs border border-border rounded-lg px-3 py-1.5 text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
                    <RefreshCw className="w-3 h-3" /> Regenerate
                  </button>
                  <button onClick={copyLetter}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors">
                    {copied ? <><CheckCircle2 className="w-3 h-3" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy</>}
                  </button>
                </div>
              </div>

              {/* Letter content */}
              <div className="rounded-2xl border border-border bg-card overflow-hidden">
                {editing ? (
                  <Textarea value={editedText} onChange={e => setEditedText(e.target.value)}
                    rows={18}
                    className="w-full p-6 text-sm text-foreground bg-card resize-none focus:outline-none leading-relaxed font-mono" />
                ) : (
                  <div className="p-6">
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap font-serif">{result.coverLetter}</p>
                  </div>
                )}
              </div>

              {/* Strengths addressed */}
              <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
                <p className="text-xs font-bold text-foreground">Key strengths addressed</p>
                <div className="flex flex-wrap gap-2">
                  {result.keyStrengths.map((s, i) => (
                    <span key={i} className="text-[11px] px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 font-medium">
                      {s}
                    </span>
                  ))}
                </div>
                {result.improvements.length > 0 && (
                  <div className="mt-2 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300 mb-1">How to improve</p>
                    {result.improvements.map((imp, i) => (
                      <p key={i} className="text-xs text-amber-700 dark:text-amber-300">→ {imp}</p>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Link href="/dashboard/cv/templates"
                  className="flex-1 py-3 rounded-xl border border-border bg-muted hover:bg-accent text-foreground text-sm font-bold flex items-center justify-center gap-2 transition-colors">
                  <FileText className="w-4 h-4" /> CV Templates
                </Link>
                {!appId && (
                  <Link href="/dashboard/application"
                    className="flex-1 py-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-bold flex items-center justify-center gap-2 transition-colors">
                    <Sparkles className="w-4 h-4" /> Build Statement
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function CoverLetterPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    }>
      <CoverLetterContent />
    </Suspense>
  )
}