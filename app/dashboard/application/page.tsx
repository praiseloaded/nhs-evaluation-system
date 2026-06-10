// app/dashboard/application/page.tsx
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, FileText, Loader2, Clock, CheckCircle2,
  Sparkles, Upload, File, X, AlertCircle, User, Globe, Heart,
} from 'lucide-react'

// ─── Nation detection ─────────────────────────────────────────────────────────
type NHSNation = 'scotland' | 'england' | 'wales' | 'northern_ireland' | 'unknown'

const SCOTLAND_SIGNALS = ['nhs scotland','nhs lothian','nhs ggc','nhs grampian','nhs tayside','nhs highland','nhs lanarkshire','nhs fife','nhs borders','nhs ayrshire','nhs forth valley','nhs dumfries','nhs western isles','nhs orkney','nhs shetland','nhs 24','scottish ambulance','public health scotland','nhs education for scotland']
const WALES_SIGNALS    = ['nhs wales','cardiff and vale','aneurin bevan','swansea bay','betsi cadwaladr','hywel dda','cwm taf','powys teaching','velindre','cymru','uhb']
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

const NATION_META: Record<NHSNation, { label: string; flag: string; color: string; defaultLimit: number; hint: string }> = {
  scotland:         { label: 'NHS Scotland',        flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', color: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',          defaultLimit: 500,  hint: 'e.g. NHS Lothian, NHS Greater Glasgow and Clyde' },
  england:          { label: 'NHS England',          flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', color: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',              defaultLimit: 1500, hint: "e.g. Guy's and St Thomas' NHS FT, Leeds Teaching Hospitals" },
  wales:            { label: 'NHS Wales',            flag: '🏴󠁧󠁢󠁷󠁬󠁳󠁿', color: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300',      defaultLimit: 1500, hint: 'e.g. Cardiff and Vale University Health Board' },
  northern_ireland: { label: 'HSC Northern Ireland', flag: '🇬🇧',        color: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300', defaultLimit: 1200, hint: 'e.g. Belfast Health and Social Care Trust' },
  unknown:          { label: 'Detecting nation…',    flag: '🏥',         color: 'bg-muted text-muted-foreground',                                         defaultLimit: 1500, hint: 'Start typing your NHS employer name' },
}

type PastApp = { id: string; jobTitle: string; band: string | null; completeness: number; status: string; wordCount: number | null }

// ─── Single file slot ─────────────────────────────────────────────────────────
type FileSlot = { file: File | null; text: string; wordCount: number; extracting: boolean; extracted: boolean; error: string | null }

function createSlot(): FileSlot { return { file: null, text: '', wordCount: 0, extracting: false, extracted: false, error: null } }

function FileSlotUpload({ slot, label, icon: Icon, accept, hint, optional, onFile, onRemove, onPasteToggle, pasteMode, pasteValue, onPasteChange }: {
  slot: FileSlot; label: string; icon: any; accept: string; hint: string; optional?: boolean
  onFile: (f: File) => void; onRemove: () => void
  onPasteToggle: () => void; pasteMode: boolean; pasteValue: string; onPasteChange: (v: string) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [drag, setDrag] = useState(false)

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">{label}</span>
          {optional && <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded font-medium">Optional</span>}
          {slot.extracted && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
        </div>
        <div className="flex gap-1">
          <button onClick={() => { if (pasteMode) onPasteToggle() }}
            className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${!pasteMode ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
            <Upload className="w-3 h-3 inline mr-1" />Upload
          </button>
          <button onClick={() => { if (!pasteMode) onPasteToggle() }}
            className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${pasteMode ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
            Paste
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="p-4">
        {pasteMode ? (
          <div className="space-y-1.5">
            <p className="text-[11px] text-muted-foreground">{hint}</p>
            <textarea value={pasteValue} onChange={e => onPasteChange(e.target.value)} rows={5}
              placeholder={`Paste ${label.toLowerCase()} text here...`}
              className="w-full bg-muted border border-border rounded-lg p-3 text-sm text-foreground placeholder-muted-foreground/50 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30" />
            {pasteValue.trim() && <p className="text-[11px] text-muted-foreground text-right">{pasteValue.split(/\s+/).filter(Boolean).length} words</p>}
          </div>
        ) : !slot.file ? (
          <div
            onDrop={e => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) onFile(f) }}
            onDragOver={e => { e.preventDefault(); setDrag(true) }}
            onDragLeave={() => setDrag(false)}
            onClick={() => inputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${drag ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40 hover:bg-accent/30'}`}>
            <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f) }} />
            <Upload className={`w-7 h-7 mx-auto mb-1.5 ${drag ? 'text-primary' : 'text-muted-foreground'}`} />
            <p className="text-sm font-medium text-foreground">{drag ? 'Drop to upload' : `Upload ${label}`}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">PDF, DOCX, DOC, or TXT · max 10MB</p>
          </div>
        ) : (
          <div className={`rounded-lg border p-3 flex items-center gap-3 ${slot.extracted ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/30' : 'border-border'}`}>
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${slot.extracted ? 'bg-emerald-100 dark:bg-emerald-900' : 'bg-muted'}`}>
              {slot.extracting ? <Loader2 className="w-4 h-4 text-primary animate-spin" /> : slot.extracted ? <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> : <File className="w-4 h-4 text-muted-foreground" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{slot.file.name}</p>
              <p className="text-[11px] text-muted-foreground">{slot.extracting ? 'Extracting text...' : slot.extracted ? `${slot.wordCount} words extracted` : `${(slot.file.size / 1024).toFixed(0)} KB`}</p>
            </div>
            {!slot.extracting && <button onClick={onRemove} className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>}
          </div>
        )}
        {slot.error && <p className="text-xs text-red-500 mt-2">{slot.error}</p>}
        {!pasteMode && slot.extracted && slot.text && (
          <details className="mt-2">
            <summary className="text-[11px] text-muted-foreground cursor-pointer hover:text-foreground">Preview ({slot.wordCount} words)</summary>
            <div className="mt-1.5 rounded-lg bg-muted p-3 max-h-32 overflow-y-auto">
              <p className="text-[11px] text-foreground/70 whitespace-pre-wrap leading-relaxed">{slot.text.slice(0, 1500)}{slot.text.length > 1500 ? '...' : ''}</p>
            </div>
          </details>
        )}
      </div>
    </div>
  )
}

// ─── Nation Badge ─────────────────────────────────────────────────────────────
function NationBadge({ nation, wordLimit, onWordLimitChange }: { nation: NHSNation; wordLimit: number; onWordLimitChange: (v: number) => void }) {
  const meta = NATION_META[nation]
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-base">{meta.flag}</span>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${meta.color}`}>{meta.label}</span>
        {nation === 'unknown' && <span className="text-xs text-muted-foreground">Type your employer name above to detect the format</span>}
      </div>
      {nation === 'scotland' && (
        <div className="flex gap-2 flex-wrap">
          {[
            { q: 'Q1', l: 'Why suitable?', lim: '500 words', c: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300' },
            { q: 'Q2', l: 'Why this Board?', lim: '500 words', c: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300' },
            { q: 'Q3', l: 'Other info', lim: '100–200w', c: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' },
          ].map(item => (
            <span key={item.q} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${item.c}`}>
              <span className="font-bold">{item.q}</span> {item.l} · {item.lim}
            </span>
          ))}
          <p className="w-full text-[11px] text-muted-foreground">3 separate Jobtrain boxes — each question pasted separately into NHS Scotland Jobs.</p>
        </div>
      )}
      {(nation === 'england' || nation === 'wales' || nation === 'northern_ireland') && (
        <div className="space-y-2">
          <div className="flex gap-2 flex-wrap">
            {[
              { q: 'Q1', l: 'Suitability', c: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300' },
              { q: 'Q2', l: 'Why this Trust/Board', c: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300' },
              { q: 'Q3', l: 'Other info', c: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' },
            ].map(item => (
              <span key={item.q} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${item.c}`}>
                <span className="font-bold">{item.q}</span> {item.l}
              </span>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">Built in 3 panels — combined into one statement for pasting into {nation === 'england' ? 'NHS Jobs / Trac' : nation === 'wales' ? 'NHS Wales Jobs' : 'HSC Recruitment'}.</p>
          <div className="flex items-center gap-3">
            <label className="text-xs text-muted-foreground shrink-0">Total statement word limit:</label>
            <input type="number" value={wordLimit} onChange={e => onWordLimitChange(Number(e.target.value))} min={300} max={5000} step={50}
              className="w-24 bg-muted border border-border rounded-lg px-2.5 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
            <span className="text-xs text-muted-foreground">words {nation === 'england' ? '— check NHS Jobs / Trac advert' : ''}</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function StatementBuilderLauncher() {
  const router = useRouter()

  const [jobTitle, setJobTitle]             = useState('')
  const [employer, setEmployer]             = useState('')
  const [band, setBand]                     = useState('')
  const [wordLimit, setWordLimit]           = useState(1500)
  const [detectedNation, setDetectedNation] = useState<NHSNation>('unknown')

  // Four upload slots
  const [jdSlot,     setJdSlot]     = useState<FileSlot>(createSlot())
  const [psSlot,     setPsSlot]     = useState<FileSlot>(createSlot())
  const [cvSlot,     setCvSlot]     = useState<FileSlot>(createSlot())
  const [nhsValSlot, setNhsValSlot] = useState<FileSlot>(createSlot())

  // Paste mode toggles
  const [jdPaste,     setJdPaste]     = useState(false)
  const [psPaste,     setPsPaste]     = useState(false)
  const [cvPaste,     setCvPaste]     = useState(false)
  const [nhsValPaste, setNhsValPaste] = useState(false)

  // Paste text state
  const [jdText,     setJdText]     = useState('')
  const [psText,     setPsText]     = useState('')
  const [cvText,     setCvText]     = useState('')
  const [nhsValText, setNhsValText] = useState('')

  const [parsing,   setParsing]   = useState(false)
  const [pastApps,  setPastApps]  = useState<PastApp[]>([])
  const [loadingPast, setLoadingPast] = useState(true)
  const [error,     setError]     = useState<string | null>(null)

  useEffect(() => {
    const n = detectNation(employer)
    setDetectedNation(n)
    if (n !== 'unknown' && n !== 'scotland') setWordLimit(NATION_META[n].defaultLimit)
  }, [employer])

  useEffect(() => {
    fetch('/api/application/list').then(r => r.json()).then(d => setPastApps(d.applications ?? [])).catch(() => {}).finally(() => setLoadingPast(false))
  }, [])

  const extractFile = useCallback(async (
    file: File, setSlot: (fn: (s: FileSlot) => FileSlot) => void, autoFill?: boolean,
  ) => {
    const name = file.name.toLowerCase()
    if (!['.pdf','.docx','.doc','.txt'].some(t => name.endsWith(t))) {
      setSlot(s => ({ ...s, error: 'Upload PDF, DOCX, DOC, or TXT', file: null })); return
    }
    if (file.size > 10 * 1024 * 1024) {
      setSlot(s => ({ ...s, error: 'File too large (max 10MB)', file: null })); return
    }
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
    } catch (err: any) {
      setSlot(s => ({ ...s, extracting: false, file: null, error: err.message }))
    }
  }, [jobTitle, band, employer])

  const clearSlot = (setSlot: (fn: (s: FileSlot) => FileSlot) => void) =>
    setSlot(() => createSlot())

  const startBuilding = async () => {
    if (!jobTitle.trim()) { setError('Job title is required'); return }
    const jobDescText = jdPaste ? jdText : jdSlot.text
    if (!jobDescText.trim()) { setError('Job description is required — upload or paste it'); return }

    setParsing(true); setError(null)
    try {
      const res = await fetch('/api/application/parse-spec', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobTitle,
          jobDescription: jobDescText,
          personSpec: psPaste ? psText : psSlot.text || undefined,
          cvText:     cvPaste ? cvText : cvSlot.text || undefined,
          nhsValuesText: nhsValPaste ? nhsValText : nhsValSlot.text || undefined,
          employer, band,
          detectedNation,
          statementWordLimit: detectedNation !== 'scotland' ? wordLimit : undefined,
        }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? 'Parse failed') }
      const data = await res.json()
      router.push(`/dashboard/application/${data.applicationId}`)
    } catch (err: any) { setError(err.message); setParsing(false) }
  }

  const hasJD = jdPaste ? !!jdText.trim() : jdSlot.extracted
  const readyCount = [
    hasJD,
    psPaste ? !!psText.trim() : psSlot.extracted,
    cvPaste ? !!cvText.trim() : cvSlot.extracted,
    nhsValPaste ? !!nhsValText.trim() : nhsValSlot.extracted,
  ].filter(Boolean).length

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">
      {/* Header */}
      <div>
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-4 h-4" /> Dashboard
        </Link>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-primary" /> NHS Statement Builder
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Works for Scotland, England, Wales, and Northern Ireland. Upload up to four documents — we detect your nation, extract the criteria, and build all three statement sections.
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 p-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card p-6 space-y-6">
        <h2 className="font-semibold text-foreground text-sm">Start New Statement</h2>

        {/* Job details */}
        <div className="grid md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Job Title *</label>
            <input type="text" value={jobTitle} onChange={e => setJobTitle(e.target.value)} placeholder="e.g. Staff Nurse Band 5"
              className="w-full bg-muted border border-border rounded-lg p-2.5 text-sm text-foreground placeholder-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Band / Grade</label>
            <input type="text" value={band} onChange={e => setBand(e.target.value)} placeholder="e.g. Band 5"
              className="w-full bg-muted border border-border rounded-lg p-2.5 text-sm text-foreground placeholder-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <Globe className="w-3 h-3" /> NHS Employer *
              <span className="text-[10px] font-normal text-amber-600 dark:text-amber-400">auto-detects nation</span>
            </label>
            <input type="text" value={employer} onChange={e => setEmployer(e.target.value)}
              placeholder={NATION_META[detectedNation].hint}
              className="w-full bg-muted border border-border rounded-lg p-2.5 text-sm text-foreground placeholder-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
        </div>

        {/* Nation badge */}
        <NationBadge nation={detectedNation} wordLimit={wordLimit} onWordLimitChange={setWordLimit} />

        {/* Four upload slots */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">Documents</h3>
          <p className="text-xs text-muted-foreground">
            Upload what you have. The NHS Values document lets the AI reference your Trust or Board's exact values in Q2 — much stronger than generic NHS Constitution language.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <FileSlotUpload slot={jdSlot} label="Job Description" icon={FileText} accept=".pdf,.docx,.doc,.txt"
            hint="The full job advert — we extract the essential and desirable criteria from this"
            onFile={f => extractFile(f, setJdSlot, true)} onRemove={() => clearSlot(setJdSlot)}
            onPasteToggle={() => setJdPaste(p => !p)} pasteMode={jdPaste} pasteValue={jdText} onPasteChange={setJdText} />

          <FileSlotUpload slot={psSlot} label="Person Specification" icon={FileText} accept=".pdf,.docx,.doc,.txt"
            hint="The person spec if separate from the job description" optional
            onFile={f => extractFile(f, setPsSlot)} onRemove={() => clearSlot(setPsSlot)}
            onPasteToggle={() => setPsPaste(p => !p)} pasteMode={psPaste} pasteValue={psText} onPasteChange={setPsText} />

          <FileSlotUpload slot={cvSlot} label="Your CV" icon={User} accept=".pdf,.docx,.doc,.txt"
            hint="Used to generate more accurate STAR evidence from your real experience" optional
            onFile={f => extractFile(f, setCvSlot)} onRemove={() => clearSlot(setCvSlot)}
            onPasteToggle={() => setCvPaste(p => !p)} pasteMode={cvPaste} pasteValue={cvText} onPasteChange={setCvText} />

          <FileSlotUpload slot={nhsValSlot} label="NHS Values Document" icon={Heart} accept=".pdf,.docx,.doc,.txt"
            hint={`Your Trust or Board's values document — e.g. ${detectedNation === 'scotland' ? 'NHS Board values framework' : detectedNation === 'wales' ? 'Health Board values document' : detectedNation === 'northern_ireland' ? 'HSC Trust values document' : "Trust's values or 'Our People' strategy"}. Uploaded values override our built-in registry for Q2.`}
            optional
            onFile={f => extractFile(f, setNhsValSlot)} onRemove={() => clearSlot(setNhsValSlot)}
            onPasteToggle={() => setNhsValPaste(p => !p)} pasteMode={nhsValPaste} pasteValue={nhsValText} onPasteChange={setNhsValText} />
        </div>

        {/* Readiness summary */}
        <div className="flex flex-wrap gap-2 items-center">
          {[
            { label: 'Job Description', ready: hasJD, required: true },
            { label: 'Person Spec',     ready: psPaste ? !!psText.trim() : psSlot.extracted, required: false },
            { label: 'CV',              ready: cvPaste ? !!cvText.trim() : cvSlot.extracted, required: false },
            { label: 'NHS Values',      ready: nhsValPaste ? !!nhsValText.trim() : nhsValSlot.extracted, required: false },
          ].map(item => (
            <span key={item.label} className={`text-[11px] font-medium px-2.5 py-1 rounded-full flex items-center gap-1 ${item.ready ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300' : item.required ? 'bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400' : 'bg-muted text-muted-foreground'}`}>
              {item.ready ? <CheckCircle2 className="w-3 h-3" /> : <div className="w-3 h-3 rounded-full border border-current opacity-50" />}
              {item.label}{item.required && !item.ready ? ' (required)' : ''}
            </span>
          ))}
          {detectedNation !== 'unknown' && (
            <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full flex items-center gap-1 ${NATION_META[detectedNation].color}`}>
              {NATION_META[detectedNation].flag} {NATION_META[detectedNation].label}
            </span>
          )}
        </div>

        <button onClick={startBuilding} disabled={parsing || !hasJD || !jobTitle.trim()}
          className="w-full py-3.5 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground font-semibold flex items-center justify-center gap-2 transition-colors text-base">
          {parsing ? <><Loader2 className="w-4 h-4 animate-spin" /> Parsing criteria...</> : <><Sparkles className="w-4 h-4" /> Parse Criteria &amp; Start Building</>}
        </button>
      </div>

      {/* Past statements */}
      {!loadingPast && pastApps.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4" /> Your Statements
          </h2>
          <div className="space-y-2">
            {pastApps.map(a => (
              <Link key={a.id} href={`/dashboard/application/${a.id}`}
                className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 hover:shadow-sm transition-shadow">
                <FileText className="w-5 h-5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{a.jobTitle}</p>
                  <p className="text-xs text-muted-foreground">{a.band ?? ''} · {a.status} · {a.wordCount ?? 0} words</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-16">
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden"><div className="h-full bg-primary rounded-full" style={{ width: `${a.completeness}%` }} /></div>
                    <p className="text-[10px] text-muted-foreground text-right mt-0.5">{a.completeness}%</p>
                  </div>
                  {a.status === 'complete' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}