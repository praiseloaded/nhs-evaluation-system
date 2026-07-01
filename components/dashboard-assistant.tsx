// components/dashboard-assistant.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, X, Send, Loader2, ArrowRight, RotateCcw } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { Button } from './ui/button'

interface NavItem      { path: string; label: string }
interface FeatureItem  { label: string; desc: string; path: string }
interface FeatureGroup { group: string; emoji: string; items: FeatureItem[] }
interface Message {
  role:           'user' | 'assistant'
  content:        string
  navigate?:      NavItem
  featureGroups?: { groups: FeatureGroup[] }
}

const STARTERS = [
  'What are all your features?',
  'Take me to Job Ready™',
  'How do I build my CV?',
  'Find NHS jobs in Scotland',
  'Take me to Salary Predictor',
  'What is a New Analysis?',
  'Open the Career Coach',
  'How does band matching work?',
]

function FeatureGroupsCard({ groups, onNavigate }: { groups: FeatureGroup[]; onNavigate: (path: string) => void }) {
  return (
    <div className="space-y-3 w-full">
      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">All Platform Features</p>
      {groups.map(group => (
        <div key={group.group}>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
            <span>{group.emoji}</span> {group.group}
          </p>
          <div className="space-y-1">
            {group.items.map(item => (
              <button key={item.path} onClick={() => onNavigate(item.path)}
                className="w-full text-left flex items-start gap-2.5 px-3 py-2 rounded-xl border border-gray-100 bg-white hover:border-amber-400 hover:bg-amber-50 transition-all group shadow-sm">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-gray-800 group-hover:text-amber-700 transition-colors">{item.label}</p>
                  <p className="text-[10px] text-gray-400 leading-snug mt-0.5">{item.desc}</p>
                </div>
                <ArrowRight className="w-3 h-3 text-gray-300 group-hover:text-amber-500 transition-colors shrink-0 mt-0.5" />
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export function DashboardAssistant() {
  const router     = useRouter()
  const { data: session } = useSession()
  const firstName  = (session?.user?.name ?? '').split(' ')[0] || ''
  const [open,     setOpen]     = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input,    setInput]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const bottomRef  = useRef<HTMLDivElement>(null)
  const inputRef   = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const send = async (text?: string) => {
    const content = (text ?? input).trim()
    if (!content || loading) return

    const userMsg: Message = { role: 'user', content }
    const next = [...messages, userMsg]
    setMessages(next)
    setInput('')
    setLoading(true)

    try {
      const res  = await fetch('/api/assistant', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ messages: next }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setMessages(prev => [...prev, {
        role:          'assistant',
        content:       data.reply ?? '',
        navigate:      data.navigate      ?? undefined,
        featureGroups: data.featureGroups ?? undefined,
      }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' }])
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  const nav = (path: string) => { router.push(path); setOpen(false) }

  return (
    <>
      {/* ── Floating pill button ───────────────────────────────────────── */}
      {!open && (
        <button onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-5 py-3 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 shadow-lg shadow-orange-300/40 active:scale-95 transition-all">
          <div className="w-7 h-7 rounded-full bg-white/25 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-sm font-black text-white tracking-tight">OmniJobReady AI</span>
        </button>
      )}

      {/* ── Chat panel ────────────────────────────────────────────────── */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-[360px] flex flex-col rounded-3xl overflow-hidden shadow-2xl bg-gray-50"
          style={{ height: 580, maxHeight: '85vh' }}>

          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-amber-500 to-orange-500 shrink-0">
            <div className="w-10 h-10 rounded-full bg-white/25 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-black text-white leading-none">OmniJobReady A.I</p>
              <p className="text-[11px] text-white/80 mt-0.5 leading-none">Your personal assistant</p>
            </div>
            {messages.length > 0 && (
              <button onClick={() => setMessages([])} title="Start over"
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors">
                <RotateCcw className="w-3.5 h-3.5 text-white" />
              </button>
            )}
            <Button onClick={() => setOpen(false)}
              className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors">
              <X className="w-3.5 h-3.5 text-white" />
            </Button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">

            {/* Welcome + starters */}
            {messages.length === 0 && (
              <>
                {/* Welcome bubble */}
                <div className="bg-white rounded-2xl rounded-tl-sm shadow-sm px-4 py-3.5 max-w-[90%]">
                  <p className="text-sm text-gray-800 leading-relaxed">
                    Hi{firstName ? ` ${firstName}` : ''}! 👋 I'm your OmniJobReady personal assistant. I know every feature on this platform and can take you anywhere you need to go.
                  </p>
                  <p className="text-sm text-gray-800 leading-relaxed mt-2">
                    What would you like to do today?
                  </p>
                </div>

                {/* Quick starters */}
                <div className="space-y-1.5 pt-1">
                  {STARTERS.map(s => (
                    <button key={s} onClick={() => send(s)}
                      className="w-full text-left text-xs text-gray-600 bg-white hover:bg-amber-50 hover:text-amber-700 border border-gray-100 hover:border-amber-300 rounded-xl px-3.5 py-2.5 transition-all shadow-sm font-medium">
                      {s}
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Message history */}
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[88%] space-y-2 ${msg.role === 'user' ? 'items-end flex flex-col' : ''}`}>
                  {/* Bubble */}
                  {msg.content && (
                    <div className={`rounded-2xl px-4 py-3 shadow-sm ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-br from-amber-500 to-orange-500 text-white rounded-tr-sm'
                        : 'bg-white text-gray-800 rounded-tl-sm'
                    }`}>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  )}

                  {/* Single nav button */}
                  {msg.navigate && (
                    <button onClick={() => nav(msg.navigate!.path)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold hover:opacity-90 transition-opacity shadow-sm">
                      <ArrowRight className="w-3.5 h-3.5" />
                      {msg.navigate.label}
                    </button>
                  )}

                  {/* Feature groups */}
                  {msg.featureGroups && (
                    <FeatureGroupsCard groups={msg.featureGroups.groups} onNavigate={nav} />
                  )}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white rounded-2xl rounded-tl-sm shadow-sm px-4 py-3 flex items-center gap-1.5">
                  {[0, 150, 300].map(d => (
                    <div key={d} className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: `${d}ms` }} />
                  ))}
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-4 py-4 bg-white border-t border-gray-100 shrink-0">
            <div className="flex items-center gap-2.5">
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') send() }}
                placeholder="Ask about your application..."
                className="flex-1 bg-gray-50 border border-gray-200 rounded-full px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400"
              />
              <button onClick={() => send()} disabled={!input.trim() || loading}
                className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 hover:opacity-90 disabled:opacity-40 flex items-center justify-center transition-opacity shadow-sm shrink-0">
                {loading
                  ? <Loader2 className="w-4 h-4 text-white animate-spin" />
                  : <Send className="w-4 h-4 text-white" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}