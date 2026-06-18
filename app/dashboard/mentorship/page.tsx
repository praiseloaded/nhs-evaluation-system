// app/dashboard/mentorship/page.tsx
// Gated to Pro/Elite — shows an upgrade prompt instead of the inbox
// when the API returns the locked flag.
'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2, Send, Plus, MessageCircle, X, Circle, Lock, Sparkles } from 'lucide-react'

interface Message { id: string; senderType: string; senderName: string | null; body: string; createdAt: string }
interface ThreadSummary {
  id: string; subject: string; status: string; lastMessageAt: string; unreadByUser: boolean
  messages: { body: string; senderType: string; createdAt: string }[]
}
interface ThreadFull { id: string; subject: string; status: string; messages: Message[] }

function UpgradePrompt({ requiredTier }: { requiredTier: string }) {
  return (
    <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-4">
      <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
        <Lock className="w-6 h-6 text-primary" />
      </div>
      <h1 className="text-xl font-bold text-foreground">Mentorship is a {requiredTier === 'elite' ? 'Elite' : 'Pro'} feature</h1>
      <p className="text-sm text-muted-foreground">Get direct messaging access to the team for application questions, interview prep, and personalised guidance.</p>
      <Link href="/upgrade" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors">
        <Sparkles className="w-4 h-4" /> Upgrade to {requiredTier === 'elite' ? 'Elite' : 'Pro'}
      </Link>
    </div>
  )
}

export default function MentorshipPage() {
  const [locked, setLocked] = useState(false)
  const [requiredTier, setRequiredTier] = useState('pro')
  const [threads, setThreads] = useState<ThreadSummary[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [active, setActive] = useState<ThreadFull | null>(null)
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [newOpen, setNewOpen] = useState(false)
  const [newSubject, setNewSubject] = useState('')
  const [newBody, setNewBody] = useState('')
  const [creating, setCreating] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const loadThreads = async () => {
    const res = await fetch('/api/mentorship/threads')
    const d = await res.json()
    if (d.locked) { setLocked(true); setRequiredTier(d.requiredTier ?? 'pro'); setLoading(false); return }
    setThreads(d.threads ?? [])
    setLoading(false)
  }

  const loadThread = async (id: string) => {
    setActiveId(id)
    const res = await fetch(`/api/mentorship/threads/${id}`)
    const d = await res.json()
    setActive(d.thread)
  }

  useEffect(() => { loadThreads() }, [])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [active?.messages.length])

  const send = async () => {
    if (!draft.trim() || !activeId) return
    setSending(true)
    await fetch(`/api/mentorship/threads/${activeId}/messages`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ body: draft }),
    })
    setDraft('')
    await loadThread(activeId)
    await loadThreads()
    setSending(false)
  }

  const createThread = async () => {
    if (!newSubject.trim() || !newBody.trim()) return
    setCreating(true)
    const res = await fetch('/api/mentorship/threads', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject: newSubject, body: newBody }),
    })
    const d = await res.json()
    setNewOpen(false); setNewSubject(''); setNewBody('')
    await loadThreads()
    if (d.thread) loadThread(d.thread.id)
    setCreating(false)
  }

  if (loading) return <div className="flex justify-center py-24"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
  if (locked) return <UpgradePrompt requiredTier={requiredTier} />

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-4 transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <MessageCircle className="w-6 h-6 text-primary" /> Mentorship
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Ask a question and get a direct reply from the team.</p>
        </div>
        <button onClick={() => setNewOpen(true)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" /> New conversation
        </button>
      </div>

      <div className="grid lg:grid-cols-[280px_1fr] gap-5">
        <div className="rounded-2xl border border-border bg-card overflow-hidden divide-y divide-border max-h-[600px] overflow-y-auto">
          {threads.length === 0 ? (
            <p className="text-center py-10 text-sm text-muted-foreground px-4">No conversations yet. Start one if you have a question.</p>
          ) : (
            threads.map(t => (
              <button key={t.id} onClick={() => loadThread(t.id)} className={`w-full text-left px-4 py-3 hover:bg-accent/40 transition-colors ${activeId === t.id ? 'bg-accent/60' : ''}`}>
                <div className="flex items-center justify-between gap-2">
                  <p className={`text-[13px] truncate ${t.unreadByUser ? 'font-bold text-foreground' : 'font-medium text-foreground'}`}>{t.subject}</p>
                  {t.unreadByUser && <Circle className="w-2 h-2 fill-primary text-primary shrink-0" />}
                </div>
                {t.messages[0] && <p className="text-[11.5px] text-muted-foreground truncate mt-0.5">{t.messages[0].senderType === 'admin' ? 'Reply: ' : ''}{t.messages[0].body}</p>}
                <p className="text-[10px] text-muted-foreground/70 mt-1">{new Date(t.lastMessageAt).toLocaleDateString('en-GB')}</p>
              </button>
            ))
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card flex flex-col" style={{ minHeight: 480 }}>
          {!active ? (
            <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">Select a conversation, or start a new one.</div>
          ) : (
            <>
              <div className="px-5 py-3.5 border-b border-border">
                <p className="text-[14px] font-semibold text-foreground">{active.subject}</p>
              </div>
              <div className="flex-1 px-5 py-4 space-y-3 overflow-y-auto">
                {active.messages.map(m => (
                  <div key={m.id} className={`flex ${m.senderType === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${m.senderType === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'}`}>
                      <p className="text-[13px] whitespace-pre-wrap">{m.body}</p>
                      <p className={`text-[10px] mt-1 ${m.senderType === 'user' ? 'opacity-70' : 'text-muted-foreground'}`}>
                        {m.senderType === 'admin' ? 'Team' : 'You'} · {new Date(m.createdAt).toLocaleString('en-GB')}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
              <div className="flex gap-2 px-4 py-3 border-t border-border">
                <textarea
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                  placeholder="Type a message…"
                  rows={2}
                  className="flex-1 rounded-xl px-3 py-2 text-[13px] bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                />
                <button onClick={send} disabled={sending || !draft.trim()} className="px-4 rounded-xl bg-primary text-primary-foreground font-semibold disabled:opacity-50 transition-colors shrink-0">
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {newOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setNewOpen(false)}>
          <div onClick={e => e.stopPropagation()} className="w-full max-w-md rounded-2xl bg-card border border-border p-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[15px] font-bold text-foreground">New conversation</p>
              <button onClick={() => setNewOpen(false)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
            </div>
            <input value={newSubject} onChange={e => setNewSubject(e.target.value)} placeholder="Subject, e.g. 'Question about interview prep'"
              className="w-full rounded-lg px-3 py-2 text-sm bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none" />
            <textarea value={newBody} onChange={e => setNewBody(e.target.value)} placeholder="Your message…" rows={4}
              className="w-full rounded-lg px-3 py-2 text-sm bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none resize-none" />
            <button onClick={createThread} disabled={creating || !newSubject.trim() || !newBody.trim()} className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50 transition-colors">
              {creating ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Send'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}