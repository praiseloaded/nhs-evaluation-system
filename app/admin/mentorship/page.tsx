// app/admin/mentorship/page.tsx
// Dedicated admin inbox — every mentorship thread across every user.
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Loader2, MessageCircle, Circle, CheckCircle2, X } from 'lucide-react'

interface ThreadRow {
  id: string; userId: string; subject: string; status: string
  lastMessageAt: string; unreadByAdmin: boolean
  messages: { body: string; senderType: string; createdAt: string }[]
  user: { id: string; name: string | null; email: string; tier: string } | null
}

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'open', label: 'Open' },
  { id: 'closed', label: 'Closed' },
]

export default function AdminMentorshipInboxPage() {
  const searchParams = useSearchParams()
  const userFilter = searchParams.get('user')

  const [threads, setThreads] = useState<ThreadRow[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    const params = new URLSearchParams({ filter })
    if (userFilter) params.set('user', userFilter)
    const res = await fetch(`/api/admin/mentorship/threads?${params.toString()}`)
    const d = await res.json()
    setThreads(d.threads ?? [])
    setUnreadCount(d.unreadCount ?? 0)
    setLoading(false)
  }

  useEffect(() => { load() }, [filter, userFilter])

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-amber-600 dark:text-amber-500" /> Mentorship Inbox
          {unreadCount > 0 && <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-amber-950">{unreadCount} unread</span>}
        </h1>
        <p className="text-[12.5px] mt-1 text-muted-foreground">Conversations started by users across the platform.</p>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-2">
          {FILTERS.map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-full text-[12px] font-medium border transition-colors ${filter === f.id ? 'bg-foreground text-background border-foreground' : 'border-border text-muted-foreground hover:text-foreground'}`}>
              {f.label}
            </button>
          ))}
        </div>
        {userFilter && (
          <Link href="/admin/mentorship" className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400">
            Filtered to one user <X className="w-3 h-3" />
          </Link>
        )}
      </div>

      <div className="rounded-2xl overflow-hidden bg-card border border-border divide-y divide-border">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : threads.length === 0 ? (
          <p className="text-center py-12 text-sm text-muted-foreground">No conversations{filter !== 'all' ? ` matching "${filter}"` : ''}.</p>
        ) : (
          threads.map(t => (
            <Link key={t.id} href={`/admin/mentorship/${t.id}`} className="flex items-start gap-3 px-5 py-4 hover:bg-accent/30 transition-colors">
              {t.unreadByAdmin ? <Circle className="w-2.5 h-2.5 mt-1.5 shrink-0 fill-amber-500 text-amber-500" /> : <CheckCircle2 className="w-3.5 h-3.5 mt-1 shrink-0 text-muted-foreground/40" />}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className={`text-[13.5px] truncate ${t.unreadByAdmin ? 'font-bold text-foreground' : 'font-medium text-foreground'}`}>{t.subject}</p>
                  <span className="text-[10.5px] font-mono text-muted-foreground shrink-0">{new Date(t.lastMessageAt).toLocaleDateString('en-GB')}</span>
                </div>
                <p className="text-[12px] text-muted-foreground truncate mt-0.5">
                  {t.user?.name ?? t.user?.email ?? 'Unknown user'} {t.messages[0] && `· ${t.messages[0].senderType === 'admin' ? 'You: ' : ''}${t.messages[0].body}`}
                </p>
              </div>
              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full shrink-0 ${t.status === 'open' ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300' : 'bg-muted text-muted-foreground'}`}>
                {t.status}
              </span>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}