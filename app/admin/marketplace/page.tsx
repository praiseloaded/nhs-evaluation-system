// app/admin/marketplace/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { ShoppingBag, Plus, Trash2, Loader2, Users, CheckCircle2, AlertCircle, X } from 'lucide-react'
import { Button } from '@/components/ui/button';

const CATEGORIES = [
  { id: 'phlebotomy', label: 'Phlebotomy Courses',  emoji: '🩸' },
  { id: 'ecg',        label: 'ECG Training',         emoji: '💓' },
  { id: 'interview',  label: 'Interview Coaching',   emoji: '🎤' },
  { id: 'mentorship', label: 'Mentors',              emoji: '🧭' },
  { id: 'mock',       label: 'Mock Interviews',      emoji: '🎭' },
  { id: 'employers',  label: 'Employer Partners',    emoji: '🏥' },
]

interface Listing { id: string; category: string; name: string; url: string; priceLabel: string; description: string }

const EMPTY_FORM = { categoryId: '', name: '', url: '', priceLabel: '', description: '' }

export default function AdminMarketplacePage() {
  const [listings,      setListings]      = useState<Listing[]>([])
  const [waitlistCounts,setWaitlistCounts]= useState<Record<string,number>>({})
  const [loading,       setLoading]       = useState(true)
  const [showForm,      setShowForm]      = useState(false)
  const [form,          setForm]          = useState(EMPTY_FORM)
  const [saving,        setSaving]        = useState(false)
  const [deleting,      setDeleting]      = useState<string|null>(null)
  const [toast,         setToast]         = useState<{msg:string;ok:boolean}|null>(null)

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  const load = () => {
    setLoading(true)
    fetch('/api/admin/marketplace')
      .then(r => r.json())
      .then(d => { setListings(d.listings ?? []); setWaitlistCounts(d.waitlistCounts ?? {}) })
      .catch(() => showToast('Failed to load', false))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const addListing = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.categoryId || !form.name || !form.url) return
    setSaving(true)
    try {
      const res = await fetch('/api/admin/marketplace', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error('Failed')
      showToast('Listing added — category is now LIVE', true)
      setForm(EMPTY_FORM); setShowForm(false); load()
    } catch { showToast('Failed to add listing', false) }
    finally { setSaving(false) }
  }

  const deleteListing = async (id: string) => {
    if (!confirm('Remove this listing?')) return
    setDeleting(id)
    try {
      await fetch('/api/admin/marketplace', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      showToast('Listing removed', true); load()
    } catch { showToast('Delete failed', false) }
    finally { setDeleting(null) }
  }

  const totalWaitlist = Object.values(waitlistCounts).reduce((a,b) => a+b, 0)

  return (
    <div className="p-8 space-y-6 max-w-5xl">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white ${toast.ok ? 'bg-emerald-600' : 'bg-red-600'}`}>
          {toast.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-amber-500" /> Marketplace Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Add listings to make a category go LIVE. Remove them to revert to waitlist mode.
          </p>
        </div>
        <button onClick={() => setShowForm(s => !s)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" /> Add Listing
        </button>
      </div>

      {/* Waitlist summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {CATEGORIES.map(cat => (
          <div key={cat.id} className="rounded-xl border border-border bg-card p-3 text-center">
            <div className="text-xl mb-1">{cat.emoji}</div>
            <p className="text-lg font-black text-foreground">{waitlistCounts[cat.id] ?? 0}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{cat.label}</p>
            {listings.some(l => l.category === cat.id) ? (
              <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400">LIVE</span>
            ) : (
              <span className="text-[9px] text-amber-600 dark:text-amber-400">Waitlist</span>
            )}
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 flex items-center gap-2 text-sm text-foreground">
        <Users className="w-4 h-4 text-primary" />
        <span className="font-bold">{totalWaitlist}</span> total waitlist signups across all categories
      </div>

      {/* Add form */}
      {showForm && (
        <form onSubmit={addListing} className="rounded-2xl border border-primary/20 bg-primary/5 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-foreground">New Listing</p>
            <Button type="button" onClick={() => setShowForm(false)}><X className="w-4 h-4 text-muted-foreground" /></Button>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide block mb-1">Category *</label>
              <select value={form.categoryId} onChange={e => setForm(f => ({...f, categoryId: e.target.value}))} required
                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="">Select category…</option>
                {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide block mb-1">Provider name *</label>
              <input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} required
                placeholder="e.g. Phlebotomy UK Training Ltd"
                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide block mb-1">URL *</label>
              <input value={form.url} onChange={e => setForm(f => ({...f, url: e.target.value}))} required type="url"
                placeholder="https://provider.com/course"
                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide block mb-1">Price label</label>
              <input value={form.priceLabel} onChange={e => setForm(f => ({...f, priceLabel: e.target.value}))}
                placeholder="e.g. £149 / Free / From £99"
                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide block mb-1">Description</label>
              <input value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))}
                placeholder="Short one-line description shown on the listing card"
                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>
          <button type="submit" disabled={saving}
            className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><Plus className="w-4 h-4" /> Add Listing — goes LIVE immediately</>}
          </button>
        </form>
      )}

      {/* Live listings table */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : listings.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center">
          <p className="text-sm text-muted-foreground">No live listings yet. Add one above to make a category go live for users.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-3 border-b border-border bg-muted/30">
            <p className="text-xs font-bold text-foreground/70 uppercase tracking-wider">Live Listings ({listings.length})</p>
          </div>
          <div className="divide-y divide-border">
            {listings.map(l => {
              const cat = CATEGORIES.find(c => c.id === l.category)
              return (
                <div key={l.id} className="flex items-center gap-4 px-5 py-4">
                  <span className="text-xl shrink-0">{cat?.emoji ?? '📦'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-foreground">{l.name}</p>
                      <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">LIVE</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{cat?.label} · {l.priceLabel || 'No price set'} · {l.url}</p>
                  </div>
                  <button onClick={() => deleteListing(l.id)} disabled={deleting === l.id}
                    className="p-2 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950 transition-colors disabled:opacity-40">
                    {deleting === l.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}