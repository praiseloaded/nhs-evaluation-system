// app/dashboard/application/page.tsx
// Statement Builder — 7-step wizard
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, ArrowRight, CheckCircle2, Circle, Loader2,
  FileText, Upload, File, X, Heart, User, Globe,
  Sparkles, AlertCircle, ChevronRight, Clock,
} from 'lucide-react'

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
type FileSlot = { file: File | null; text: string; wordCount: number; extracting: boolean; extracted: boolean; error: string | null }
type Criterion = { id: string; text: string; type: 'essential' | 'desirable'; category: string | null }
type PastApp = { id: string; jobTitle: string; band: string | null; completeness: number; status: string; wordCount: number | null }

const STEPS = [
  { n: 1, label: 'Upload'     },
  { n: 2, label: 'Criteria'   },
  { n: 3, label: 'Context'    },
  { n: 4, label: 'Evidence'   },
  { n: 5, label: 'Suitability'},
  { n: 6, label: 'Values & Other'},
  { n: 7, label: 'Statement'  },
]

function createSlot(): FileSlot { return { file: null, text: '', wordCount: 0, extracting: false, extracted: false, error: null } }

// ─── Step indicator ───────────────────────────────────────────────────────────
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
            {s.n < current
              ? <CheckCircle2 className="w-3 h-3" />
              : <span className="w-3 h-3 flex items-center justify-center text-[10px] font-bold">{s.n}</span>}
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
            <input ref={ref} type="file" accept=".pdf,.docx,.doc,.txt" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f) }} />
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
            {!slot.extracting && <button onClick={onRemove} className="p-1 hover:bg-accent rounded text-muted-foreground"><X className="w-3 h-3" /></button>}
          </div>
        )}
        {slot.error && <p className="text-[10px] text-red-500 mt-1">{slot.error}</p>}
      </div>
    </div>
  )
}

// ─── Evidence card (minimal STAR) ─────────────────────────────────────────────
function EvidenceCard({ criterion, index, total, value, noExp, onChange, onNoExp, generating, generated }: {
  criterion: Criterion; index: number; total: number
  value: string; noExp: boolean; onChange: (v: string) => void; onNoExp: (v: boolean) => void
  generating: boolean; generated: boolean
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground font-medium">{index + 1} of {total}</span>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${criterion.type === 'essential' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300' : 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'}`}>
          {criterion.type}
        </span>
      </div>

      <div className="rounded-xl border border-border bg-muted/30 p-4">
        <p className="text-sm font-semibold text-foreground leading-relaxed">{criterion.text}</p>
      </div>

      {!noExp ? (
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Tell us about a time you demonstrated this
          </label>
          <p className="text-xs text-muted-foreground">Just write naturally — what happened, what you did, what the outcome was. The AI will structure it.</p>
          <textarea value={value} onChange={e => onChange(e.target.value)} rows={5}
            placeholder={`e.g. "When I was working at [place], a patient needed... I decided to... As a result..."`}
            className="w-full bg-muted border border-border rounded-xl p-3 text-sm text-foreground placeholder-muted-foreground/40 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30" />
          {value.trim() && <p className="text-[10px] text-muted-foreground text-right">{value.trim().split(/\s+/).length} words</p>}
        </div>
      ) : (
        <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/30 p-4">
          <p className="text-xs text-amber-700 dark:text-amber-300 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            The AI will write a forward-looking development statement for this criterion — showing commitment to building this skill.
          </p>
        </div>
      )}

      <label className="flex items-center gap-2.5 cursor-pointer select-none">
        <input type="checkbox" checked={noExp} onChange={e => onNoExp(e.target.checked)} className="w-4 h-4 rounded accent-primary" />
        <span className="text-sm text-muted-foreground">I don't have experience in this yet</span>
      </label>

      {generated && (
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-950/20 p-3">
          <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Evidence saved — AI will use this in your statement
          </p>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN WIZARD
// ═══════════════════════════════════════════════════════════════════════════════
export default function StatementBuilderWizard() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

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

  // ── Step 2: Criteria ────────────────────────────────────────────────────────
  const [applicationId, setApplicationId]   = useState<string | null>(null)
  const [criteria, setCriteria]             = useState<Criterion[]>([])
  const [parsedSpec, setParsedSpec]         = useState<any>(null)
  const [parsing, setParsing]               = useState(false)

  // ── Step 3: Context ─────────────────────────────────────────────────────────
  const [currentRole, setCurrentRole]           = useState('')
  const [yearsExp, setYearsExp]                 = useState('')
  const [whyRole, setWhyRole]                   = useState('')
  const [whyOrg, setWhyOrg]                     = useState('')
  const [careerGoals, setCareerGoals]           = useState('')

  // ── Step 4: Evidence ────────────────────────────────────────────────────────
  const [evidenceIndex, setEvidenceIndex]       = useState(0)
  const [evidenceValues, setEvidenceValues]     = useState<Record<string, string>>({})
  const [noExpFlags, setNoExpFlags]             = useState<Record<string, boolean>>({})
  const [savedEvidence, setSavedEvidence]       = useState<Record<string, boolean>>({})
  const [savingEvidence, setSavingEvidence]     = useState(false)

  // ── Step 5–7: Statements ────────────────────────────────────────────────────
  const [statementQ1, setStatementQ1] = useState('')
  const [statementQ2, setStatementQ2] = useState('')
  const [statementQ3, setStatementQ3] = useState('')
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

  // Past applications
  const [pastApps, setPastApps] = useState<PastApp[]>([])
  const [loadingPast, setLoadingPast] = useState(true)

  useEffect(() => {
    fetch('/api/application/list').then(r=>r.json()).then(d=>setPastApps(d.applications??[])).catch(()=>{}).finally(()=>setLoadingPast(false))
  }, [])

  useEffect(() => {
    const n = detectNation(employer)
    setDetectedNation(n)
    if (n !== 'unknown' && n !== 'scotland') setWordLimit(NATION_META[n].defaultLimit)
  }, [employer])

  // ── Extract file ─────────────────────────────────────────────────────────────
  const extractFile = useCallback(async (file: File, setSlot: (fn: (s: FileSlot) => FileSlot) => void, autoFill?: boolean) => {
    const name = file.name.toLowerCase()
    if (!['.pdf','.docx','.doc','.txt'].some(t => name.endsWith(t))) {
      setSlot(s => ({ ...s, error: 'PDF, DOCX, DOC or TXT only', file: null })); return
    }
    if (file.size > 10*1024*1024) { setSlot(s => ({ ...s, error: 'Max 10MB', file: null })); return }
    setSlot(s => ({ ...s, file, extracting: true, extracted: false, error: null }))
    try {
      const fd = new FormData(); fd.append('file', file)
      const res = await fetch('/api/application/extract-document', { method: 'POST', body: fd })
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

  // ── Step 1 → 2: Parse ────────────────────────────────────────────────────────
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
          personSpec: psPaste ? psText : psSlot.text || undefined,
          cvText: cvPaste ? cvText : cvSlot.text || undefined,
          nhsValuesText: nhsPaste ? nhsText : nhsSlot.text || undefined,
          employer, band, detectedNation,
          statementWordLimit: detectedNation !== 'scotland' ? wordLimit : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Parse failed')
      setApplicationId(data.applicationId)
      setParsedSpec(data.parsed)
      // Build flat criteria list
      const list: Criterion[] = [
        ...(data.parsed.essentialCriteria ?? []).map((c: any) => ({ id: c.id ?? c.text.slice(0,20), text: c.text, type: 'essential' as const, category: c.category ?? null })),
        ...(data.parsed.desirableCriteria ?? []).map((c: any) => ({ id: c.id ?? c.text.slice(0,20), text: c.text, type: 'desirable' as const, category: c.category ?? null })),
      ]
      setCriteria(list)
      setStep(2)
    } catch (e: any) { setError(e.message) }
    finally { setParsing(false) }
  }

  // ── Step 3 → 4: Save context ──────────────────────────────────────────────
  const saveContextAndProceed = async () => {
    if (!whyRole.trim()) { setError('Please tell us why you want this role'); return }
    setError(null)
    // Save context to application
    try {
      await fetch(`/api/application/${applicationId}/context`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentRole, yearsExperience: yearsExp ? Number(yearsExp) : null }),
      })
    } catch {}
    setStep(4)
  }

  // ── Step 4: Save evidence for current criterion ───────────────────────────
  const saveCurrentEvidence = async () => {
    const c = criteria[evidenceIndex]
    if (!c) return
    const noExp = noExpFlags[c.id] ?? false
    const raw   = evidenceValues[c.id] ?? ''
    if (!noExp && !raw.trim()) { setError('Please describe your experience or tick "I don\'t have this yet"'); return }
    setError(null); setSavingEvidence(true)
    try {
      // Find the criterion DB id from applicationId
      await fetch('/api/application/save-evidence', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId, criterionText: c.text, type: c.type,
          rawEvidence: noExp ? null : raw,
          noExperience: noExp,
        }),
      })
      setSavedEvidence(p => ({ ...p, [c.id]: true }))
      if (evidenceIndex < criteria.length - 1) {
        setEvidenceIndex(i => i + 1)
      } else {
        setStep(5)
      }
    } catch (e: any) { setError(e.message) }
    finally { setSavingEvidence(false) }
  }

  // ── Step 5: Generate Q1 ────────────────────────────────────────────────────
  const generateQ1 = async () => {
    setGeneratingQ1(true); setError(null)
    try {
      const res = await fetch('/api/application/generate-statement', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId, nation: detectedNation, wordLimit,
          careerMotivation: whyRole,
        }),
      })
      const data = await res.json()
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
      const res = await fetch('/api/application/generate-q2', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId, nation: detectedNation, wordLimit,
          personalMotivation: whyOrg,
          careerGoals,
        }),
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
      const res = await fetch('/api/application/generate-q3', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId, nation: detectedNation, wordLimit, context: q3Context }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      setStatementQ3(data.statement ?? '')
    } catch (e: any) { setError(e.message) }
    finally { setGeneratingQ3(false) }
  }

  // ── Copy helpers ────────────────────────────────────────────────────────────
  const [copied, setCopied] = useState<string | null>(null)
  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(null), 2000)
  }

  const isScotland = detectedNation === 'scotland'
  const nationMeta = NATION_META[detectedNation]
  const hasJD = jdPaste ? !!jdText.trim() : jdSlot.extracted
  const currentCriterion = criteria[evidenceIndex]

  const wc = (t: string) => t.trim().split(/\s+/).filter(Boolean).length
  const q1Limit = isScotland ? 480 : Math.round(wordLimit * 0.50)
  const q2Limit = isScotland ? 450 : Math.round(wordLimit * 0.35)
  const q3Limit = isScotland ? 200 : Math.round(wordLimit * 0.15)

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-3">
          <ArrowLeft className="w-4 h-4" /> Dashboard
        </Link>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" /> NHS Statement Builder
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">Scotland · England · Wales · Northern Ireland</p>
      </div>

      <StepBar current={step} />

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 p-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
          STEP 1 — UPLOAD
      ════════════════════════════════════════════════════════════ */}
      {step === 1 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-bold text-foreground">Upload your documents</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Upload what you have — we extract the criteria and values automatically. Only the Job Description is required.
            </p>
          </div>

          {/* Job details */}
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

          {/* Nation format info */}
          {detectedNation !== 'unknown' && (
            <div className={`rounded-lg border p-3 text-xs ${nationMeta.color} border-current/20`}>
              <span className="font-semibold">{nationMeta.flag} {nationMeta.label} detected</span>
              {isScotland
                ? ' — 3 separate Jobtrain boxes (Q1 500w · Q2 500w · Q3 open)'
                : ` — Single supporting statement · `}
              {!isScotland && (
                <span className="inline-flex items-center gap-1">
                  word limit:
                  <input type="number" value={wordLimit} onChange={e => setWordLimit(Number(e.target.value))} min={300} max={5000} step={50}
                    className="w-16 bg-white/50 dark:bg-black/20 border border-current/30 rounded px-1.5 py-0.5 text-xs font-semibold focus:outline-none" />
                  words
                </span>
              )}
            </div>
          )}

          {/* Four file slots */}
          <div className="grid sm:grid-cols-2 gap-3">
            <FileSlotInput slot={jdSlot} label="Job Description" icon={FileText}
              hint="PDF, DOCX or TXT — auto-extracts criteria"
              onFile={f => extractFile(f, setJdSlot, true)} onRemove={() => clearSlot(setJdSlot)}
              pasteMode={jdPaste} onTogglePaste={() => setJdPaste(p => !p)} pasteValue={jdText} onPasteChange={setJdText} />

            <FileSlotInput slot={psSlot} label="Person Specification" icon={FileText} optional
              hint="If separate from the job description"
              onFile={f => extractFile(f, setPsSlot)} onRemove={() => clearSlot(setPsSlot)}
              pasteMode={psPaste} onTogglePaste={() => setPsPaste(p => !p)} pasteValue={psText} onPasteChange={setPsText} />

            <FileSlotInput slot={cvSlot} label="Your CV" icon={User} optional
              hint="Used to generate accurate STAR evidence"
              onFile={f => extractFile(f, setCvSlot)} onRemove={() => clearSlot(setCvSlot)}
              pasteMode={cvPaste} onTogglePaste={() => setCvPaste(p => !p)} pasteValue={cvText} onPasteChange={setCvText} />

            <FileSlotInput slot={nhsSlot} label="NHS Values Document" icon={Heart} optional
              hint="Trust/Board values doc — makes Q2 much stronger"
              onFile={f => extractFile(f, setNhsSlot)} onRemove={() => clearSlot(setNhsSlot)}
              pasteMode={nhsPaste} onTogglePaste={() => setNhsPaste(p => !p)} pasteValue={nhsText} onPasteChange={setNhsText} />
          </div>

          <button onClick={parseAndProceed} disabled={parsing || !hasJD || !jobTitle.trim()}
            className="w-full py-3.5 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground font-semibold flex items-center justify-center gap-2">
            {parsing ? <><Loader2 className="w-4 h-4 animate-spin" /> Extracting criteria...</> : <>Extract Criteria &amp; Continue <ArrowRight className="w-4 h-4" /></>}
          </button>

          {/* Past statements */}
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
          STEP 2 — CRITERIA REVIEW
      ════════════════════════════════════════════════════════════ */}
      {step === 2 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-bold text-foreground">Criteria extracted</h2>
            <p className="text-sm text-muted-foreground mt-1">
              We found {criteria.filter(c => c.type === 'essential').length} essential and {criteria.filter(c => c.type === 'desirable').length} desirable criteria. Review them below then continue.
            </p>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {['essential','desirable'].map(type => {
              const list = criteria.filter(c => c.type === type)
              if (!list.length) return null
              return (
                <div key={type}>
                  <p className={`text-[10px] font-bold uppercase tracking-wider mb-1.5 ${type === 'essential' ? 'text-blue-600 dark:text-blue-400' : 'text-purple-600 dark:text-purple-400'}`}>
                    {type} ({list.length})
                  </p>
                  <div className="space-y-1.5">
                    {list.map((c, i) => (
                      <div key={i} className="flex items-start gap-2 rounded-lg border border-border bg-card p-3">
                        <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${type === 'essential' ? 'bg-blue-500' : 'bg-purple-500'}`} />
                        <p className="text-xs text-foreground leading-relaxed">{c.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="flex-1 py-3 rounded-xl border border-border bg-muted text-foreground font-semibold flex items-center justify-center gap-2 hover:bg-accent">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <button onClick={() => setStep(3)} className="flex-2 flex-1 py-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold flex items-center justify-center gap-2">
              Looks good <ArrowRight className="w-4 h-4" />
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
            <p className="text-sm text-muted-foreground mt-1">Three quick questions — your answers shape the tone and focus of your statement.</p>
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
              <textarea value={whyRole} onChange={e => setWhyRole(e.target.value)} rows={3}
                placeholder="e.g. I want to develop my venepuncture skills in a hospital setting and take on more clinical responsibility at Band 3..."
                className="w-full bg-muted border border-border rounded-xl p-3 text-sm text-foreground placeholder-muted-foreground/40 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-foreground">Why do you want to work for {employer || 'this organisation'}?</label>
              <p className="text-xs text-muted-foreground">What draws you to this specific Trust, Board or service?</p>
              <textarea value={whyOrg} onChange={e => setWhyOrg(e.target.value)} rows={3}
                placeholder={`e.g. I have always admired ${employer || 'this organisation'}'s commitment to person-centred care and their reputation for staff development...`}
                className="w-full bg-muted border border-border rounded-xl p-3 text-sm text-foreground placeholder-muted-foreground/40 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-foreground">Where do you want to be in 3–5 years?</label>
              <textarea value={careerGoals} onChange={e => setCareerGoals(e.target.value)} rows={2}
                placeholder="e.g. I aim to progress to Band 4 and eventually specialise in..."
                className="w-full bg-muted border border-border rounded-xl p-3 text-sm text-foreground placeholder-muted-foreground/40 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>

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
          STEP 4 — EVIDENCE (one criterion at a time)
      ════════════════════════════════════════════════════════════ */}
      {step === 4 && currentCriterion && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-bold text-foreground">Your evidence</h2>
            <p className="text-sm text-muted-foreground mt-1">
              One criterion at a time. Write naturally — the AI structures it into a proper NHS paragraph.
            </p>
          </div>

          {/* Progress bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{evidenceIndex + 1} of {criteria.length} criteria</span>
              <span>{Math.round(((evidenceIndex) / criteria.length) * 100)}% done</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${(evidenceIndex / criteria.length) * 100}%` }} />
            </div>
            {/* Mini criterion chips */}
            <div className="flex gap-1 flex-wrap pt-1">
              {criteria.map((c, i) => (
                <div key={i} className={`w-2 h-2 rounded-full transition-colors ${i < evidenceIndex ? 'bg-emerald-500' : i === evidenceIndex ? 'bg-primary' : 'bg-muted'}`} title={c.text.slice(0,40)} />
              ))}
            </div>
          </div>

          <EvidenceCard
            criterion={currentCriterion}
            index={evidenceIndex}
            total={criteria.length}
            value={evidenceValues[currentCriterion.id] ?? ''}
            noExp={noExpFlags[currentCriterion.id] ?? false}
            onChange={v => setEvidenceValues(p => ({ ...p, [currentCriterion.id]: v }))}
            onNoExp={v => setNoExpFlags(p => ({ ...p, [currentCriterion.id]: v }))}
            generating={savingEvidence}
            generated={savedEvidence[currentCriterion.id] ?? false}
          />

          <div className="flex gap-3">
            <button onClick={() => { setError(null); if (evidenceIndex > 0) setEvidenceIndex(i => i - 1); else setStep(3) }}
              className="flex-1 py-3 rounded-xl border border-border bg-muted text-foreground font-semibold flex items-center justify-center gap-2 hover:bg-accent">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <button onClick={saveCurrentEvidence} disabled={savingEvidence}
              className="flex-1 py-3 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground font-semibold flex items-center justify-center gap-2">
              {savingEvidence ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> :
               evidenceIndex < criteria.length - 1 ? <>Save &amp; Next <ArrowRight className="w-4 h-4" /></> : <>Save &amp; Build Statement <Sparkles className="w-4 h-4" /></>}
            </button>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
          STEP 5 — Q1 SUITABILITY
      ════════════════════════════════════════════════════════════ */}
      {step === 5 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-bold text-foreground">Why are you suitable?</h2>
            <p className="text-sm text-muted-foreground mt-1">
              AI is assembling your STAR evidence into Q1 — tuned to the role, criteria and {employer || 'this organisation'}'s values.
            </p>
          </div>

          {!statementQ1 && !generatingQ1 && (
            <div className="rounded-xl border border-border bg-muted/30 p-6 text-center space-y-3">
              <Sparkles className="w-8 h-8 text-primary mx-auto" />
              <p className="text-sm text-muted-foreground">Ready to generate Q1 using your {criteria.length} criteria responses</p>
              <button onClick={generateQ1} className="px-6 py-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold flex items-center gap-2 mx-auto">
                <Sparkles className="w-4 h-4" /> Generate Q1 — Why You're Suitable
              </button>
            </div>
          )}

          {generatingQ1 && (
            <div className="rounded-xl border border-border bg-muted/30 p-8 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
              <p className="text-sm text-muted-foreground">Weaving your evidence into a tailored NHS statement...</p>
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
              <textarea value={statementQ1} onChange={e => setStatementQ1(e.target.value)} rows={12}
                className="w-full bg-muted border border-border rounded-xl p-4 text-sm text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 leading-relaxed" />
              <button onClick={generateQ1} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Regenerate
              </button>
            </div>
          )}

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

          {/* Q2 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">Q2 — Why {employer || 'this organisation'}?</span>
              {statementQ2 && <span className="text-xs text-muted-foreground">{wc(statementQ2)} / {q2Limit}w</span>}
            </div>
            {!statementQ2 ? (
              <button onClick={generateQ2} disabled={generatingQ2}
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold flex items-center justify-center gap-2">
                {generatingQ2 ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</> : <><Sparkles className="w-4 h-4" /> Generate Q2</>}
              </button>
            ) : (
              <div className="space-y-2">
                <textarea value={statementQ2} onChange={e => setStatementQ2(e.target.value)} rows={8}
                  className="w-full bg-muted border border-border rounded-xl p-4 text-sm text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 leading-relaxed" />
                <div className="flex gap-2">
                  <button onClick={generateQ2} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"><Sparkles className="w-3 h-3" /> Regenerate</button>
                  <button onClick={() => copyText(statementQ2, 'q2')} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 ml-auto">
                    {copied === 'q2' ? <><CheckCircle2 className="w-3 h-3 text-emerald-500" /> Copied</> : 'Copy'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Q3 toggles */}
          <div className="space-y-3">
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">Q3 — Any other information?</span>
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <p className="text-xs text-muted-foreground">Tick anything that applies. Leave all unticked for "None."</p>
              {[
                { key: 'hasCareerGap',             label: 'Career gap to explain',                         fKey: 'careerGapExplanation',         ph: 'e.g. 12-month caring break' },
                { key: 'applyingUnderGIS',         label: 'Applying under Guaranteed Interview Scheme',    fKey: 'gisDisabilityType',            ph: 'e.g. long-term health condition', gis: true },
                { key: 'preferPartTime',           label: 'Part-time / flexible working preference',       fKey: 'preferredHours',               ph: 'e.g. 0.8 WTE' },
                { key: 'isRelocating',             label: 'Relocating for this role',                      fKey: 'relocationDetails',            ph: 'e.g. relocating from London, August 2026' },
                { key: 'hasQualificationsPending', label: 'Qualifications / registration pending',         fKey: 'qualificationsPendingDetails', ph: 'e.g. HCPC registration, July 2026' },
                { key: 'hasLongNoticePeriod',      label: 'Notice period longer than 4 weeks',            fKey: 'noticePeriodDetails',          ph: 'e.g. 3 months, negotiable' },
              ].map(row => (
                <div key={row.key} className="space-y-1.5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={(q3Context as any)[row.key]} onChange={e => setQ3Context(c => ({ ...c, [row.key]: e.target.checked }))} className="w-4 h-4 rounded accent-primary" />
                    <span className="text-sm text-foreground">{row.label}</span>
                    {(row as any).gis && <span className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 px-1.5 py-0.5 rounded font-semibold">GIS</span>}
                  </label>
                  {(q3Context as any)[row.key] && (
                    <input value={(q3Context as any)[row.fKey]} onChange={e => setQ3Context(c => ({ ...c, [row.fKey]: e.target.value }))}
                      placeholder={row.ph}
                      className="w-full ml-6 bg-muted border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  )}
                </div>
              ))}
            </div>
            {!statementQ3 ? (
              <button onClick={generateQ3} disabled={generatingQ3}
                className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-semibold flex items-center justify-center gap-2">
                {generatingQ3 ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</> : <><Sparkles className="w-4 h-4" /> Generate Q3</>}
              </button>
            ) : (
              <div className="space-y-2">
                <textarea value={statementQ3} onChange={e => setStatementQ3(e.target.value)} rows={4}
                  className="w-full bg-muted border border-border rounded-xl p-4 text-sm text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/30" />
                <div className="flex gap-2">
                  <button onClick={generateQ3} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"><Sparkles className="w-3 h-3" /> Regenerate</button>
                  <button onClick={() => copyText(statementQ3, 'q3')} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 ml-auto">
                    {copied === 'q3' ? <><CheckCircle2 className="w-3 h-3 text-emerald-500" /> Copied</> : 'Copy'}
                  </button>
                </div>
              </div>
            )}
          </div>

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

      {/* ════════════════════════════════════════════════════════════
          STEP 7 — FINAL STATEMENT
      ════════════════════════════════════════════════════════════ */}
      {step === 7 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-bold text-foreground">Your statement is ready</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {isScotland
                ? 'Copy each question separately into the Jobtrain form on NHS Scotland Jobs.'
                : 'Copy the full statement and paste it into the supporting statement box.'}
            </p>
          </div>

          {/* Word count summary */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { q: 'Q1', t: statementQ1, lim: q1Limit, c: 'blue' },
              { q: 'Q2', t: statementQ2, lim: q2Limit, c: 'indigo' },
              { q: 'Q3', t: statementQ3, lim: q3Limit, c: 'amber' },
            ].map(({ q, t, lim, c }) => {
              const count = wc(t)
              const over  = count > lim
              return (
                <div key={q} className={`rounded-lg border p-2.5 text-center ${over ? 'border-red-200 dark:border-red-800' : 'border-border'}`}>
                  <p className="text-[10px] font-bold text-muted-foreground">{q}</p>
                  <p className={`text-sm font-bold ${over ? 'text-red-500' : 'text-foreground'}`}>{count}</p>
                  <p className="text-[10px] text-muted-foreground">/ {lim}w</p>
                </div>
              )
            })}
          </div>

          {/* Scotland: 3 separate copy buttons */}
          {isScotland ? (
            <div className="space-y-4">
              {[
                { q: 'Q1', label: 'Why are you suitable?', t: statementQ1, key: 'q1', badge: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300' },
                { q: 'Q2', label: `Why ${employer || 'this organisation'}?`, t: statementQ2, key: 'q2', badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300' },
                { q: 'Q3', label: 'Other information', t: statementQ3, key: 'q3', badge: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' },
              ].map(({ q, label, t, key, badge }) => (
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
                  <div className="p-4">
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{t}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* England/Wales/NI: one combined copy */
            <div className="space-y-3">
              <button onClick={() => copyText([statementQ1, statementQ2, statementQ3].join('\n\n'), 'all')}
                className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center justify-center gap-2 text-base">
                {copied === 'all' ? <><CheckCircle2 className="w-4 h-4" /> Copied!</> : 'Copy Full Statement'}
              </button>
              <div className="rounded-xl border border-border bg-card p-5">
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{[statementQ1, statementQ2, statementQ3].join('\n\n')}</p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[{ q:'Q1',t:statementQ1,k:'q1'},{q:'Q2',t:statementQ2,k:'q2'},{q:'Q3',t:statementQ3,k:'q3'}].map(({q,t,k}) => (
                  <button key={q} onClick={() => copyText(t, k)} className="py-1.5 rounded-lg border border-border bg-muted text-xs font-medium text-muted-foreground hover:text-foreground flex items-center justify-center gap-1">
                    {copied === k ? <><CheckCircle2 className="w-3 h-3 text-emerald-500" /> Copied</> : `Copy ${q}`}
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
  )
}