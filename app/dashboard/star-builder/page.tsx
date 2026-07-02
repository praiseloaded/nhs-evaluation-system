// app/dashboard/star-builder/page.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Sparkles, Send, Loader2, CheckCircle2, RotateCcw, FolderOpen, Copy, CheckCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Stage = 'situation' | 'task' | 'action' | 'result' | 'polish'
interface Message { role: 'user' | 'assistant'; content: string; _stage?: string }

const STAGE_LABELS: Record<Stage, string> = {
  situation: 'Situation',
  task:      'Task',
  action:    'Action',
  result:    'Result',
  polish:    'Polishing…',
}
const STAGE_ORDER: Stage[] = ['situation', 'task', 'action', 'result', 'polish']
const STAGE_COLORS: Record<Stage, string> = {
  situation: 'bg-blue-500',
  task:      'bg-violet-500',
  action:    'bg-amber-500',
  result:    'bg-emerald-500',
  polish:    'bg-primary',
}

export default function StarBuilderPage() {
  const [jobContext, setJobContext]   = useState('')
  const [started,   setStarted]      = useState(false)
  const [messages,  setMessages]     = useState<Message[]>([])
  const [input,     setInput]        = useState('')
  const [stage,     setStage]        = useState<Stage>('situation')
  const [loading,   setLoading]      = useState(false)
  const [result,    setResult]       = useState<{ star: string; title: string; competency: string; savedId: string | null } | null>(null)
  const [copied,    setCopied]       = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])

  const stageIndex = STAGE_ORDER.indexOf(stage)

  const startSession = async () => {
    setStarted(true); setLoading(true)
    const res  = await fetch('/api/star-builder', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [], stage: 'situation', jobContext }),
    })
    const data = await res.json()
    setMessages([{ role: 'assistant', content: data.reply }])
    setLoading(false)
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  const send = async () => {
    if (!input.trim() || loading) return
    const userMsg: Message = { role: 'user', content: input.trim(), _stage: stage }
    const next = [...messages, userMsg]
    setMessages(next); setInput(''); setLoading(true)

    const nextStageForRequest = STAGE_ORDER[stageIndex + 1] as Stage ?? 'polish'

    const res  = await fetch('/api/star-builder', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: next, stage: nextStageForRequest, jobContext }),
    })
    const data = await res.json()

    if (data.done) {
      setResult({ star: data.star, title: data.title, competency: data.competency, savedId: data.savedId })
      setStage('polish')
    } else {
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
      setStage(nextStageForRequest)
    }
    setLoading(false)
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  const reset = () => {
    setStarted(false); setMessages([]); setInput('')
    setStage('situation'); setResult(null); setJobContext('')
  }

  const copy = () => {
    if (result?.star) { navigator.clipboard.writeText(result.star); setCopied(true); setTimeout(() => setCopied(false), 1500) }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div>
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-3 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
        </Link>
        <h1 className="text-2xl font-black text-foreground flex items-center gap-2">⭐ Auto STAR Builder™</h1>
        <p className="text-sm text-muted-foreground mt-1">Answer one question at a time. AI interviews you and writes a polished STAR example saved to your EvidenceVault™.</p>
      </div>

      {!started ? (
        <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-2">Job context (optional)</label>
            <input value={jobContext} onChange={e => setJobContext(e.target.value)}
              placeholder="e.g. Band 6 Staff Nurse, NHS Greater Glasgow — helps tailor the questions"
              className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div className="rounded-xl bg-muted/30 border border-border p-4 space-y-2">
            <p className="text-xs font-bold text-foreground">How it works</p>
            <div className="grid grid-cols-4 gap-2">
              {(['Situation', 'Task', 'Action', 'Result'] as const).map((s, i) => (
                <div key={s} className="text-center">
                  <div className={`w-8 h-8 rounded-full ${['bg-blue-500','bg-violet-500','bg-amber-500','bg-emerald-500'][i]} flex items-center justify-center text-white text-xs font-black mx-auto mb-1`}>{i+1}</div>
                  <p className="text-[10px] text-muted-foreground font-bold">{s}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">One question per stage. At the end, AI writes a polished 150-word example and saves it to your EvidenceVault.</p>
          </div>
          <button onClick={startSession}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4" /> Start building my STAR example
          </button>
        </div>
      ) : result ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/20 p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <p className="text-sm font-bold text-foreground">STAR example complete</p>
              </div>
              {result.savedId && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                  <FolderOpen className="w-3 h-3" /> Saved to EvidenceVault
                </span>
              )}
            </div>
            <div className="bg-white dark:bg-background rounded-xl border border-border p-4">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <p className="text-xs font-black text-foreground">{result.title}</p>
                  <p className="text-[10px] text-muted-foreground">{result.competency}</p>
                </div>
                <button onClick={copy} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 shrink-0">
                  {copied ? <CheckCheck className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <p className="text-sm text-foreground leading-relaxed">{result.star}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Link href="/dashboard/evidence-vault"
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors">
              <FolderOpen className="w-4 h-4" /> View EvidenceVault
            </Link>
            <button onClick={reset}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors">
              <RotateCcw className="w-4 h-4" /> Build another
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-hidden flex flex-col" style={{ height: 520 }}>
          {/* Progress bar */}
          <div className="flex border-b border-border shrink-0">
            {STAGE_ORDER.slice(0, 4).map((s, i) => (
              <div key={s} className={`flex-1 flex flex-col items-center py-2.5 transition-all ${i <= stageIndex ? 'opacity-100' : 'opacity-30'}`}>
                <div className={`w-5 h-5 rounded-full ${STAGE_COLORS[s]} flex items-center justify-center text-white text-[9px] font-black mb-0.5`}>{i+1}</div>
                <span className="text-[9px] font-bold text-muted-foreground">{STAGE_LABELS[s]}</span>
              </div>
            ))}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-tr-sm'
                    : 'bg-muted text-foreground rounded-tl-sm'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
                  {[0,150,300].map(d => <div key={d} className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay:`${d}ms` }} />)}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-border px-4 py-3 shrink-0">
            <div className="flex items-end gap-2">
              <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                rows={2} placeholder={`Describe the ${STAGE_LABELS[stage] ?? 'next step'}…`}
                className="flex-1 bg-muted border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder-muted-foreground/50 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30" />
              <Button onClick={send} disabled={!input.trim() || loading}
                className="w-9 h-9 rounded-xl bg-primary disabled:opacity-40 flex items-center justify-center transition-opacity shrink-0">
                <Send className="w-3.5 h-3.5 text-primary-foreground" />
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5 text-center">Enter to send · Shift+Enter for new line</p>
          </div>
        </div>
      )}
    </div>
  )
}
