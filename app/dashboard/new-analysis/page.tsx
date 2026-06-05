'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ChevronRight, ChevronLeft, Sparkles, CheckCircle2, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

// ─── Types ────────────────────────────────────────────────────────────────────

type ExtractionStatus = 'idle' | 'extracting' | 'success' | 'error'

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

// ─── Sub-components ───────────────────────────────────────────────────────────

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
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

// ─── Step Config ──────────────────────────────────────────────────────────────

const STEPS = [
  { number: 1, title: 'Job Source' },
  { number: 2, title: 'Basic Info' },
  { number: 3, title: 'Job Details' },
  { number: 4, title: 'Criteria & CV' },
]

// ─── Main Component ───────────────────────────────────────────────────────────

export default function NewAnalysisPage() {
  const router = useRouter()

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [extractionStatus, setExtractionStatus] = useState<ExtractionStatus>('idle')
  const [error, setError] = useState<string | null>(null)

  // Prevents the submit button from being clickable the instant step 4 renders,
  // which would catch the tail-end of the "Next" button click event.
  const [submitReady, setSubmitReady] = useState(false)

  useEffect(() => {
    if (step === 4) {
      setSubmitReady(false)
      const t = setTimeout(() => setSubmitReady(true), 150)
      return () => clearTimeout(t)
    }
  }, [step])

  const [formData, setFormData] = useState<FormData>({
    sourceUrl: '',
    jobTitle: '',
    band: '',
    location: '',
    jobDescription: '',
    personSpec: '',
    essentialCriteria: '',
    desirableCriteria: '',
    skills: '',
    statement: '',
    cv: '',
  })

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (name === 'sourceUrl') setExtractionStatus('idle')
  }

  const handleNext = () => setStep(s => Math.min(s + 1, 4))
  const handlePrev = () => setStep(s => Math.max(s - 1, 1))

  // Prevent Enter key from submitting on steps 1–3
  const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Enter' && step < 4) {
      e.preventDefault()
    }
  }

  const extractFromUrl = async () => {
    if (!formData.sourceUrl) return

    setExtractionStatus('extracting')
    setError(null)

    try {
      const res = await fetch('/api/extract-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: formData.sourceUrl }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'Extraction failed')
      }

      const data = await res.json()

      setFormData(prev => ({
        ...prev,
        jobTitle: data.jobTitle || prev.jobTitle,
        band: data.band || prev.band,
        location: data.location || prev.location,
        jobDescription: data.jobDescription || prev.jobDescription,
        personSpec: data.personSpec || prev.personSpec,
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
      jobTitle: formData.jobTitle,
      jobSpec,
      personSpec: formData.personSpec,
      essentialCriteria: formData.essentialCriteria,
      desirableCriteria: formData.desirableCriteria,
      skills: formData.skills,
      values: '',
      sourceUrl: formData.sourceUrl,
      cv: formData.cv,
      statement: formData.statement,
    }
  }

 const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()

  if (step !== 4 || !submitReady) return

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

// 🔴 HANDLE UPGRADE BLOCK FIRST
if (data.blocked && data.upgradeRequired) {
  router.push(`/upgrade?reason=${data.reason}`)
  return
}

if (!res.ok || !data.success) {
  throw new Error(data.error ?? 'Analysis failed')
}

    localStorage.setItem('analysis', JSON.stringify(data))

    router.push(`/dashboard/analysis/${data.id}`)
  } catch (err: any) {
    setError(err.message)
  } finally {
    setLoading(false)
  }
}

  // ─── Style tokens ──────────────────────────────────────────────────────────

  const inputBase =
    'w-full rounded-lg border border-gray-200 px-4 py-2.5 bg-white text-gray-900 text-sm ' +
    'placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ' +
    'transition-shadow'

  const cardClass = 'rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-5'

  const AutoFilledBadge = () =>
    extractionStatus === 'success' ? (
      <span className="ml-1 inline-flex items-center gap-1 text-green-600 font-medium">
        <CheckCircle2 className="w-3 h-3" /> Auto-filled from URL
      </span>
    ) : null

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">

      {/* Back link */}
      <Link
        href="/dashboard/saved-analyses"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to saved analyses
      </Link>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">New NHS Job Analysis</h1>
        <p className="text-sm text-gray-500 mt-1">
          Paste a job URL to auto-fill, or complete the steps manually.
        </p>
      </div>

      {/* Step indicator */}
      <div className="mb-8">
        <div className="flex items-center">
          {STEPS.map((s, i) => (
            <div key={s.number} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    s.number < step
                      ? 'bg-blue-600 text-white'
                      : s.number === step
                        ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                        : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {s.number < step ? '✓' : s.number}
                </div>
                <span
                  className={`text-[10px] font-medium whitespace-nowrap ${
                    s.number === step ? 'text-blue-600' : 'text-gray-400'
                  }`}
                >
                  {s.title}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`h-px flex-1 mx-2 mb-4 transition-colors ${
                    s.number < step ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Global error */}
      {error && (
        <div className="mb-5 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span className="mt-0.5 shrink-0">⚠</span>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="space-y-6">

        {/* ── Step 1: URL ── */}
        {step === 1 && (
          <div className={cardClass}>
            <div>
              <h2 className="font-semibold text-gray-900">Job Source</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Paste an NHS Jobs URL to auto-extract the job details.
              </p>
            </div>

            <Field
              label="NHS Job URL"
              hint="Paste the full job listing URL. We'll extract the details automatically."
            >
              <div className="flex gap-2 mt-1">
                <input
                  name="sourceUrl"
                  type="url"
                  value={formData.sourceUrl}
                  onChange={handleInputChange}
                  className={inputBase}
                  placeholder="https://www.jobs.nhs.uk/..."
                />
                <button
                  type="button"
                  onClick={extractFromUrl}
                  disabled={extractionStatus === 'extracting' || !formData.sourceUrl}
                  className={`shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                    extractionStatus === 'success'
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {extractionStatus === 'extracting' ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Extracting…
                    </>
                  ) : extractionStatus === 'success' ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Extracted!
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Extract
                    </>
                  )}
                </button>
              </div>

              {extractionStatus === 'success' && (
                <div className="mt-3 flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>
                    Job details extracted successfully. Review and edit them in the next steps.
                  </span>
                </div>
              )}
            </Field>

            <div className="border-t border-dashed border-gray-200 pt-4">
              <p className="text-xs text-gray-400 text-center">
                Prefer to fill in manually? Use the <strong>Next</strong> button to skip.
              </p>
            </div>

            
          </div>
        )}

        {/* ── Step 2: Basic Info ── */}
        {step === 2 && (
          <div className={cardClass}>
            <div>
              <h2 className="font-semibold text-gray-900">Basic Information</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Core details about the role.<AutoFilledBadge />
              </p>
            </div>

            <Field label="Job Title">
              <input
                name="jobTitle"
                value={formData.jobTitle}
                onChange={handleInputChange}
                className={inputBase}
                placeholder="e.g. Staff Nurse"
              />
            </Field>

            <Field label="Band" hint="NHS Agenda for Change pay band">
              <input
                name="band"
                value={formData.band}
                onChange={handleInputChange}
                className={inputBase}
                placeholder="e.g. Band 5"
              />
            </Field>

            <Field label="Location">
              <input
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                className={inputBase}
                placeholder="e.g. Royal Free Hospital, London"
              />
            </Field>
          </div>
        )}

        {/* ── Step 3: Job Details ── */}
        {step === 3 && (
          <div className={cardClass}>
            <div>
              <h2 className="font-semibold text-gray-900">Job Details</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Description and person specification.<AutoFilledBadge />
              </p>
            </div>

            <Field label="Job Description">
              <textarea
                name="jobDescription"
                value={formData.jobDescription}
                onChange={handleInputChange}
                className={inputBase + ' min-h-36 resize-y'}
                placeholder="Describe the main responsibilities and duties…"
              />
            </Field>

            <Field
              label="Person Specification"
              hint="Overview of the type of candidate required."
            >
              <textarea
                name="personSpec"
                value={formData.personSpec}
                onChange={handleInputChange}
                className={inputBase + ' min-h-36 resize-y'}
                placeholder="Outline the ideal candidate profile…"
              />
            </Field>
          </div>
        )}

        {/* ── Step 4: Criteria & CV ── */}
        {step === 4 && (
          <div className={cardClass}>
            <div>
              <h2 className="font-semibold text-gray-900">Criteria & Your Details</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Selection criteria, your CV, and supporting statement.
                <AutoFilledBadge />
              </p>
            </div>

            <Field
              label="Essential Criteria"
              hint="Mandatory requirements — these are scored most heavily."
            >
              <textarea
                name="essentialCriteria"
                value={formData.essentialCriteria}
                onChange={handleInputChange}
                className={inputBase + ' min-h-28 resize-y'}
                placeholder="List essential criteria…"
              />
            </Field>

            <Field label="Desirable Criteria" hint="Nice-to-have requirements.">
              <textarea
                name="desirableCriteria"
                value={formData.desirableCriteria}
                onChange={handleInputChange}
                className={inputBase + ' min-h-28 resize-y'}
                placeholder="List desirable criteria…"
              />
            </Field>

            <Field label="Your Key Skills" hint="Relevant skills to match against the job spec.">
              <input
                name="skills"
                value={formData.skills}
                onChange={handleInputChange}
                className={inputBase}
                placeholder="e.g. Cannulation, IV drug administration, patient assessment"
              />
            </Field>

            <Field
              label="Supporting Statement"
              hint="Your personal statement for this application."
            >
              <textarea
                name="statement"
                value={formData.statement}
                onChange={handleInputChange}
                className={inputBase + ' min-h-40 resize-y'}
                placeholder="Write your supporting statement here…"
              />
            </Field>

            <Field label="CV" hint="Paste the full text of your CV.">
              <textarea
                name="cv"
                value={formData.cv}
                onChange={handleInputChange}
                className={inputBase + ' min-h-40 resize-y'}
                placeholder="Paste your CV text here…"
              />
            </Field>
          </div>
        )}

        {/* ── Navigation ── */}
        <div className="flex justify-between items-center pt-2">
          <button
            type="button"
            onClick={handlePrev}
            disabled={step === 1}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" /> Previous
          </button>

          <span className="text-xs text-gray-400">Step {step} of {STEPS.length}</span>

          {step < 4 ? (
            <button
              type="button"
              onClick={handleNext}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={loading || !submitReady}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Analysing…
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Run NHS Analysis
                </>
              )}
            </button>
          )}
        </div>

      </form>
    </div>
  )
}
