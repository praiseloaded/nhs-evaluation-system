// components/cv-optimiser.tsx
'use client'

import { useCallback, useRef, useState } from 'react'
import {
  Upload, FileText, Loader2, CheckCircle2, AlertTriangle,
  X, ChevronDown, ChevronUp, Sparkles, Target, Shield, Stethoscope, File,
} from 'lucide-react'

interface CvOptimiserProps {
  applicationId: string
  existingCvText?: string | null
  existingCvScore?: any
  onScoreUpdate?: (score: any) => void
}

export function CvOptimiser({ applicationId, existingCvText, existingCvScore, onScoreUpdate }: CvOptimiserProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [mode, setMode] = useState<'upload' | 'paste'>(existingCvText ? 'paste' : 'upload')
  const [cvText, setCvText] = useState(existingCvText ?? '')
  const [file, setFile] = useState<File | null>(null)
  const [extracting, setExtracting] = useState(false)
  const [analysing, setAnalysing] = useState(false)
  const [score, setScore] = useState<any>(existingCvScore ?? null)
  const [error, setError] = useState<string | null>(null)
  const [expandedSection, setExpandedSection] = useState<string | null>(null)

  // ── Extract from file ──────────────────────────────────────────────────
  const handleFile = useCallback(async (f: File) => {
    setFile(f); setExtracting(true); setError(null)
    try {
      const formData = new FormData()
      formData.append('file', f)
      const res = await fetch('/api/application/extract-document', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Extraction failed')
      setCvText(data.text)
      setExtracting(false)
    } catch (err: any) {
      setError(err.message); setFile(null); setExtracting(false)
    }
  }, [])

  // ── Run optimisation ───────────────────────────────────────────────────
  const analyse = useCallback(async () => {
    if (!cvText.trim()) { setError('Provide CV text first'); return }
    setAnalysing(true); setError(null); setScore(null)
    try {
      const res = await fetch(`/api/application/${applicationId}/cv-optimise`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cvText }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Analysis failed')
      setScore(data.cvScore)
      onScoreUpdate?.(data.cvScore)
    } catch (err: any) { setError(err.message) }
    finally { setAnalysing(false) }
  }, [cvText, applicationId, onScoreUpdate])

  const ats = score?.atsMatch
  const values = score?.valuesAlignment
  const clinical = score?.clinicalRelevance
  const weakSections = score?.weakSections ?? []
  const priorities = score?.topPriorities ?? []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-500" /> CV Optimiser
        </h3>
        <div className="flex gap-1">
          <button onClick={() => setMode('upload')}
            className={`px-2.5 py-1 rounded text-xs font-medium ${mode === 'upload' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
            <Upload className="w-3 h-3 inline mr-1" />Upload
          </button>
          <button onClick={() => setMode('paste')}
            className={`px-2.5 py-1 rounded text-xs font-medium ${mode === 'paste' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
            Paste
          </button>
        </div>
      </div>

      {/* Input */}
      {mode === 'upload' && !cvText ? (
        <div onClick={() => fileInputRef.current?.click()}
          onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
          onDragOver={e => e.preventDefault()}
          className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-accent/50 transition-all">
          <input ref={fileInputRef} type="file" accept=".pdf,.docx,.doc,.txt" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
          {extracting ? <Loader2 className="w-6 h-6 text-primary animate-spin mx-auto mb-2" /> : <Upload className="w-6 h-6 text-muted-foreground mx-auto mb-2" />}
          <p className="text-xs text-muted-foreground">{extracting ? 'Extracting...' : 'Upload CV (PDF, DOCX, DOC)'}</p>
        </div>
      ) : mode === 'paste' || cvText ? (
        <div className="space-y-2">
          {file && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted rounded-lg px-3 py-2">
              <File className="w-3 h-3" /> {file.name}
              <button onClick={() => { setFile(null); setCvText('') }} className="ml-auto"><X className="w-3 h-3" /></button>
            </div>
          )}
          <textarea value={cvText} onChange={e => setCvText(e.target.value)}
            placeholder="Paste your CV text here..."
            rows={6}
            className="w-full bg-muted border border-border rounded-xl p-3 text-xs text-foreground placeholder-muted-foreground/50 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30" />
          <p className="text-[10px] text-muted-foreground text-right">{cvText.split(/\s+/).filter(Boolean).length} words</p>
        </div>
      ) : null}

      {error && <p className="text-xs text-red-500">{error}</p>}

      {/* Analyse button */}
      <button onClick={analyse} disabled={!cvText.trim() || analysing}
        className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-semibold flex items-center justify-center gap-2">
        {analysing ? <><Loader2 className="w-4 h-4 animate-spin" /> Analysing CV...</> : <><Sparkles className="w-4 h-4" /> Optimise Against Job Spec</>}
      </button>

      {/* ═══ RESULTS ═══ */}
      {score && (
        <div className="space-y-4 pt-2">
          {/* Score cards */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'Overall', value: score.overall, icon: Target, color: 'text-foreground' },
              { label: 'ATS', value: ats?.score, icon: Shield, color: 'text-blue-500' },
              { label: 'Values', value: values?.score, icon: CheckCircle2, color: 'text-purple-500' },
              { label: 'Clinical', value: clinical?.score, icon: Stethoscope, color: 'text-emerald-500' },
            ].map(item => (
              <div key={item.label} className="rounded-xl border border-border bg-card p-3 text-center">
                <item.icon className={`w-4 h-4 mx-auto mb-1 ${item.color}`} />
                <p className="text-lg font-bold text-foreground">{item.value ?? 0}%</p>
                <p className="text-[10px] text-muted-foreground">{item.label}</p>
              </div>
            ))}
          </div>

          {/* Top priorities */}
          {priorities.length > 0 && (
            <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/30 p-4">
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Top priorities
              </p>
              <ol className="space-y-1.5">
                {priorities.map((p: string, i: number) => (
                  <li key={i} className="text-xs text-foreground/80 flex gap-2">
                    <span className="text-amber-500 font-bold shrink-0">{i + 1}.</span> {p}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Missing keywords */}
          {ats?.criticalMissing?.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Missing keywords</p>
              <div className="flex flex-wrap gap-1.5">
                {ats.criticalMissing.map((k: string, i: number) => (
                  <span key={i} className="px-2 py-0.5 rounded bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-[10px] font-medium">{k}</span>
                ))}
              </div>
            </div>
          )}

          {/* Weak sections with rewrites */}
          {weakSections.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sections to improve</p>
              {weakSections.map((s: any, i: number) => (
                <div key={i} className="rounded-xl border border-border bg-card overflow-hidden">
                  <button onClick={() => setExpandedSection(expandedSection === `s${i}` ? null : `s${i}`)}
                    className="w-full flex items-center gap-3 p-3 text-left hover:bg-accent/50 transition-colors">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${
                      s.severity === 'high' ? 'bg-red-500' : s.severity === 'medium' ? 'bg-amber-500' : 'bg-blue-500'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground">{s.section}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{s.issue}</p>
                    </div>
                    {expandedSection === `s${i}` ? <ChevronUp className="w-3 h-3 text-muted-foreground" /> : <ChevronDown className="w-3 h-3 text-muted-foreground" />}
                  </button>
                  {expandedSection === `s${i}` && (
                    <div className="px-3 pb-3 space-y-2 border-t border-border pt-2">
                      {s.currentText && (
                        <div>
                          <p className="text-[10px] font-semibold text-red-500 uppercase mb-1">Current</p>
                          <p className="text-xs text-foreground/60 bg-red-50 dark:bg-red-950/30 rounded-lg px-3 py-2 line-through">{s.currentText}</p>
                        </div>
                      )}
                      {s.suggestedRewrite && (
                        <div>
                          <p className="text-[10px] font-semibold text-emerald-500 uppercase mb-1">Suggested rewrite</p>
                          <p className="text-xs text-foreground bg-emerald-50 dark:bg-emerald-950/30 rounded-lg px-3 py-2">{s.suggestedRewrite}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}