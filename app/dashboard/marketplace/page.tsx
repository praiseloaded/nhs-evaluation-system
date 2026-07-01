// app/dashboard/marketplace/page.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2, Bell, BellRing, Users, ExternalLink, Sparkles } from 'lucide-react'

interface Category {
  id: string; label: string; emoji: string; desc: string
  live: boolean; listings: any[]; waitlistCount: number; joined: boolean
}

export default function MarketplacePage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading,    setLoading]    = useState(true)
  const [toggling,   setToggling]   = useState<string | null>(null)

  const load = () => {
    fetch('/api/marketplace').then(r => r.json()).then(d => setCategories(d.categories ?? [])).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const toggleWaitlist = async (cat: Category) => {
    setToggling(cat.id)
    const action = cat.joined ? 'leave' : 'join'
    setCategories(prev => prev.map(c => c.id === cat.id
      ? { ...c, joined: !c.joined, waitlistCount: c.waitlistCount + (c.joined ? -1 : 1) }
      : c))
    try {
      await fetch('/api/marketplace', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryId: cat.id, action }),
      })
    } finally { setToggling(null) }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div>
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-3 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
        </Link>
        <h1 className="text-2xl font-black text-foreground flex items-center gap-2">🛍️ Healthcare Career Marketplace™</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Beyond applications — courses, coaching, mentors and employer connections. Join the waitlist for categories that interest you and we'll notify you the moment they launch.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {categories.map(cat => (
            <div key={cat.id} className="rounded-2xl border border-border bg-card p-5 flex flex-col gap-4">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center text-2xl shrink-0">{cat.emoji}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-foreground">{cat.label}</p>
                    {cat.live ? (
                      <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">LIVE</span>
                    ) : (
                      <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">COMING SOON</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{cat.desc}</p>
                </div>
              </div>

              {cat.live ? (
                <div className="space-y-2">
                  {cat.listings.map((l: any, i: number) => (
                    <a key={i} href={l.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center justify-between gap-2 rounded-xl border border-border bg-muted/20 px-3 py-2.5 hover:border-primary/40 transition-colors group">
                      <div>
                        <p className="text-xs font-bold text-foreground">{l.name}</p>
                        <p className="text-[10px] text-muted-foreground">{l.priceLabel}</p>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                    </a>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3 pt-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" /> {cat.waitlistCount} waitlisted
                  </p>
                  <button onClick={() => toggleWaitlist(cat)} disabled={toggling === cat.id}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-50 ${
                      cat.joined
                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                        : 'bg-primary text-primary-foreground hover:bg-primary/90'
                    }`}>
                    {cat.joined ? <><BellRing className="w-3.5 h-3.5" /> Notified</> : <><Bell className="w-3.5 h-3.5" /> Join waitlist</>}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Mentorship cross-link — the one category that's actually live today */}
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-primary shrink-0" />
          <div>
            <p className="text-sm font-bold text-foreground">Looking for a mentor right now?</p>
            <p className="text-xs text-muted-foreground mt-0.5">Our Mentorship feature is live today — connect with NHS professionals by band and specialty.</p>
          </div>
        </div>
        <Link href="/dashboard/mentorship" className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-bold whitespace-nowrap">
          Find a Mentor →
        </Link>
      </div>

      <p className="text-center text-xs text-muted-foreground pb-4">
        Are you a course provider, coach, or NHS employer interested in joining the Marketplace? <a href="mailto:partners@omnijobready.com" className="text-primary underline">Get in touch</a>
      </p>
    </div>
  )
}