// app/dashboard/cv/templates/page.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Sparkles, CheckCircle2, Loader2, Copy,
  FileText, Download, ChevronRight, Search, X,
  Zap, Award, BarChart3, RefreshCw,
} from 'lucide-react'
import type { NHSTemplate } from '@/lib/cv/nhs-templates'
import { CV_TEMPLATES, TEMPLATE_CATEGORIES, CvPreviewRouter } from '@/components/cv-preview-templates'
import type { CvData } from '@/components/cv-preview-templates'

// ── Sample CV for preview rendering ──────────────────────────────────────────
const SAMPLE: CvData = {
  id: 'preview', title: 'Preview', template: 'classic',
  fullName: 'Sarah Johnson',
  email: 'sarah.johnson@email.com',
  phone: '07700 900123',
  location: 'Edinburgh, Scotland',
  professionalRegistration: 'NMC PIN: 12A3456E',
  personalStatement: 'Dedicated registered nurse with 6 years of experience delivering compassionate, evidence-based care across acute medical and surgical wards. Demonstrated ability to lead handovers, mentor Band 2–3 staff, and contribute to clinical audit and quality improvement initiatives. Committed to upholding NHS values and delivering person-centred care.',
  workExperience: [
    { id: '1', jobTitle: 'Staff Nurse', employer: 'NHS Lothian', location: 'Edinburgh', startDate: 'Jan 2020', endDate: '', current: true, bullets: ['Delivered safe, compassionate care to a caseload of 8–10 patients per shift on a 28-bed acute medical ward', 'Mentored 3 Band 2 healthcare assistants and supported their NVQ progression', 'Led weekly clinical governance meetings and contributed to a falls reduction audit (23% reduction)'] },
    { id: '2', jobTitle: 'Junior Staff Nurse', employer: 'NHS Greater Glasgow & Clyde', location: 'Glasgow', startDate: 'Sep 2018', endDate: 'Dec 2019', current: false, bullets: ['Completed preceptorship programme with distinction', 'Managed drug rounds and IV medication administration for 12-bed surgical bay'] },
  ],
  education: [
    { id: '1', qualification: 'BSc (Hons) Nursing — Adult', institution: 'University of Edinburgh', location: 'Edinburgh', startDate: 'Sep 2015', endDate: 'Jun 2018', grade: '2:1' },
  ],
  skills: [
    { id: '1', category: 'Clinical', items: 'IV cannulation, medication administration, wound assessment, patient observation' },
    { id: '2', category: 'Core', items: 'MDT working, clinical governance, safeguarding, infection control, NMC standards' },
  ],
  certifications: [
    { id: '1', name: 'Basic Life Support', issuer: 'NHS Lothian', date: 'Mar 2025', expiryDate: 'Mar 2026' },
    { id: '2', name: 'IV Therapy Certificate', issuer: 'RCN', date: 'Jun 2024', expiryDate: '' },
  ],
  additionalInfo: '',
  references: [
    { id: '1', name: 'Dr. Patricia Moss', role: 'Ward Manager', organisation: 'NHS Lothian', relationship: 'Line manager', email: 'p.moss@nhslothian.scot.nhs.uk', phone: '' },
  ],
}

interface Generated {
  personalStatement:  string
  keySkills:          string[]
  achievementBullets: string[]
  sectionGuidance:    Record<string, string>
  atsScore:           { keywordsIncluded: string[]; keywordsMissing: string[]; recommendation: string }
  coverLetterOpener:  string
}

// Mini template thumbnail — renders a scaled-down version of the actual template
function TemplateThumbnail({ templateId, isSelected }: { templateId: string; isSelected: boolean }) {
  const sampleWithTemplate = { ...SAMPLE, template: templateId }
  return (
    <div style={{
      width: '100%',
      aspectRatio: '210/297',
      overflow: 'hidden',
      borderRadius: 6,
      position: 'relative',
      border: isSelected ? '2px solid #3b82f6' : '1px solid #e2e8f0',
      boxShadow: isSelected ? '0 0 0 3px rgba(59,130,246,0.2)' : '0 1px 3px rgba(0,0,0,0.06)',
      transition: 'all 0.15s',
      background: '#fff',
    }}>
      <div style={{ transform: 'scale(0.28)', transformOrigin: 'top left', width: '357%', height: '357%', pointerEvents: 'none' }}>
        <CvPreviewRouter cv={sampleWithTemplate} />
      </div>
      {isSelected && (
        <div style={{ position: 'absolute', top: 6, right: 6, background: '#3b82f6', borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CheckCircle2 size={11} color="#fff" />
        </div>
      )}
    </div>
  )
}

export default function CVTemplatesPage() {
  const [nhsTemplates,  setNhsTemplates]  = useState<NHSTemplate[]>([])
  const [loading,       setLoading]       = useState(true)
  const [selectedCvT,  setSelectedCvT]   = useState(CV_TEMPLATES[0])
  const [selectedRole, setSelectedRole]  = useState<NHSTemplate | null>(null)
  const [catFilter,    setCatFilter]     = useState('All')
  const [search,       setSearch]        = useState('')
  const [step,         setStep]          = useState<1|2|3>(1)
  const [context,      setContext]       = useState('')
  const [generating,   setGenerating]    = useState(false)
  const [generated,    setGenerated]     = useState<Generated | null>(null)
  const [error,        setError]         = useState<string|null>(null)
  const [copied,       setCopied]        = useState<string|null>(null)
  const [preview,      setPreview]       = useState<CvData>({ ...SAMPLE, template: CV_TEMPLATES[0].id })

  useEffect(() => {
    fetch('/api/cv/templates')
      .then(r => r.json())
      .then(d => setNhsTemplates(d.templates ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    setPreview(p => ({ ...p, template: selectedCvT.id }))
  }, [selectedCvT])

  const filteredCvTemplates = CV_TEMPLATES.filter(t => {
    const matchCat  = catFilter === 'All' || (t as any).category === catFilter
    const matchSearch = !search || t.label.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  const filteredRoles = nhsTemplates.filter(t =>
    !search || t.title.toLowerCase().includes(search.toLowerCase()) || t.band.toLowerCase().includes(search.toLowerCase())
  )

  const generate = async () => {
    if (!selectedRole) return
    setGenerating(true); setError(null)
    try {
      const res  = await fetch('/api/cv/templates', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ templateId: selectedRole.id, additionalContext: context }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Generation failed')
      setGenerated(data.generated)
      setStep(3)
    } catch (e: any) { setError(e.message) }
    finally { setGenerating(false) }
  }

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="min-h-screen bg-slate-950">

      {/* Top bar */}
      <div className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-slate-400 hover:text-white transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-sm font-bold text-white">NHS CV Templates</h1>
              <p className="text-[11px] text-slate-500">12 designs · AI-generated content · ATS optimised</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard/cv-builder" className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white border border-slate-700 rounded-lg px-3 py-1.5 transition-colors">
              <FileText className="w-3.5 h-3.5" /> Open CV Builder
            </Link>
            <Link href="/dashboard/cover-letter" className="flex items-center gap-1.5 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded-lg px-3 py-1.5 transition-colors font-semibold">
              <Sparkles className="w-3.5 h-3.5" /> Cover Letter AI
            </Link>
          </div>
        </div>
      </div>

      {/* Step indicator */}
      <div className="border-b border-slate-800 bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-2">
          {[
            { n: 1, label: 'Choose visual design' },
            { n: 2, label: 'Choose role template' },
            { n: 3, label: 'Review AI content' },
          ].map((s, i) => (
            <div key={s.n} className="flex items-center gap-2">
              <button
                onClick={() => { if (s.n <= step) setStep(s.n as 1|2|3) }}
                className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                  step === s.n ? 'bg-blue-600 text-white' :
                  step > s.n  ? 'bg-emerald-900/50 text-emerald-400 cursor-pointer hover:bg-emerald-900' :
                  'text-slate-600 cursor-default'
                }`}>
                {step > s.n ? <CheckCircle2 className="w-3 h-3" /> : <span className="w-4 h-4 rounded-full border border-current flex items-center justify-center text-[10px]">{s.n}</span>}
                {s.label}
              </button>
              {i < 2 && <ChevronRight className="w-3 h-3 text-slate-700" />}
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* ── STEP 1: Choose visual design ───────────────────────────────── */}
        {step === 1 && (
          <div className="grid lg:grid-cols-[320px_1fr] gap-8">

            {/* Left: template gallery */}
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-black text-white mb-1">Choose your design</h2>
                <p className="text-sm text-slate-400">Pick the visual style that fits your role and seniority.</p>
              </div>

              {/* Search + filter */}
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                  <input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search templates…"
                    className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500" />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {TEMPLATE_CATEGORIES.map(cat => (
                    <button key={cat} onClick={() => setCatFilter(cat)}
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-full transition-all ${catFilter === cat ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Template grid */}
              <div className="grid grid-cols-2 gap-3 max-h-[calc(100vh-320px)] overflow-y-auto pr-1">
                {filteredCvTemplates.map(t => (
                  <button key={t.id} onClick={() => setSelectedCvT(t)}
                    className="text-left group">
                    <TemplateThumbnail templateId={t.id} isSelected={selectedCvT.id === t.id} />
                    <div className="mt-2 px-0.5">
                      <div className="flex items-center gap-1.5">
                        <span style={{ background: (t as any).color ?? '#1B3A5C' }} className="w-2 h-2 rounded-full shrink-0" />
                        <p className="text-[11px] font-bold text-white truncate">{t.label}</p>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5 truncate">{(t as any).best}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Right: live preview */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span style={{ background: (selectedCvT as any).color ?? '#1B3A5C' }} className="w-3 h-3 rounded-full" />
                    <h3 className="text-base font-black text-white">{selectedCvT.label}</h3>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{selectedCvT.desc} · Best for: {(selectedCvT as any).best}</p>
                </div>
                <button onClick={() => setStep(2)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold transition-colors">
                  Use this design <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Full preview */}
              <div className="rounded-2xl overflow-hidden border border-slate-700 shadow-2xl"
                style={{ maxHeight: 'calc(100vh - 240px)', overflowY: 'auto' }}>
                <CvPreviewRouter cv={preview} />
              </div>

              <p className="text-[11px] text-slate-600 text-center">Preview uses sample data — your real content appears after generation</p>
            </div>
          </div>
        )}

        {/* ── STEP 2: Choose role template ───────────────────────────────── */}
        {step === 2 && (
          <div className="grid lg:grid-cols-[380px_1fr] gap-8">

            {/* Left: role picker */}
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div style={{ background: (selectedCvT as any).color ?? '#1B3A5C' }} className="w-3 h-3 rounded-full" />
                  <span className="text-xs text-slate-400 font-semibold">{selectedCvT.label}</span>
                </div>
                <h2 className="text-lg font-black text-white mb-1">Choose your role</h2>
                <p className="text-sm text-slate-400">Select the NHS role closest to yours. AI will generate keywords and content specific to that role.</p>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search roles e.g. phlebotomist, BMS…"
                  className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500" />
              </div>

              <div className="space-y-2 max-h-[calc(100vh-380px)] overflow-y-auto pr-1">
                {loading ? (
                  <div className="flex items-center justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-slate-500" /></div>
                ) : filteredRoles.map(t => (
                  <button key={t.id} onClick={() => setSelectedRole(t)}
                    className={`w-full text-left rounded-2xl border p-4 transition-all ${
                      selectedRole?.id === t.id
                        ? 'border-blue-500 bg-blue-950/40 shadow-[0_0_0_1px_rgba(59,130,246,0.3)]'
                        : 'border-slate-700 bg-slate-800/50 hover:border-slate-600 hover:bg-slate-800'
                    }`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            t.band.includes('5') || t.band.includes('6') ? 'bg-purple-900/60 text-purple-300' :
                            t.band.includes('4') ? 'bg-indigo-900/60 text-indigo-300' :
                            t.band.includes('3') ? 'bg-blue-900/60 text-blue-300' :
                            'bg-slate-700 text-slate-300'
                          }`}>{t.band}</span>
                          <span className="text-[10px] text-slate-500 font-medium">{t.category}</span>
                          {t.registrationBody && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-900/50 text-amber-300">{t.registrationBody}</span>}
                        </div>
                        <p className="text-sm font-bold text-white">{t.title}</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {t.atsKeywords.slice(0, 4).map(kw => (
                            <span key={kw} className="text-[9px] px-1.5 py-0.5 rounded bg-slate-700/60 text-slate-400">{kw}</span>
                          ))}
                          {t.atsKeywords.length > 4 && <span className="text-[9px] text-slate-600">+{t.atsKeywords.length - 4}</span>}
                        </div>
                      </div>
                      {selectedRole?.id === t.id && <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Right: selected role details + context input */}
            <div className="space-y-5">
              {!selectedRole ? (
                <div className="rounded-2xl border border-dashed border-slate-700 p-16 text-center space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto">
                    <Award className="w-6 h-6 text-slate-600" />
                  </div>
                  <p className="text-base font-bold text-slate-400">Select a role template</p>
                  <p className="text-sm text-slate-600">Choose from {nhsTemplates.length} NHS-specific roles on the left.</p>
                </div>
              ) : (
                <>
                  {/* Role detail card */}
                  <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6 space-y-5">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-900/60 text-blue-300">{selectedRole.band}</span>
                        <span className="text-xs text-slate-500">{selectedRole.category}</span>
                      </div>
                      <h3 className="text-lg font-black text-white">{selectedRole.title}</h3>
                      <p className="text-sm text-slate-400 mt-1">{selectedRole.description}</p>
                    </div>

                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">ATS Keywords ({selectedRole.atsKeywords.length})</p>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedRole.atsKeywords.map(kw => (
                          <span key={kw} className="text-[10px] px-2 py-0.5 rounded-full bg-blue-950/60 text-blue-300 border border-blue-800/50 font-medium">{kw}</span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">CV Sections</p>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedRole.sections.map(s => (
                          <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700/60 text-slate-400">{s}</span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Achievement Prompts</p>
                      <div className="space-y-2">
                        {selectedRole.starPrompts.map((p, i) => (
                          <p key={i} className="text-xs text-slate-400 flex gap-2">
                            <span className="text-blue-400 font-bold shrink-0">{i + 1}.</span>
                            {p}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Context input */}
                  <div className="rounded-2xl border border-slate-700 bg-slate-800/30 p-5 space-y-3">
                    <div>
                      <p className="text-sm font-bold text-white">Add your context <span className="text-slate-500 font-normal">(optional but recommended)</span></p>
                      <p className="text-xs text-slate-500 mt-0.5">The more you add, the more personalised the output. Years of experience, your employer, key achievements.</p>
                    </div>
                    <textarea value={context} onChange={e => setContext(e.target.value)} rows={4}
                      placeholder={`e.g. 4 years phlebotomy experience at NHS Lothian, competent in paediatric venepuncture, IBMS member, looking to progress to Band 4…`}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3.5 text-sm text-white placeholder-slate-600 resize-none focus:outline-none focus:border-blue-500" />
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 bg-red-950/40 border border-red-800/50 rounded-xl px-4 py-3">
                      <X className="w-4 h-4 text-red-400 shrink-0" />
                      <p className="text-sm text-red-300">{error}</p>
                    </div>
                  )}

                  <button onClick={generate} disabled={generating}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 disabled:opacity-50 text-white font-black text-base flex items-center justify-center gap-3 transition-all shadow-lg shadow-blue-900/30">
                    {generating
                      ? <><Loader2 className="w-5 h-5 animate-spin" /> Generating NHS CV content…</>
                      : <><Zap className="w-5 h-5" /> Generate AI CV Content</>}
                  </button>

                  <p className="text-[11px] text-slate-600 text-center">Generates: personal statement · key skills · achievement bullets · section guidance · ATS score</p>
                </>
              )}
            </div>
          </div>
        )}

        {/* ── STEP 3: Review generated content ──────────────────────────── */}
        {step === 3 && generated && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h2 className="text-xl font-black text-white">Your AI-generated CV content</h2>
                <p className="text-sm text-slate-400 mt-1">
                  For <span className="text-white font-semibold">{selectedRole?.title}</span> using the <span className="font-semibold" style={{ color: (selectedCvT as any).color ?? '#60a5fa' }}>{selectedCvT.label}</span> design.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => { setStep(2); setGenerated(null) }}
                  className="flex items-center gap-1.5 text-xs border border-slate-700 text-slate-400 hover:text-white rounded-lg px-3 py-2 transition-colors">
                  <RefreshCw className="w-3.5 h-3.5" /> Regenerate
                </button>
                <Link href="/dashboard/cv-builder"
                  className="flex items-center gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg px-3 py-2 font-bold transition-colors">
                  <FileText className="w-3.5 h-3.5" /> Open in CV Builder
                </Link>
              </div>
            </div>

            {/* ATS score banner */}
            <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-5">
              <div className="flex items-start justify-between gap-6 flex-wrap">
                <div className="space-y-2 flex-1">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">ATS Keywords Included</p>
                  <div className="flex flex-wrap gap-1.5">
                    {generated.atsScore.keywordsIncluded.map(kw => (
                      <span key={kw} className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-300 border border-emerald-800/50 font-medium">{kw}</span>
                    ))}
                  </div>
                </div>
                <div className="shrink-0 max-w-xs">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">ATS Recommendation</p>
                  <p className="text-xs text-slate-300">{generated.atsScore.recommendation}</p>
                </div>
              </div>
            </div>

            {/* Content sections */}
            <div className="grid md:grid-cols-2 gap-4">

              {/* Personal Statement */}
              <div className="md:col-span-2 rounded-2xl border border-slate-700 bg-slate-800/30 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-700/50 bg-slate-800/50">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-400" />
                    <p className="text-sm font-bold text-white">Personal Statement</p>
                    <span className="text-[10px] text-slate-500">{generated.personalStatement.split(' ').length} words</span>
                  </div>
                  <button onClick={() => copy(generated.personalStatement, 'statement')}
                    className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors">
                    {copied === 'statement' ? <><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                  </button>
                </div>
                <div className="px-5 py-4">
                  <p className="text-sm text-slate-200 leading-relaxed">{generated.personalStatement}</p>
                </div>
              </div>

              {/* Key Skills */}
              <div className="rounded-2xl border border-slate-700 bg-slate-800/30 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-700/50 bg-slate-800/50">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-teal-400" />
                    <p className="text-sm font-bold text-white">Key Skills</p>
                  </div>
                  <button onClick={() => copy(generated.keySkills.join('\n'), 'skills')}
                    className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors">
                    {copied === 'skills' ? <><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                  </button>
                </div>
                <div className="px-5 py-4 flex flex-wrap gap-2">
                  {generated.keySkills.map((s, i) => (
                    <span key={i} className="text-xs px-3 py-1.5 rounded-full bg-teal-950/50 text-teal-300 border border-teal-800/50 font-medium">{s}</span>
                  ))}
                </div>
              </div>

              {/* Achievement Bullets */}
              <div className="rounded-2xl border border-slate-700 bg-slate-800/30 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-700/50 bg-slate-800/50">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-purple-400" />
                    <p className="text-sm font-bold text-white">Achievement Bullets</p>
                  </div>
                  <button onClick={() => copy(generated.achievementBullets.join('\n'), 'bullets')}
                    className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors">
                    {copied === 'bullets' ? <><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                  </button>
                </div>
                <div className="px-5 py-4 space-y-2.5">
                  {generated.achievementBullets.map((b, i) => (
                    <p key={i} className="text-sm text-slate-200 flex gap-2.5">
                      <span className="text-purple-400 shrink-0 font-bold">▸</span>
                      {b}
                    </p>
                  ))}
                </div>
              </div>

              {/* Section Guidance */}
              <div className="md:col-span-2 rounded-2xl border border-slate-700 bg-slate-800/30 overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-700/50 bg-slate-800/50">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-400" />
                    <p className="text-sm font-bold text-white">Section Guidance</p>
                  </div>
                </div>
                <div className="px-5 py-4 grid sm:grid-cols-3 gap-4">
                  {Object.entries(generated.sectionGuidance).map(([section, guidance]) => (
                    <div key={section}>
                      <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-1 capitalize">{section}</p>
                      <p className="text-xs text-slate-400 leading-relaxed">{guidance as string}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cover letter opener */}
              {generated.coverLetterOpener && (
                <div className="md:col-span-2 rounded-2xl border border-slate-700 bg-gradient-to-r from-blue-950/40 to-slate-800/30 p-5 flex items-start gap-4">
                  <Sparkles className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-2">Cover Letter Opener</p>
                    <p className="text-sm text-slate-200 leading-relaxed italic">"{generated.coverLetterOpener}"</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => copy(generated.coverLetterOpener, 'opener')}
                      className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors">
                      {copied === 'opener' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <Link href="/dashboard/cover-letter"
                      className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1">
                      Full letter <ChevronRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom CTA */}
            <div className="rounded-2xl border border-emerald-800/30 bg-emerald-950/20 p-5 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-sm font-bold text-white">Ready to build your full CV?</p>
                <p className="text-xs text-slate-400 mt-0.5">Copy the content above into the CV Builder, then export as a professional Word document.</p>
              </div>
              <div className="flex gap-3">
                <Link href="/dashboard/cv-builder"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold transition-colors">
                  <FileText className="w-4 h-4" /> Open CV Builder
                </Link>
                <Link href="/dashboard/cover-letter"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-600 hover:border-slate-500 text-slate-300 hover:text-white text-sm font-semibold transition-colors">
                  <Sparkles className="w-4 h-4" /> Cover Letter
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}