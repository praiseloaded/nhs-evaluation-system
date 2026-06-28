// app/admin/mentorship/[id]/page.tsx
'use client'

import { useState, useEffect, useRef, use } from 'react'
import Link         from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Loader2, Send, CheckCircle2,
  XCircle, MessageCircle, User, Shield,
} from 'lucide-react'

interface Message {
  id: string; senderType: string; body: string; createdAt: string
}
interface Thread {
  id: string; subject: string; status: string; lastMessageAt: string
  user: { id: string; name: string | null; email: string; tier: string } | null
  messages: Message[]
}

export default function AdminThreadPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id }   = use(params)
  const router   = useRouter()
  const bottomRef = useRef<HTMLDivElement>(null)

  const [thread,    setThread]    = useState<Thread | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [reply,     setReply]     = useState('')
  const [sending,   setSending]   = useState(false)
  const [toggling,  setToggling]  = useState(false)

  async function load() {
    const res = await fetch(`/api/admin/mentorship/threads/${id}`)
    const d   = await res.json()
    setThread(d.thread ?? null)
    setLoading(false)
  }

  useEffect(() => { load() }, [id])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [thread?.messages.length])

  async function sendReply() {
    if (!reply.trim()) return
    setSending(true)
    await fetch(`/api/admin/mentorship/threads/${id}/messages`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ body: reply }),
    })
    setReply('')
    await load()
    setSending(false)
  }

  async function toggleStatus() {
    if (!thread) return
    setToggling(true)
    const next = thread.status === 'open' ? 'closed' : 'open'
    await fetch(`/api/admin/mentorship/threads/${id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ status: next }),
    })
    await load()
    setToggling(false)
  }

  if (loading) return (
    <div className="flex justify-center py-24">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  )

  if (!thread) return (
    <div className="max-w-3xl mx-auto px-6 py-12 text-center">
      <p className="text-muted-foreground">Thread not found.</p>
      <Link href="/admin/mentorship" className="text-primary text-sm hover:underline mt-2 inline-block">← Back to inbox</Link>
    </div>
  )

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-5">
      {/* Back */}
      <Link href="/admin/mentorship"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" /> Mentorship inbox
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-[18px] font-black text-foreground tracking-tight">{thread.subject}</h1>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
              thread.status === 'open'
                ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
                : 'bg-muted text-muted-foreground'
            }`}>{thread.status}</span>
            {thread.user && (
              <span className="text-[11px] text-muted-foreground">
                {thread.user.name ?? thread.user.email}
                <span className={`ml-1.5 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full ${
                  thread.user.tier === 'elite' ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300' :
                  thread.user.tier === 'pro'   ? 'bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300' :
                  'bg-muted text-muted-foreground'
                }`}>{thread.user.tier}</span>
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {thread.user && (
            <Link href={`/admin/users/${thread.user.id}`}
              className="text-[11px] text-muted-foreground hover:text-foreground border border-border rounded-lg px-3 py-1.5 transition-colors">
              View user
            </Link>
          )}
          <button onClick={toggleStatus} disabled={toggling}
            className={`flex items-center gap-1.5 text-[11px] font-semibold border rounded-lg px-3 py-1.5 transition-colors ${
              thread.status === 'open'
                ? 'border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30'
                : 'border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
            }`}>
            {toggling ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : thread.status === 'open' ? <><XCircle className="w-3.5 h-3.5" /> Close</> 
              : <><CheckCircle2 className="w-3.5 h-3.5" /> Reopen</>
            }
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="p-5 space-y-4 max-h-[500px] overflow-y-auto">
          {thread.messages.map(m => (
            <div key={m.id} className={`flex gap-3 ${m.senderType === 'admin' ? 'justify-end' : 'justify-start'}`}>
              {m.senderType === 'user' && (
                <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
              )}
              <div className={`max-w-[78%] rounded-2xl px-4 py-2.5 ${
                m.senderType === 'admin'
                  ? 'bg-gradient-to-br from-red-500 to-amber-500 text-white'
                  : 'bg-muted text-foreground'
              }`}>
                <p className="text-[13px] whitespace-pre-wrap leading-relaxed">{m.body}</p>
                <p className={`text-[10px] mt-1 ${m.senderType === 'admin' ? 'text-white/60' : 'text-muted-foreground'}`}>
                  {m.senderType === 'admin' ? 'Team' : thread.user?.name ?? 'User'} · {new Date(m.createdAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              {m.senderType === 'admin' && (
                <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-950/40 flex items-center justify-center shrink-0 mt-0.5">
                  <Shield className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                </div>
              )}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Reply box */}
        {thread.status === 'open' ? (
          <div className="flex gap-3 px-4 py-3 border-t border-border bg-muted/20">
            <textarea
              value={reply}
              onChange={e => setReply(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply() } }}
              placeholder="Type your reply… (Enter to send)"
              rows={2}
              className="flex-1 rounded-xl px-3 py-2 text-[13px] bg-background border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
            />
            <button onClick={sendReply} disabled={sending || !reply.trim()}
              className="px-4 rounded-xl bg-gradient-to-br from-red-500 to-amber-500 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold transition-colors shrink-0">
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        ) : (
          <div className="px-5 py-3 border-t border-border bg-muted/20 text-center">
            <p className="text-[12px] text-muted-foreground">This conversation is closed. Reopen it to reply.</p>
          </div>
        )}
      </div>
    </div>
  )
}