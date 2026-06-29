// app/dashboard/job-ready/page.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Zap, Loader2, Copy, CheckCircle2, ChevronRight,
  FileText, Mail, Mic, Calendar, Target, AlertCircle, ClipboardList,
  Sparkles, ExternalLink, TrendingUp, Minus,
  ChevronDown, Clock, Building2, Trash2,
} from 'lucide-react'

type Tab = 'cv' | 'cover' | 'statement' | 'interview' | 'plan'

interface SavedPackage {
  id: string; jobTitle: string; employer: string; band: string; updatedAt: string
}

interface Result {
  jobTitle: string; employer: string; band: string; location: string
  closingDate: string | null; essentialCriteria: string[]; atsKeywords: string[]
  cvContent: { personalStatement: string; keySkills: string[]; achievementBullets: string[] }
  coverLetter: { body: string; subjectLine: string }
  supportingStatement: {
    intro: string
    criteria: { criterion: string; starEvidence: string }[]
    closing: string
  }
  interviewPrep: {
    questions: { question: string; keyPoints: string[] }[]
    researchTips: string[]
  }
  actionPlan: { day: number; task: string; timeMinutes: number }[]
  shortlistChance: { score: number; verdict: string; gaps: string[]; strengths: string[] }
}

const TABS: { id: Tab; label: string; icon: any }[] = [
  { id: 'cv',        label: 'CV Content',     icon: FileText     },
  { id: 'cover',     label: 'Cover Letter',   icon: Mail         },
  { id: 'statement', label: 'Statement',      icon: ClipboardList},
  { id: 'interview', label: 'Interview Prep', icon: Mic          },
  { id: 'plan',      label: 'Action Plan',    icon: Calendar     },
]


// ── Inline package detail loader ──────────────────────────────────────────────
function PkgDetail({ pkgId, jobTitle, employer, onPushToCV }: { pkgId:string; jobTitle:string; employer:string; onPushToCV?:(d:any)=>void }) {
  const [data,    setData]    = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [copied,  setCopied]  = useState<string|null>(null)

  useEffect(() => {
    fetch(`/api/job-ready?id=${pkgId}`)
      .then(r => r.json())
      .then(d => setData(d.packageData))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [pkgId])

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  if (loading) return (
    <div className="px-5 py-6 border-t border-border flex items-center gap-2 text-muted-foreground">
      <Loader2 className="w-4 h-4 animate-spin" /> Loading saved content…
    </div>
  )

  if (!data) return (
    <div className="px-5 py-4 border-t border-border text-sm text-muted-foreground">
      Content not available. <Link href={`/dashboard/application/${pkgId}`} className="text-primary underline">Open in Application Tracker →</Link>
    </div>
  )

  return (
    <div className="border-t border-border bg-white">
      {/* Mini tabs */}
      <div className="flex gap-0 border-b border-border overflow-x-auto">
        {(['cv','cover','statement','interview','plan'] as const).map(tab => (
          <MiniTab key={tab} tab={tab} />
        ))}
      </div>
      <PkgContent data={data} copy={copy} copied={copied} onPushToCV={onPushToCV} />
    </div>
  )
}

function MiniTab({ tab }: { tab: string }) {
  const labels: Record<string,string> = { cv:'CV', cover:'Cover Letter', statement:'Statement', interview:'Interview', plan:'Plan' }
  return <div className="px-3 py-2 text-xs text-muted-foreground border-b-2 border-transparent">{labels[tab]}</div>
}

function PkgContent({ data, copy, copied, onPushToCV }: { data:any; copy:(t:string,k:string)=>void; copied:string|null; onPushToCV?:(d:any)=>void }) {
  const [tab, setTab] = useState<'cv'|'cover'|'statement'|'interview'|'plan'>('cv')
  const [tabLabels] = useState([
    {id:'cv',label:'CV'},{id:'cover',label:'Cover Letter'},{id:'statement',label:'Statement'},
    {id:'interview',label:'Interview'},{id:'plan',label:'Plan'},
  ])

  return (
    <div>
      <div className="flex border-b border-border overflow-x-auto">
        {tabLabels.map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            className={`px-4 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 -mb-px transition-all ${tab===t.id ? 'text-primary border-primary' : 'text-muted-foreground border-transparent hover:text-foreground'}`}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="p-5">
        {tab === 'cv' && (
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs font-bold text-foreground">Personal Statement</p>
                <div className="flex items-center gap-2">
                  <button onClick={() => copy(data.cvContent?.personalStatement||data.personalStatement||'', 'ps-saved')} className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1">
                    <Copy className="w-3 h-3" /> Copy
                  </button>
                  <button onClick={() => onPushToCV?.(data)}
                    className="text-[10px] font-bold px-2 py-1 rounded-md bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1 transition-colors">
                    <FileText className="w-3 h-3" /> Push to CV Builder
                  </button>
                </div>
              </div>
              <p className="text-xs text-foreground leading-relaxed bg-muted/30 rounded-lg p-3">{data.cvContent?.personalStatement || data.personalStatement}</p>
            </div>
            {(data.cvContent?.keySkills || data.keySkills)?.length > 0 && (
              <div>
                <p className="text-xs font-bold text-foreground mb-1.5">Key Skills</p>
                <div className="flex flex-wrap gap-1.5">
                  {(data.cvContent?.keySkills || data.keySkills || []).map((s:string,i:number) => <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">{s}</span>)}
                </div>
              </div>
            )}
            {(data.cvContent?.achievementBullets || data.achievementBullets)?.length > 0 && (
              <div>
                <p className="text-xs font-bold text-foreground mb-1.5">Achievement Bullets</p>
                {(data.cvContent?.achievementBullets || data.achievementBullets || []).map((b:string,i:number) => (
                  <p key={i} className="text-xs text-foreground flex gap-2 py-1.5 border-b border-border/40 last:border-0"><span className="text-primary shrink-0">▸</span>{b}</p>
                ))}
              </div>
            )}
          </div>
        )}
        {tab === 'cover' && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-foreground">Cover Letter</p>
              <button onClick={() => copy(data.coverLetter?.body||'', 'cover-saved')} className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1"><Copy className="w-3 h-3" /> Copy</button>
            </div>
            <p className="text-xs text-foreground leading-relaxed bg-muted/30 rounded-lg p-3 whitespace-pre-wrap">{data.coverLetter?.body}</p>
          </div>
        )}
        {tab === 'statement' && (
          <div className="space-y-3">
            <p className="text-xs text-foreground italic">{data.supportingStatement?.intro}</p>
            {data.supportingStatement?.criteria?.map((c:any,i:number) => (
              <div key={i} className="rounded-lg border border-border overflow-hidden">
                <div className="bg-muted/40 px-3 py-2 border-b border-border">
                  <p className="text-[10px] font-bold text-primary">{c.criterion}</p>
                </div>
                <p className="text-xs text-foreground p-3 leading-relaxed">{c.starEvidence}</p>
              </div>
            ))}
            <p className="text-xs text-foreground italic">{data.supportingStatement?.closing}</p>
          </div>
        )}
        {tab === 'interview' && (
          <div className="space-y-3">
            {data.interviewPrep?.questions?.map((q:any,i:number) => (
              <div key={i} className="rounded-lg border border-amber-200 bg-amber-50 overflow-hidden">
                <p className="text-xs font-semibold text-amber-900 px-3 py-2 border-b border-amber-100">Q{i+1}. {q.question}</p>
                <div className="px-3 py-2 space-y-1">
                  {q.keyPoints?.map((pt:string,j:number) => <p key={j} className="text-[11px] text-amber-800 flex gap-1.5"><span>→</span>{pt}</p>)}
                </div>
              </div>
            ))}
          </div>
        )}
        {tab === 'plan' && (
          <div className="space-y-2">
            {data.actionPlan?.map((item:any,i:number) => (
              <div key={i} className="flex items-start gap-3 rounded-lg border border-border bg-background p-3">
                <span className="text-[10px] font-black text-primary bg-primary/10 rounded-lg w-8 h-8 flex items-center justify-center shrink-0">D{item.day}</span>
                <div>
                  <p className="text-xs text-foreground">{item.task}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">~{item.timeMinutes} mins</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}


export default function JobReadyPage() {
  const [jobText,    setJobText]    = useState('')
  const [loading,    setLoading]    = useState(false)
  const [result,     setResult]     = useState<Result | null>(null)
  const [error,      setError]      = useState<string | null>(null)
  const [activeTab,  setActiveTab]  = useState<Tab>('cv')
  const [copied,     setCopied]     = useState<string | null>(null)
  const [history,    setHistory]    = useState<SavedPackage[]>([])
  const [savedAppId,   setSavedAppId]   = useState<string | null>(null)
  const [cvProfileId,  setCvProfileId]  = useState<string | null>(null)
  const [pushingToCV,  setPushingToCV]  = useState(false)
  const [cvPushed,     setCvPushed]     = useState(false)
  const [histOpen,   setHistOpen]   = useState(true)
  const [expandedPkg, setExpandedPkg] = useState<string|null>(null)

  useEffect(() => {
    fetch('/api/job-ready')
      .then(r => r.json())
      .then(d => setHistory(d.packages ?? []))
      .catch(() => {})
  }, [])


  const pushToCV = async (packageData?: any) => {
    // Handle both nested (saved pkg: data.cvContent.x) and flat (current result: data.x) structures
    const ps      = packageData?.cvContent?.personalStatement || packageData?.personalStatement || result?.cvContent?.personalStatement
    const skills  = packageData?.cvContent?.keySkills || packageData?.keySkills || result?.cvContent?.keySkills || []
    const bullets = packageData?.cvContent?.achievementBullets || packageData?.achievementBullets || result?.cvContent?.achievementBullets || []
    if (!ps) return
    setPushingToCV(true)
    try {
      const res = await fetch('/api/cv/populate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          personalStatement:  ps,
          keySkills:          skills,
          achievementBullets: bullets,
          title:              result?.jobTitle || 'My CV',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Push failed')
      setCvProfileId(data.profileId)
      setCvPushed(true)
      // Redirect to CV builder — fresh load picks up new DB content
      window.location.href = '/dashboard/cv-builder'
    } catch (e: any) {
      console.error('Push to CV failed:', e)
      alert('Could not push to CV Builder: ' + e.message)
    }
    finally { setPushingToCV(false) }
  }


  const deletePackage = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Delete this saved package? This cannot be undone.')) return
    try {
      const res = await fetch('/api/job-ready', {
        method:  'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ id }),
      })
      if (!res.ok) throw new Error('Delete failed')
      setHistory(prev => prev.filter(p => p.id !== id))
      if (expandedPkg === id) setExpandedPkg(null)
    } catch (e: any) {
      alert('Could not delete: ' + e.message)
    }
  }

  const reloadHistory = () =>
    fetch('/api/job-ready').then(r => r.json()).then(d => setHistory(d.packages ?? [])).catch(() => {})

  const generate = async () => {
    if (!jobText.trim()) return
    setLoading(true); setError(null); setResult(null); setSavedAppId(null)
    try {
      const res  = await fetch('/api/job-ready', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobText }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Generation failed')
      setResult(data.result)
      setActiveTab('cv')
      if (data.applicationId) setSavedAppId(data.applicationId)
      if (data.cvProfileId)  setCvProfileId(data.cvProfileId)
      if (data.cvProfileId)  setCvPushed(true)
      reloadHistory()
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2500)
  }

  const CopyBtn = ({ text, id }: { text: string; id: string }) => (
    <button onClick={() => copy(text, id)}
      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2.5 py-1.5 rounded-lg hover:bg-muted">
      {copied === id
        ? <><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Copied</>
        : <><Copy className="w-3.5 h-3.5" /> Copy</>}
    </button>
  )

  const score = result?.shortlistChance.score ?? 0
  const scoreRing = score >= 75 ? 'stroke-emerald-500' : score >= 50 ? 'stroke-amber-500' : 'stroke-red-500'
  const scoreText = score >= 75 ? 'text-emerald-700' : score >= 50 ? 'text-amber-600' : 'text-red-600'
  const scoreBg   = score >= 75 ? 'bg-emerald-50 border-emerald-200' : score >= 50 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'
  const circumference = 2 * Math.PI * 28

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">

      {/* Header */}
      <div>
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-3 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
        </Link>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
              <Zap className="w-6 h-6 text-yellow-500" /> Job Ready™
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">Paste any NHS job advert → complete application package in 30 seconds</p>
          </div>
          {result && (
            <button onClick={() => { setResult(null); setJobText('') }}
              className="text-xs border border-border text-muted-foreground hover:text-foreground rounded-lg px-3 py-2 transition-colors">
              ← New job
            </button>
          )}
        </div>
      </div>

      {/* Saved packages — prominent, always visible, load content inline */}
      <div className="rounded-2xl border-2 border-primary/20 bg-primary/5 overflow-hidden">
        <button onClick={() => setHistOpen(h => !h)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-primary/10 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div className="text-left">
              <p className="text-sm font-black text-foreground">My Saved Job Ready™ Packages</p>
              <p className="text-xs text-muted-foreground">
                {history.length === 0 ? 'No packages yet — generate your first one below' : `${history.length} saved · click any to view the full content`}
              </p>
            </div>
          </div>
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${histOpen ? 'rotate-180' : ''}`} />
        </button>

        {histOpen && history.length === 0 && !result && (
          <div className="border-t border-primary/10 px-5 py-8 text-center">
            <Zap className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Paste a job advert below and click Generate — your package will appear here.</p>
          </div>
        )}

        {histOpen && history.length > 0 && (
          <div className="border-t border-primary/10">
            <div className="divide-y divide-border">
              {history.map(pkg => (
                <div key={pkg.id}>
                  <div
                    onClick={() => setExpandedPkg(expandedPkg === pkg.id ? null : pkg.id)}
                    className="w-full flex items-center gap-4 px-5 py-4 hover:bg-white/60 transition-colors cursor-pointer group">
                    <div className="w-9 h-9 rounded-xl bg-white border border-border flex items-center justify-center shrink-0 shadow-sm">
                      <Building2 className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground">{pkg.jobTitle}</p>
                      <p className="text-xs text-muted-foreground">{pkg.employer}{pkg.band ? ` · ${pkg.band}` : ''} · {new Date(pkg.updatedAt).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Link href={`/dashboard/application/${pkg.id}`}
                        onClick={e => e.stopPropagation()}
                        className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors whitespace-nowrap">
                        Full application →
                      </Link>
                      <button
                        onClick={e => deletePackage(pkg.id, e)}
                        title="Delete package"
                        className="w-6 h-6 rounded-full flex items-center justify-center text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${expandedPkg === pkg.id ? 'rotate-180' : ''}`} />
                    </div>
                  </div>

                  {/* Inline expanded content */}
                  {expandedPkg === pkg.id && (
                    <PkgDetail pkgId={pkg.id} jobTitle={pkg.jobTitle} employer={pkg.employer} onPushToCV={pushToCV} />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      {!result && (
        <div className="grid md:grid-cols-2 gap-5">
          <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
            <p className="text-sm font-bold text-foreground flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-primary text-[10px] font-black text-primary-foreground flex items-center justify-center">1</span>
              Paste the full job advert
            </p>
            <textarea
              value={jobText}
              onChange={e => setJobText(e.target.value)}
              rows={13}
              placeholder="Copy and paste the complete NHS job advert here — job title, band, employer, description, and person specification.

The more you paste, the more accurate and personalised your application package will be."
              className="w-full bg-background border border-border rounded-xl p-4 text-sm text-foreground placeholder-muted-foreground/40 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 leading-relaxed"
            />
            <p className="text-[11px] text-muted-foreground">{jobText.length} characters · NHS Jobs, Trac, NHS Scotland, any format</p>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-5 space-y-1">
              <p className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-primary text-[10px] font-black text-primary-foreground flex items-center justify-center">2</span>
                What you'll get
              </p>
              {[
                { icon: FileText,      label: 'ATS-optimised CV content',  desc: 'Personal statement, skills, achievement bullets' },
                { icon: Mail,          label: 'NHS cover letter',           desc: '3-paragraph, evidence-led, under 320 words'      },
                { icon: ClipboardList, label: 'Supporting statement',        desc: 'Top 5 criteria with real STAR evidence'           },
                { icon: Mic,           label: 'Interview preparation',       desc: '5 panel questions with answer frameworks'        },
                { icon: Calendar,      label: '7-day action plan',           desc: 'Daily tasks specific to this employer'           },
                { icon: Target,        label: 'Shortlist chance analysis',   desc: 'Score, strengths, and gaps vs person spec'       },
              ].map(item => (
                <div key={item.label} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
                  <item.icon className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-foreground">{item.label}</p>
                    <p className="text-[11px] text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <button
              onClick={generate}
              disabled={loading || !jobText.trim()}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 disabled:opacity-40 text-white font-black text-base flex items-center justify-center gap-3 transition-all shadow-lg shadow-orange-200">
              {loading
                ? <><Loader2 className="w-5 h-5 animate-spin" /> Generating your package…</>
                : <><Zap className="w-5 h-5" /> Generate Everything</>}
            </button>
            <p className="text-[11px] text-muted-foreground text-center">~20–30 seconds · Personalised using your saved CV profile</p>
          </div>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-5">

          {/* Job header + saved confirmation */}
          <div className="rounded-2xl border border-border bg-card p-5 flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-lg font-black text-foreground">{result.jobTitle}</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {result.employer}{result.location ? ` · ${result.location}` : ''}{result.band ? ` · ${result.band}` : ''}
              </p>
              {result.closingDate && (
                <p className="text-xs text-amber-600 mt-1.5 font-semibold">⏰ Closes: {result.closingDate}</p>
              )}
              {savedAppId && (
                <p className="text-xs text-emerald-700 mt-1.5 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Saved to Application Tracker ·{' '}
                  <Link href={`/dashboard/application/${savedAppId}`} className="underline hover:no-underline font-semibold">
                    View application →
                  </Link>
                </p>
              )}
              {cvPushed ? (
                <p className="text-xs text-blue-700 mt-1 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Personal statement &amp; skills saved to CV Builder ·{' '}
                  <Link href="/dashboard/cv-builder" className="underline hover:no-underline font-semibold">
                    Open CV Builder →
                  </Link>
                </p>
              ) : (
                <button onClick={() => pushToCV()} disabled={pushingToCV}
                  className="mt-2 flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-60">
                  {pushingToCV ? <><Loader2 className="w-3 h-3 animate-spin" /> Pushing…</> : <><FileText className="w-3 h-3" /> Push to CV Builder</>}
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Link href="/dashboard/cv-builder"
                className="text-xs border border-border text-muted-foreground hover:text-foreground rounded-lg px-3 py-2 transition-colors flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" /> CV Builder
              </Link>
              <Link href="/dashboard/application"
                className="text-xs bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-3 py-2 font-bold transition-colors flex items-center gap-1.5">
                <ClipboardList className="w-3.5 h-3.5" /> Statement Builder
              </Link>
            </div>
          </div>

          {/* Analysis + ATS keywords row */}
          <div className="grid md:grid-cols-3 gap-4">

            {/* Shortlist chance — circular gauge */}
            <div className={`rounded-2xl border p-5 ${scoreBg}`}>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Shortlist Analysis</p>
              <div className="flex items-center gap-4">
                {/* SVG gauge */}
                <div className="relative shrink-0">
                  <svg width="72" height="72" viewBox="0 0 72 72">
                    <circle cx="36" cy="36" r="28" fill="none" stroke="#e5e7eb" strokeWidth="7" />
                    <circle cx="36" cy="36" r="28" fill="none"
                      className={scoreRing}
                      strokeWidth="7"
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={circumference - (circumference * score) / 100}
                      transform="rotate(-90 36 36)" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`text-lg font-black leading-none ${scoreText}`}>{score}%</span>
                  </div>
                </div>
                <div>
                  <p className={`text-sm font-black ${scoreText}`}>{result.shortlistChance.verdict}</p>
                  {result.shortlistChance.strengths.slice(0,2).map((s,i) => (
                    <p key={i} className="text-[11px] text-emerald-700 flex gap-1 mt-0.5"><TrendingUp className="w-3 h-3 shrink-0 mt-0.5" />{s}</p>
                  ))}
                  {result.shortlistChance.gaps.slice(0,2).map((g,i) => (
                    <p key={i} className="text-[11px] text-amber-700 flex gap-1 mt-0.5"><Minus className="w-3 h-3 shrink-0 mt-0.5" />{g}</p>
                  ))}
                </div>
              </div>
            </div>

            {/* Essential criteria */}
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Essential Criteria</p>
              <div className="space-y-1.5">
                {result.essentialCriteria.slice(0,5).map((c,i) => (
                  <p key={i} className="text-xs text-foreground flex gap-1.5">
                    <span className="text-primary font-bold shrink-0">{i+1}.</span>{c}
                  </p>
                ))}
              </div>
            </div>

            {/* ATS keywords */}
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">ATS Keywords</p>
              <div className="flex flex-wrap gap-1.5">
                {result.atsKeywords.map(kw => (
                  <span key={kw} className="text-[10px] px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-medium">{kw}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-border flex gap-0 overflow-x-auto">
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-all -mb-px ${
                  activeTab === tab.id
                    ? 'text-primary border-primary'
                    : 'text-muted-foreground border-transparent hover:text-foreground hover:border-border'
                }`}>
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden">

            {/* CV Content */}
            {activeTab === 'cv' && (
              <div className="p-6 space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-bold text-foreground">Personal Statement</p>
                    <CopyBtn text={result.cvContent.personalStatement} id="ps" />
                  </div>
                  <p className="text-sm text-foreground leading-relaxed bg-muted/30 rounded-xl p-4 border border-border">{result.cvContent.personalStatement}</p>
                </div>

                <div>
                  <p className="text-sm font-bold text-foreground mb-2">Key Skills</p>
                  <div className="flex flex-wrap gap-2">
                    {result.cvContent.keySkills.map((s,i) => (
                      <span key={i} className="text-xs px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-medium">{s}</span>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-bold text-foreground">Achievement Bullets</p>
                    <CopyBtn text={result.cvContent.achievementBullets.join('\n')} id="bullets" />
                  </div>
                  <div className="space-y-2">
                    {result.cvContent.achievementBullets.map((b,i) => (
                      <p key={i} className="text-sm text-foreground flex gap-2.5 py-2 border-b border-border/50 last:border-0">
                        <span className="text-primary shrink-0 font-bold">▸</span>{b}
                      </p>
                    ))}
                  </div>
                </div>

                <Link href="/dashboard/cv-builder" className="flex items-center gap-2 text-xs text-primary hover:text-primary/80 transition-colors font-semibold">
                  <ExternalLink className="w-3.5 h-3.5" /> Copy content into CV Builder → pick a template → download Word doc
                </Link>
              </div>
            )}

            {/* Cover Letter */}
            {activeTab === 'cover' && (
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-foreground">Cover Letter</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Subject line: <span className="font-medium text-foreground">{result.coverLetter.subjectLine}</span></p>
                  </div>
                  <CopyBtn text={result.coverLetter.body} id="cover" />
                </div>
                <div className="bg-muted/20 border border-border rounded-xl p-5">
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{result.coverLetter.body}</p>
                </div>
                <Link href="/dashboard/cover-letter" className="flex items-center gap-2 text-xs text-primary hover:text-primary/80 font-semibold transition-colors">
                  <ExternalLink className="w-3.5 h-3.5" /> Open in Cover Letter AI to refine and adjust tone
                </Link>
              </div>
            )}

            {/* Supporting Statement */}
            {activeTab === 'statement' && (
              <div className="p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-foreground">Supporting Statement</p>
                  <CopyBtn
                    text={
                      result.supportingStatement.intro + '\n\n' +
                      result.supportingStatement.criteria.map(c => `${c.criterion}\n\n${c.starEvidence}`).join('\n\n') + '\n\n' +
                      result.supportingStatement.closing
                    }
                    id="statement"
                  />
                </div>

                <div className="bg-muted/20 border border-border rounded-xl p-4">
                  <p className="text-sm text-foreground italic leading-relaxed">{result.supportingStatement.intro}</p>
                </div>

                <div className="space-y-4">
                  {result.supportingStatement.criteria.map((c,i) => (
                    <div key={i} className="rounded-xl border border-border overflow-hidden">
                      <div className="bg-muted/40 px-4 py-2.5 border-b border-border">
                        <p className="text-[11px] font-bold text-primary uppercase tracking-wider">Criterion {i+1}</p>
                        <p className="text-xs font-semibold text-foreground mt-0.5">{c.criterion}</p>
                      </div>
                      <div className="px-4 py-3">
                        <p className="text-sm text-foreground leading-relaxed">{c.starEvidence}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-muted/20 border border-border rounded-xl p-4">
                  <p className="text-sm text-foreground italic leading-relaxed">{result.supportingStatement.closing}</p>
                </div>

                <Link href="/dashboard/application" className="flex items-center gap-2 text-xs text-primary hover:text-primary/80 font-semibold transition-colors">
                  <ExternalLink className="w-3.5 h-3.5" /> Open in Statement Builder to expand with Q1/Q2/Q3 structure
                </Link>
              </div>
            )}

            {/* Interview Prep */}
            {activeTab === 'interview' && (
              <div className="p-6 space-y-5">
                <div>
                  <p className="text-sm font-bold text-foreground mb-3">Likely Panel Questions</p>
                  <div className="space-y-3">
                    {result.interviewPrep.questions.map((q,i) => (
                      <div key={i} className="rounded-xl border border-border overflow-hidden">
                        <div className="bg-amber-50 border-b border-amber-100 px-4 py-3">
                          <p className="text-sm font-semibold text-amber-900 flex gap-2">
                            <span className="text-amber-600 font-black shrink-0">Q{i+1}.</span>{q.question}
                          </p>
                        </div>
                        <div className="px-4 py-3 space-y-1.5">
                          {q.keyPoints.map((pt,j) => (
                            <p key={j} className="text-xs text-muted-foreground flex gap-2">
                              <span className="text-amber-500 shrink-0 font-bold">→</span>{pt}
                            </p>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-bold text-foreground mb-2">Research Before Your Interview</p>
                  <div className="space-y-2">
                    {result.interviewPrep.researchTips.map((tip,i) => (
                      <p key={i} className="text-sm text-foreground flex gap-2 py-2 border-b border-border/50 last:border-0">
                        <span className="text-primary shrink-0">📌</span>{tip}
                      </p>
                    ))}
                  </div>
                </div>

                <Link href="/dashboard/interview" className="flex items-center gap-2 text-xs text-primary hover:text-primary/80 font-semibold transition-colors">
                  <ExternalLink className="w-3.5 h-3.5" /> Practice these in Interview Simulator
                </Link>
              </div>
            )}

            {/* Action Plan */}
            {activeTab === 'plan' && (
              <div className="p-6">
                <p className="text-sm font-bold text-foreground mb-4">Your 7-Day Application Plan</p>
                <div className="space-y-2">
                  {result.actionPlan.map((item,i) => (
                    <div key={i} className="flex items-start gap-4 rounded-xl border border-border bg-background p-4 hover:bg-muted/20 transition-colors">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-xs font-black text-primary">D{item.day}</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-foreground">{item.task}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">~{item.timeMinutes} mins</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}