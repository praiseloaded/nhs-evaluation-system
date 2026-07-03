// app/dashboard/cv-builder/page.tsx
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { CvPreviewRouter, CV_TEMPLATES, TEMPLATE_CATEGORIES, type CvData as CvDataBase } from '@/components/cv-preview-templates'
import {
  ArrowLeft, Plus, Trash2, Download, Loader2, FileText,
  Briefcase, GraduationCap, Award, User, ListChecks, Users,
  ChevronDown, Check, Layout, Save, Sparkles, X, Upload, FileUp, AlertCircle,
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
  template: string
  fullName: string
  email: string
  phone: string
  location: string
  professionalRegistration: string
  personalStatement: string
  profilePhoto?: string
  workExperience: WorkExperienceItem[]
  education: EducationItem[]
  skills: SkillGroup[]
  certifications: CertificationItem[]
  additionalInfo: string
  references: ReferenceItem[]
}

// ── NHS Role Templates (from taxonomy) ────────────────────────────────────
const NHS_ROLE_TEMPLATES = [
  { id: 'healthcare-support-worker-b2', title: 'Healthcare Support Worker', band: 'Band 2', keywords: ['patient care', 'personal hygiene', 'moving and handling', 'vital signs', 'safeguarding', 'infection control'], statement: 'Dedicated healthcare support worker with experience delivering compassionate, person-centred care across [setting]. Proven ability to assist with personal care, record clinical observations accurately, and support patients with complex needs while upholding dignity and respect at all times. Committed to working collaboratively within multidisciplinary teams and maintaining high standards of infection prevention and control.', skills: [{ category: 'Clinical Skills', items: 'Vital signs monitoring, personal care, moving and handling, pressure area care' }, { category: 'Core Competencies', items: 'Patient safety, safeguarding, infection control, documentation, communication' }] },
  { id: 'healthcare-assistant-b2',      title: 'Healthcare Assistant',       band: 'Band 2', keywords: ['clinical observations', 'patient care', 'HCA', 'basic life support', 'catheter care', 'handover'], statement: 'Experienced healthcare assistant with a strong track record of delivering safe, compassionate care in [ward/department]. Skilled in performing clinical observations, supporting patient mobility, and contributing to effective team handovers. Committed to patient dignity, infection prevention, and escalating concerns promptly to registered practitioners.', skills: [{ category: 'Clinical Skills', items: 'Clinical observations, wound care support, catheter care, specimen collection, ECG support' }, { category: 'Core Competencies', items: 'Patient safety, MDT working, handover, documentation, basic life support' }] },
  { id: 'phlebotomist-b3',              title: 'Phlebotomist',               band: 'Band 3', keywords: ['venepuncture', 'cannulation', 'specimen integrity', 'TRAK', 'COSHH', 'sample handling', 'SOP'], statement: 'Competent and patient-focused phlebotomist with experience performing venepuncture across all patient groups including paediatric and elderly patients. Skilled in maintaining specimen integrity, TRAK data entry, and strict SOP compliance. Proven ability to manage a busy clinic calmly while prioritising patient dignity and safety.', skills: [{ category: 'Clinical Competencies', items: 'Venepuncture, cannulation, specimen handling, labelling, centrifugation' }, { category: 'Systems & Compliance', items: 'TRAK, COSHH, infection control, SOP compliance, sharps safety' }] },
  { id: 'medical-laboratory-assistant-b3', title: 'Medical Laboratory Assistant', band: 'Band 3', keywords: ['specimen reception', 'LIMS', 'COSHH', 'SOP', 'quality control', 'centrifuge'], statement: 'Methodical medical laboratory assistant with experience in specimen reception, processing, and quality control in [pathology/haematology/biochemistry]. Skilled in LIMS data entry, centrifugation, and maintaining strict COSHH compliance. Committed to turnaround time targets and zero-tolerance for sample errors.', skills: [{ category: 'Laboratory Skills', items: 'Specimen reception, centrifugation, aliquoting, LIMS entry, quality control checks' }, { category: 'Compliance', items: 'COSHH, SOP compliance, IPC, stock management, audit trails' }] },
  { id: 'clinical-support-worker-b3',   title: 'Clinical Support Worker',    band: 'Band 3', keywords: ['ECG', 'phlebotomy', 'clinical skills', 'mentoring', 'clinical governance', 'patient safety'], statement: 'Experienced clinical support worker with a broad range of competencies including phlebotomy, ECG recording, and wound care support. Track record of supervising junior staff and contributing to service improvement initiatives. Committed to clinical governance, patient safety, and continuing professional development.', skills: [{ category: 'Clinical Competencies', items: 'Venepuncture, ECG recording, wound care, catheter care, clinical observations' }, { category: 'Leadership & Quality', items: 'Junior staff supervision, SOP compliance, clinical audit, patient safety reporting' }] },
  { id: 'pathology-coordinator-b4',     title: 'Pathology Coordinator',      band: 'Band 4', keywords: ['LIMS', 'laboratory workflow', 'quality assurance', 'ISO 15189', 'turnaround time', 'staff coordination'], statement: 'Experienced pathology coordinator with a strong background in laboratory workflow management, quality assurance, and staff coordination. Proven ability to maintain turnaround time targets, lead audits, and liaise effectively with clinical teams. Skilled in LIMS management and ISO 15189 compliance documentation.', skills: [{ category: 'Operational Skills', items: 'Workflow management, LIMS, stock control, staff rostering, quality audits' }, { category: 'Quality & Governance', items: 'ISO 15189, UKAS compliance, SOP review, incident reporting, EQA' }] },
  { id: 'admin-officer-b4',             title: 'Administrative Officer',     band: 'Band 4', keywords: ['administration', 'EMIS', 'SystmOne', 'GDPR', 'minute taking', 'diary management', 'patient administration'], statement: 'Organised and detail-oriented administrative officer with extensive NHS experience providing senior administrative support across [department/directorate]. Skilled in diary management, minute-taking, patient administration systems, and GDPR-compliant record management. Proven ability to manage competing priorities and support governance processes effectively.', skills: [{ category: 'Administrative Skills', items: 'Diary management, minute taking, correspondence, patient administration, finance processing' }, { category: 'Systems & Compliance', items: 'EMIS, SystmOne, NHS PAS, GDPR, FOI, Microsoft Office' }] },
  { id: 'biomedical-scientist-b5',      title: 'Biomedical Scientist',       band: 'Band 5', keywords: ['HCPC', 'IBMS', 'analytical testing', 'quality control', 'ISO 15189', 'EQA', 'audit', 'clinical governance'], statement: 'HCPC-registered Biomedical Scientist with post-registration experience in [haematology/biochemistry/microbiology/blood transfusion]. Skilled in complex analytical testing, QC monitoring, EQA participation, and SOP development. Committed to delivering accurate, timely results that directly support patient diagnosis and treatment.', skills: [{ category: 'Scientific Competencies', items: 'Analytical testing, quality control, EQA participation, result authorisation, troubleshooting' }, { category: 'Governance & Quality', items: 'ISO 15189, UKAS, SOP writing, audit, incident reporting, IBMS CPD' }] },
  { id: 'clinical-research-assistant-b5', title: 'Clinical Research Assistant', band: 'Band 5', keywords: ['GCP', 'clinical trials', 'MHRA', 'informed consent', 'data collection', 'CTMS', 'adverse events', 'CTIMP'], statement: 'GCP-trained clinical research assistant with experience supporting Phase II–IV clinical trials in [therapeutic area]. Skilled in participant recruitment, informed consent, data collection, and adverse event reporting. Rigorous approach to regulatory compliance and protocol adherence, with experience using CTMS and working to MHRA standards.', skills: [{ category: 'Research Skills', items: 'Patient recruitment, informed consent, CRF completion, adverse event reporting, data quality checks' }, { category: 'Regulatory & Systems', items: 'GCP, MHRA compliance, CTMS, protocol adherence, regulatory documentation' }] },
  { id: 'research-coordinator-b5',      title: 'Research Coordinator',       band: 'Band 5', keywords: ['GCP', 'NIHR', 'HRA', 'IRAS', 'monitoring visits', 'CRF', 'trial management', 'regulatory submissions'], statement: 'Experienced research coordinator managing multiple portfolio studies across [specialty] in line with NIHR, HRA, and ICH GCP standards. Skilled in regulatory submissions, site initiation, monitoring visit preparation, and multi-disciplinary team coordination. Proven ability to maintain data integrity and study timelines across concurrent trials.', skills: [{ category: 'Research Coordination', items: 'Study management, regulatory submissions, site initiation, monitoring visit preparation, CRF oversight' }, { category: 'Regulatory & Governance', items: 'GCP, IRAS, HRA approval, R&D reporting, sponsor liaison, CDISC standards' }] },
]

const TEMPLATES = CV_TEMPLATES

const uid = () => Math.random().toString(36).slice(2, 10)

const emptyCv = (): CvData => ({
  id: '', title: 'My CV', template: 'classic',
  fullName: '', email: '', phone: '', location: '', professionalRegistration: '', profilePhoto: '',
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


// ── Main page ─────────────────────────────────────────────────────────────
export default function CvBuilderPage() {
  const [profiles, setProfiles] = useState<{ id: string; title: string; template: string }[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [cv, setCv] = useState<CvData>(emptyCv())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false)
  const [templatePanelOpen, setTemplatePanelOpen] = useState(false)
  const [templateCatFilter, setTemplateCatFilter] = useState('All')
  const [roleTemplateOpen, setRoleTemplateOpen] = useState(false)
  const [roleFilter, setRoleFilter]   = useState('')
  const [uploadOpen, setUploadOpen]     = useState(false)
  const [uploadFile, setUploadFile]     = useState<File|null>(null)
  const [uploading, setUploading]       = useState(false)
  const [uploadError, setUploadError]   = useState<string|null>(null)
  const [uploadDragging, setUploadDragging] = useState(false)
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
        profilePhoto: p.profilePhoto ?? '',
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

  const handleUpload = async () => {
    if (!uploadFile) return
    setUploading(true); setUploadError(null)
    try {
      const fd = new FormData()
      fd.append('file', uploadFile)
      if (cv.id) fd.append('saveId', cv.id)
      const res  = await fetch('/api/cv/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Upload failed')

      const e = data.extracted
      const uid2 = () => Math.random().toString(36).slice(2,8)
      // Populate the CV with extracted data
      const next: Partial<CvData> = {
        fullName:                e.fullName ?? '',
        email:                   e.email ?? '',
        phone:                   e.phone ?? '',
        location:                e.location ?? '',
        professionalRegistration: e.professionalRegistration ?? '',
        personalStatement:       e.personalStatement ?? '',
        workExperience: (e.workExperience ?? []).map((w: any) => ({ id: uid2(), ...w, bullets: w.bullets ?? [] })),
        education:      (e.education      ?? []).map((x: any) => ({ id: uid2(), ...x })),
        skills:         (e.skills         ?? []).map((s: any) => ({ id: uid2(), category: s.category ?? '', items: Array.isArray(s.items) ? s.items.join(', ') : (s.items ?? '') })),
        certifications: (e.certifications ?? []).map((c: any) => ({ id: uid2(), ...c })),
        additionalInfo: e.additionalInfo ?? '',
        references:     (e.references     ?? []).map((r: any) => ({ id: uid2(), ...r })),
      }
      // If a new profile was created, load it
      if (data.profileId && !cv.id) {
        await loadProfile(data.profileId)
      } else {
        update(next)
      }
      setUploadOpen(false)
      setUploadFile(null)
    } catch(e: any) { setUploadError(e.message) }
    finally { setUploading(false) }
  }

  const applyRoleTemplate = (t: typeof NHS_ROLE_TEMPLATES[0]) => {
    const newSkills = t.skills.map(s => ({ id: uid(), category: s.category, items: s.items }))
    update({ personalStatement: t.statement, skills: newSkills })
    setRoleTemplateOpen(false)
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
          profilePhoto: next.profilePhoto,
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
    // Flush save first so template is persisted
    if (saveTimer.current) {
      clearTimeout(saveTimer.current)
      await fetch(`/api/cv/${cv.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: cv.title, template: cv.template,
          fullName: cv.fullName, email: cv.email, phone: cv.phone,
          location: cv.location, professionalRegistration: cv.professionalRegistration,
          personalStatement: cv.personalStatement,
          profilePhoto: cv.profilePhoto,
          workExperience: cv.workExperience.map(({ id, ...w }) => w),
          education: cv.education.map(({ id, ...e }) => e),
          skills: cv.skills.map(s => ({ category: s.category, items: s.items.split(',').map(x => x.trim()).filter(Boolean) })),
          certifications: cv.certifications.map(({ id, ...c }) => c),
          additionalInfo: cv.additionalInfo,
          references: cv.references.map(({ id, ...r }) => r),
        }),
      }).catch(() => {})
    }
    try {
      const res = await fetch(`/api/cv/${cv.id}/export`)
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      const tLabel = cv.template.charAt(0).toUpperCase() + cv.template.slice(1)
      a.download = `${(cv.fullName||'CV').replace(/[^a-z0-9]/gi,'_')}_${tLabel}_CV.docx`
      a.click()
      URL.revokeObjectURL(url)
    } catch(e:any){ console.error('Export failed:', e) }
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
      <h1 className="text-xl font-bold text-foreground">Omni CV Builder</h1>
      <p className="text-sm text-muted-foreground">Build a CV in an  — reverse chronological, clear headings, no photo needed.</p>
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
            <FileText className="w-6 h-6 text-primary" /> Omni CV Builder
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Acceptable format — reverse chronological, no photo, clear headings.</p>
        </div>
        <div className="flex items-center gap-2">
          {profiles.length > 1 && (
            <select value={activeId ?? ''} onChange={e => loadProfile(e.target.value)} className="text-sm rounded-lg border border-border bg-card px-3 py-2">
              {profiles.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          )}
          <button onClick={() => setUploadOpen(true)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-accent transition-colors">
            <FileUp className="w-3.5 h-3.5" /> Upload CV
          </button>
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

      {/* Template picker bar */}
      <div className="flex gap-2 mb-6">
        <button onClick={() => setTemplatePanelOpen(true)}
          className="flex-1 flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 hover:border-primary/40 transition-colors group">
          {/* Mini thumbnail of current template */}
          <div style={{ width: 36, height: 51, overflow: 'hidden', borderRadius: 3, flexShrink: 0, border: '1px solid #e2e8f0', background: '#fff' }}>
            <div style={{ transform: 'scale(0.12)', transformOrigin: 'top left', width: '833%', height: '833%', pointerEvents: 'none' }}>
              <CvPreviewRouter cv={{ ...cv }} />
            </div>
          </div>
          <div className="flex-1 text-left min-w-0">
            <p className="text-xs text-muted-foreground">Active template</p>
            <p className="text-sm font-bold text-foreground truncate">{TEMPLATES.find(t => t.id === cv.template)?.label ?? 'NHS Classic'}</p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-primary font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
            <Layout className="w-3.5 h-3.5" /> Change
          </div>
        </button>
        <button onClick={() => setRoleTemplateOpen(true)}
          className="flex items-center gap-2 px-4 py-3 rounded-xl border border-primary/40 bg-primary/5 text-primary text-sm font-semibold hover:bg-primary/10 transition-colors whitespace-nowrap">
          <Sparkles className="w-4 h-4" /> NHS Role
        </button>
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
              <div className="sm:col-span-2">
                <FieldLabel>Profile photo (optional — only shows on photo-enabled templates)</FieldLabel>
                <div className="flex items-center gap-4">
                  {cv.profilePhoto && <img src={cv.profilePhoto} alt="Profile" className="w-16 h-16 rounded-full object-cover border-2 border-border shrink-0" />}
                  <div className="flex-1">
                    <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-muted text-sm font-medium text-foreground hover:bg-accent cursor-pointer transition-colors">
                      <Upload className="w-3.5 h-3.5" />
                      {cv.profilePhoto ? 'Change photo' : 'Upload photo'}
                      <input type="file" accept="image/*" className="hidden" onChange={e => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        const reader = new FileReader()
                        reader.onload = ev => update({ profilePhoto: ev.target?.result as string })
                        reader.readAsDataURL(file)
                      }} />
                    </label>
                    {cv.profilePhoto && (
                      <button onClick={() => update({ profilePhoto: '' })} className="ml-2 text-xs text-red-500 hover:text-red-700 transition-colors">Remove</button>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-1">JPG or PNG · Appears in: NHS Royal, NHS Emerald, Adobe Azure, International, Corporate, Magazine, Gradient, Canvas, Spectrum and more.</p>
                  </div>
                </div>
              </div>
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
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Live preview · A4</p>
              <span className="text-[10px] text-muted-foreground">210 × 297 mm</span>
            </div>
            {/* A4 = 210mm wide. Scroll vertically, fixed width */}
            <div className="overflow-y-auto rounded-xl shadow-lg border border-border" style={{ maxHeight: 'calc(100vh - 160px)' }}>
              <div style={{ width: '210mm', minHeight: '297mm', background: '#fff', margin: 0, padding: 0, overflow: 'hidden' }}>
                <div style={{ margin: 0, padding: 0 }}>
                  <CvPreviewRouter cv={cv} />
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>


      {/* ── Template Picker Panel (Adobe-style) ── */}
      {templatePanelOpen && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
              <div>
                <h2 className="text-base font-black text-foreground">Choose a template</h2>
                <p className="text-xs text-muted-foreground mt-0.5">{TEMPLATES.length} designs — click any to preview instantly</p>
              </div>
              <button onClick={() => setTemplatePanelOpen(false)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* Category filters */}
            <div className="flex items-center gap-2 px-6 py-3 border-b border-border overflow-x-auto shrink-0">
              {TEMPLATE_CATEGORIES.map(cat => (
                <button key={cat} onClick={() => setTemplateCatFilter(cat)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap transition-all ${templateCatFilter === cat ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'}`}>
                  {cat}
                </button>
              ))}
            </div>

            {/* Template grid */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {TEMPLATES.filter(t => templateCatFilter === 'All' || (t as any).category === templateCatFilter || (templateCatFilter === '📷 Photo' && (t as any).hasPhoto)).map(t => {
                  const isSelected = cv.template === t.id
                  return (
                    <button key={t.id} onClick={() => { update({ template: t.id }); setTemplatePanelOpen(false) }}
                      className="group text-left">
                      {/* Scaled preview */}
                      <div style={{
                        width: '100%',
                        aspectRatio: '210/297',
                        overflow: 'hidden',
                        borderRadius: 8,
                        position: 'relative',
                        border: isSelected ? '3px solid #3b82f6' : '2px solid #e2e8f0',
                        boxShadow: isSelected ? '0 0 0 3px rgba(59,130,246,0.25)' : '0 1px 4px rgba(0,0,0,0.06)',
                        transition: 'all 0.15s',
                        background: '#fff',
                        cursor: 'pointer',
                      }}
                      className="hover:border-blue-400 hover:shadow-md">
                        <div style={{ transform: 'scale(0.28)', transformOrigin: 'top left', width: '357%', height: '357%', pointerEvents: 'none' }}>
                          <CvPreviewRouter cv={{ ...cv, template: t.id }} />
                        </div>
                        {isSelected && (
                          <div className="absolute top-2 right-2 bg-blue-500 rounded-full w-5 h-5 flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}
                        {(t as any).hasPhoto && !isSelected && (
                          <div className="absolute top-2 left-2 bg-black/60 rounded-full px-1.5 py-0.5 text-[8px] text-white font-bold">📷</div>
                        )}
                        {/* Hover overlay */}
                        <div className="absolute inset-0 bg-blue-500/0 group-hover:bg-blue-500/5 transition-colors rounded-md" />
                      </div>
                      {/* Label */}
                      <div className="mt-2 px-0.5">
                        <div className="flex items-center gap-1.5">
                          <span style={{ background: (t as any).color ?? '#1B3A5C' }} className="w-2 h-2 rounded-full shrink-0 inline-block" />
                          <p className="text-[11px] font-bold text-foreground truncate">{t.label}</p>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{(t as any).best ?? ''}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-border bg-muted/30 shrink-0 flex items-center justify-between">
              <p className="text-[11px] text-muted-foreground">Changing template updates the live preview instantly. Download to get the Word document.</p>
              <button onClick={() => setTemplatePanelOpen(false)} className="text-xs font-semibold text-primary hover:underline">Done</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Upload CV Modal ── */}
      {uploadOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div>
                <h2 className="text-base font-black text-foreground flex items-center gap-2">
                  <Upload className="w-4 h-4 text-primary" /> Upload Existing CV
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">Upload a PDF or Word document — AI extracts and converts it to any template.</p>
              </div>
              <button onClick={() => { setUploadOpen(false); setUploadFile(null); setUploadError(null) }} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Drop zone */}
              <div
                onDragOver={e => { e.preventDefault(); setUploadDragging(true) }}
                onDragLeave={() => setUploadDragging(false)}
                onDrop={e => { e.preventDefault(); setUploadDragging(false); const f = e.dataTransfer.files[0]; if(f) setUploadFile(f) }}
                onClick={() => document.getElementById('cv-file-input')?.click()}
                className={`relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
                  uploadDragging ? 'border-primary bg-primary/5' : uploadFile ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20' : 'border-border hover:border-primary/50 hover:bg-muted/30'
                }`}>
                <input id="cv-file-input" type="file" accept=".pdf,.doc,.docx" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if(f) setUploadFile(f) }} />
                {uploadFile ? (
                  <div className="space-y-2">
                    <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center mx-auto">
                      <FileUp className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <p className="text-sm font-bold text-foreground">{uploadFile.name}</p>
                    <p className="text-xs text-muted-foreground">{(uploadFile.size / 1024).toFixed(0)} KB · Click to change</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mx-auto">
                      <Upload className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-bold text-foreground">Drop your CV here</p>
                    <p className="text-xs text-muted-foreground">PDF, DOC or DOCX · Max 10MB</p>
                  </div>
                )}
              </div>

              {/* What happens info */}
              <div className="rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 p-4 space-y-1.5">
                <p className="text-xs font-bold text-blue-700 dark:text-blue-300">What happens next</p>
                {['AI reads and extracts all your CV content', 'Populates name, contact, experience, education, skills', 'You choose any of the 12 NHS templates', 'Download as a polished Word document'].map((s, i) => (
                  <p key={i} className="text-xs text-blue-600 dark:text-blue-400 flex gap-2">
                    <span className="font-bold shrink-0">{i+1}.</span>{s}
                  </p>
                ))}
              </div>

              {cv.id && (
                <p className="text-[11px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
                  ⚠ This will replace your current CV content. Your template choice is kept.
                </p>
              )}

              {uploadError && (
                <div className="flex items-center gap-2 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                  <p className="text-sm text-red-600 dark:text-red-400">{uploadError}</p>
                </div>
              )}

              <button onClick={handleUpload} disabled={!uploadFile || uploading}
                className="w-full py-3.5 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground font-bold flex items-center justify-center gap-2 transition-colors">
                {uploading
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Extracting CV content…</>
                  : <><Sparkles className="w-4 h-4" /> Extract & Convert CV</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NHS Role Template Modal */}
      {roleTemplateOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div>
                <h2 className="text-base font-black text-foreground">NHS Role Templates</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Select a template to pre-fill your personal statement, skills, and keywords.</p>
              </div>
              <button onClick={() => setRoleTemplateOpen(false)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <div className="px-6 py-3 border-b border-border">
              <input value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
                placeholder="Search roles e.g. phlebotomist, biomedical..."
                className="w-full bg-muted border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div className="overflow-y-auto flex-1 p-4 space-y-2">
              {NHS_ROLE_TEMPLATES.filter(t => !roleFilter || t.title.toLowerCase().includes(roleFilter.toLowerCase()) || t.band.toLowerCase().includes(roleFilter.toLowerCase())).map(t => (
                <button key={t.id} onClick={() => applyRoleTemplate(t)}
                  className="w-full text-left rounded-xl border border-border bg-card hover:border-primary/50 hover:bg-primary/5 p-4 transition-all group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">{t.band}</span>
                      </div>
                      <p className="text-sm font-bold text-foreground">{t.title}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {t.keywords.slice(0, 5).map(kw => (
                          <span key={kw} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{kw}</span>
                        ))}
                      </div>
                    </div>
                    <span className="text-xs text-primary font-semibold opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1">Apply →</span>
                  </div>
                </button>
              ))}
            </div>
            <div className="px-6 py-3 border-t border-border bg-muted/30">
              <p className="text-[11px] text-muted-foreground">⚠ Applying a template replaces your current personal statement and skills. Your work experience and education are kept.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}