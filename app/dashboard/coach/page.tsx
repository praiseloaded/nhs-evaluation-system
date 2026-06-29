// app/dashboard/coach/page.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Send, Loader2, Sparkles, User, Bot, RefreshCw } from 'lucide-react'

interface Message { role: 'user' | 'assistant'; content: string }

const STARTERS = [
  'What band should I apply for next?',
  'What s missing from my profile for a Band 6?',
  'How do I get NHS sponsorship as an international nurse?',
  'What CPD do I need to progress from Band 5 to Band 6?',
  'Review my career progress and suggest next steps',
  'How do I write a stronger supporting statement?',
  'What questions should I expect at a Band 5 interview?',
  'How does the NHS pension work at my band?',
]

export default function CoachPage() {
  const [messages,  setMessages]  = useState<Message[]>([])
  const [input,     setInput]     = useState('')
  const [loading,   setLoading]   = useState(false)
  const [started,   setStarted]   = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async (text?: string) => {
    const content = text ?? input.trim()
    if (!content || loading) return

    const userMsg: Message = { role: 'user', content }
    const next = [...messages, userMsg]
    setMessages(next)
    setInput('')
    setLoading(true)
    setStarted(true)

    try {
      const res  = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Coach failed')
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
    } catch (e: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Sorry, something went wrong: ${e.message}` }])
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b border-border bg-background/90 backdrop-blur-sm px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-foreground" />
            </div>
            <div>
              <h1 className="text-sm font-black text-foreground">AI Career Coach</h1>
              <p className="text-[11px] text-muted-foreground">Knows your CV, applications, and career goals</p>
            </div>
          </div>
        </div>
        {started && (
          <button onClick={() => { setMessages([]); setStarted(false) }}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <RefreshCw className="w-3 h-3" /> New session
          </button>
        )}
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 max-w-3xl mx-auto w-full">

        {/* Welcome / starters */}
        {!started && (
          <div className="space-y-6">
            <div className="text-center space-y-3 pt-8">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center mx-auto shadow-lg shadow-violet-900/30">
                <Sparkles className="w-8 h-8 text-foreground" />
              </div>
              <h2 className="text-xl font-black text-foreground">Your NHS Career Coach</h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                I know your CV, your applications, your evidence vault, and your career history. Ask me anything about progressing in the NHS.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-2">
              {STARTERS.map(q => (
                <button key={q} onClick={() => send(q)}
                  className="text-left text-xs text-foreground bg-muted hover:bg-accent border border-border hover:border-primary/40 rounded-xl px-4 py-3 transition-all">
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                msg.role === 'user'
                  ? 'bg-blue-600'
                  : 'bg-gradient-to-br from-violet-600 to-blue-600'
              }`}>
                {msg.role === 'user'
                  ? <User className="w-3.5 h-3.5 text-foreground" />
                  : <Sparkles className="w-3.5 h-3.5 text-foreground" />}
              </div>
              <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-foreground rounded-tr-sm'
                  : 'bg-muted text-foreground rounded-tl-sm'
              }`}>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center shrink-0">
                <Sparkles className="w-3.5 h-3.5 text-foreground" />
              </div>
              <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex gap-1.5 items-center">
                  <div className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-border bg-background/90 backdrop-blur-sm px-4 py-4 shrink-0">
        <div className="max-w-3xl mx-auto flex gap-3 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            rows={1}
            placeholder="Ask about your next role, interview prep, pay, sponsorship, CPD…"
            className="flex-1 bg-white border border-border focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 rounded-xl px-4 py-3 text-sm text-foreground placeholder-muted-foreground/40 resize-none focus:outline-none leading-relaxed"
            style={{ minHeight: 44, maxHeight: 160 }}
            onInput={e => {
              const t = e.target as HTMLTextAreaElement
              t.style.height = 'auto'
              t.style.height = Math.min(t.scrollHeight, 160) + 'px'
            }}
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || loading}
            className="w-11 h-11 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 flex items-center justify-center transition-colors shrink-0">
            {loading ? <Loader2 className="w-4 h-4 text-foreground animate-spin" /> : <Send className="w-4 h-4 text-foreground" />}
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground text-center mt-2">Press Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  )
}