// app/dashboard/application/page.tsx
// Statement Builder — Layer 4 wizard
// Extract all essential criteria → cluster into competencies → evidence per competency
'use client'

import { useCallback, useEffect, useRef, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, ArrowRight, CheckCircle2, Loader2,
  FileText, Upload, File, X, Heart, User, Globe,
  Sparkles, AlertCircle, ChevronRight, Clock, Plus, FolderOpen,
} from 'lucide-react'
import { RoleTemplatePicker } from '@/components/role-template-picker'
import { CompetencyScorePanel } from '@/components/competency-score-panel'
import { getEvidencePrompt, type RoleTemplate } from '@/lib/nhs-role-templates'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

// ─── Nation detection ─────────────────────────────────────────────────────────
type NHSNation = 'scotland' | 'england' | 'wales' | 'northern_ireland' | 'unknown'

const SCOTLAND_SIGNALS = ['nhs scotland','nhs lothian','nhs ggc','nhs grampian','nhs tayside','nhs highland','nhs lanarkshire','nhs fife','nhs borders','nhs ayrshire','nhs forth valley','nhs dumfries','nhs western isles','nhs orkney','nhs shetland','nhs 24','scottish ambulance','public health scotland','nhs education for scotland']
const WALES_SIGNALS    = ['nhs wales','cardiff and vale','aneurin bevan','swansea bay','betsi cadwaladr','hywel dda','cwm taf','cymru','uhb']
const NI_SIGNALS       = ['hsc trust','health and social care trust','belfast trust','south eastern trust','northern trust','southern trust','western trust','northern ireland','hscni']

function detectNation(employer: string): NHSNation {
  if (!employer || employer.trim().length < 2) return 'unknown'
  const l = employer.toLowerCase()
  if (SCOTLAND_SIGNALS.some(s => l.includes(s))) return 'scotland'
  if (NI_SIGNALS.some(s => l.includes(s))) return 'northern_ireland'
  if (WALES_SIGNALS.some(s => l.includes(s))) return 'wales'
  if (l.includes('nhs') || l.includes('hospital') || l.includes('trust') || l.includes('icb')) return 'england'
  return 'unknown'
}

const NATION_META: Record<NHSNation, { label: string; flag: string; color: string; defaultLimit: number }> = {
  scotland:         { label: 'NHS Scotland',        flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', color: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',          defaultLimit: 500  },
  england:          { label: 'NHS England',          flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', color: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',              defaultLimit: 1500 },
  wales:            { label: 'NHS Wales',            flag: '🏴󠁧󠁢󠁷󠁬󠁳󠁿', color: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300',      defaultLimit: 1500 },
  northern_ireland: { label: 'HSC Northern Ireland', flag: '🇬🇧',        color: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300', defaultLimit: 1200 },
  unknown:          { label: 'NHS',                  flag: '🏥',         color: 'bg-muted text-muted-foreground',                                         defaultLimit: 1500 },
}

// ─── Types ────────────────────────────────────────────────────────────────────
type FileSlot  = { file: File | null; text: string; wordCount: number; extracting: boolean; extracted: boolean; error: string | null }
type Criterion = { id: string; text: string; type: 'essential' | 'desirable'; category: string | null }
type PastApp   = { id: string; jobTitle: string; band: string | null; employer: string | null; completeness: number; status: string; wordCount: number | null; statementQ1: string | null; statementQ2: string | null; createdAt: string }

// ─── Layer 4: Competency types ────────────────────────────────────────────────
type Competency = {
  id:          string
  label:       string
  description: string
  criteriaIds: string[]   // which extracted essential criteria map here
  evidence:    string
  noExp:       boolean
  saved:       boolean
}

// 12 NHS competency domains — criteria cluster into these automatically
const NHS_COMPETENCY_DOMAINS: Omit<Competency, 'criteriaIds' | 'evidence' | 'noExp' | 'saved'>[] = [
  { id: 'clinical_assessment',  label: 'Clinical Assessment & Decision Making',    description: 'Assessing patients, clinical decisions, interpreting findings, applying clinical knowledge' },
  { id: 'patient_safety',       label: 'Patient Safety & Risk Management',         description: 'Risk identification, escalation, infection control, safeguarding, governance, incident reporting' },
  { id: 'communication',        label: 'Communication & Interpersonal Skills',     description: 'Written and verbal communication, active listening, documentation, difficult conversations' },
  { id: 'person_centred',       label: 'Person-Centred Care & NHS Values',         description: 'Compassion, dignity, respect, patient involvement, holistic care, equality and inclusion' },
  { id: 'teamwork',             label: 'Teamwork & Collaboration',                 description: 'MDT working, supporting colleagues, handover, cross-departmental and interdisciplinary working' },
  { id: 'leadership',           label: 'Leadership & Service Improvement',         description: 'Leading others, delegating, supervising, audits, quality improvement, change management' },
  { id: 'clinical_skills',      label: 'Clinical & Technical Competencies',        description: 'Specific procedures, equipment, certifications, clinical systems, technical qualifications' },
  { id: 'evidence_based',       label: 'Evidence-Based Practice & Education',      description: 'Research, guidelines, NICE, CPD, teaching, training, clinical standards' },
  { id: 'organisation',         label: 'Organisation & Prioritisation',            description: 'Caseload management, time management, working under pressure, planning, coordination' },
  { id: 'digital',              label: 'Digital & Information Systems',            description: 'Electronic records, clinical systems (EMIS, TRAKCARE, SystmOne), data, information governance' },
  { id: 'professional',         label: 'Professional Standards & Accountability',  description: 'NMC/HCPC/GMC standards, confidentiality, ethics, professional boundaries, regulatory requirements' },
  { id: 'other',                label: 'Other Role-Specific Requirements',         description: 'Remaining criteria specific to this post' },
]

const DOMAIN_KEYWORDS: Record<string, string[]> = {
  clinical_assessment: ['assess','assessment','diagnos','clinical judgement','decision','triage','observation','examination','history','interpret','evaluate','differential','presentation'],
  patient_safety:      ['safety','risk','escalat','safeguard','infection','control','incident','report','governance','candour','hazard','fail safe','raise concern','alert','coshh'],
  communication:       ['communicat','interpersonal','listen','document','record','written','verbal','present','explain','inform','liaise','negotiate','language','barrier'],
  person_centred:      ['compassion','dignity','respect','person-centred','holistic','patient experience','values','diversity','inclusion','equality','empathy','consent','choice'],
  teamwork:            ['team','multidisciplin','mdt','colleague','handover','cooperat','collaborat','support','cross','interdisciplin','partner','joint working'],
  leadership:          ['lead','supervise','delegate','mentor','manage','quality improvement','audit','service improvement','change','innovation','develop service','implement','line manage'],
  clinical_skills:     ['venepuncture','cannulat','catheter','wound','medication','administer','drug','prescription','procedure','equipment','technique','certification','qualified','competenc'],
  evidence_based:      ['research','evidence','guideline','nice','protocol','standard','education','training','teach','cpd','study','literature','current practice','journal'],
  organisation:        ['prioritis','organis','caseload','workload','time management','pressure','deadline','efficient','plan','coordinate','schedule','manage competing'],
  digital:             ['electronic','record','system','it','computer','software','trakcare','emis','systmone','rio','digital','data','information governance','database'],
  professional:        ['nmc','hcpc','gmc','professional','registration','accountab','confidential','ethics','boundary','regulatory','code of conduct','standard of practice','revalidat'],
}

function clusterCriteria(criteria: Criterion[]): Competency[] {
  // Only cluster essential criteria — desirable are noted but don't drive evidence collection
  const essential = criteria.filter(c => c.type === 'essential')
  const domainMap: Record<string, string[]> = {}
  NHS_COMPETENCY_DOMAINS.forEach(d => { domainMap[d.id] = [] })

  for (const c of essential) {
    const text = c.text.toLowerCase()
    let bestDomain = 'other'
    let bestScore  = 0
    for (const [domainId, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
      const score = keywords.filter(kw => text.includes(kw)).length
      if (score > bestScore) { bestScore = score; bestDomain = domainId }
    }
    domainMap[bestDomain].push(c.id)
  }

  return NHS_COMPETENCY_DOMAINS
    .filter(d => domainMap[d.id].length > 0)
    .map(d => ({
      ...d,
      criteriaIds: domainMap[d.id],
      evidence:    '',
      noExp:       false,
      saved:       false,
    }))
}

const STEPS = [
  { n: 1, label: 'Upload'      },
  { n: 2, label: 'Competencies'},
  { n: 3, label: 'Context'     },
  { n: 4, label: 'Evidence'    },
  { n: 5, label: 'Suitability' },
  { n: 6, label: 'Values & Other'},
  { n: 7, label: 'Statement'   },
]

function createSlot(): FileSlot { return { file: null, text: '', wordCount: 0, extracting: false, extracted: false, error: null } }

// ─── Step bar ─────────────────────────────────────────────────────────────────
function StepBar({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-1 mb-8 overflow-x-auto pb-1">
      {STEPS.map((s, i) => (
        <div key={s.n} className="flex items-center gap-1 shrink-0">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
            s.n === current ? 'bg-primary text-primary-foreground' :
            s.n < current  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300' :
            'bg-muted text-muted-foreground'
          }`}>
            {s.n < current ? <CheckCircle2 className="w-3 h-3" /> : <span className="w-3 h-3 flex items-center justify-center text-[10px] font-bold">{s.n}</span>}
            <span className="hidden sm:inline">{s.label}</span>
          </div>
          {i < STEPS.length - 1 && <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />}
        </div>
      ))}
    </div>
  )
}

// ─── File slot ────────────────────────────────────────────────────────────────
function FileSlotInput({ slot, label, icon: Icon, optional, hint, onFile, onRemove, pasteMode, onTogglePaste, pasteValue, onPasteChange }: {
  slot: FileSlot; label: string; icon: any; optional?: boolean; hint: string
  onFile: (f: File) => void; onRemove: () => void
  pasteMode: boolean; onTogglePaste: () => void; pasteValue: string; onPasteChange: (v: string) => void
}) {
  const ref = useRef<HTMLInputElement>(null)
  const [drag, setDrag] = useState(false)
  const ready = pasteMode ? !!pasteValue.trim() : slot.extracted
  return (
    <div className={`rounded-xl border transition-colors ${ready ? 'border-emerald-200 dark:border-emerald-800' : 'border-border'} bg-card overflow-hidden`}>
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/20">
        <div className="flex items-center gap-2">
          <Icon className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold text-foreground">{label}</span>
          {optional && <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">Optional</span>}
          {ready && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
        </div>
        <div className="flex gap-1">
          {(['upload','paste'] as const).map(m => (
            <button key={m} onClick={() => { if ((m==='paste') !== pasteMode) onTogglePaste() }}
              className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${(m==='paste')===pasteMode ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
              {m === 'upload' ? <><Upload className="w-2.5 h-2.5 inline mr-0.5" />Upload</> : 'Paste'}
            </button>
          ))}
        </div>
      </div>
      <div className="p-3">
        {pasteMode ? (
          <textarea value={pasteValue} onChange={e => onPasteChange(e.target.value)} rows={4}
            placeholder={`Paste ${label.toLowerCase()} here...`}
            className="w-full bg-muted border border-border rounded-lg p-2.5 text-xs text-foreground placeholder-muted-foreground/50 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30" />
        ) : !slot.file ? (
          <div onDrop={e => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) onFile(f) }}
            onDragOver={e => { e.preventDefault(); setDrag(true) }} onDragLeave={() => setDrag(false)}
            onClick={() => ref.current?.click()}
            className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all ${drag ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40 hover:bg-accent/20'}`}>
            <Input ref={ref} type="file" accept=".pdf,.docx,.doc,.txt" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f) }} />
            <Upload className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">{hint}</p>
          </div>
        ) : (
          <div className={`rounded-lg border p-2.5 flex items-center gap-2 ${slot.extracted ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-950/20' : 'border-border'}`}>
            <div className={`w-7 h-7 rounded flex items-center justify-center shrink-0 ${slot.extracted ? 'bg-emerald-100 dark:bg-emerald-900' : 'bg-muted'}`}>
              {slot.extracting ? <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" /> : slot.extracted ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <File className="w-3.5 h-3.5 text-muted-foreground" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate">{slot.file.name}</p>
              <p className="text-[10px] text-muted-foreground">{slot.extracting ? 'Extracting...' : slot.extracted ? `${slot.wordCount} words` : `${(slot.file.size/1024).toFixed(0)} KB`}</p>
            </div>
            {!slot.extracting && <Button onClick={onRemove} className="p-1 hover:bg-accent rounded text-muted-foreground"><X className="w-3 h-3" /></Button>}
          </div>
        )}
        {slot.error && <p className="text-[10px] text-red-500 mt-1">{slot.error}</p>}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN WIZARD
// ═══════════════════════════════════════════════════════════════════════════════
function StatementBuilderWizardInner() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [mode, setMode] = useState<'list' | 'wizard'>('list')
  const [step, setStep] = useState(1)
  const [error, setError] = useState<string | null>(null)

  // ── Step 1: Upload ──────────────────────────────────────────────────────────
  const [jobTitle, setJobTitle]   = useState('')
  const [employer, setEmployer]   = useState('')
  const [band, setBand]           = useState('')
  const [wordLimit, setWordLimit] = useState(1500)
  const [detectedNation, setDetectedNation] = useState<NHSNation>('unknown')
  const [jdSlot,  setJdSlot]  = useState<FileSlot>(createSlot())
  const [psSlot,  setPsSlot]  = useState<FileSlot>(createSlot())
  const [cvSlot,  setCvSlot]  = useState<FileSlot>(createSlot())
  const [nhsSlot, setNhsSlot] = useState<FileSlot>(createSlot())
  const [jdPaste,  setJdPaste]  = useState(false)
  const [psPaste,  setPsPaste]  = useState(false)
  const [cvPaste,  setCvPaste]  = useState(false)
  const [nhsPaste, setNhsPaste] = useState(false)
  const [jdText,  setJdText]  = useState('')
  const [psText,  setPsText]  = useState('')
  const [cvText,  setCvText]  = useState('')
  const [nhsText, setNhsText] = useState('')

  // ── Step 2: Criteria + competency clusters ──────────────────────────────────
  const [applicationId, setApplicationId] = useState<string | null>(null)
  const [criteria, setCriteria]           = useState<Criterion[]>([])
  const [parsedSpec, setParsedSpec]       = useState<any>(null)
  const [parsing, setParsing]             = useState(false)
  const [competencies, setCompetencies]   = useState<Competency[]>([])

  // ── Step 3: Context ─────────────────────────────────────────────────────────
  const [currentRole, setCurrentRole] = useState('')
  const [yearsExp, setYearsExp]       = useState('')
  const [whyRole, setWhyRole]         = useState('')
  const [whyOrg, setWhyOrg]           = useState('')
  const [careerGoals, setCareerGoals] = useState('')

  // ── Step 4: Evidence per competency ────────────────────────────────────────
  const [competencyIndex, setCompetencyIndex] = useState(0)
  const [savingEvidence, setSavingEvidence]   = useState(false)

  // ── Step 5–7: Statements ────────────────────────────────────────────────────
  const [statementQ1, setStatementQ1]   = useState('')
  const [statementQ2, setStatementQ2]   = useState('')
  const [statementQ3, setStatementQ3]   = useState('')
  const [generatingQ1, setGeneratingQ1] = useState(false)
  const [generatingQ2, setGeneratingQ2] = useState(false)
  const [generatingQ3, setGeneratingQ3] = useState(false)
  const [q3Context, setQ3Context] = useState({
    hasCareerGap: false, careerGapExplanation: '',
    applyingUnderGIS: false, gisDisabilityType: '',
    preferPartTime: false, preferredHours: '',
    isRelocating: false, relocationDetails: '',
    hasQualificationsPending: false, qualificationsPendingDetails: '',
    hasLongNoticePeriod: false, noticePeriodDetails: '',
    additionalFreeText: '',
  })

  // Role template
  const [selectedRole, setSelectedRole] = useState<RoleTemplate | null>(null)

  // Past applications
  const [pastApps, setPastApps]     = useState<PastApp[]>([])
  const [loadingPast, setLoadingPast] = useState(true)

  useEffect(() => {
    fetch('/api/application/list').then(r=>r.json()).then(d=>setPastApps(d.applications??[])).catch(()=>{}).finally(()=>setLoadingPast(false))
  }, [])

  // ── Restore from URL ?id=xxx ─────────────────────────────────────────────────
  useEffect(() => {
    const urlId   = searchParams.get('id')
    const urlStep = searchParams.get('step')
    if (!urlId) return
    const load = async () => {
      try {
        const res  = await fetch(`/api/application/${urlId}`)
        const data = await res.json()
        if (!res.ok || !data.application) return
        const a      = data.application
        const parsed = a.parsedSpec as any
        setApplicationId(urlId)
        setJobTitle(a.jobTitle ?? '')
        setEmployer(a.employer ?? '')
        setBand(a.band ?? '')
        setDetectedNation(parsed?.detectedNation ?? detectNation(a.employer ?? ''))
        if (parsed?.statementWordLimit) setWordLimit(parsed.statementWordLimit)
        if (a.criteria?.length) {
          const list: Criterion[] = a.criteria.map((c: any) => ({ id: c.id, text: c.criterionText, type: c.type, category: c.category ?? null }))
          setCriteria(list)
          const clustered = clusterCriteria(list)
          // Restore saved evidence into clusters
          const savedComp = parsed?.competencyEvidence as Record<string, any> ?? {}
          setCompetencies(clustered.map(comp => ({
            ...comp,
            evidence: savedComp[comp.id]?.evidence ?? '',
            noExp:    savedComp[comp.id]?.noExperience ?? false,
            saved:    !!savedComp[comp.id],
          })))
        }
        if (a.currentRole) setCurrentRole(a.currentRole)
        setStep(urlStep ? Number(urlStep) : 4)
        setMode('wizard')
      } catch {}
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  useEffect(() => {
    const n = detectNation(employer)
    setDetectedNation(n)
    if (n !== 'unknown' && n !== 'scotland') setWordLimit(NATION_META[n].defaultLimit)
  }, [employer])

  // ── Extract file ─────────────────────────────────────────────────────────────
  const extractFile = useCallback(async (file: File, setSlot: (fn: (s: FileSlot) => FileSlot) => void, autoFill?: boolean) => {
    const name = file.name.toLowerCase()
    if (!['.pdf','.docx','.doc','.txt'].some(t => name.endsWith(t))) { setSlot(s => ({ ...s, error: 'PDF, DOCX, DOC or TXT only', file: null })); return }
    if (file.size > 10*1024*1024) { setSlot(s => ({ ...s, error: 'Max 10MB', file: null })); return }
    setSlot(s => ({ ...s, file, extracting: true, extracted: false, error: null }))
    try {
      const fd = new FormData(); fd.append('file', file)
      const res  = await fetch('/api/application/extract-document', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Extraction failed')
      setSlot(s => ({ ...s, text: data.text, wordCount: data.wordCount ?? 0, extracting: false, extracted: true }))
      if (autoFill && data.detected) {
        if (data.detected.jobTitle && !jobTitle) setJobTitle(data.detected.jobTitle)
        if (data.detected.band && !band) setBand(data.detected.band)
        if (data.detected.employer && !employer) setEmployer(data.detected.employer)
      }
    } catch (err: any) { setSlot(s => ({ ...s, extracting: false, file: null, error: err.message })) }
  }, [jobTitle, band, employer])

  const clearSlot = (setSlot: (fn: (s: FileSlot) => FileSlot) => void) => setSlot(() => createSlot())

  // ── Clear wizard ──────────────────────────────────────────────────────────────
  const clearWizard = () => {
    setApplicationId(null); setStep(1); setCriteria([]); setParsedSpec(null); setCompetencies([])
    setStatementQ1(''); setStatementQ2(''); setStatementQ3('')
    setCompetencyIndex(0); setJobTitle(''); setEmployer(''); setBand('')
    setWhyRole(''); setWhyOrg(''); setCareerGoals(''); setCurrentRole(''); setYearsExp('')
    setError(null); setMode('list')
  }

  // ── Step 1 → 2: Parse + cluster ───────────────────────────────────────────
  const parseAndProceed = async () => {
    const jd = jdPaste ? jdText : jdSlot.text
    if (!jobTitle.trim()) { setError('Job title is required'); return }
    if (!jd.trim()) { setError('Job description is required'); return }
    setParsing(true); setError(null)
    try {
      const res = await fetch('/api/application/parse-spec', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobTitle, jobDescription: jd,
          personSpec:    psPaste  ? psText  : psSlot.text  || undefined,
          cvText:        cvPaste  ? cvText  : cvSlot.text  || undefined,
          nhsValuesText: nhsPaste ? nhsText : nhsSlot.text || undefined,
          employer, band, detectedNation,
          statementWordLimit: detectedNation !== 'scotland' ? wordLimit : undefined,
          // No cap — extract all criteria from the person spec
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Parse failed')
      setApplicationId(data.applicationId)
      setParsedSpec(data.parsed)

      // Build full criteria list — essential + desirable, no slicing
      const list: Criterion[] = [
        ...(data.parsed.essentialCriteria ?? []).map((c: any) => ({ id: c.id ?? `e-${Math.random()}`, text: c.text, type: 'essential' as const, category: c.category ?? null })),
        ...(data.parsed.desirableCriteria ?? []).map((c: any) => ({ id: c.id ?? `d-${Math.random()}`, text: c.text, type: 'desirable' as const, category: c.category ?? null })),
      ]
      setCriteria(list)

      // Layer 4: cluster essential criteria into competencies immediately
      setCompetencies(clusterCriteria(list))
      setCompetencyIndex(0)
      setStep(2)
    } catch (e: any) { setError(e.message) }
    finally { setParsing(false) }
  }

  // ── Step 3 → 4: Save context ──────────────────────────────────────────────
  const saveContextAndProceed = async () => {
    if (!whyRole.trim()) { setError('Please tell us why you want this role'); return }
    setError(null)
    try {
      await fetch(`/api/application/${applicationId}/context`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentRole, yearsExperience: yearsExp ? Number(yearsExp) : null }),
      })
    } catch {}
    setStep(4)
  }

  // ── Step 5: Generate Q1 ────────────────────────────────────────────────────
  const generateQ1 = async () => {
    if (!applicationId) { setError('Session lost — please start fresh.'); return }
    setGeneratingQ1(true); setError(null)
    try {
      const res  = await fetch('/api/application/generate-statement', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId, nation: detectedNation, wordLimit, careerMotivation: whyRole }),
      })
      const data = await res.json()
      if (res.status === 422) {
        // Blocked by anti-hallucination guard — guide user back
        throw new Error(data.error ?? 'Please go back and provide more evidence before generating.')
      }
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      setStatementQ1(data.statement ?? '')
      setStep(6)
    } catch (e: any) { setError(e.message) }
    finally { setGeneratingQ1(false) }
  }

  // ── Step 6: Generate Q2 + Q3 ───────────────────────────────────────────────
  const generateQ2 = async () => {
    setGeneratingQ2(true); setError(null)
    try {
      const res  = await fetch('/api/application/generate-q2', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId, nation: detectedNation, wordLimit, personalMotivation: whyOrg, careerGoals }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      setStatementQ2(data.statement ?? '')
    } catch (e: any) { setError(e.message) }
    finally { setGeneratingQ2(false) }
  }

  const generateQ3 = async () => {
    setGeneratingQ3(true); setError(null)
    try {
      const res  = await fetch('/api/application/generate-q3', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId, nation: detectedNation, wordLimit, context: q3Context }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      setStatementQ3(data.statement ?? '')
    } catch (e: any) { setError(e.message) }
    finally { setGeneratingQ3(false) }
  }

  const [copied, setCopied] = useState<string | null>(null)
  const copyText = (text: string, key: string) => { navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(null), 2000) }

  const isScotland = detectedNation === 'scotland'
  const nationMeta = NATION_META[detectedNation]
  const hasJD      = jdPaste ? !!jdText.trim() : jdSlot.extracted
  const wc = (t: string) => t.trim().split(/\s+/).filter(Boolean).length
  const q1Limit = isScotland ? 480 : Math.round(wordLimit * 0.50)
  const q2Limit = isScotland ? 450 : Math.round(wordLimit * 0.35)
  const q3Limit = isScotland ? 200 : Math.round(wordLimit * 0.15)
  const totalApps      = pastApps.length
  const generatedCount = pastApps.filter(a => !!(a.statementQ1 || a.statementQ2)).length
  const inProgressCount = totalApps - generatedCount

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-10">

        {/* Header */}
        <div className="mb-8">
          <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-5 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
          </Link>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">Statement Builder</h1>
              <p className="text-sm text-muted-foreground mt-1 max-w-md">Evidence-based NHS supporting statements — Scotland, England, Wales and Northern Ireland.</p>
            </div>
            {mode === 'list' && (
              <button onClick={() => { setMode('wizard'); setStep(1) }}
                className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold transition-colors shadow-sm">
                <Plus className="w-4 h-4" /> New Statement
              </button>
            )}
            {mode === 'wizard' && step > 1 && (
              <button onClick={clearWizard} className="shrink-0 text-xs text-muted-foreground hover:text-foreground border border-border rounded-lg px-3 py-2 hover:bg-accent transition-colors">
                ← All Statements
              </button>
            )}
          </div>
          {mode === 'list' && !loadingPast && totalApps > 0 && (
            <div className="flex items-center gap-3 mt-5 flex-wrap">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card border border-border">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span className="text-xs font-medium text-foreground">{totalApps}</span>
                <span className="text-xs text-muted-foreground">total</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">{generatedCount}</span>
                <span className="text-xs text-emerald-600 dark:text-emerald-400">generated</span>
              </div>
              {inProgressCount > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">{inProgressCount}</span>
                  <span className="text-xs text-amber-600 dark:text-amber-400">in progress</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ════ LIST MODE ════ */}
        {mode === 'list' && (
          <div className="space-y-3">
            {loadingPast ? (
              <div className="flex items-center justify-center py-20"><Loader2 className="w-5 h-5 text-primary animate-spin" /></div>
            ) : pastApps.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center space-y-5">
                <div className="w-14 h-14 rounded-2xl bg-primary/8 border border-primary/20 flex items-center justify-center mx-auto">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
                <div className="space-y-1">
                  <p className="text-base font-semibold text-foreground">No statements yet</p>
                  <p className="text-sm text-muted-foreground max-w-xs mx-auto">Upload a job description to extract criteria and build your first NHS supporting statement.</p>
                </div>
                <button onClick={() => { setMode('wizard'); setStep(1) }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold transition-colors">
                  <Plus className="w-4 h-4" /> Start Your First Statement
                </button>
              </div>
            ) : pastApps.map((a, idx) => {
              const isGenerated = !!(a.statementQ1 || a.statementQ2)
              const appNation   = detectNation(a.employer ?? '')
              const nMeta       = NATION_META[appNation]
              const pct         = Math.max(a.completeness ?? 0, isGenerated ? 100 : 0)
              return (
                <Link key={a.id} href={`/dashboard/application/${a.id}`}
                  className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-5 hover:border-primary/40 hover:shadow-md transition-all duration-200">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold text-sm transition-colors ${isGenerated ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300' : 'bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'}`}>
                    {isGenerated ? <CheckCircle2 className="w-5 h-5" /> : <span>{idx + 1}</span>}
                  </div>
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-foreground leading-tight truncate">{a.jobTitle}</p>
                      {a.band && <span className="shrink-0 text-[10px] font-semibold bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{a.band}</span>}
                      {appNation !== 'unknown' && <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${nMeta.color}`}>{nMeta.flag} {nMeta.label}</span>}
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      {a.employer && <span className="text-xs text-muted-foreground flex items-center gap-1"><Globe className="w-3 h-3" /> {a.employer}</span>}
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${isGenerated ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300' : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'}`}>
                        {isGenerated ? <><CheckCircle2 className="w-2.5 h-2.5" /> Ready to submit</> : <><Clock className="w-2.5 h-2.5" /> In progress</>}
                      </span>
                    </div>
                    <div className="h-1 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-500 ${isGenerated ? 'bg-emerald-500' : 'bg-primary/60'}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                </Link>
              )
            })}
          </div>
        )}

        {/* ════ WIZARD MODE ════ */}
        {mode === 'wizard' && (
          <div>
            <StepBar current={step} />

{/* ════════════════════════════════════════════════════════════
    STEP 1 — UPLOAD
════════════════════════════════════════════════════════════ */}
{step === 1 && (
  <div className="space-y-6">
    <div>
      <h2 className="text-lg font-bold text-foreground">Upload your documents</h2>
      <p className="text-sm text-muted-foreground mt-1">Upload what you have — we extract all criteria automatically. Only the Job Description is required.</p>
    </div>
    <div className="grid grid-cols-3 gap-3">
      <div className="space-y-1">
        <label className="text-xs font-semibold text-muted-foreground">Job Title *</label>
        <input value={jobTitle} onChange={e => setJobTitle(e.target.value)} placeholder="e.g. Staff Nurse Band 5"
          className="w-full bg-muted border border-border rounded-lg p-2 text-sm text-foreground placeholder-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30" />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-semibold text-muted-foreground">Band</label>
        <input value={band} onChange={e => setBand(e.target.value)} placeholder="e.g. Band 5"
          className="w-full bg-muted border border-border rounded-lg p-2 text-sm text-foreground placeholder-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30" />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
          <Globe className="w-3 h-3" /> Employer
          {detectedNation !== 'unknown' && <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${nationMeta.color}`}>{nationMeta.flag}</span>}
        </label>
        <input value={employer} onChange={e => setEmployer(e.target.value)} placeholder="e.g. NHS Lothian"
          className="w-full bg-muted border border-border rounded-lg p-2 text-sm text-foreground placeholder-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30" />
      </div>
    </div>
    {detectedNation !== 'unknown' && (
      <div className={`rounded-lg border p-3 text-xs ${nationMeta.color} border-current/20`}>
        <span className="font-semibold">{nationMeta.flag} {nationMeta.label} detected</span>
        {isScotland ? ' — 3 separate Jobtrain boxes (Q1 500w · Q2 500w · Q3 open)' : ` — Single supporting statement · `}
        {!isScotland && (
          <span className="inline-flex items-center gap-1">word limit:
            <Input type="number" value={wordLimit} onChange={e => setWordLimit(Number(e.target.value))} min={300} max={5000} step={50}
              className="w-16 bg-white/50 dark:bg-black/20 border border-current/30 rounded px-1.5 py-0.5 text-xs font-semibold focus:outline-none" /> words
          </span>
        )}
      </div>
    )}
    <div className="grid sm:grid-cols-2 gap-3">
      <FileSlotInput slot={jdSlot} label="Job Description" icon={FileText} hint="PDF, DOCX or TXT — auto-extracts all criteria"
        onFile={f => extractFile(f, setJdSlot, true)} onRemove={() => clearSlot(setJdSlot)}
        pasteMode={jdPaste} onTogglePaste={() => setJdPaste(p => !p)} pasteValue={jdText} onPasteChange={setJdText} />
      <FileSlotInput slot={psSlot} label="Person Specification" icon={FileText} optional hint="If separate from the job description"
        onFile={f => extractFile(f, setPsSlot)} onRemove={() => clearSlot(setPsSlot)}
        pasteMode={psPaste} onTogglePaste={() => setPsPaste(p => !p)} pasteValue={psText} onPasteChange={setPsText} />
      <FileSlotInput slot={cvSlot} label="Your CV" icon={User} optional hint="Used to match evidence to criteria"
        onFile={f => extractFile(f, setCvSlot)} onRemove={() => clearSlot(setCvSlot)}
        pasteMode={cvPaste} onTogglePaste={() => setCvPaste(p => !p)} pasteValue={cvText} onPasteChange={setCvText} />
      <FileSlotInput slot={nhsSlot} label="NHS Values Document" icon={Heart} optional hint="Trust/Board values — makes Q2 much stronger"
        onFile={f => extractFile(f, setNhsSlot)} onRemove={() => clearSlot(setNhsSlot)}
        pasteMode={nhsPaste} onTogglePaste={() => setNhsPaste(p => !p)} pasteValue={nhsText} onPasteChange={setNhsText} />
    </div>
    {error && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{error}</p>}
    <RoleTemplatePicker selected={selectedRole} onSelect={setSelectedRole} />
    <button onClick={parseAndProceed} disabled={parsing || !hasJD || !jobTitle.trim()}
      className="w-full py-3.5 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground font-semibold flex items-center justify-center gap-2">
      {parsing ? <><Loader2 className="w-4 h-4 animate-spin" /> Extracting &amp; clustering criteria…</> : <>Extract Criteria &amp; Continue <ArrowRight className="w-4 h-4" /></>}
    </button>
    {!loadingPast && pastApps.length > 0 && (
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Previous Statements</p>
        <div className="space-y-1.5">
          {pastApps.slice(0,3).map(a => (
            <Link key={a.id} href={`/dashboard/application/${a.id}`}
              className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 hover:shadow-sm transition-shadow">
              <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{a.jobTitle}</p>
                <p className="text-[10px] text-muted-foreground">{a.band ?? ''} · {a.status} · {a.completeness}%</p>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
            </Link>
          ))}
        </div>
      </div>
    )}
  </div>
)}

{/* ════════════════════════════════════════════════════════════
    STEP 2 — COMPETENCY CLUSTERS (Layer 4)
════════════════════════════════════════════════════════════ */}
{step === 2 && (
  <div className="space-y-6">
    <div>
      <h2 className="text-lg font-bold text-foreground">Competency clusters</h2>
      <p className="text-sm text-muted-foreground mt-1">
        We extracted <strong>{criteria.filter(c => c.type === 'essential').length} essential</strong> and{' '}
        <strong>{criteria.filter(c => c.type === 'desirable').length} desirable</strong> criteria, clustered into{' '}
        <strong>{competencies.length} competency areas</strong>.
        You'll answer <strong>{competencies.length} questions</strong> — one per competency.
        The AI writes around competencies, not individual criteria, producing a natural statement.
      </p>
    </div>

    {/* Desirable note */}
    {criteria.filter(c => c.type === 'desirable').length > 0 && (
      <div className="rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/30 px-4 py-3 text-xs text-purple-700 dark:text-purple-300 flex items-start gap-2">
        <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        <span><strong>Desirable criteria</strong> are noted for reference but don't require separate evidence — the AI weaves them in where your competency evidence naturally covers them.</span>
      </div>
    )}

    {/* Competency cluster list */}
    <div className="space-y-2">
      {competencies.map((comp, i) => {
        const crits = criteria.filter(c => comp.criteriaIds.includes(c.id))
        return (
          <div key={comp.id} className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-xs font-bold text-primary">{i + 1}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{comp.label}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{comp.description}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {crits.map((c, ci) => (
                    <span key={ci} className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                      {c.text.length > 55 ? c.text.slice(0, 55) + '…' : c.text}
                    </span>
                  ))}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <span className="text-[10px] font-bold text-muted-foreground">{crits.length} {crits.length === 1 ? 'criterion' : 'criteria'}</span>
              </div>
              <button onClick={() => setCompetencies(prev => prev.filter(c => c.id !== comp.id))}
                className="p-1 rounded text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors ml-1 shrink-0"
                title="Remove this competency">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )
      })}
    </div>

    <p className="text-[11px] text-muted-foreground text-right">
      {criteria.filter(c => c.type === 'essential').length} essential criteria → {competencies.length} competency questions
    </p>

    <div className="flex gap-3">
      <button onClick={() => setStep(1)} className="flex-1 py-3 rounded-xl border border-border bg-muted text-foreground font-semibold flex items-center justify-center gap-2 hover:bg-accent">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>
      <button onClick={() => { setCompetencyIndex(0); setStep(3) }} disabled={competencies.length === 0}
        className="flex-1 py-3 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-40 text-primary-foreground font-semibold flex items-center justify-center gap-2">
        Continue — {competencies.length} questions <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  </div>
)}

{/* ════════════════════════════════════════════════════════════
    STEP 3 — CONTEXT
════════════════════════════════════════════════════════════ */}
{step === 3 && (
  <div className="space-y-6">
    <div>
      <h2 className="text-lg font-bold text-foreground">A bit about you</h2>
      <p className="text-sm text-muted-foreground mt-1">These answers shape the tone and focus of your statement.</p>
    </div>
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-foreground">Your current role</label>
          <input value={currentRole} onChange={e => setCurrentRole(e.target.value)} placeholder="e.g. Healthcare Assistant"
            className="w-full bg-muted border border-border rounded-xl p-3 text-sm text-foreground placeholder-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-foreground">Years of experience</label>
          <input type="number" value={yearsExp} onChange={e => setYearsExp(e.target.value)} placeholder="e.g. 3" min={0} max={50}
            className="w-full bg-muted border border-border rounded-xl p-3 text-sm text-foreground placeholder-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-foreground">Why do you want this role? <span className="text-red-500">*</span></label>
        <p className="text-xs text-muted-foreground">What attracts you to this specific post, band or department?</p>
        <textarea value={whyRole} onChange={e => setWhyRole(e.target.value)} rows={3} placeholder="e.g. I want to develop my clinical skills and take on more responsibility at Band 5..."
          className="w-full bg-muted border border-border rounded-xl p-3 text-sm text-foreground placeholder-muted-foreground/40 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30" />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-foreground">Why do you want to work for {employer || 'this organisation'}?</label>
        <textarea value={whyOrg} onChange={e => setWhyOrg(e.target.value)} rows={3} placeholder={`e.g. I admire ${employer || "this organisation"}'s commitment to person-centred care...`}
          className="w-full bg-muted border border-border rounded-xl p-3 text-sm text-foreground placeholder-muted-foreground/40 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30" />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-foreground">Where do you want to be in 3–5 years?</label>
        <textarea value={careerGoals} onChange={e => setCareerGoals(e.target.value)} rows={2} placeholder="e.g. I aim to progress to Band 6 and eventually specialise in..."
          className="w-full bg-muted border border-border rounded-xl p-3 text-sm text-foreground placeholder-muted-foreground/40 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30" />
      </div>
    </div>
    {error && <p className="text-xs text-red-500">{error}</p>}
    <div className="flex gap-3">
      <button onClick={() => setStep(2)} className="flex-1 py-3 rounded-xl border border-border bg-muted text-foreground font-semibold flex items-center justify-center gap-2 hover:bg-accent">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>
      <button onClick={saveContextAndProceed} className="flex-1 py-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold flex items-center justify-center gap-2">
        Continue to Evidence <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  </div>
)}

{/* ════════════════════════════════════════════════════════════
    STEP 4 — EVIDENCE PER COMPETENCY (Layer 4)
════════════════════════════════════════════════════════════ */}
{step === 4 && (() => {
  const comp = competencies[competencyIndex]
  if (!comp) return null
  const crits = criteria.filter(c => comp.criteriaIds.includes(c.id))
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-foreground">Your evidence</h2>
        <p className="text-sm text-muted-foreground mt-1">
          One competency at a time — {competencies.length} questions total.
          Describe your experience naturally. The AI structures it into STAR paragraphs covering all criteria in this area.
        </p>
      </div>

      {/* Progress */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{competencyIndex + 1} of {competencies.length} competencies</span>
          <span>{Math.round((competencyIndex / competencies.length) * 100)}% done</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${(competencyIndex / competencies.length) * 100}%` }} />
        </div>
        <div className="flex gap-1 flex-wrap pt-1">
          {competencies.map((c, i) => (
            <button
              key={i}
              onClick={() => { setError(null); setCompetencyIndex(i) }}
              title={`${c.label}${c.saved ? ' — click to edit' : ''}`}
              className={`w-3 h-3 rounded-full transition-all hover:scale-125 focus:outline-none ${
                c.saved ? 'bg-emerald-500 hover:bg-emerald-400' : i === competencyIndex ? 'bg-primary' : 'bg-muted hover:bg-muted-foreground/40'
              }`}
            />
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground">Click any dot to jump back and edit a saved answer</p>
      </div>

      {/* Competency card */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-primary/10 text-primary">
            Competency {competencyIndex + 1} of {competencies.length}
          </span>
          {comp.saved && <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Saved</span>}
        </div>

        <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
          <p className="text-sm font-bold text-foreground">{comp.label}</p>
          <p className="text-xs text-muted-foreground">{comp.description}</p>
          {/* Criteria this covers */}
          <div className="pt-1">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Covers {crits.length} essential {crits.length === 1 ? 'criterion' : 'criteria'}:</p>
            <div className="flex flex-wrap gap-1.5">
              {crits.map((c, i) => (
                <span key={i} className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                  {c.text.length > 60 ? c.text.slice(0, 60) + '…' : c.text}
                </span>
              ))}
            </div>
          </div>
        </div>

        {!comp.noExp ? (
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Describe your experience in this competency area</label>
            <p className="text-xs text-muted-foreground">
              One specific example — what the situation was, what you did, and what the result was.
              The AI will structure it into STAR format covering all {crits.length} {crits.length === 1 ? 'criterion' : 'criteria'} above.
            </p>
            <textarea
              value={comp.evidence}
              onChange={e => setCompetencies(prev => prev.map((c, i) => i === competencyIndex ? { ...c, evidence: e.target.value } : c))}
              rows={6}
              placeholder={getEvidencePrompt(selectedRole, comp.id, comp.description)}
              className="w-full bg-muted border border-border rounded-xl p-3 text-sm text-foreground placeholder-muted-foreground/40 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            {comp.evidence.trim() && <p className="text-[10px] text-muted-foreground text-right">{comp.evidence.trim().split(/\s+/).length} words</p>}
          </div>
        ) : (
          <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/30 p-4">
            <p className="text-xs text-amber-700 dark:text-amber-300 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              The AI will write a forward-looking development statement for this competency — showing commitment to building this skill.
            </p>
          </div>
        )}

        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <input type="checkbox" checked={comp.noExp}
            onChange={e => setCompetencies(prev => prev.map((c, i) => i === competencyIndex ? { ...c, noExp: e.target.checked } : c))}
            className="w-4 h-4 rounded accent-primary" />
          <span className="text-sm text-muted-foreground">I don't have experience in this area yet</span>
        </label>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex gap-3">
        <button onClick={() => { setError(null); if (competencyIndex > 0) setCompetencyIndex(i => i - 1); else setStep(3) }}
          className="flex-1 py-3 rounded-xl border border-border bg-muted text-foreground font-semibold flex items-center justify-center gap-2 hover:bg-accent">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <button
          disabled={savingEvidence}
          onClick={async () => {
            if (!comp.noExp && !comp.evidence.trim()) { setError('Please describe your experience or tick "I don\'t have experience yet"'); return }
            setError(null); setSavingEvidence(true)
            try {
              await fetch('/api/application/save-competency-evidence', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  applicationId,
                  competencyId:    comp.id,
                  competencyLabel: comp.label,
                  criteriaIds:     comp.criteriaIds,
                  // Pass criterion texts so MissingEvidenceReport can match
                  // against DB criteria (which have different IDs than wizard IDs)
                  criteriaTexts:   criteria
                    .filter(c => comp.criteriaIds.includes(c.id))
                    .map(c => c.text),
                  evidence:        comp.noExp ? null : comp.evidence,
                  noExperience:    comp.noExp,
                }),
              })
              setCompetencies(prev => prev.map((c, i) => i === competencyIndex ? { ...c, saved: true } : c))
              if (competencyIndex < competencies.length - 1) { setCompetencyIndex(i => i + 1) } else { setStep(5) }
            } catch (e: any) { setError(e.message) }
            finally { setSavingEvidence(false) }
          }}
          className="flex-1 py-3 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground font-semibold flex items-center justify-center gap-2">
          {savingEvidence ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
            : comp.saved ? <>Update &amp; Continue <ArrowRight className="w-4 h-4" /></>
            : competencyIndex < competencies.length - 1 ? <>Save &amp; Next Competency <ArrowRight className="w-4 h-4" /></>
            : <>Save &amp; Build Statement <Sparkles className="w-4 h-4" /></>}
        </button>
      </div>
    </div>
  )
})()}

{/* ════════════════════════════════════════════════════════════
    STEP 5 — Q1 SUITABILITY
════════════════════════════════════════════════════════════ */}
{step === 5 && (
  <div className="space-y-6">
    <div>
      <h2 className="text-lg font-bold text-foreground">Why are you suitable?</h2>
      <p className="text-sm text-muted-foreground mt-1">
        AI is weaving your competency evidence into Q1 — written around {competencies.length} competencies, not individual criteria.
      </p>
    </div>
    {/* Layer 3: per-competency score before generating */}
    {competencies.length > 0 && (() => {
      const evidenceMap = Object.fromEntries(
        competencies.map(c => [c.id, { label: c.label, description: c.description, criteriaIds: c.criteriaIds, evidence: c.evidence, noExperience: c.noExp }])
      )
      return (
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Evidence quality before generating</p>
          <CompetencyScorePanel applicationId={applicationId ?? ''} competencyEvidence={evidenceMap} totalEssential={criteria.filter(c => c.type === 'essential').length} />
        </div>
      )
    })()}

    {!statementQ1 && !generatingQ1 && (
      <div className="rounded-xl border border-border bg-muted/30 p-6 text-center space-y-3">
        <Sparkles className="w-8 h-8 text-primary mx-auto" />
        <p className="text-sm text-muted-foreground">Ready to generate Q1 from your {competencies.length} competency responses</p>
        <button onClick={generateQ1} className="px-6 py-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold flex items-center gap-2 mx-auto">
          <Sparkles className="w-4 h-4" /> Generate Q1 — Why You're Suitable
        </button>
      </div>
    )}
    {generatingQ1 && (
      <div className="rounded-xl border border-border bg-muted/30 p-8 text-center space-y-3">
        <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
        <p className="text-sm text-muted-foreground">Weaving competency evidence into a human NHS statement…</p>
      </div>
    )}
    {statementQ1 && (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">Q1</span>
            <span className="text-xs text-muted-foreground">{wc(statementQ1)} / {q1Limit} words</span>
            {wc(statementQ1) > q1Limit && <span className="text-[10px] text-red-500 font-medium">over limit</span>}
          </div>
          <button onClick={() => copyText(statementQ1, 'q1')} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
            {copied === 'q1' ? <><CheckCircle2 className="w-3 h-3 text-emerald-500" /> Copied</> : 'Copy'}
          </button>
        </div>
        <Textarea value={statementQ1} onChange={e => setStatementQ1(e.target.value)} rows={12}
          className="w-full bg-muted border border-border rounded-xl p-4 text-sm text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 leading-relaxed" />
        <button onClick={generateQ1} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
          <Sparkles className="w-3 h-3" /> Regenerate
        </button>
      </div>
    )}
    {error && <p className="text-xs text-red-500">{error}</p>}
    <div className="flex gap-3">
      <button onClick={() => setStep(4)} className="flex-1 py-3 rounded-xl border border-border bg-muted text-foreground font-semibold flex items-center justify-center gap-2 hover:bg-accent">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>
      <button onClick={() => setStep(6)} disabled={!statementQ1}
        className="flex-1 py-3 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-40 text-primary-foreground font-semibold flex items-center justify-center gap-2">
        Next: Values &amp; Other <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  </div>
)}

{/* ════════════════════════════════════════════════════════════
    STEP 6 — Q2 + Q3
════════════════════════════════════════════════════════════ */}
{step === 6 && (
  <div className="space-y-6">
    <div>
      <h2 className="text-lg font-bold text-foreground">Values &amp; other information</h2>
      <p className="text-sm text-muted-foreground mt-1">Generate Q2 (why this organisation) and Q3 (any other info).</p>
    </div>
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">Q2 — Why {employer || 'this organisation'}?</span>
        {statementQ2 && <span className="text-xs text-muted-foreground">{wc(statementQ2)} / {q2Limit}w</span>}
      </div>
      {!statementQ2 ? (
        <button onClick={generateQ2} disabled={generatingQ2}
          className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold flex items-center justify-center gap-2">
          {generatingQ2 ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</> : <><Sparkles className="w-4 h-4" /> Generate Q2</>}
        </button>
      ) : (
        <div className="space-y-2">
          <Textarea value={statementQ2} onChange={e => setStatementQ2(e.target.value)} rows={8}
            className="w-full bg-muted border border-border rounded-xl p-4 text-sm text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 leading-relaxed"></Textarea>
          <div className="flex gap-2">
            <button onClick={generateQ2} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"><Sparkles className="w-3 h-3" /> Regenerate</button>

            <button onClick={() => copyText(statementQ2, 'q2')} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 ml-auto">
              {copied === 'q2' ? <><CheckCircle2 className="w-3 h-3 text-emerald-500" /> Copied</> : 'Copy'}
            </button>
          </div>
        </div>
      )}
    </div>
    <div className="space-y-3">
      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">Q3 — Any other information?</span>
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <p className="text-xs text-muted-foreground">Tick anything that applies. Leave all unticked for "None."</p>
        {[
          { key: 'hasCareerGap',             label: 'Career gap to explain',                      fKey: 'careerGapExplanation',         ph: 'e.g. 12-month caring break' },
          { key: 'applyingUnderGIS',         label: 'Applying under Guaranteed Interview Scheme', fKey: 'gisDisabilityType',            ph: 'e.g. long-term health condition', gis: true },
          { key: 'preferPartTime',           label: 'Part-time / flexible working preference',    fKey: 'preferredHours',               ph: 'e.g. 0.8 WTE' },
          { key: 'isRelocating',             label: 'Relocating for this role',                   fKey: 'relocationDetails',            ph: 'e.g. relocating from London, August 2026' },
          { key: 'hasQualificationsPending', label: 'Qualifications / registration pending',      fKey: 'qualificationsPendingDetails', ph: 'e.g. HCPC registration, July 2026' },
          { key: 'hasLongNoticePeriod',      label: 'Notice period longer than 4 weeks',         fKey: 'noticePeriodDetails',          ph: 'e.g. 3 months, negotiable' },
        ].map(row => (
          <div key={row.key} className="space-y-1.5">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={(q3Context as any)[row.key]} onChange={e => setQ3Context(c => ({ ...c, [row.key]: e.target.checked }))} className="w-4 h-4 rounded accent-primary" />
              <span className="text-sm text-foreground">{row.label}</span>
              {(row as any).gis && <span className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 px-1.5 py-0.5 rounded font-semibold">GIS</span>}
            </label>
            {(q3Context as any)[row.key] && (
              <input value={(q3Context as any)[row.fKey]} onChange={e => setQ3Context(c => ({ ...c, [row.fKey]: e.target.value }))} placeholder={row.ph}
                className="w-full ml-6 bg-muted border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30" />
            )}
          </div>
        ))}
      </div>
      {!statementQ3 ? (
        <button onClick={generateQ3} disabled={generatingQ3}
          className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-semibold flex items-center justify-center gap-2">
          {generatingQ3 ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</> : <><Sparkles className="w-4 h-4" /> Generate Q3</>}
        </button>
      ) : (
        <div className="space-y-2">
          <Textarea value={statementQ3} onChange={e => setStatementQ3(e.target.value)} rows={4}
            className="w-full bg-muted border border-border rounded-xl p-4 text-sm text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"></Textarea>
          <div className="flex gap-2">
            <button onClick={generateQ3} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"><Sparkles className="w-3 h-3" /> Regenerate</button>
            <button onClick={() => copyText(statementQ3, 'q3')} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 ml-auto">
              {copied === 'q3' ? <><CheckCircle2 className="w-3 h-3 text-emerald-500" /> Copied</> : 'Copy'}
            </button>
          </div>
        </div>
      )}
    </div>
    {error && <p className="text-xs text-red-500">{error}</p>}
    <div className="flex gap-3">
      <button onClick={() => setStep(5)} className="flex-1 py-3 rounded-xl border border-border bg-muted text-foreground font-semibold flex items-center justify-center gap-2 hover:bg-accent">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>
      <button onClick={() => setStep(7)} disabled={!statementQ2 || !statementQ3}
        className="flex-1 py-3 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-40 text-primary-foreground font-semibold flex items-center justify-center gap-2">
        View Final Statement <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  </div>
)}

{/* STEP 7 */}
{step === 7 && (
  <div className="space-y-6">
    <div>
      <h2 className="text-lg font-bold text-foreground">Your statement is ready</h2>
      <p className="text-sm text-muted-foreground mt-1">
        {isScotland ? 'Copy each question separately into the Jobtrain form on NHS Scotland Jobs.' : 'Copy the full statement and paste it into the supporting statement box.'}
      </p>
    </div>
    <div className="grid grid-cols-3 gap-2">
      {[{ q:'Q1',t:statementQ1,lim:q1Limit},{q:'Q2',t:statementQ2,lim:q2Limit},{q:'Q3',t:statementQ3,lim:q3Limit}].map(({q,t,lim}) => {
        const count = wc(t); const over = count > lim
        return (
          <div key={q} className={`rounded-lg border p-2.5 text-center ${over ? 'border-red-200 dark:border-red-800' : 'border-border'}`}>
            <p className="text-[10px] font-bold text-muted-foreground">{q}</p>
            <p className={`text-sm font-bold ${over ? 'text-red-500' : 'text-foreground'}`}>{count}</p>
            <p className="text-[10px] text-muted-foreground">/ {lim}w</p>
          </div>
        )
      })}
    </div>
    {isScotland ? (
      <div className="space-y-4">
        {[{q:'Q1',label:'Why are you suitable?',t:statementQ1,key:'q1',badge:'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'},
          {q:'Q2',label:`Why ${employer||'this organisation'}?`,t:statementQ2,key:'q2',badge:'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'},
          {q:'Q3',label:'Other information',t:statementQ3,key:'q3',badge:'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'},
        ].map(({q,label,t,key,badge}) => (
          <div key={q} className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/20">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badge}`}>{q}</span>
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
              <button onClick={() => copyText(t, key)} className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80">
                {copied === key ? <><CheckCircle2 className="w-3 h-3" /> Copied!</> : 'Copy'}
              </button>
            </div>
            <div className="p-4"><p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{t}</p></div>
          </div>
        ))}
      </div>
    ) : (
      <div className="space-y-3">
        <button onClick={() => copyText([statementQ1,statementQ2,statementQ3].join('\n\n'),'all')}
          className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center justify-center gap-2 text-base">
          {copied === 'all' ? <><CheckCircle2 className="w-4 h-4" /> Copied!</> : 'Copy Full Statement'}
        </button>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{[statementQ1,statementQ2,statementQ3].join('\n\n')}</p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[{q:'Q1',t:statementQ1,k:'q1'},{q:'Q2',t:statementQ2,k:'q2'},{q:'Q3',t:statementQ3,k:'q3'}].map(({q,t,k}) => (
            <button key={q} onClick={() => copyText(t,k)} className="py-1.5 rounded-lg border border-border bg-muted text-xs font-medium text-muted-foreground hover:text-foreground flex items-center justify-center gap-1">
              {copied===k?<><CheckCircle2 className="w-3 h-3 text-emerald-500"/>Copied</>:`Copy ${q}`}
            </button>
          ))}
        </div>
      </div>
    )}
    <div className="flex gap-3">
      <button onClick={() => setStep(6)} className="flex-1 py-3 rounded-xl border border-border bg-muted text-foreground font-semibold flex items-center justify-center gap-2 hover:bg-accent">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>
      {applicationId && (
        <Link href={`/dashboard/application/${applicationId}`}
          className="flex-1 py-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold flex items-center justify-center gap-2">
          View Full Builder <ArrowRight className="w-4 h-4" />
        </Link>
      )}
    </div>
  </div>
)}

          </div>
        )}
      </div>
    </div>
  )
}

export default function StatementBuilderWizard() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>}>
      <StatementBuilderWizardInner />
    </Suspense>
  )
}