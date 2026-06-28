'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Send, Loader2, Sparkles, ChevronDown, MessageCircle, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './ui/button'

type Message = { role: 'user' | 'assistant'; content: string }

const SUGGESTIONS = [
  { label: "What makes this different from ChatGPT?",     emoji: "🤔" },
  { label: "How does the A/B statement testing work?",    emoji: "🧪" },
  { label: "Can it help with NHS visa sponsorship?",      emoji: "🌍" },
  { label: "What is the EvidenceVault™?",                  emoji: "🗄️" },
  { label: "How does Shortlist Intelligence™ work?",      emoji: "🔥" },
  { label: "What's included in each pricing tier?",       emoji: "💳" },
]

function renderMessage(text: string) {
  return text.split('\n').map((line, i) => {
    if (!line.trim()) return <div key={i} className="h-1" />
    if (line.startsWith('- ') || line.startsWith('• ')) {
      return (
        <div key={i} className="flex items-start gap-2 text-[13px] leading-relaxed">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 dark:bg-blue-500 shrink-0 mt-[6px]" />
          <span dangerouslySetInnerHTML={{ __html: line.slice(2).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') }} />
        </div>
      )
    }
    return (
      <p key={i} className="text-[13px] leading-relaxed"
        dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') }} />
    )
  })
}

export function HomepageChatWidget() {
  const [open,      setOpen]      = useState(false)
  const [messages,  setMessages]  = useState<Message[]>([])
  const [input,     setInput]     = useState('')
  const [streaming, setStreaming] = useState(false)
  const bottomRef  = useRef<HTMLDivElement>(null)
  const inputRef   = useRef<HTMLTextAreaElement>(null)
  const abortRef   = useRef<AbortController | null>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streaming])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150)
  }, [open])

  async function send(text?: string) {
    const content = (text ?? input).trim()
    if (!content || streaming) return
    setInput('')

    const newMessages: Message[] = [...messages, { role: 'user', content }]
    setMessages(newMessages)
    setStreaming(true)
    setMessages(m => [...m, { role: 'assistant', content: '' }])

    abortRef.current = new AbortController()
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
        signal: abortRef.current.signal,
      })
      if (!res.ok || !res.body) throw new Error('Failed')
      const reader = res.body.getReader()
      const dec = new TextDecoder()
      let text = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        text += dec.decode(value, { stream: true })
        const t = text
        setMessages(m => { const u = [...m]; u[u.length - 1] = { role: 'assistant', content: t }; return u })
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 10)
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setMessages(m => {
          const u = [...m]
          u[u.length - 1] = { role: 'assistant', content: 'Something went wrong — please try again.' }
          return u
        })
      }
    } finally {
      setStreaming(false)
    }
  }

  return (
    <>
      {/* Trigger button */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2.5">
        {!open && (
          <div  style={{ background: 'linear-gradient(135deg, #c41d1d, #eb2539, #ff0606)' }} className="flex items-center gap-2.5 bg-foreground text-background text-[12px] font-semibold px-4 py-2 rounded-full shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-200 cursor-pointer"
            onClick={() => setOpen(true)}>
            <Sparkles className="w-3.5 h-3.5 text-white-400" />
            Ask me anything
          </div>
        )}
        <button onClick={() => setOpen(o => !o)}
          className={cn(
            'w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-200 active:scale-95',
            open ? 'bg-foreground text-background' : 'text-white shadow-blue-500/30'
          )}
          style={!open ? { background: 'linear-gradient(135deg, #ef7354, #e90e0e)' } : {}}>
          {open ? <X className="w-5 h-5" /> : <MessageCircle className="w-6 h-6" />}
        </button>
      </div>

      {/* Panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[400px] max-w-[calc(100vw-24px)] rounded-2xl border border-border bg-card shadow-2xl shadow-black/20 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-3 duration-200"
          style={{ height: '540px', maxHeight: 'calc(100vh - 140px)' }}>

          {/* Header */}
          <div className="shrink-0 px-5 py-4 flex items-center gap-3"
            style={{ background: 'linear-gradient(135deg, #c41d1d, #eb2539, #ff0606)' }}>
            <div className="w-9 h-9 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-black text-white leading-none">OmniJobReady AI™</p>
              <p className="text-[11px] text-white mt-0.5">Ask anything about the platform</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {messages.length > 0 && (
                <button onClick={() => setMessages([])}
                  className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                  title="Clear chat">
                  <RotateCcw className="w-3.5 h-3.5 text-white" />
                </button>
              )}
              <Button onClick={() => setOpen(false)}
                className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                <ChevronDown className="w-4 h-4 text-white" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4 min-h-0">

            {/* Welcome state */}
            {messages.length === 0 && (
              <>
                <div className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: 'linear-gradient(135deg, #eb4925, #bd5757)' }}>
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3 max-w-[88%]">
                    <p className="text-[13px] text-foreground leading-relaxed">
                      Hi! I know everything about <strong>OmniJobReady AI™</strong> — every feature, how it works, pricing, and how to get started.
                    </p>
                    <p className="text-[11.5px] text-muted-foreground mt-1.5">What would you like to know?</p>
                  </div>
                </div>

                {/* Suggestion pills */}
                <div className="space-y-2 pl-9">
                  {SUGGESTIONS.map(s => (
                    <button key={s.label} onClick={() => send(s.label)}
                      className="w-full text-left flex items-center gap-2.5 text-[12px] text-foreground/80 border border-border hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-xl px-3.5 py-2.5 transition-all group">
                      <span className="text-base leading-none">{s.emoji}</span>
                      <span className="group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{s.label}</span>
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Conversation */}
            {messages.map((m, i) => (
              <div key={i} className={cn('flex items-end gap-2.5', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                {m.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: 'linear-gradient(135deg, #ef7354, #e90e0e)' }}>
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                  </div>
                )}
                <div className={cn(
                  'max-w-[85%] rounded-2xl px-4 py-3',
                  m.role === 'user'
                    ? 'text-white rounded-br-sm'
                    : 'bg-muted text-foreground rounded-bl-sm space-y-1'
                )}
                  style={m.role === 'user' ? { background: 'linear-gradient(135deg, #ef7354, #e90e0e)' } : {}}>
                  {m.role === 'user' ? (
                    <p className="text-[13px] leading-relaxed">{m.content}</p>
                  ) : m.content ? (
                    <div className="space-y-1">{renderMessage(m.content)}</div>
                  ) : (
                    <div className="flex items-center gap-1.5 py-0.5">
                      {[0, 1, 2].map(j => (
                        <span key={j} className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce"
                          style={{ animationDelay: `${j * 0.12}s` }} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="shrink-0 px-3 py-3 border-t border-border bg-background/50">
            <div className="flex items-end gap-2">
              <textarea ref={inputRef} value={input}
                onChange={e => { setInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 96) + 'px' }}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                placeholder="Ask about features, pricing, how it works…"
                disabled={streaming} rows={1}
                className="flex-1 rounded-xl px-3.5 py-2.5 text-[13px] bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/15 resize-none disabled:opacity-50 transition-all min-h-[40px]"
                style={{ maxHeight: 96 }}
              />
              <button onClick={() => send()} disabled={streaming || !input.trim()}
                className="w-10 h-10 rounded-xl disabled:opacity-40 text-white flex items-center justify-center transition-all shrink-0 active:scale-95"
                style={{ background: 'linear-gradient(135deg, #ef7354, #e90e0e)' }}>
                {streaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground/50 text-center mt-2">Enter to send · Shift+Enter for new line</p>
          </div>
        </div>
      )}
    </>
  )
}