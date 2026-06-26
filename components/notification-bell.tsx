// components/notification-bell.tsx
//
// Facebook-style bell: badge count, dropdown feed, click-to-mark-read,
// "Mark all read" action. Polls every 20s so it feels live without
// needing websockets. Drop this into your dashboard navbar/sidebar.
'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Bell, MessageCircle, Shield, CheckCheck, Loader2 } from 'lucide-react'

interface NotificationRow {
  id: string; type: string; title: string; body: string | null
  linkUrl: string | null; read: boolean; createdAt: string
}

const ICON_BY_TYPE: Record<string, React.ElementType> = {
  mentorship_reply: MessageCircle,
  mentorship_thread_closed: MessageCircle,
  account_tier_changed: Shield,
  account_suspended: Shield,
  account_unsuspended: Shield,
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d`
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationRow[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const ref = useRef<HTMLDivElement>(null)

  const load = async () => {
    try {
      const res = await fetch('/api/notifications')
      if (!res.ok) { setLoading(false); return }
      const text = await res.text()
      if (!text) { setLoading(false); return }
      const d = JSON.parse(text)
      setNotifications(d.notifications ?? [])
      setUnreadCount(d.unreadCount ?? 0)
    } catch {
      // silently fail — bell shows empty rather than crashing
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const interval = setInterval(load, 60000) // poll every 60s — notifications aren't time-critical
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const markRead = async (id: string) => {
    await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) }).catch(() => {})
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    setUnreadCount(c => Math.max(0, c - 1))
  }

  const markAllRead = async () => {
    await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) }).catch(() => {})
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setUnreadCount(0)
  }

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(o => !o)} className="relative p-2 rounded-lg hover:bg-accent transition-colors" aria-label="Notifications">
        <Bell className="w-5 h-5 text-foreground" />
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-[420px] rounded-xl bg-card border border-border shadow-xl overflow-hidden z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <p className="text-[14px] font-bold text-foreground">Notifications</p>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="flex items-center gap-1 text-[11px] font-medium text-primary hover:underline">
                <CheckCheck className="w-3 h-3" /> Mark all read
              </button>
            )}
          </div>

          <div className="overflow-y-auto max-h-[330px]">
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
            ) : notifications.length === 0 ? (
              <p className="text-center py-10 text-[13px] text-muted-foreground">No notifications yet.</p>
            ) : (
              notifications.map(n => {
                const Icon = ICON_BY_TYPE[n.type] ?? Bell
                const content = (
                  <div className={`flex items-start gap-3 px-4 py-3 transition-colors hover:bg-accent/40 ${!n.read ? 'bg-primary/5' : ''}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${!n.read ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[12.5px] leading-snug ${!n.read ? 'font-semibold text-foreground' : 'text-foreground'}`}>{n.title}</p>
                      {n.body && <p className="text-[11.5px] text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>}
                      <p className="text-[10.5px] text-muted-foreground/70 mt-1">{timeAgo(n.createdAt)}</p>
                    </div>
                    {!n.read && <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />}
                  </div>
                )
                return n.linkUrl ? (
                  <Link key={n.id} href={n.linkUrl} onClick={() => { if (!n.read) markRead(n.id); setOpen(false) }}>{content}</Link>
                ) : (
                  <button key={n.id} onClick={() => !n.read && markRead(n.id)} className="w-full text-left">{content}</button>
                )
              })
            )}
          </div>

          <Link href="/dashboard/settings#notifications" onClick={() => setOpen(false)} className="block text-center py-2.5 text-[11.5px] font-medium text-muted-foreground hover:text-foreground border-t border-border transition-colors">
            Notification settings
          </Link>
        </div>
      )}
    </div>
  )
}