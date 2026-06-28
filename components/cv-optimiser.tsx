// components/cv-optimiser.tsx
'use client'

import { useCallback, useRef, useState } from 'react'
import {
  Upload, FileText, Loader2, CheckCircle2, AlertTriangle,
  X, ChevronDown, ChevronUp, Sparkles, Target, Shield,
  Stethoscope, File, RefreshCw, User, Pen,
} from 'lucide-react'

type Tone = 'professional' | 'warm' | 'personal'

const TONE_OPTIONS: { value: Tone; label: string; description: string }[] = [
  { value: 'professional', label: 'Professional',  description: 'Formal NHS clinical tone — precise, competency-focused' },
  { value: 'warm',         label: 'Warm & human',  description: 'Friendly but professional — reads like a real person wrote it' },
  { value: 'personal',     label: 'Personal',      description: 'First-person narrative — your story, your voice, authentic examples' },
]

interface CvOptimiserProps {
  applicationId: string
  existingCvText?: string | null
  existingCvScore?: any
  onScoreUpdate?: (score: any) => void
}

export function CvOptimiser({ applicationId, existingCvText, existingCvScore, onScoreUpdate }: CvOptimiserProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [mode, setMode]             = useState<'upload' | 'paste'>(existingCvText ? 'paste' : 'upload')
  const [cvText, setCvText]         = useState(existingCvText ?? '')
  const [file, setFile]             = useState<File | null>(null)
  const [extracting, setExtracting] = useState(false)
  const [analysing, setAnalysing]   = useState(false)
  const [score, setScore]           = useState<any>(existingCvScore ?? null)
  const [error, setError]           = useState<string | null>(null)
  const [expandedSection, setExpandedSection] = useState<string | null>(null)
  const [tone, setTone]             = useState<Tone>('warm')
  const [showTonePicker, setShowTonePicker] = useState(false)

  const handleFile = useCallback(async (f: File) => {
    setFile(f); setExtracting(true); setError(null)
    try {
      const fd = new FormData(); fd.append('file', f)
      const res  = await fetch('/api/application/extract-document', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Extraction failed')
      setCvText(data.text); setExtracting(false)
    } catch (err: any) { setError(err.message); setFile(null); setExtracting(false) }
  }, [])

  const analyse = useCallback(async () => {
    if (!cvText.trim()) { setError('Provide CV text first'); return }
    setAnalysing(true); setError(null); setScore(null)
    try {
      const res  = await fetch(`/api/application/${applicationId}/cv-optimise`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ cvText, tone }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Analysis failed')
      setScore(data.cvScore)
      onScoreUpdate?.(data.cvScore)
    } catch (err: any) { setError(err.message) }
    finally { setAnalysing(false) }
  }, [cvText, applicationId, onScoreUpdate, tone])

  const ats        = score?.atsMatch
  const values     = score?.valuesAlignment
  const clinical   = score?.clinicalRelevance
  const priorities = score?.topPriorities ?? []
  const weakSections = score?.weakSections ?? []
  const selectedTone = TONE_OPTIONS.find(t => t.value === tone)!

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-500" /> CV Optimiser
        </h3>
        <div className="flex gap-1">
          {(['upload','paste'] as const).map(m => (
            <button key={m} onClick={() => setMode(m)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${mode === m ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
              {m === 'upload' ? <><Upload className="w-3 h-3 inline mr-1" />Upload</> : 'Paste'}
            </button>
          ))}
        </div>
      </div>

      {/* CV Input */}
      {mode === 'upload' && !cvText ? (
        <div onClick={() => fileInputRef.current?.click()}
          onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
          onDragOver={e => e.preventDefault()}
          className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-accent/50 transition-all">
          <input ref={fileInputRef} type="file" accept=".pdf,.docx,.doc,.txt" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
          {extracting
            ? <Loader2 className="w-6 h-6 text-primary animate-spin mx-auto mb-2" />
            : <Upload className="w-6 h-6 text-muted-foreground mx-auto mb-2" />}
          <p className="text-xs text-muted-foreground">{extracting ? 'Extracting…' : 'Upload CV — PDF, DOCX or TXT'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {file && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted rounded-lg px-3 py-2">
              <File className="w-3 h-3" /> {file.name}
              <button onClick={() => { setFile(null); setCvText('') }} className="ml-auto"><X className="w-3 h-3" /></button>
            </div>
          )}
          <textarea value={cvText} onChange={e => setCvText(e.target.value)}
            placeholder="Paste your CV text here…" rows={6}
            className="w-full bg-muted border border-border rounded-xl p-3 text-xs text-foreground placeholder-muted-foreground/50 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30" />
          <p className="text-[10px] text-muted-foreground text-right">{cvText.split(/\s+/).filter(Boolean).length} words</p>
        </div>
      )}

      {/* Tone picker */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <button onClick={() => setShowTonePicker(t => !t)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-accent/30 transition-colors">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <Pen className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="text-left">
              <p className="text-xs font-semibold text-foreground">Rewrite tone: {selectedTone.label}</p>
              <p className="text-[11px] text-muted-foreground">{selectedTone.description}</p>
            </div>
          </div>
          {showTonePicker
            ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
            : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>
        {showTonePicker && (
          <div className="border-t border-border divide-y divide-border">
            {TONE_OPTIONS.map(t => (
              <button key={t.value} onClick={() => { setTone(t.value); setShowTonePicker(false) }}
                className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-accent/30 transition-colors ${tone === t.value ? 'bg-primary/5' : ''}`}>
                <div className={`w-4 h-4 rounded-full border-2 mt-0.5 shrink-0 flex items-center justify-center ${tone === t.value ? 'border-primary bg-primary' : 'border-border'}`}>
                  {tone === t.value && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground">{t.label}</p>
                  <p className="text-[11px] text-muted-foreground">{t.description}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      {/* Analyse / Regenerate button */}
      <button onClick={analyse} disabled={!cvText.trim() || analysing}
        className="w-full py-2.5 rounded-xl bg-gradient-to-br from-red-500 to-amber-500 hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-semibold flex items-center justify-center gap-2">
        {analysing
          ? <><Loader2 className="w-4 h-4 animate-spin" /> Analysing CV…</>
          : score
            ? <><RefreshCw className="w-4 h-4" /> Regenerate — {selectedTone.label} tone</>
            : <><Sparkles className="w-4 h-4" /> Optimise Against Job Spec</>}
      </button>

      {/* ═══ RESULTS ═══ */}
      {score && (
        <div className="space-y-4 pt-2">

          {/* Score cards */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'Overall',  value: score.overall,    icon: Target,       color: '#3b82f6' },
              { label: 'ATS',      value: ats?.score,       icon: Shield,       color: '#8b5cf6' },
              { label: 'Values',   value: values?.score,    icon: CheckCircle2, color: '#10b981' },
              { label: 'Clinical', value: clinical?.score,  icon: Stethoscope,  color: '#f59e0b' },
            ].map(item => {
              const v = Math.round(item.value ?? 0)
              const verdict = v >= 80 ? 'Strong' : v >= 65 ? 'Good' : v >= 45 ? 'Fair' : 'Weak'
              const verdictCls = v >= 80 ? 'text-emerald-600 dark:text-emerald-400'
                : v >= 65 ? 'text-blue-600 dark:text-blue-400'
                : v >= 45 ? 'text-amber-600 dark:text-amber-400' : 'text-red-500'
              return (
                <div key={item.label} className="rounded-xl border border-border bg-card p-3 text-center space-y-1">
                  <p className="text-xl font-black tabular-nums" style={{ color: item.color }}>{v}%</p>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${v}%`, background: item.color }} />
                  </div>
                  <p className="text-[10px] text-muted-foreground">{item.label}</p>
                  <p className={`text-[10px] font-semibold ${verdictCls}`}>{verdict}</p>
                </div>
              )
            })}
          </div>

          {/* Tone badge — shows which tone was used */}
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <Pen className="w-3 h-3" />
            Rewrites generated in <span className="font-semibold text-foreground">{selectedTone.label}</span> tone
            <button onClick={() => setShowTonePicker(true)} className="text-primary hover:underline ml-1">Change</button>
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

          {/* Weak sections with human-voice rewrites */}
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
                    {expandedSection === `s${i}`
                      ? <ChevronUp className="w-3 h-3 text-muted-foreground" />
                      : <ChevronDown className="w-3 h-3 text-muted-foreground" />}
                  </button>
                  {expandedSection === `s${i}` && (
                    <div className="px-3 pb-3 space-y-3 border-t border-border pt-3">
                      {s.currentText && (
                        <div>
                          <p className="text-[10px] font-semibold text-red-500 uppercase mb-1.5 flex items-center gap-1">
                            <X className="w-3 h-3" /> Current (generic / weak)
                          </p>
                          <p className="text-xs text-foreground/60 bg-red-50 dark:bg-red-950/30 rounded-lg px-3 py-2.5 leading-relaxed line-through decoration-red-300">{s.currentText}</p>
                        </div>
                      )}
                      {s.suggestedRewrite && (
                        <div>
                          <p className="text-[10px] font-semibold text-emerald-500 uppercase mb-1.5 flex items-center gap-1">
                            <User className="w-3 h-3" /> Suggested rewrite — {selectedTone.label} voice
                          </p>
                          <p className="text-xs text-foreground bg-emerald-50 dark:bg-emerald-950/30 rounded-lg px-3 py-2.5 leading-relaxed border border-emerald-200 dark:border-emerald-800">{s.suggestedRewrite}</p>
                          <button
                            onClick={() => navigator.clipboard.writeText(s.suggestedRewrite)}
                            className="text-[10px] text-primary hover:underline mt-1.5 flex items-center gap-1">
                            Copy rewrite
                          </button>
                        </div>
                      )}
                      {s.whyItMatters && (
                        <p className="text-[11px] text-muted-foreground leading-relaxed border-l-2 border-primary/30 pl-3">
                          {s.whyItMatters}
                        </p>
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