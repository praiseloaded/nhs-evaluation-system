// app/dashboard/cpd/page.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Plus, Trash2, Calendar, Clock, BookOpen, X, Loader2, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'

const CPD_TYPES = [
  { id: 'participatory', label: 'Participatory', desc: 'Courses, conferences, training with others', color: 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300' },
  { id: 'self-directed', label: 'Self-directed',  desc: 'Reading, online modules, reflection',       color: 'bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300' },
  { id: 'practice',      label: 'Practice-based', desc: 'Supervision, peer review, clinical audit',  color: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300' },
]

const REG_BODIES = [
  { id: 'nmc',  label: 'NMC',  sub: '35 hrs / 3 years' },
  { id: 'hcpc', label: 'HCPC', sub: '30 activities / 2 years' },
  { id: 'gmc',  label: 'GMC',  sub: '50 hrs / 1 year' },
  { id: 'none', label: 'Personal goal', sub: '' },
]

const EMPTY_FORM = { date: new Date().toISOString().slice(0,10), title: '', type: 'participatory', hours: '', provider: '', reflection: '', evidence: '' }

export default function CpdPage() {
  const [entries,  setEntries]  = useState<any[]>([])
  const [settings, setSettings] = useState<any>({ body: 'nmc', cycleStart: new Date().toISOString().slice(0,10) })
  const [targets,  setTargets]  = useState<any>({})
  const [loading,  setLoading]  = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form,     setForm]     = useState(EMPTY_FORM)
  const [saving,   setSaving]   = useState(false)
  const [deleting, setDeleting] = useState<string|null>(null)

  useEffect(() => {
    fetch('/api/cpd').then(r => r.json()).then(d => {
      setEntries(d.entries ?? [])
      setSettings(d.settings ?? { body: 'nmc', cycleStart: new Date().toISOString().slice(0,10) })
      setTargets(d.targets ?? {})
    }).finally(() => setLoading(false))
  }, [])

  const target = targets[settings.body] ?? { hours: 35, activities: null }
  const totalHours      = entries.reduce((s: number, e: any) => s + (Number(e.hours) || 0), 0)
  const totalActivities = entries.length
  const pct = target.hours > 0 ? Math.min(100, Math.round((totalHours / target.hours) * 100)) : Math.min(100, Math.round((totalActivities / (target.activities || 30)) * 100))

  const addEntry = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const res  = await fetch('/api/cpd', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'add', ...form }) })
    const data = await res.json()
    setEntries(data.entries ?? [])
    setShowForm(false); setForm(EMPTY_FORM); setSaving(false)
  }

  const deleteEntry = async (id: string) => {
    setDeleting(id)
    const res  = await fetch('/api/cpd', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete', id }) })
    const data = await res.json()
    setEntries(data.entries ?? []); setDeleting(null)
  }

  const updateBody = async (body: string) => {
    const s = { ...settings, body }
    setSettings(s)
    await fetch('/api/cpd', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'settings', settings: { body } }) })
  }

  const exportCsv = () => {
    const rows = [['Date','Title','Type','Hours','Provider','Reflection','Evidence']]
    entries.forEach((e: any) => rows.push([e.date, e.title, e.type, e.hours, e.provider, e.reflection, e.evidence]))
    const csv  = rows.map(r => r.map((c: string) => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a'); a.href = url; a.download = 'cpd-log.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const reg = REG_BODIES.find(r => r.id === settings.body)

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-3 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
          </Link>
          <h1 className="text-2xl font-black text-foreground flex items-center gap-2">📚 CPD Tracker</h1>
          <p className="text-sm text-muted-foreground mt-1">Log continuing professional development for NMC, HCPC or GMC revalidation.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCsv} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors">
            <Plus className="w-3.5 h-3.5" /> Log CPD
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : (
        <>
          {/* Registration body selector */}
          <div className="flex gap-2 flex-wrap">
            {REG_BODIES.map(r => (
              <button key={r.id} onClick={() => updateBody(r.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${settings.body === r.id ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:text-foreground'}`}>
                {r.label} {r.sub && <span className="opacity-70 font-normal ml-1">{r.sub}</span>}
              </button>
            ))}
          </div>

          {/* Progress */}
          <div className="rounded-2xl border border-border bg-card p-6 flex items-center gap-6 flex-wrap">
            <div className="relative w-24 h-24 shrink-0">
              <svg viewBox="0 0 100 100" className="w-24 h-24 -rotate-90">
                <circle cx="50" cy="50" r="40" stroke="#e5e7eb" strokeWidth="10" fill="none" />
                <circle cx="50" cy="50" r="40" stroke={pct >= 100 ? '#10b981' : pct >= 60 ? '#3b82f6' : '#f59e0b'} strokeWidth="10" fill="none"
                  strokeDasharray={2*Math.PI*40} strokeDashoffset={2*Math.PI*40*(1-pct/100)} strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-black text-foreground">{pct}%</span>
              </div>
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-foreground">{reg?.label ?? 'CPD Progress'}</p>
              <div className="grid grid-cols-3 gap-4 mt-3">
                <div>
                  <p className="text-xl font-black text-foreground">{totalHours.toFixed(1)}</p>
                  <p className="text-[10px] text-muted-foreground">{target.hours > 0 ? `of ${target.hours} hrs` : 'hours logged'}</p>
                </div>
                <div>
                  <p className="text-xl font-black text-foreground">{totalActivities}</p>
                  <p className="text-[10px] text-muted-foreground">{target.activities ? `of ${target.activities} activities` : 'activities'}</p>
                </div>
                <div>
                  {CPD_TYPES.map(t => {
                    const count = entries.filter((e: any) => e.type === t.id).length
                    return (
                      <div key={t.id} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <span className={`text-[9px] font-bold px-1 rounded ${t.color}`}>{t.id[0].toUpperCase()}</span>
                        {count}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Entries */}
          {entries.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center space-y-3">
              <BookOpen className="w-8 h-8 text-muted-foreground/30 mx-auto" />
              <p className="text-sm text-muted-foreground">No CPD logged yet. Add your first activity to start tracking.</p>
              <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold">
                <Plus className="w-3.5 h-3.5" /> Log first CPD activity
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {entries.map((entry: any) => {
                const t = CPD_TYPES.find(t => t.id === entry.type)
                return (
                  <div key={entry.id} className="rounded-2xl border border-border bg-card p-4 flex items-start gap-4">
                    <div className="text-center shrink-0 w-12">
                      <p className="text-[10px] font-bold text-muted-foreground">{new Date(entry.date).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-foreground">{entry.title}</p>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${t?.color ?? 'bg-muted text-muted-foreground'}`}>{t?.label ?? entry.type}</span>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" />{entry.hours}h</span>
                      </div>
                      {entry.provider    && <p className="text-xs text-muted-foreground mt-0.5">{entry.provider}</p>}
                      {entry.reflection  && <p className="text-xs text-foreground/70 mt-1 line-clamp-2">{entry.reflection}</p>}
                    </div>
                    <button onClick={() => deleteEntry(entry.id)} disabled={deleting === entry.id}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors shrink-0">
                      {deleting === entry.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Add form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <form onSubmit={addEntry} className="bg-background rounded-2xl border border-border max-w-lg w-full p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-foreground">Log CPD activity</p>
              <Button type="button" onClick={() => setShowForm(false)}><X className="w-4 h-4 text-muted-foreground" /></Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide block mb-1">Date *</label>
                <input type="date" value={form.date} onChange={e => setForm(f => ({...f,date:e.target.value}))} required aria-label="CPD date"
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide block mb-1">Hours *</label>
                <input type="number" value={form.hours} onChange={e => setForm(f => ({...f,hours:e.target.value}))} required min="0" step="0.5" placeholder="1.5" aria-label="CPD hours"
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide block mb-1">Activity title *</label>
              <input value={form.title} onChange={e => setForm(f => ({...f,title:e.target.value}))} required placeholder="e.g. NMC Safeguarding Level 3 online module" aria-label="CPD title"
                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide block mb-1">Type *</label>
              <div className="flex gap-2">
                {CPD_TYPES.map(t => (
                  <button key={t.id} type="button" onClick={() => setForm(f => ({...f,type:t.id}))}
                    className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${form.type === t.id ? t.color + ' border-current' : 'border-border text-muted-foreground'}`}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide block mb-1">Provider / Organisation</label>
              <input value={form.provider} onChange={e => setForm(f => ({...f,provider:e.target.value}))} placeholder="e.g. Royal College of Nursing, eLearning for Healthcare" aria-label="CPD provider"
                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide block mb-1">Reflection (NMC requirement)</label>
              <textarea value={form.reflection} onChange={e => setForm(f => ({...f,reflection:e.target.value}))} rows={3} placeholder="What did you learn? How will it improve your practice?" aria-label="CPD reflection"
                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <button type="submit" disabled={saving}
              className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2">
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><Plus className="w-4 h-4" /> Add activity</>}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
