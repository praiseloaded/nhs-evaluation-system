// app/dashboard/cv-builder/page.tsx
// NHS CV Builder — manual entry, 3 templates, live preview, docx export
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Plus, Trash2, Download, Loader2, FileText,
  Briefcase, GraduationCap, Award, User, ListChecks, Users,
  ChevronDown, Check, Layout, Save,
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────
interface WorkExperienceItem {
  id: string; jobTitle: string; employer: string; location: string
  startDate: string; endDate: string; current: boolean; bullets: string[]
}
interface EducationItem {
  id: string; qualification: string; institution: string; location: string
  startDate: string; endDate: string; grade: string
}
interface CertificationItem { id: string; name: string; issuer: string; date: string; expiryDate: string }
interface ReferenceItem { id: string; name: string; role: string; organisation: string; relationship: string; email: string; phone: string }
interface SkillGroup { id: string; category: string; items: string }

interface CvData {
  id: string
  title: string
  template: 'clinical' | 'nonClinical' | 'newToNhs'
  fullName: string
  email: string
  phone: string
  location: string
  professionalRegistration: string
  personalStatement: string
  workExperience: WorkExperienceItem[]
  education: EducationItem[]
  skills: SkillGroup[]
  certifications: CertificationItem[]
  additionalInfo: string
  references: ReferenceItem[]
}

const TEMPLATES = [
  { id: 'clinical', label: 'Clinical', desc: 'For nursing, AHP, and direct patient care roles — leads with registration number and clinical skills.' },
  { id: 'nonClinical', label: 'Non-Clinical', desc: 'For admin, management, and corporate NHS roles — leads with personal statement and core competencies.' },
  { id: 'newToNhs', label: 'New to NHS', desc: 'For first-time applicants or career changers — emphasises transferable skills and any care-related experience.' },
] as const

const uid = () => Math.random().toString(36).slice(2, 10)

const emptyCv = (): CvData => ({
  id: '', title: 'My CV', template: 'clinical',
  fullName: '', email: '', phone: '', location: '', professionalRegistration: '',
  personalStatement: '',
  workExperience: [], education: [], skills: [], certifications: [], references: [],
  additionalInfo: '',
})

// ── Reusable bits ─────────────────────────────────────────────────────────
function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-semibold text-muted-foreground mb-1">{children}</label>
}
function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 ${props.className ?? ''}`} />
}
function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y ${props.className ?? ''}`} />
}
function SectionCard({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-bold text-foreground">{title}</h3>
      </div>
      {children}
    </div>
  )
}
function RemovableRow({ onRemove, children }: { onRemove: () => void; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border/70 bg-background/50 p-4 space-y-3 relative">
      <button onClick={onRemove} className="absolute top-3 right-3 text-muted-foreground hover:text-red-500 transition-colors">
        <Trash2 className="w-3.5 h-3.5" />
      </button>
      {children}
    </div>
  )
}

// ── Live preview renderer ────────────────────────────────────────────────
function CvPreview({ cv }: { cv: CvData }) {
  const skillGroups = cv.skills.filter(s => s.category || s.items)

  return (
    <div className="bg-white text-[#1a1a1a] rounded-lg shadow-sm border border-border p-8 sm:p-10 text-[12.5px] leading-relaxed min-h-[800px] font-serif">
      {/* Header */}
      <div className="text-center mb-4 pb-3 border-b-2 border-[#1B3A5C]">
        <h1 className="text-[22px] font-bold tracking-tight">{cv.fullName || 'Your Name'}</h1>
        <p className="text-[11px] text-gray-600 mt-1">
          {[cv.email, cv.phone, cv.location, cv.professionalRegistration].filter(Boolean).join('   |   ')}
        </p>
      </div>

      {cv.template === 'clinical' && cv.professionalRegistration && (
        <p className="text-[11px] text-center text-[#1B3A5C] font-semibold mb-4">{cv.professionalRegistration}</p>
      )}

      {cv.personalStatement && (
        <section className="mb-4">
          <h2 className="text-[13px] font-bold text-[#1B3A5C] border-b border-[#1B3A5C]/30 mb-1.5 pb-0.5">Personal Statement</h2>
          <p className="text-[12px]">{cv.personalStatement}</p>
        </section>
      )}

      {cv.workExperience.length > 0 && (
        <section className="mb-4">
          <h2 className="text-[13px] font-bold text-[#1B3A5C] border-b border-[#1B3A5C]/30 mb-1.5 pb-0.5">Work Experience</h2>
          {cv.workExperience.map(job => (
            <div key={job.id} className="mb-3">
              <div className="flex justify-between items-baseline">
                <span className="font-bold text-[12.5px]">{job.jobTitle || 'Job Title'}</span>
                <span className="text-[11px] text-gray-600">{job.startDate}{job.startDate && ' – '}{job.current ? 'Present' : job.endDate}</span>
              </div>
              <p className="italic text-[11.5px] text-gray-700">{[job.employer, job.location].filter(Boolean).join(', ')}</p>
              {job.bullets.filter(Boolean).length > 0 && (
                <ul className="list-disc ml-4 mt-1 space-y-0.5">
                  {job.bullets.filter(Boolean).map((b, i) => <li key={i} className="text-[11.5px]">{b}</li>)}
                </ul>
              )}
            </div>
          ))}
        </section>
      )}

      {cv.education.length > 0 && (
        <section className="mb-4">
          <h2 className="text-[13px] font-bold text-[#1B3A5C] border-b border-[#1B3A5C]/30 mb-1.5 pb-0.5">Education & Qualifications</h2>
          {cv.education.map(ed => (
            <div key={ed.id} className="mb-2">
              <div className="flex justify-between items-baseline">
                <span className="font-bold text-[12px]">{ed.qualification || 'Qualification'}</span>
                <span className="text-[11px] text-gray-600">{ed.startDate}{ed.startDate && ' – '}{ed.endDate}</span>
              </div>
              <p className="italic text-[11px] text-gray-700">{[ed.institution, ed.location, ed.grade].filter(Boolean).join(', ')}</p>
            </div>
          ))}
        </section>
      )}

      {skillGroups.length > 0 && (
        <section className="mb-4">
          <h2 className="text-[13px] font-bold text-[#1B3A5C] border-b border-[#1B3A5C]/30 mb-1.5 pb-0.5">Skills & Competencies</h2>
          {skillGroups.map(s => (
            <p key={s.id} className="text-[11.5px] mb-1"><span className="font-semibold">{s.category}:</span> {s.items}</p>
          ))}
        </section>
      )}

      {cv.certifications.length > 0 && (
        <section className="mb-4">
          <h2 className="text-[13px] font-bold text-[#1B3A5C] border-b border-[#1B3A5C]/30 mb-1.5 pb-0.5">Certifications & Training</h2>
          <ul className="list-disc ml-4 space-y-0.5">
            {cv.certifications.map(c => (
              <li key={c.id} className="text-[11.5px]">
                {c.name}{(c.issuer || c.date) && ` — ${[c.issuer, c.date && `(${c.date}${c.expiryDate ? ` – expires ${c.expiryDate}` : ''})`].filter(Boolean).join(' ')}`}
              </li>
            ))}
          </ul>
        </section>
      )}

      {cv.additionalInfo && (
        <section className="mb-4">
          <h2 className="text-[13px] font-bold text-[#1B3A5C] border-b border-[#1B3A5C]/30 mb-1.5 pb-0.5">Additional Information</h2>
          <p className="text-[11.5px]">{cv.additionalInfo}</p>
        </section>
      )}

      <section>
        <h2 className="text-[13px] font-bold text-[#1B3A5C] border-b border-[#1B3A5C]/30 mb-1.5 pb-0.5">References</h2>
        {cv.references.length > 0 ? (
          cv.references.map(r => (
            <div key={r.id} className="mb-2">
              <p className="font-bold text-[12px]">{r.name || 'Reference name'}</p>
              <p className="text-[11px] text-gray-700">{[r.role, r.organisation].filter(Boolean).join(', ')}</p>
              <p className="text-[10.5px] text-gray-500">{[r.relationship, r.email, r.phone].filter(Boolean).join('   |   ')}</p>
            </div>
          ))
        ) : (
          <p className="text-[11.5px] italic text-gray-600">Available on request.</p>
        )}
      </section>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────
export default function CvBuilderPage() {
  const [profiles, setProfiles] = useState<{ id: string; title: string; template: string }[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [cv, setCv] = useState<CvData>(emptyCv())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Load profile list ──
  useEffect(() => {
    fetch('/api/cv')
      .then(r => r.json())
      .then(d => {
        const list = d.profiles ?? []
        setProfiles(list.map((p: any) => ({ id: p.id, title: p.title, template: p.template })))
        if (list.length > 0) loadProfile(list[0].id)
        else setLoading(false)
      })
      .catch(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadProfile = async (id: string) => {
    setLoading(true)
    const res = await fetch(`/api/cv/${id}`)
    const d = await res.json()
    if (d.profile) {
      const p = d.profile
      setCv({
        id: p.id, title: p.title, template: p.template,
        fullName: p.fullName ?? '', email: p.email ?? '', phone: p.phone ?? '',
        location: p.location ?? '', professionalRegistration: p.professionalRegistration ?? '',
        personalStatement: p.personalStatement ?? '',
        workExperience: (p.workExperience ?? []).map((w: any) => ({ id: w.id ?? uid(), ...w, bullets: w.bullets ?? [''] })),
        education: (p.education ?? []).map((e: any) => ({ id: e.id ?? uid(), ...e })),
        skills: Array.isArray(p.skills) ? p.skills.map((s: any) => ({ id: s.id ?? uid(), category: s.category ?? '', items: Array.isArray(s.items) ? s.items.join(', ') : (s.items ?? '') })) : [],
        certifications: (p.certifications ?? []).map((c: any) => ({ id: c.id ?? uid(), ...c })),
        additionalInfo: p.additionalInfo ?? '',
        references: (p.references ?? []).map((r: any) => ({ id: r.id ?? uid(), ...r })),
      })
      setActiveId(p.id)
    }
    setLoading(false)
  }

 const createNew = async () => {
  try {
    const res = await fetch('/api/cv', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: `CV ${profiles.length + 1}` }),
    })
    if (!res.ok) {
      const text = await res.text()
      console.error('Create CV failed:', res.status, text)
      return
    }
    const d = await res.json()
    if (d.profile) {
      setProfiles(prev => [{ id: d.profile.id, title: d.profile.title, template: d.profile.template }, ...prev])
      loadProfile(d.profile.id)
    } else {
      console.error('No profile in response:', d)
    }
  } catch (err) {
    console.error('Create CV error:', err)
  }
}

  // ── Autosave — debounced ──
  const persist = useCallback((next: CvData) => {
    if (!next.id) return
    setSaving(true)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      await fetch(`/api/cv/${next.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: next.title, template: next.template,
          fullName: next.fullName, email: next.email, phone: next.phone,
          location: next.location, professionalRegistration: next.professionalRegistration,
          personalStatement: next.personalStatement,
          workExperience: next.workExperience.map(({ id, ...w }) => w),
          education: next.education.map(({ id, ...e }) => e),
          skills: next.skills.map(s => ({ category: s.category, items: s.items.split(',').map(x => x.trim()).filter(Boolean) })),
          certifications: next.certifications.map(({ id, ...c }) => c),
          additionalInfo: next.additionalInfo,
          references: next.references.map(({ id, ...r }) => r),
        }),
      })
      setSaving(false)
    }, 900)
  }, [])

  const update = (patch: Partial<CvData>) => {
    setCv(prev => {
      const next = { ...prev, ...patch }
      persist(next)
      return next
    })
  }

  const exportDocx = async () => {
    if (!cv.id) return
    setExporting(true)
    try {
      const res = await fetch(`/api/cv/${cv.id}/export`)
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${(cv.fullName || 'CV').replace(/[^a-z0-9]/gi, '_')}_CV.docx`
      a.click()
      URL.revokeObjectURL(url)
    } catch {}
    finally { setExporting(false) }
  }

  // ── List manipulation helpers ──
  const addWork = () => update({ workExperience: [...cv.workExperience, { id: uid(), jobTitle: '', employer: '', location: '', startDate: '', endDate: '', current: false, bullets: [''] }] })
  const addEducation = () => update({ education: [...cv.education, { id: uid(), qualification: '', institution: '', location: '', startDate: '', endDate: '', grade: '' }] })
  const addSkillGroup = () => update({ skills: [...cv.skills, { id: uid(), category: '', items: '' }] })
  const addCert = () => update({ certifications: [...cv.certifications, { id: uid(), name: '', issuer: '', date: '', expiryDate: '' }] })
  const addReference = () => update({ references: [...cv.references, { id: uid(), name: '', role: '', organisation: '', relationship: '', email: '', phone: '' }] })

  if (loading) return (
    <div className="flex justify-center py-24"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
  )

  if (profiles.length === 0 && !cv.id) return (
    <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
      <FileText className="w-10 h-10 text-muted-foreground mx-auto" />
      <h1 className="text-xl font-bold text-foreground">NHS CV Builder</h1>
      <p className="text-sm text-muted-foreground">Build a CV in an NHS-acceptable format — reverse chronological, clear headings, no photo needed.</p>
      <button onClick={createNew} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors">
        <Plus className="w-4 h-4" /> Start your CV
      </button>
    </div>
  )

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-8">
      <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-4 transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
      </Link>

      <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary" /> NHS CV Builder
          </h1>
          <p className="text-sm text-muted-foreground mt-1">NHS-acceptable format — reverse chronological, no photo, clear headings.</p>
        </div>
        <div className="flex items-center gap-2">
          {profiles.length > 1 && (
            <select value={activeId ?? ''} onChange={e => loadProfile(e.target.value)} className="text-sm rounded-lg border border-border bg-card px-3 py-2">
              {profiles.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          )}
          <button onClick={createNew} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-accent transition-colors">
            <Plus className="w-3.5 h-3.5" /> New CV
          </button>
          <span className="text-xs text-muted-foreground flex items-center gap-1 px-2">
            {saving ? <><Loader2 className="w-3 h-3 animate-spin" /> Saving…</> : <><Check className="w-3 h-3 text-emerald-500" /> Saved</>}
          </span>
          <button onClick={exportDocx} disabled={exporting} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60">
            {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Download .docx
          </button>
        </div>
      </div>

      {/* Template picker */}
      <div className="relative mb-6">
        <button onClick={() => setTemplatePickerOpen(o => !o)} className="w-full flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 hover:border-primary/40 transition-colors">
          <div className="flex items-center gap-3">
            <Layout className="w-4 h-4 text-muted-foreground" />
            <div className="text-left">
              <p className="text-sm font-semibold text-foreground">{TEMPLATES.find(t => t.id === cv.template)?.label} template</p>
              <p className="text-[11px] text-muted-foreground">{TEMPLATES.find(t => t.id === cv.template)?.desc}</p>
            </div>
          </div>
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${templatePickerOpen ? 'rotate-180' : ''}`} />
        </button>
        {templatePickerOpen && (
          <div className="absolute z-10 mt-1 w-full rounded-xl border border-border bg-card shadow-lg overflow-hidden">
            {TEMPLATES.map(t => (
              <button key={t.id} onClick={() => { update({ template: t.id }); setTemplatePickerOpen(false) }}
                className={`w-full text-left px-4 py-3 hover:bg-accent transition-colors ${t.id === cv.template ? 'bg-primary/5' : ''}`}>
                <p className="text-sm font-semibold text-foreground">{t.label}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{t.desc}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-[1fr_480px] gap-6">

        {/* ── Editor ── */}
        <div className="space-y-5 order-2 lg:order-1">

          <SectionCard icon={User} title="Personal Details">
            <div className="grid sm:grid-cols-2 gap-3">
              <div><FieldLabel>Full name</FieldLabel><TextInput value={cv.fullName} onChange={e => update({ fullName: e.target.value })} placeholder="Jane Smith" /></div>
              <div><FieldLabel>Email</FieldLabel><TextInput value={cv.email} onChange={e => update({ email: e.target.value })} placeholder="jane@email.com" /></div>
              <div><FieldLabel>Phone</FieldLabel><TextInput value={cv.phone} onChange={e => update({ phone: e.target.value })} placeholder="07700 900000" /></div>
              <div><FieldLabel>Location</FieldLabel><TextInput value={cv.location} onChange={e => update({ location: e.target.value })} placeholder="Glasgow, UK" /></div>
              <div className="sm:col-span-2"><FieldLabel>Professional registration (optional)</FieldLabel><TextInput value={cv.professionalRegistration} onChange={e => update({ professionalRegistration: e.target.value })} placeholder="e.g. NMC PIN: 21A1234E" /></div>
            </div>
          </SectionCard>

          <SectionCard icon={FileText} title="Personal Statement">
            <TextArea value={cv.personalStatement} onChange={e => update({ personalStatement: e.target.value })} rows={4} placeholder="2-3 sentences summarising your experience, key strengths, and what you're looking for next." />
          </SectionCard>

          <SectionCard icon={Briefcase} title="Work Experience">
            {cv.workExperience.map((job, idx) => (
              <RemovableRow key={job.id} onRemove={() => update({ workExperience: cv.workExperience.filter(w => w.id !== job.id) })}>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div><FieldLabel>Job title</FieldLabel><TextInput value={job.jobTitle} onChange={e => update({ workExperience: cv.workExperience.map(w => w.id === job.id ? { ...w, jobTitle: e.target.value } : w) })} /></div>
                  <div><FieldLabel>Employer</FieldLabel><TextInput value={job.employer} onChange={e => update({ workExperience: cv.workExperience.map(w => w.id === job.id ? { ...w, employer: e.target.value } : w) })} /></div>
                  <div><FieldLabel>Location</FieldLabel><TextInput value={job.location} onChange={e => update({ workExperience: cv.workExperience.map(w => w.id === job.id ? { ...w, location: e.target.value } : w) })} /></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><FieldLabel>Start</FieldLabel><TextInput value={job.startDate} onChange={e => update({ workExperience: cv.workExperience.map(w => w.id === job.id ? { ...w, startDate: e.target.value } : w) })} placeholder="Jan 2022" /></div>
                    <div><FieldLabel>End</FieldLabel><TextInput disabled={job.current} value={job.endDate} onChange={e => update({ workExperience: cv.workExperience.map(w => w.id === job.id ? { ...w, endDate: e.target.value } : w) })} placeholder="Present" /></div>
                  </div>
                </div>
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <input type="checkbox" checked={job.current} onChange={e => update({ workExperience: cv.workExperience.map(w => w.id === job.id ? { ...w, current: e.target.checked } : w) })} /> Current role
                </label>
                <div>
                  <FieldLabel>Key responsibilities / achievements (one per line)</FieldLabel>
                  <TextArea rows={3} value={job.bullets.join('\n')} onChange={e => update({ workExperience: cv.workExperience.map(w => w.id === job.id ? { ...w, bullets: e.target.value.split('\n') } : w) })} placeholder="Delivered safe, compassionate care to a caseload of 12 patients per shift" />
                </div>
              </RemovableRow>
            ))}
            <button onClick={addWork} className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"><Plus className="w-3.5 h-3.5" /> Add role</button>
          </SectionCard>

          <SectionCard icon={GraduationCap} title="Education & Qualifications">
            {cv.education.map(ed => (
              <RemovableRow key={ed.id} onRemove={() => update({ education: cv.education.filter(e => e.id !== ed.id) })}>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div><FieldLabel>Qualification</FieldLabel><TextInput value={ed.qualification} onChange={e => update({ education: cv.education.map(x => x.id === ed.id ? { ...x, qualification: e.target.value } : x) })} placeholder="BSc Nursing (Adult)" /></div>
                  <div><FieldLabel>Institution</FieldLabel><TextInput value={ed.institution} onChange={e => update({ education: cv.education.map(x => x.id === ed.id ? { ...x, institution: e.target.value } : x) })} /></div>
                  <div><FieldLabel>Grade / classification</FieldLabel><TextInput value={ed.grade} onChange={e => update({ education: cv.education.map(x => x.id === ed.id ? { ...x, grade: e.target.value } : x) })} placeholder="2:1" /></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><FieldLabel>Start</FieldLabel><TextInput value={ed.startDate} onChange={e => update({ education: cv.education.map(x => x.id === ed.id ? { ...x, startDate: e.target.value } : x) })} /></div>
                    <div><FieldLabel>End</FieldLabel><TextInput value={ed.endDate} onChange={e => update({ education: cv.education.map(x => x.id === ed.id ? { ...x, endDate: e.target.value } : x) })} /></div>
                  </div>
                </div>
              </RemovableRow>
            ))}
            <button onClick={addEducation} className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"><Plus className="w-3.5 h-3.5" /> Add qualification</button>
          </SectionCard>

          <SectionCard icon={ListChecks} title="Skills & Competencies">
            {cv.skills.map(s => (
              <RemovableRow key={s.id} onRemove={() => update({ skills: cv.skills.filter(x => x.id !== s.id) })}>
                <div><FieldLabel>Category</FieldLabel><TextInput value={s.category} onChange={e => update({ skills: cv.skills.map(x => x.id === s.id ? { ...x, category: e.target.value } : x) })} placeholder="Clinical Skills" /></div>
                <div><FieldLabel>Skills (comma separated)</FieldLabel><TextInput value={s.items} onChange={e => update({ skills: cv.skills.map(x => x.id === s.id ? { ...x, items: e.target.value } : x) })} placeholder="Venepuncture, cannulation, ECG, manual handling" /></div>
              </RemovableRow>
            ))}
            <button onClick={addSkillGroup} className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"><Plus className="w-3.5 h-3.5" /> Add skill group</button>
          </SectionCard>

          <SectionCard icon={Award} title="Certifications & Training">
            {cv.certifications.map(c => (
              <RemovableRow key={c.id} onRemove={() => update({ certifications: cv.certifications.filter(x => x.id !== c.id) })}>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div><FieldLabel>Name</FieldLabel><TextInput value={c.name} onChange={e => update({ certifications: cv.certifications.map(x => x.id === c.id ? { ...x, name: e.target.value } : x) })} placeholder="Basic Life Support" /></div>
                  <div><FieldLabel>Issuer</FieldLabel><TextInput value={c.issuer} onChange={e => update({ certifications: cv.certifications.map(x => x.id === c.id ? { ...x, issuer: e.target.value } : x) })} /></div>
                  <div><FieldLabel>Date</FieldLabel><TextInput value={c.date} onChange={e => update({ certifications: cv.certifications.map(x => x.id === c.id ? { ...x, date: e.target.value } : x) })} placeholder="Jun 2025" /></div>
                  <div><FieldLabel>Expiry (optional)</FieldLabel><TextInput value={c.expiryDate} onChange={e => update({ certifications: cv.certifications.map(x => x.id === c.id ? { ...x, expiryDate: e.target.value } : x) })} placeholder="Jun 2027" /></div>
                </div>
              </RemovableRow>
            ))}
            <button onClick={addCert} className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"><Plus className="w-3.5 h-3.5" /> Add certificate</button>
          </SectionCard>

          <SectionCard icon={FileText} title="Additional Information">
            <TextArea value={cv.additionalInfo} onChange={e => update({ additionalInfo: e.target.value })} rows={3} placeholder="Languages, IT skills, driving licence, relevant hobbies/interests" />
          </SectionCard>

          <SectionCard icon={Users} title="References">
            {cv.references.map(r => (
              <RemovableRow key={r.id} onRemove={() => update({ references: cv.references.filter(x => x.id !== r.id) })}>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div><FieldLabel>Name</FieldLabel><TextInput value={r.name} onChange={e => update({ references: cv.references.map(x => x.id === r.id ? { ...x, name: e.target.value } : x) })} /></div>
                  <div><FieldLabel>Role</FieldLabel><TextInput value={r.role} onChange={e => update({ references: cv.references.map(x => x.id === r.id ? { ...x, role: e.target.value } : x) })} /></div>
                  <div><FieldLabel>Organisation</FieldLabel><TextInput value={r.organisation} onChange={e => update({ references: cv.references.map(x => x.id === r.id ? { ...x, organisation: e.target.value } : x) })} /></div>
                  <div><FieldLabel>Relationship</FieldLabel><TextInput value={r.relationship} onChange={e => update({ references: cv.references.map(x => x.id === r.id ? { ...x, relationship: e.target.value } : x) })} placeholder="Line manager" /></div>
                  <div><FieldLabel>Email</FieldLabel><TextInput value={r.email} onChange={e => update({ references: cv.references.map(x => x.id === r.id ? { ...x, email: e.target.value } : x) })} /></div>
                  <div><FieldLabel>Phone</FieldLabel><TextInput value={r.phone} onChange={e => update({ references: cv.references.map(x => x.id === r.id ? { ...x, phone: e.target.value } : x) })} /></div>
                </div>
              </RemovableRow>
            ))}
            <button onClick={addReference} className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"><Plus className="w-3.5 h-3.5" /> Add reference</button>
            <p className="text-[11px] text-muted-foreground">Leave blank to show "Available on request" instead.</p>
          </SectionCard>

        </div>

        {/* ── Live preview ── */}
        <div className="order-1 lg:order-2">
          <div className="sticky top-6">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Live preview</p>
            <div className="max-h-[calc(100vh-140px)] overflow-y-auto rounded-xl">
              <CvPreview cv={cv} />
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}