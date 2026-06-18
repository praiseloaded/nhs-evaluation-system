// components/notification-settings.tsx
// Drop into app/dashboard/settings/page.tsx — lets the user mute
// specific notification types without disabling notifications entirely.
'use client'

import { useState, useEffect } from 'react'
import { Bell, BellOff, Loader2 } from 'lucide-react'

const TYPES: { type: string; label: string; description: string }[] = [
  { type: 'mentorship_reply', label: 'Mentorship replies', description: 'When the team replies to your conversation' },
  { type: 'mentorship_thread_closed', label: 'Conversation closed', description: 'When a mentorship thread is marked closed' },
  { type: 'account_tier_changed', label: 'Plan changes', description: 'When your account tier is changed' },
  { type: 'account_suspended', label: 'Account status', description: 'Suspension or reinstatement notices' },
]

export function NotificationSettings() {
  const [muted, setMuted] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [savingType, setSavingType] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/notifications/preferences')
      .then(r => r.json())
      .then(d => setMuted(new Set(d.mutedTypes ?? [])))
      .finally(() => setLoading(false))
  }, [])

  const toggle = async (type: string) => {
    const isMuted = muted.has(type)
    setSavingType(type)
    await fetch('/api/notifications/preferences', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, muted: !isMuted }),
    })
    setMuted(prev => {
      const next = new Set(prev)
      isMuted ? next.delete(type) : next.add(type)
      return next
    })
    setSavingType(null)
  }

  if (loading) return <div className="flex justify-center py-6"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>

  return (
    <div id="notifications" className="rounded-2xl border border-border bg-card p-5 space-y-1">
      <p className="text-sm font-bold text-foreground mb-1">Notifications</p>
      <p className="text-[12px] text-muted-foreground mb-3">Choose which updates you want to be notified about.</p>
      <div className="divide-y divide-border">
        {TYPES.map(t => {
          const isMuted = muted.has(t.type)
          return (
            <div key={t.type} className="flex items-center justify-between gap-3 py-3">
              <div>
                <p className="text-[13px] font-medium text-foreground">{t.label}</p>
                <p className="text-[11.5px] text-muted-foreground">{t.description}</p>
              </div>
              <button
                onClick={() => toggle(t.type)}
                disabled={savingType === t.type}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors shrink-0 ${isMuted ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary'}`}
              >
                {savingType === t.type ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : isMuted ? <BellOff className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />}
                {isMuted ? 'Muted' : 'On'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}