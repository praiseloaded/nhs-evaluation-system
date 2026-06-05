// app/dashboard/application/page.tsx
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, FileText, Loader2, Plus, Clock, CheckCircle2,
  Sparkles, Upload, File, X, AlertCircle, User,
} from 'lucide-react'

type PastApp = {
  id: string; jobTitle: string; band: string | null; completeness: number
  status: string; createdAt: string; wordCount: number | null
}

// ─── File Upload Component (reusable for job doc + CV) ────────────────────────

function FileUploadZone({
  label, accept, file, extracting, extracted, wordCount, error,
  onFileSelect, onRemove, previewText,
}: {
  label: string; accept: string; file: File | null; extracting: boolean
  extracted: boolean; wordCount: number; error: string | null
  onFileSelect: (f: File) => void; onRemove: () => void; previewText: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  return (
    <div className="space-y-3">
      {!file ? (
        <div
          onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) onFileSelect(f) }}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => inputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
            dragOver ? 'border-primary bg-primary/5 scale-[1.01]' : 'border-border hover:border-primary/50 hover:bg-accent/50'
          }`}
        >
          <input ref={inputRef} type="file" accept={accept} className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) onFileSelect(f) }} />
          <Upload className={`w-8 h-8 mx-auto mb-2 ${dragOver ? 'text-primary' : 'text-muted-foreground'}`} />
          <p className="text-sm font-medium text-foreground mb-0.5">
            {dragOver ? 'Drop here' : `Upload ${label}`}
          </p>
          <p className="text-xs text-muted-foreground">PDF, DOCX, DOC, or TXT — up to 10MB</p>
        </div>
      ) : (
        <div className={`rounded-xl border p-4 ${
          extracted ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/30' : 'border-border bg-card'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${extracted ? 'bg-emerald-100 dark:bg-emerald-900' : 'bg-muted'}`}>
              {extracting ? <Loader2 className="w-5 h-5 text-primary animate-spin" /> :
               extracted ? <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /> :
               <File className="w-5 h-5 text-muted-foreground" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {extracting ? 'Extracting text...' : extracted ? `${wordCount} words extracted` : `${(file.size / 1024).toFixed(0)} KB`}
              </p>
            </div>
            {!extracting && (
              <button onClick={onRemove} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {extracted && previewText && (
        <details className="group">
          <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
            Preview extracted text ({wordCount} words)
          </summary>
          <div className="mt-2 rounded-lg bg-muted p-3 max-h-40 overflow-y-auto">
            <p className="text-xs text-foreground/70 whitespace-pre-wrap leading-relaxed">
              {previewText.slice(0, 2000)}{previewText.length > 2000 ? '...' : ''}
            </p>
          </div>
        </details>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

// ─── Text Input with Mode Toggle ──────────────────────────────────────────────

function TextInputSection({
  label, placeholder, value, onChange, icon: Icon,
}: {
  label: string; placeholder: string; value: string
  onChange: (v: string) => void; icon: any
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
        <Icon className="w-3 h-3" /> {label}
      </label>
      <textarea value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} rows={8}
        className="w-full bg-muted border border-border rounded-lg p-3 text-sm text-foreground placeholder-muted-foreground/50 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30" />
      {value.trim() && (
        <p className="text-xs text-muted-foreground text-right">
          {value.split(/\s+/).filter(Boolean).length} words
        </p>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════

export default function ApplicationLauncher() {
  const router = useRouter()

  // Job description state
  const [jobTitle, setJobTitle] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [employer, setEmployer] = useState('')
  const [band, setBand] = useState('')
  const [jobMode, setJobMode] = useState<'upload' | 'paste'>('upload')
  const [jobFile, setJobFile] = useState<File | null>(null)
  const [jobExtracting, setJobExtracting] = useState(false)
  const [jobExtracted, setJobExtracted] = useState(false)
  const [jobWordCount, setJobWordCount] = useState(0)
  const [jobError, setJobError] = useState<string | null>(null)

  // CV state
  const [cvText, setCvText] = useState('')
  const [cvMode, setCvMode] = useState<'upload' | 'paste'>('upload')
  const [cvFile, setCvFile] = useState<File | null>(null)
  const [cvExtracting, setCvExtracting] = useState(false)
  const [cvExtracted, setCvExtracted] = useState(false)
  const [cvWordCount, setCvWordCount] = useState(0)
  const [cvError, setCvError] = useState<string | null>(null)

  const [parsing, setParsing] = useState(false)
  const [pastApps, setPastApps] = useState<PastApp[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/application/list')
      .then(r => r.json())
      .then(data => setPastApps(data.applications ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // ── Extract document helper ────────────────────────────────────────────
  const extractDocument = useCallback(async (
    file: File,
    setExtracting: (v: boolean) => void,
    setExtracted: (v: boolean) => void,
    setText: (v: string) => void,
    setWordCount: (v: number) => void,
    setErr: (v: string | null) => void,
    autoFillJob?: boolean,
  ) => {
    const name = file.name.toLowerCase()
    if (!['.pdf', '.docx', '.doc', '.txt'].some(t => name.endsWith(t))) {
      setErr('Upload PDF, DOCX, DOC, or TXT'); return false
    }
    if (file.size > 10 * 1024 * 1024) { setErr('File too large (max 10MB)'); return false }

    setExtracting(true); setExtracted(false); setErr(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/application/extract-document', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Extraction failed')

      setText(data.text)
      setWordCount(data.wordCount ?? 0)
      setExtracted(true)

      if (autoFillJob) {
        if (data.detected?.jobTitle && !jobTitle) setJobTitle(data.detected.jobTitle)
        if (data.detected?.band && !band) setBand(data.detected.band)
        if (data.detected?.employer && !employer) setEmployer(data.detected.employer)
      }
      return true
    } catch (err: any) { setErr(err.message); return false }
    finally { setExtracting(false) }
  }, [jobTitle, band, employer])

  // ── Job file handlers ──────────────────────────────────────────────────
  const handleJobFile = useCallback(async (file: File) => {
    setJobFile(file)
    const ok = await extractDocument(file, setJobExtracting, setJobExtracted, setJobDescription, setJobWordCount, setJobError, true)
    if (!ok) setJobFile(null)
  }, [extractDocument])

  const removeJobFile = useCallback(() => {
    setJobFile(null); setJobExtracted(false); setJobDescription(''); setJobWordCount(0)
  }, [])

  // ── CV file handlers ───────────────────────────────────────────────────
  const handleCvFile = useCallback(async (file: File) => {
    setCvFile(file)
    const ok = await extractDocument(file, setCvExtracting, setCvExtracted, setCvText, setCvWordCount, setCvError)
    if (!ok) setCvFile(null)
  }, [extractDocument])

  const removeCvFile = useCallback(() => {
    setCvFile(null); setCvExtracted(false); setCvText(''); setCvWordCount(0)
  }, [])

  // ── Start building ─────────────────────────────────────────────────────
  const startBuilding = useCallback(async () => {
    if (!jobTitle.trim()) { setError('Job title is required'); return }
    if (!jobDescription.trim()) { setError('Job description is required — upload a document or paste text'); return }

    setParsing(true); setError(null)
    try {
      const res = await fetch('/api/application/parse-spec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobTitle, jobDescription, employer, band, cvText: cvText || undefined }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? 'Parse failed') }
      const data = await res.json()
      router.push(`/dashboard/application/${data.applicationId}`)
    } catch (err: any) { setError(err.message); setParsing(false) }
  }, [jobTitle, jobDescription, employer, band, cvText, router])

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">
      <div>
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-4 h-4" /> Dashboard
        </Link>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-primary" /> Application Builder
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Upload a job description and your CV to build a structured NHS supporting statement
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 p-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card p-6 space-y-6">
        <h2 className="font-semibold text-foreground text-sm">Start New Application</h2>

        {/* Job details */}
        <div className="grid md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Job Title *</label>
            <input type="text" value={jobTitle} onChange={e => setJobTitle(e.target.value)} placeholder="e.g., District Nurse Band 6"
              className="w-full bg-muted border border-border rounded-lg p-2.5 text-sm text-foreground placeholder-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Band</label>
            <input type="text" value={band} onChange={e => setBand(e.target.value)} placeholder="e.g., Band 6"
              className="w-full bg-muted border border-border rounded-lg p-2.5 text-sm text-foreground placeholder-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Employer</label>
            <input type="text" value={employer} onChange={e => setEmployer(e.target.value)} placeholder="e.g., NHS Trust name"
              className="w-full bg-muted border border-border rounded-lg p-2.5 text-sm text-foreground placeholder-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
        </div>

        {/* ═══ JOB DESCRIPTION SECTION ═══ */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" /> Job Description / Person Spec *
            </h3>
            <div className="flex gap-1">
              <button onClick={() => setJobMode('upload')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${jobMode === 'upload' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                <Upload className="w-3 h-3 inline mr-1" />Upload
              </button>
              <button onClick={() => setJobMode('paste')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${jobMode === 'paste' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                Paste
              </button>
            </div>
          </div>

          {jobMode === 'upload' ? (
            <FileUploadZone
              label="Job Description"
              accept=".pdf,.docx,.doc,.txt"
              file={jobFile}
              extracting={jobExtracting}
              extracted={jobExtracted}
              wordCount={jobWordCount}
              error={jobError}
              onFileSelect={handleJobFile}
              onRemove={removeJobFile}
              previewText={jobDescription}
            />
          ) : (
            <TextInputSection
              label="Job Description / Person Specification"
              placeholder="Paste the full job description including essential and desirable criteria..."
              value={jobDescription}
              onChange={setJobDescription}
              icon={FileText}
            />
          )}
        </div>

        <hr className="border-border" />

        {/* ═══ CV SECTION ═══ */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <User className="w-4 h-4 text-blue-500" /> Your CV
              <span className="text-[10px] font-normal text-muted-foreground bg-muted px-1.5 py-0.5 rounded">Optional but recommended</span>
            </h3>
            <div className="flex gap-1">
              <button onClick={() => setCvMode('upload')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${cvMode === 'upload' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                <Upload className="w-3 h-3 inline mr-1" />Upload
              </button>
              <button onClick={() => setCvMode('paste')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${cvMode === 'paste' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                Paste
              </button>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Your CV helps the AI understand your experience and generate more accurate, evidence-based paragraphs.
          </p>

          {cvMode === 'upload' ? (
            <FileUploadZone
              label="CV"
              accept=".pdf,.docx,.doc,.txt"
              file={cvFile}
              extracting={cvExtracting}
              extracted={cvExtracted}
              wordCount={cvWordCount}
              error={cvError}
              onFileSelect={handleCvFile}
              onRemove={removeCvFile}
              previewText={cvText}
            />
          ) : (
            <TextInputSection
              label="CV Content"
              placeholder="Paste your CV text here — your experience, qualifications, skills, and employment history..."
              value={cvText}
              onChange={setCvText}
              icon={User}
            />
          )}
        </div>

        <hr className="border-border" />

        {/* Submit */}
        <button onClick={startBuilding} disabled={parsing || jobExtracting || cvExtracting || !jobDescription.trim()}
          className="w-full py-3.5 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground font-semibold flex items-center justify-center gap-2 transition-colors text-base">
          {parsing ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Parsing criteria from document...</>
          ) : (
            <><Sparkles className="w-4 h-4" /> Parse Criteria &amp; Start Building</>
          )}
        </button>

        {/* Summary of what's ready */}
        <div className="flex flex-wrap gap-3 justify-center">
          {jobDescription && (
            <span className="text-[10px] font-medium bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-2.5 py-1 rounded-full flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Job spec ({jobWordCount || jobDescription.split(/\s+/).length} words)
            </span>
          )}
          {cvText && (
            <span className="text-[10px] font-medium bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-2.5 py-1 rounded-full flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> CV ({cvWordCount || cvText.split(/\s+/).length} words)
            </span>
          )}
          {jobTitle && (
            <span className="text-[10px] font-medium bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 px-2.5 py-1 rounded-full">
              {jobTitle}
            </span>
          )}
        </div>
      </div>

      {/* Past applications */}
      {!loading && pastApps.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4" /> Your Applications
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
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${a.completeness}%` }} />
                    </div>
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