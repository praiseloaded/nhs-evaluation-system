'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import Link from 'next/link'
import { ChevronRight, ChevronLeft, Sparkles, CheckCircle2, ArrowLeft, Upload, X, FileText, Loader2 } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'

type ExtractionStatus = 'idle' | 'extracting' | 'success' | 'error'

interface UploadedFile {
  name: string
  base64: string
  mimeType: string
}

interface FormData {
  sourceUrl: string
  jobTitle: string
  band: string
  location: string
  jobDescription: string
  personSpec: string
  essentialCriteria: string
  desirableCriteria: string
  skills: string
  statement: string
  cv: string
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5">
        <label className="block text-sm font-semibold text-gray-800">{label}</label>
        {hint && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
      </div>
      {children}
    </div>
  )
}

function FileUploadZone({ label, hint, file, onFile, onClear }: {
  label: string; hint?: string; file: UploadedFile | null
  onFile: (f: UploadedFile) => void; onClear: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const ACCEPTED = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
  ]

  const readFile = (f: File) => {
    if (!ACCEPTED.includes(f.type) && !f.name.endsWith('.docx')) return
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      onFile({ name: f.name, base64: result.split(',')[1], mimeType: f.type || 'application/octet-stream' })
    }
    reader.readAsDataURL(f)
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) readFile(f)
  }

  return (
    <div>
      <div className="mb-1.5">
        <label className="block text-sm font-semibold text-gray-800">{label}</label>
        {hint && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
      </div>
      {file ? (
        <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
          <FileText className="w-5 h-5 text-green-600 shrink-0" />
          <span className="text-sm text-green-800 font-medium truncate flex-1">{file.name}</span>
          <button type="button" onClick={onClear} className="text-green-500 hover:text-green-700 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`cursor-pointer rounded-lg border-2 border-dashed px-4 py-5 text-center transition-all ${dragging ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'}`}
        >
          <Upload className="w-5 h-5 mx-auto mb-1.5 text-gray-400" />
          <p className="text-sm text-gray-500"><span className="font-medium text-blue-600">Click to upload</span> or drag & drop</p>
          <p className="text-xs text-gray-400 mt-0.5">PDF, DOCX or TXT</p>
        </div>
      )}
      <input ref={inputRef} type="file" accept=".pdf,.docx,.txt" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) readFile(f); e.target.value = '' }} />
    </div>
  )
}

const STEPS = [
  { number: 1, title: 'Job Source' },
  { number: 2, title: 'Basic Info' },
  { number: 3, title: 'Job Details' },
  { number: 4, title: 'Criteria & CV' },
]

function NewAnalysisForm() {
  const router       = useRouter()
  const searchParams = useSearchParams()

  // ── Read params from /jobs or /job/cos "Analyse this job" button ─────────
  const urlJobUrl   = searchParams.get('jobUrl')   ?? ''
  const urlJobTitle = searchParams.get('jobTitle') ?? ''

  const [step, setStep]                     = useState(1)
  const [loading, setLoading]               = useState(false)
  const [extractionStatus, setExtractionStatus] = useState<ExtractionStatus>('idle')
  const [error, setError]                   = useState<string | null>(null)
  const [jobDescFile, setJobDescFile]       = useState<UploadedFile | null>(null)
  const [personSpecFile, setPersonSpecFile] = useState<UploadedFile | null>(null)

  const [formData, setFormData] = useState<FormData>({
    sourceUrl:         urlJobUrl,
    jobTitle:          urlJobTitle,
    band:              '',
    location:          '',
    jobDescription:    '',
    personSpec:        '',
    essentialCriteria: '',
    desirableCriteria: '',
    skills:            '',
    statement:         '',
    cv:                '',
  })

  // ── Auto-extract when jobUrl is in the URL ────────────────────────────────
  useEffect(() => {
    if (!urlJobUrl) return
    // Small delay so form state is settled
    const t = setTimeout(() => { extractFromSource(urlJobUrl) }, 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlJobUrl])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (name === 'sourceUrl') setExtractionStatus('idle')
  }

  const handleNext = () => setStep(s => Math.min(s + 1, 4))
  const handlePrev = () => setStep(s => Math.max(s - 1, 1))
  const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => { if (e.key === 'Enter') e.preventDefault() }

  const canExtract = !!formData.sourceUrl || !!jobDescFile || !!personSpecFile

  // Shared extraction logic — called both manually and on mount
  const extractFromSource = async (overrideUrl?: string) => {
    const urlToUse = overrideUrl ?? formData.sourceUrl
    if (!urlToUse && !jobDescFile && !personSpecFile) return
    setExtractionStatus('extracting')
    setError(null)
    try {
      const res = await fetch('/api/extract-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url:            urlToUse || undefined,
          jobDescFile:    jobDescFile    ?? undefined,
          personSpecFile: personSpecFile ?? undefined,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'Extraction failed')
      }
      const data = await res.json()
      setFormData(prev => ({
        ...prev,
        sourceUrl:         urlToUse || prev.sourceUrl,
        jobTitle:          data.jobTitle          || prev.jobTitle,
        band:              data.band              || prev.band,
        location:          data.location          || prev.location,
        jobDescription:    data.jobDescription    || prev.jobDescription,
        personSpec:        data.personSpec        || prev.personSpec,
        essentialCriteria: data.essentialCriteria || prev.essentialCriteria,
        desirableCriteria: data.desirableCriteria || prev.desirableCriteria,
      }))
      setExtractionStatus('success')
    } catch (err: any) {
      setError(err.message)
      setExtractionStatus('error')
    }
  }

  const buildPayload = () => {
    const jobSpec = `
JOB DESCRIPTION:
${formData.jobDescription}

PERSON SPEC:
${formData.personSpec}

ESSENTIAL CRITERIA:
${formData.essentialCriteria}

DESIRABLE CRITERIA:
${formData.desirableCriteria}

SKILLS:
${formData.skills}

LOCATION:
${formData.location}

SOURCE URL:
${formData.sourceUrl}
    `.trim()

    return {
      jobTitle:          formData.jobTitle,
      jobSpec,
      personSpec:        formData.personSpec,
      essentialCriteria: formData.essentialCriteria,
      desirableCriteria: formData.desirableCriteria,
      skills:            formData.skills,
      values:            '',
      sourceUrl:         formData.sourceUrl,
      cv:                formData.cv,
      statement:         formData.statement,
    }
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (step !== 4) return
    setLoading(true)
    setError(null)
    if (!formData.jobTitle || !formData.jobDescription) {
      setError('Job title and job description are required')
      setLoading(false)
      return
    }
    try {
      const res = await fetch('/api/analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload()),
      })
      const data = await res.json()
      if (data.blocked && data.upgradeRequired) { router.push(`/upgrade?reason=${data.reason}`); return }
      if (!res.ok || !data.success) throw new Error(data.error ?? 'Analysis failed')
      router.push(`/dashboard/analysis/${data.id}?new=1`)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const inputBase =
    'w-full rounded-lg border border-gray-200 px-4 py-2.5 bg-white text-gray-900 text-sm ' +
    'placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ' +
    'transition-shadow'

  const cardClass = 'rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-5'

  const AutoFilledBadge = () =>
    extractionStatus === 'success' ? (
      <span className="ml-1 inline-flex items-center gap-1 text-green-600 font-medium">
        <CheckCircle2 className="w-3 h-3" /> Auto-filled
      </span>
    ) : null

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link href="/dashboard/saved-analyses" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to saved analyses
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">New NHS Job Analysis</h1>
        <p className="text-sm text-gray-500 mt-1">
          {urlJobTitle
            ? <>Analysing: <strong className="text-gray-700">{urlJobTitle}</strong></>
            : 'Paste a job URL, upload documents, or fill in the steps manually.'
          }
        </p>
        {/* Auto-extraction progress banner */}
        {extractionStatus === 'extracting' && urlJobUrl && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 text-sm text-blue-700">
            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
            Fetching job details from NHS Jobs…
          </div>
        )}
        {extractionStatus === 'success' && urlJobUrl && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            Job details extracted — review below, then run your analysis.
          </div>
        )}
        {extractionStatus === 'error' && urlJobUrl && (
          <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-700">
            ⚠ Couldn't auto-extract from this URL — please fill in the details manually.
          </div>
        )}
      </div>

      {/* Step indicator */}
      <div className="mb-8">
        <div className="flex items-center">
          {STEPS.map((s, i) => (
            <div key={s.number} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  s.number < step ? 'bg-gradient-to-br from-red-500 to-amber-500 text-white' : s.number === step ? 'bg-gradient-to-br from-red-500 to-amber-500 text-white ring-4 ring-blue-100' : 'bg-gray-100 text-gray-400'
                }`}>
                  {s.number < step ? '✓' : s.number}
                </div>
                <span className={`text-[10px] font-medium whitespace-nowrap ${s.number === step ? 'text-blue-600' : 'text-gray-400'}`}>{s.title}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`h-px flex-1 mx-2 mb-4 transition-colors ${s.number < step ? 'bg-gradient-to-br from-red-500 to-amber-500' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-5 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span className="mt-0.5 shrink-0">⚠</span><span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="space-y-6">

        {step === 1 && (
          <div className={cardClass}>
            <div>
              <h2 className="font-semibold text-gray-900">Job Source</h2>
              <p className="text-xs text-gray-400 mt-0.5">Provide a URL, upload documents, or both — then hit Extract.</p>
            </div>
            <Field label="NHS Job URL" hint="Paste the full job listing URL to auto-extract details.">
              <input name="sourceUrl" type="url" value={formData.sourceUrl} onChange={handleInputChange} className={inputBase} placeholder="https://www.jobs.nhs.uk/..." />
            </Field>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">and / or</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>
            <div className="space-y-4">
              <p className="text-sm font-semibold text-gray-800 -mb-1">Upload Documents</p>
              <FileUploadZone label="Job Description" hint="Upload the job description (PDF, DOCX or TXT)." file={jobDescFile} onFile={setJobDescFile} onClear={() => { setJobDescFile(null); setExtractionStatus('idle') }} />
              <FileUploadZone label="Person Specification" hint="Upload the person spec — essentials & desirables will be extracted automatically." file={personSpecFile} onFile={setPersonSpecFile} onClear={() => { setPersonSpecFile(null); setExtractionStatus('idle') }} />
            </div>
            <button type="button" onClick={() => extractFromSource()} disabled={extractionStatus === 'extracting' || !canExtract}
              className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${extractionStatus === 'success' ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-gradient-to-br from-red-500 to-amber-500 hover:bg-blue-700 text-white'}`}>
              {extractionStatus === 'extracting' ? (<><Loader2 className="w-4 h-4 animate-spin" />Extracting…</>)
                : extractionStatus === 'success' ? (<><CheckCircle2 className="w-4 h-4" />Extracted! Click Next to review</>)
                : (<><Sparkles className="w-4 h-4" />Extract Job Details</>)}
            </button>
            {extractionStatus === 'success' && (
              <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Details extracted. Review and edit them in the next steps.</span>
              </div>
            )}
            <div className="border-t border-dashed border-gray-200 pt-4 space-y-1">
              <p className="text-xs text-gray-400 text-center">You need at least one of: a URL, a Job Description file, or a Person Specification file.</p>
              <p className="text-xs text-gray-400 text-center">Prefer to fill everything in manually? Hit <strong>Next</strong> to skip this step entirely.</p>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className={cardClass}>
            <div>
              <h2 className="font-semibold text-gray-900">Basic Information</h2>
              <p className="text-xs text-gray-400 mt-0.5">Core details about the role.<AutoFilledBadge /></p>
            </div>
            <Field label="Job Title"><input name="jobTitle" value={formData.jobTitle} onChange={handleInputChange} className={inputBase} placeholder="e.g. Staff Nurse" /></Field>
            <Field label="Band" hint="NHS Agenda for Change pay band"><input name="band" value={formData.band} onChange={handleInputChange} className={inputBase} placeholder="e.g. Band 5" /></Field>
            <Field label="Location"><input name="location" value={formData.location} onChange={handleInputChange} className={inputBase} placeholder="e.g. Royal Free Hospital, London" /></Field>
          </div>
        )}

        {step === 3 && (
          <div className={cardClass}>
            <div>
              <h2 className="font-semibold text-gray-900">Job Details</h2>
              <p className="text-xs text-gray-400 mt-0.5">Description and person specification.<AutoFilledBadge /></p>
            </div>
            <Field label="Job Description"><textarea name="jobDescription" value={formData.jobDescription} onChange={handleInputChange} className={inputBase + ' min-h-36 resize-y'} placeholder="Describe the main responsibilities and duties…" /></Field>
            <Field label="Person Specification" hint="Overview of the type of candidate required."><textarea name="personSpec" value={formData.personSpec} onChange={handleInputChange} className={inputBase + ' min-h-36 resize-y'} placeholder="Outline the ideal candidate profile…" /></Field>
          </div>
        )}

        {step === 4 && (
          <div className={cardClass}>
            <div>
              <h2 className="font-semibold text-gray-900">Criteria & Your Details</h2>
              <p className="text-xs text-gray-400 mt-0.5">Selection criteria, your CV, and supporting statement.<AutoFilledBadge /></p>
            </div>
            <Field label="Essential Criteria" hint="Mandatory requirements — these are scored most heavily."><textarea name="essentialCriteria" value={formData.essentialCriteria} onChange={handleInputChange} className={inputBase + ' min-h-28 resize-y'} placeholder="List essential criteria…" /></Field>
            <Field label="Desirable Criteria" hint="Nice-to-have requirements."><textarea name="desirableCriteria" value={formData.desirableCriteria} onChange={handleInputChange} className={inputBase + ' min-h-28 resize-y'} placeholder="List desirable criteria…" /></Field>
            <Field label="Your Key Skills" hint="Relevant skills to match against the job spec."><input name="skills" value={formData.skills} onChange={handleInputChange} className={inputBase} placeholder="e.g. Cannulation, IV drug administration, patient assessment" /></Field>
            <Field label="Supporting Statement" hint="Your personal statement for this application."><textarea name="statement" value={formData.statement} onChange={handleInputChange} className={inputBase + ' min-h-40 resize-y'} placeholder="Write your supporting statement here…" /></Field>
            <Field label="CV" hint="Paste the full text of your CV."><textarea name="cv" value={formData.cv} onChange={handleInputChange} className={inputBase + ' min-h-40 resize-y'} placeholder="Paste your CV text here…" /></Field>
          </div>
        )}

        <div className="flex justify-between items-center pt-2">
          <button type="button" onClick={handlePrev} disabled={step === 1}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            <ChevronLeft className="w-4 h-4" /> Previous
          </button>
          <span className="text-xs text-gray-400">Step {step} of {STEPS.length}</span>
          {step < 4 ? (
            <button type="button" onClick={handleNext}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-gradient-to-br from-red-500 to-amber-500 hover:bg-blue-700 text-white text-sm font-medium transition-colors">
              Next <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button type="button" disabled={loading} onClick={() => handleSubmit()}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" />Analysing…</>
                : <><Sparkles className="w-4 h-4" />Run NHS Analysis</>
              }
            </button>
          )}
        </div>
      </form>
    </div>
  )
}

export default function NewAnalysisPage() {
  return (
    <Suspense fallback={
      <div className="max-w-4xl mx-auto px-4 py-8 flex justify-center">
        <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
      </div>
    }>
      <NewAnalysisForm />
    </Suspense>
  )
}