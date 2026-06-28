// app/dashboard/evidence-vault/page.tsx
// EvidenceVault™ — digital portfolio and proof-of-experience repository.
// 6 modules: Experience Library, Certificates, Competencies, Interview Vault,
// References, and Statement Builder integration (handled via skillTags/usageCount).

'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Plus, Trash2, Edit2, X, Save, Loader2, Search,
  Briefcase, Award, CheckCircle2, MessageSquare, Users, FolderOpen,
  Calendar, ChevronDown, ChevronUp, AlertTriangle, Sparkles, Tag,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────
interface EvidenceEntry {
  id: string; title: string; category: string
  situation: string; task: string; action: string; result: string
  skillTags: string[]; nhsValueTags: string[]
  dateOccurred: string | null; employer: string | null; usageCount: number
}
interface Certificate {
  id: string; name: string; issuer: string | null; certNumber: string | null
  dateIssued: string | null; expiryDate: string | null; category: string
}
interface Competency {
  id: string | null; skillName: string; status: string; notes: string | null
  signedOffBy: string | null; signedOffDate: string | null
}
interface InterviewEntry {
  id: string; question: string; category: string; answer: string
}
interface ReferenceEntry {
  id: string; employer: string; jobTitle: string
  startDate: string | null; endDate: string | null
  responsibilities: string; achievements: string | null
  refereeName: string | null; refereeRole: string | null
  refereeEmail: string | null; refereePhone: string | null
}

const EVIDENCE_CATEGORIES = [
  { value: 'clinical', label: 'Clinical Procedure' },
  { value: 'patient_interaction', label: 'Patient Interaction' },
  { value: 'research', label: 'Research' },
  { value: 'audit', label: 'Audit / QI' },
  { value: 'training', label: 'Training Delivered' },
  { value: 'leadership', label: 'Leadership' },
  { value: 'other', label: 'Other' },
]

const NHS_VALUES = ['Quality', 'Dignity and Respect', 'Care and Compassion', 'Openness, Honesty and Responsibility', 'Teamwork']

const COMPETENCY_STATUSES = [
  { value: 'competent', label: 'Competent', color: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300' },
  { value: 'training', label: 'In Training', color: 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300' },
  { value: 'not_started', label: 'Not Started', color: 'bg-muted text-muted-foreground' },
]

const TABS = [
  { key: 'experience', label: 'Experience Library', icon: Briefcase },
  { key: 'certificates', label: 'Certificates', icon: Award },
  { key: 'competencies', label: 'Competencies', icon: CheckCircle2 },
  { key: 'interview', label: 'Interview Vault', icon: MessageSquare },
  { key: 'references', label: 'References', icon: Users },
] as const

type TabKey = typeof TABS[number]['key']

function fmtDate(d: string | null): string {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function daysUntil(d: string | null): number | null {
  if (!d) return null
  return Math.ceil((new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPERIENCE LIBRARY TAB
// ═══════════════════════════════════════════════════════════════════════════
function ExperienceTab() {
  const [entries, setEntries] = useState<EvidenceEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<EvidenceEntry | null>(null)
  const [filter, setFilter] = useState<string>('all')
  const [search, setSearch] = useState('')

  const [form, setForm] = useState({
    title: '', category: 'clinical', situation: '', task: '', action: '', result: '',
    skillTags: '', nhsValueTags: [] as string[], employer: '', dateOccurred: '',
  })

  const load = useCallback(() => {
    setLoading(true)
    fetch('/api/evidence-vault/entries').then(r => r.json()).then(d => setEntries(d.entries ?? [])).finally(() => setLoading(false))
  }, [])
  useEffect(() => { load() }, [load])

  const resetForm = () => {
    setForm({ title: '', category: 'clinical', situation: '', task: '', action: '', result: '', skillTags: '', nhsValueTags: [], employer: '', dateOccurred: '' })
    setEditing(null); setShowForm(false)
  }

  const startEdit = (e: EvidenceEntry) => {
    setForm({
      title: e.title, category: e.category, situation: e.situation, task: e.task, action: e.action, result: e.result,
      skillTags: e.skillTags.join(', '), nhsValueTags: e.nhsValueTags, employer: e.employer ?? '', dateOccurred: e.dateOccurred?.slice(0,10) ?? '',
    })
    setEditing(e); setShowForm(true)
  }

  const save = async () => {
    const payload = {
      ...form,
      skillTags: form.skillTags.split(',').map(s => s.trim()).filter(Boolean),
    }
    if (editing) {
      await fetch('/api/evidence-vault/entries', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editing.id, ...payload }) })
    } else {
      await fetch('/api/evidence-vault/entries', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    }
    resetForm(); load()
  }

  const remove = async (id: string) => {
    await fetch('/api/evidence-vault/entries', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    load()
  }

  const filtered = entries.filter(e => {
    if (filter !== 'all' && e.category !== filter) return false
    if (search && !`${e.title} ${e.skillTags.join(' ')}`.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-base font-bold text-foreground">Experience Library</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Store STAR examples — these power your supporting statements and interview prep.</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold">
          <Plus className="w-3.5 h-3.5" /> Add Evidence
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by title or skill..."
            className="w-full bg-muted border border-border rounded-lg pl-8 pr-3 py-2 text-xs text-foreground placeholder-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <select value={filter} onChange={e => setFilter(e.target.value)}
          className="bg-muted border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30">
          <option value="all">All categories</option>
          {EVIDENCE_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>

      {/* Form */}
      {showForm && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">{editing ? 'Edit Evidence' : 'New Evidence Entry'}</p>
            <button onClick={resetForm}><X className="w-4 h-4 text-muted-foreground" /></button>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Title (e.g. Dementia patient research visit)"
              className="bg-muted border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30" />
            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              className="bg-muted border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30">
              {EVIDENCE_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <input value={form.employer} onChange={e => setForm(f => ({ ...f, employer: e.target.value }))} placeholder="Employer / setting (optional)"
              className="bg-muted border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30" />
            <input type="date" value={form.dateOccurred} onChange={e => setForm(f => ({ ...f, dateOccurred: e.target.value }))}
              className="bg-muted border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          {[
            { key: 'situation', label: 'Situation', ph: 'What was the context?' },
            { key: 'task', label: 'Task', ph: 'What did you need to do?' },
            { key: 'action', label: 'Action', ph: 'What did you do?' },
            { key: 'result', label: 'Result', ph: 'What was the outcome?' },
          ].map(f => (
            <div key={f.key} className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">{f.label}</label>
              <textarea value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} rows={2} placeholder={f.ph}
                className="w-full bg-muted border border-border rounded-lg p-2 text-xs text-foreground placeholder-muted-foreground/50 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          ))}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Skill tags (comma separated)</label>
            <input value={form.skillTags} onChange={e => setForm(f => ({ ...f, skillTags: e.target.value }))} placeholder="venepuncture, consent, communication"
              className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">NHS Values demonstrated</label>
            <div className="flex flex-wrap gap-1.5">
              {NHS_VALUES.map(v => (
                <button key={v} onClick={() => setForm(f => ({ ...f, nhsValueTags: f.nhsValueTags.includes(v) ? f.nhsValueTags.filter(x => x !== v) : [...f.nhsValueTags, v] }))}
                  className={`text-[10px] px-2 py-1 rounded-full border transition-colors ${form.nhsValueTags.includes(v) ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-muted-foreground border-border'}`}>
                  {v}
                </button>
              ))}
            </div>
          </div>
          <button onClick={save} disabled={!form.title || !form.situation}
            className="w-full py-2.5 rounded-lg bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2">
            <Save className="w-4 h-4" /> {editing ? 'Save Changes' : 'Add to Vault'}
          </button>
        </div>
      )}

      {/* List */}
      {loading ? <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 text-primary animate-spin" /></div> : (
        filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <p className="text-sm text-muted-foreground">No evidence entries yet. Add your first example above.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(e => (
              <div key={e.id} className="rounded-xl border border-border bg-card p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-foreground">{e.title}</p>
                      <span className="text-[10px] font-medium bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                        {EVIDENCE_CATEGORIES.find(c => c.value === e.category)?.label ?? e.category}
                      </span>
                      {e.usageCount > 0 && (
                        <span className="text-[10px] font-medium bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
                          Used {e.usageCount}x
                        </span>
                      )}
                    </div>
                    {(e.employer || e.dateOccurred) && (
                      <p className="text-[11px] text-muted-foreground mt-0.5">{[e.employer, fmtDate(e.dateOccurred)].filter(Boolean).join(' · ')}</p>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => startEdit(e)} className="p-1.5 rounded hover:bg-accent text-muted-foreground"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => remove(e.id)} className="p-1.5 rounded hover:bg-accent text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{e.situation}</p>
                {(e.skillTags.length > 0 || e.nhsValueTags.length > 0) && (
                  <div className="flex flex-wrap gap-1.5">
                    {e.skillTags.map(t => <span key={t} className="text-[10px] bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full flex items-center gap-1"><Tag className="w-2.5 h-2.5" />{t}</span>)}
                    {e.nhsValueTags.map(t => <span key={t} className="text-[10px] bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full">{t}</span>)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// CERTIFICATES TAB
// ═══════════════════════════════════════════════════════════════════════════
function CertificatesTab() {
  const [certs, setCerts] = useState<Certificate[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', issuer: '', certNumber: '', dateIssued: '', expiryDate: '', category: 'training' })

  const load = () => {
    setLoading(true)
    fetch('/api/evidence-vault/certificates').then(r => r.json()).then(d => setCerts(d.certificates ?? [])).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const save = async () => {
    await fetch('/api/evidence-vault/certificates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    setForm({ name: '', issuer: '', certNumber: '', dateIssued: '', expiryDate: '', category: 'training' })
    setShowForm(false); load()
  }
  const remove = async (id: string) => {
    await fetch('/api/evidence-vault/certificates', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    load()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-base font-bold text-foreground">Certificate Vault</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Track training certificates, mandatory training and registrations — with expiry alerts.</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold">
          <Plus className="w-3.5 h-3.5" /> Add Certificate
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">New Certificate</p>
            <button onClick={() => setShowForm(false)}><X className="w-4 h-4 text-muted-foreground" /></button>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Certificate name (e.g. Phlebotomy Certificate)"
              className="bg-muted border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30" />
            <input value={form.issuer} onChange={e => setForm(f => ({ ...f, issuer: e.target.value }))} placeholder="Issuer (e.g. Skills for Health)"
              className="bg-muted border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              className="bg-muted border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30">
              <option value="mandatory">Mandatory Training</option>
              <option value="training">Training</option>
              <option value="professional_registration">Professional Registration</option>
              <option value="qualification">Qualification</option>
            </select>
            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground">Date issued</label>
              <input type="date" value={form.dateIssued} onChange={e => setForm(f => ({ ...f, dateIssued: e.target.value }))}
                className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground">Expiry date</label>
              <input type="date" value={form.expiryDate} onChange={e => setForm(f => ({ ...f, expiryDate: e.target.value }))}
                className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>
          <input value={form.certNumber} onChange={e => setForm(f => ({ ...f, certNumber: e.target.value }))} placeholder="Certificate number (optional)"
            className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30" />
          <button onClick={save} disabled={!form.name}
            className="w-full py-2.5 rounded-lg bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2">
            <Save className="w-4 h-4" /> Add Certificate
          </button>
        </div>
      )}

      {loading ? <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 text-primary animate-spin" /></div> : (
        certs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <p className="text-sm text-muted-foreground">No certificates added yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {certs.map(c => {
              const days = daysUntil(c.expiryDate)
              const expiring = days !== null && days <= 60
              const expired = days !== null && days < 0
              return (
                <div key={c.id} className="rounded-xl border border-border bg-card p-4 flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-foreground">{c.name}</p>
                      <span className="text-[10px] font-medium bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                        {c.category.replace(/_/g, ' ')}
                      </span>
                      {expired && <span className="text-[10px] font-bold bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 px-2 py-0.5 rounded-full flex items-center gap-1"><AlertTriangle className="w-2.5 h-2.5" /> Expired</span>}
                      {!expired && expiring && <span className="text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full flex items-center gap-1"><AlertTriangle className="w-2.5 h-2.5" /> Expires in {days}d</span>}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {[c.issuer, c.dateIssued ? `Issued ${fmtDate(c.dateIssued)}` : null, c.expiryDate ? `Expires ${fmtDate(c.expiryDate)}` : null].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <button onClick={() => remove(c.id)} className="p-1.5 rounded hover:bg-accent text-red-400 shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              )
            })}
          </div>
        )
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPETENCIES TAB
// ═══════════════════════════════════════════════════════════════════════════
function CompetenciesTab() {
  const [skills, setSkills] = useState<Competency[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [newSkill, setNewSkill] = useState('')

  const load = () => {
    setLoading(true)
    fetch('/api/evidence-vault/competencies').then(r => r.json()).then(d => setSkills(d.competencies ?? [])).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const setStatus = async (skillName: string, status: string) => {
    await fetch('/api/evidence-vault/competencies', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ skillName, status }) })
    load()
  }

  const addCustom = async () => {
    if (!newSkill.trim()) return
    await setStatus(newSkill.trim(), 'training')
    setNewSkill(''); setAdding(false)
  }

  const counts = {
    competent: skills.filter(s => s.status === 'competent').length,
    training: skills.filter(s => s.status === 'training').length,
    not_started: skills.filter(s => s.status === 'not_started').length,
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-base font-bold text-foreground">Competency Tracker</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Track your clinical skill status — feeds into Career GPS™ gap analysis.</p>
        </div>
        <button onClick={() => setAdding(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold">
          <Plus className="w-3.5 h-3.5" /> Add Skill
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950 p-3 text-center">
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{counts.competent}</p>
          <p className="text-[10px] text-muted-foreground">Competent</p>
        </div>
        <div className="rounded-xl bg-amber-50 dark:bg-amber-950 p-3 text-center">
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{counts.training}</p>
          <p className="text-[10px] text-muted-foreground">In Training</p>
        </div>
        <div className="rounded-xl bg-muted p-3 text-center">
          <p className="text-2xl font-bold text-muted-foreground">{counts.not_started}</p>
          <p className="text-[10px] text-muted-foreground">Not Started</p>
        </div>
      </div>

      {adding && (
        <div className="flex gap-2">
          <input value={newSkill} onChange={e => setNewSkill(e.target.value)} placeholder="e.g. NG Tube Insertion" autoFocus
            onKeyDown={e => e.key === 'Enter' && addCustom()}
            className="flex-1 bg-muted border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30" />
          <button onClick={addCustom} className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold">Add</button>
          <button onClick={() => setAdding(false)} className="px-3 py-2 rounded-lg border border-border text-muted-foreground text-xs">Cancel</button>
        </div>
      )}

      {loading ? <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 text-primary animate-spin" /></div> : (
        <div className="space-y-1.5">
          {skills.map(s => (
            <div key={s.skillName} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-2.5">
              <p className="text-sm text-foreground">{s.skillName}</p>
              <div className="flex gap-1.5">
                {COMPETENCY_STATUSES.map(opt => (
                  <button key={opt.value} onClick={() => setStatus(s.skillName, opt.value)}
                    className={`text-[10px] font-semibold px-2.5 py-1 rounded-full transition-colors ${s.status === opt.value ? opt.color : 'bg-transparent text-muted-foreground/50 hover:bg-muted'}`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// INTERVIEW VAULT TAB
// ═══════════════════════════════════════════════════════════════════════════
function InterviewTab() {
  const [entries, setEntries] = useState<InterviewEntry[]>([])
  const [suggested, setSuggested] = useState<{ question: string; category: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [activeQ, setActiveQ] = useState<string | null>(null)
  const [draft, setDraft] = useState('')

  const load = () => {
    setLoading(true)
    fetch('/api/evidence-vault/interview').then(r => r.json()).then(d => {
      setEntries(d.entries ?? []); setSuggested(d.suggestedQuestions ?? [])
    }).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const answeredQuestions = new Set(entries.map(e => e.question))

  const save = async (question: string, category: string) => {
    if (!draft.trim()) return
    await fetch('/api/evidence-vault/interview', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question, category, answer: draft }) })
    setActiveQ(null); setDraft(''); load()
  }

  const remove = async (id: string) => {
    await fetch('/api/evidence-vault/interview', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    load()
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-bold text-foreground">Interview Vault</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Prepare answers to common NHS interview questions — revise before any interview.</p>
      </div>

      {loading ? <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 text-primary animate-spin" /></div> : (
        <div className="space-y-2">
          {/* Answered entries */}
          {entries.map(e => (
            <div key={e.id} className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-950/20 p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-foreground flex-1">{e.question}</p>
                <button onClick={() => remove(e.id)} className="p-1 rounded hover:bg-accent text-red-400 shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{e.answer}</p>
            </div>
          ))}

          {/* Suggested unanswered questions */}
          {suggested.filter(s => !answeredQuestions.has(s.question)).map(s => (
            <div key={s.question} className="rounded-xl border border-border bg-card p-4 space-y-2">
              <button onClick={() => setActiveQ(activeQ === s.question ? null : s.question)} className="w-full flex items-center justify-between gap-2 text-left">
                <p className="text-sm font-medium text-foreground">{s.question}</p>
                {activeQ === s.question ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </button>
              {activeQ === s.question && (
                <div className="space-y-2">
                  <textarea value={draft} onChange={e => setDraft(e.target.value)} rows={4} placeholder="Draft your answer using a real example from your Experience Library..."
                    className="w-full bg-muted border border-border rounded-lg p-2 text-xs text-foreground placeholder-muted-foreground/50 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  <button onClick={() => save(s.question, s.category)} disabled={!draft.trim()}
                    className="px-3 py-2 rounded-lg bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground text-xs font-semibold flex items-center gap-1.5">
                    <Save className="w-3.5 h-3.5" /> Save Answer
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// REFERENCES TAB
// ═══════════════════════════════════════════════════════════════════════════
function ReferencesTab() {
  const [entries, setEntries] = useState<ReferenceEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    employer: '', jobTitle: '', startDate: '', endDate: '', responsibilities: '', achievements: '',
    refereeName: '', refereeRole: '', refereeEmail: '', refereePhone: '',
  })

  const load = () => {
    setLoading(true)
    fetch('/api/evidence-vault/references').then(r => r.json()).then(d => setEntries(d.entries ?? [])).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const save = async () => {
    await fetch('/api/evidence-vault/references', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    setForm({ employer: '', jobTitle: '', startDate: '', endDate: '', responsibilities: '', achievements: '', refereeName: '', refereeRole: '', refereeEmail: '', refereePhone: '' })
    setShowForm(false); load()
  }
  const remove = async (id: string) => {
    await fetch('/api/evidence-vault/references', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    load()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-base font-bold text-foreground">Employment History & References</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Keep your work history and referee details ready — no more re-typing for every application.</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold">
          <Plus className="w-3.5 h-3.5" /> Add Role
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">New Employment Record</p>
            <button onClick={() => setShowForm(false)}><X className="w-4 h-4 text-muted-foreground" /></button>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <input value={form.employer} onChange={e => setForm(f => ({ ...f, employer: e.target.value }))} placeholder="Employer"
              className="bg-muted border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30" />
            <input value={form.jobTitle} onChange={e => setForm(f => ({ ...f, jobTitle: e.target.value }))} placeholder="Job title"
              className="bg-muted border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground">Start date</label>
              <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground">End date (leave blank if current)</label>
              <input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>
          <textarea value={form.responsibilities} onChange={e => setForm(f => ({ ...f, responsibilities: e.target.value }))} rows={3} placeholder="Key responsibilities"
            className="w-full bg-muted border border-border rounded-lg p-2 text-xs text-foreground placeholder-muted-foreground/50 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30" />
          <textarea value={form.achievements} onChange={e => setForm(f => ({ ...f, achievements: e.target.value }))} rows={2} placeholder="Key achievements (optional)"
            className="w-full bg-muted border border-border rounded-lg p-2 text-xs text-foreground placeholder-muted-foreground/50 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30" />
          <p className="text-xs font-semibold text-muted-foreground pt-1">Referee (optional)</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <input value={form.refereeName} onChange={e => setForm(f => ({ ...f, refereeName: e.target.value }))} placeholder="Referee name"
              className="bg-muted border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30" />
            <input value={form.refereeRole} onChange={e => setForm(f => ({ ...f, refereeRole: e.target.value }))} placeholder="Referee role"
              className="bg-muted border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30" />
            <input value={form.refereeEmail} onChange={e => setForm(f => ({ ...f, refereeEmail: e.target.value }))} placeholder="Referee email"
              className="bg-muted border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30" />
            <input value={form.refereePhone} onChange={e => setForm(f => ({ ...f, refereePhone: e.target.value }))} placeholder="Referee phone"
              className="bg-muted border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <button onClick={save} disabled={!form.employer || !form.jobTitle || !form.responsibilities}
            className="w-full py-2.5 rounded-lg bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2">
            <Save className="w-4 h-4" /> Save Record
          </button>
        </div>
      )}

      {loading ? <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 text-primary animate-spin" /></div> : (
        entries.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <p className="text-sm text-muted-foreground">No employment history added yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map(e => (
              <div key={e.id} className="rounded-xl border border-border bg-card p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{e.jobTitle}</p>
                    <p className="text-xs text-muted-foreground">{e.employer}</p>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3 h-3" /> {fmtDate(e.startDate)} – {e.endDate ? fmtDate(e.endDate) : 'Present'}
                    </p>
                  </div>
                  <button onClick={() => remove(e.id)} className="p-1.5 rounded hover:bg-accent text-red-400 shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{e.responsibilities}</p>
                {e.refereeName && (
                  <p className="text-[11px] text-muted-foreground border-t border-border pt-2">
                    Referee: <span className="text-foreground font-medium">{e.refereeName}</span> {e.refereeRole && `(${e.refereeRole})`} {e.refereeEmail && `· ${e.refereeEmail}`}
                  </p>
                )}
              </div>
            ))}
          </div>
        )
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════
export default function EvidenceVaultPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('experience')

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="mb-8">
          <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-4 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <FolderOpen className="w-6 h-6 text-primary" /> EvidenceVault™
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-md">
            Your digital portfolio — store evidence once, reuse it everywhere: supporting statements, interview prep, and applications.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border overflow-x-auto pb-0 -mb-px mb-6">
          {TABS.map(tab => {
            const Icon = tab.icon
            return (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors -mb-px ${activeTab === tab.key ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'}`}>
                <Icon className="w-3.5 h-3.5" /> {tab.label}
              </button>
            )
          })}
        </div>

        {activeTab === 'experience' && <ExperienceTab />}
        {activeTab === 'certificates' && <CertificatesTab />}
        {activeTab === 'competencies' && <CompetenciesTab />}
        {activeTab === 'interview' && <InterviewTab />}
        {activeTab === 'references' && <ReferencesTab />}
      </div>
    </div>
  )
}