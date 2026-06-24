// app/dashboard/interview/[id]/page.tsx
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Mic, Square, ChevronRight, CheckCircle2, ChevronDown, ChevronUp,
  AlertTriangle, Clock, ArrowLeft, Loader2,
  Video, VideoOff, Sun, Moon, Users, MessageSquare,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type Panellist = { id: string; name: string; role: string; title: string; avatar: string; color: string; specialty: string }
type Question = { id: string; panellistId: string; question: string; category: string; followUp?: string; context?: string; scoringCriteria?: string }
type Evaluation = { score: number; verdict: string; strengths: string[]; gaps: string[]; panellistNote: string; improvementTip: string; starRating: { situation: boolean; task: boolean; action: boolean; result: boolean } }
type FollowUpData = { question: string; panellistId: string; interjection: string; transcript: string; evaluation: Evaluation }
type AnswerResult = { questionId: string; transcript: string; evaluation: Evaluation; followUp?: FollowUpData }
type Phase = 'loading' | 'lobby' | 'interview' | 'evaluating' | 'results'
type AnswerStep = 'answering' | 'evaluated' | 'follow-up-answering' | 'follow-up-evaluated'

// ─── Hooks ────────────────────────────────────────────────────────────────────

function useSpeechRecognition() {
  const ref = useRef<any>(null)
  const [isListening, setIsListening] = useState(false)
  const [interimText, setInterimText] = useState('')
  const cbRef = useRef<(t: string) => void>()
  const startListening = useCallback((onResult: (t: string) => void) => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) { alert('Speech recognition not supported. Use Chrome or Edge.'); return }
    const r = new SR(); r.continuous = true; r.interimResults = true; r.lang = 'en-GB'
    cbRef.current = onResult
    r.onresult = (e: any) => {
      let interim = '', final = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript + ' '
        else interim += e.results[i][0].transcript
      }
      if (final) cbRef.current?.(final.trim())
      setInterimText(interim)
    }
    r.onerror = () => {}
    r.onend = () => { if (ref.current) try { r.start() } catch {} }
    ref.current = r; r.start(); setIsListening(true)
  }, [])
  const stopListening = useCallback(() => {
    if (ref.current) { ref.current.onend = null; ref.current.stop(); ref.current = null }
    setIsListening(false); setInterimText('')
  }, [])
  return { isListening, interimText, startListening, stopListening }
}

function useWebcam() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [active, setActive] = useState(false)
  const toggle = useCallback(async () => {
    if (active) { streamRef.current?.getTracks().forEach(t => t.stop()); if (videoRef.current) videoRef.current.srcObject = null; streamRef.current = null; setActive(false) }
    else { try { const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: false }); streamRef.current = s; if (videoRef.current) videoRef.current.srcObject = s; setActive(true) } catch { alert('Camera access denied.') } }
  }, [active])
  useEffect(() => () => { streamRef.current?.getTracks().forEach(t => t.stop()) }, [])
  return { videoRef, active, toggle }
}

// ─── Small Components ─────────────────────────────────────────────────────────

function ThemeToggle() {
  const [dark, setDark] = useState(false)
  useEffect(() => { setDark(document.documentElement.classList.contains('dark')) }, [])
  return <button onClick={() => { document.documentElement.classList.toggle('dark'); setDark(d => !d) }} className="p-2 rounded-lg bg-muted hover:bg-accent transition-colors" title="Toggle theme">{dark ? <Sun className="w-4 h-4 text-yellow-400" /> : <Moon className="w-4 h-4 text-slate-600" />}</button>
}

function Timer({ isRunning }: { isRunning: boolean }) {
  const [s, setS] = useState(0)
  useEffect(() => { if (!isRunning) { setS(0); return }; const i = setInterval(() => setS(p => p + 1), 1000); return () => clearInterval(i) }, [isRunning])
  return <span className="font-mono text-sm text-red-500 dark:text-red-400 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />{String(Math.floor(s/60)).padStart(2,'0')}:{String(s%60).padStart(2,'0')}</span>
}

function CountdownTimer({ totalSeconds, onTimeUp }: { totalSeconds: number; onTimeUp: () => void }) {
  const [r, setR] = useState(totalSeconds)
  const called = useRef(false)
  useEffect(() => { const i = setInterval(() => setR(p => { if (p <= 1 && !called.current) { called.current = true; onTimeUp(); return 0 }; return p - 1 }), 1000); return () => clearInterval(i) }, [onTimeUp])
  const urgent = r <= 120, critical = r <= 60
  return <span className={`font-mono text-sm flex items-center gap-1.5 px-2.5 py-1 rounded-lg border ${critical ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800 animate-pulse' : urgent ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800' : 'text-foreground bg-muted border-border'}`}><Clock className="w-3.5 h-3.5" />{String(Math.floor(r/60)).padStart(2,'0')}:{String(r%60).padStart(2,'0')}{critical && <span className="text-[10px] font-semibold ml-1">ENDING</span>}</span>
}

function ScoreBadge({ score }: { score: number }) {
  const c = score >= 80 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300' : score >= 65 ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' : score >= 50 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
  return <span className={`${c} text-xs font-bold px-2.5 py-0.5 rounded-full`}>{score}%</span>
}

function StarBadge({ label, present }: { label: string; present: boolean }) {
  return <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${present ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800' : 'bg-red-50 text-red-500 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800'}`}>{label} {present ? '✓' : '✗'}</span>
}

function PanellistCard({ panellist, isSpeaking }: { panellist: Panellist; isSpeaking: boolean }) {
  return (
    <div className={`relative rounded-2xl overflow-hidden transition-all duration-500 aspect-[4/3] border-2 bg-card ${isSpeaking ? 'shadow-xl scale-[1.03]' : 'opacity-60 scale-100 border-transparent'}`} style={{ borderColor: isSpeaking ? panellist.color : 'transparent' }}>
      <div className="absolute inset-0 opacity-10" style={{ background: `radial-gradient(circle at center, ${panellist.color}, transparent 70%)` }} />
      <div className="absolute inset-0 flex flex-col items-center justify-center p-3">
        <div className={`w-14 h-14 rounded-full flex items-center justify-center text-3xl mb-2 ${isSpeaking ? 'animate-pulse' : ''}`} style={{ backgroundColor: `${panellist.color}20` }}>{panellist.avatar}</div>
        <p className="font-semibold text-foreground text-xs text-center">{panellist.name}</p>
        <p className="text-muted-foreground text-[10px] text-center">{panellist.role}</p>
      </div>
      {isSpeaking && <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-0.5">{[0,1,2,3,4].map(i => <div key={i} className="w-1 rounded-full animate-pulse" style={{ height: `${6+Math.random()*10}px`, backgroundColor: panellist.color, animationDelay: `${i*0.12}s` }} />)}</div>}
    </div>
  )
}

function EvalBlock({ ev }: { ev: Evaluation }) {
  return (
    <div className="space-y-3">
      {ev.panellistNote && <p className="text-sm text-muted-foreground italic border-l-2 border-muted pl-3">&quot;{ev.panellistNote}&quot;</p>}
      <div className="flex gap-2 flex-wrap">{['situation','task','action','result'].map(k => <StarBadge key={k} label={k.charAt(0).toUpperCase()} present={(ev.starRating as any)?.[k]} />)}</div>
      {ev.strengths?.length > 0 && <div className="space-y-1">{ev.strengths.map((s,i) => <p key={i} className="text-xs text-emerald-600 dark:text-emerald-400 flex gap-1.5"><CheckCircle2 className="w-3 h-3 shrink-0 mt-0.5" /> {s}</p>)}</div>}
      {ev.gaps?.length > 0 && <div className="space-y-1">{ev.gaps.map((g,i) => <p key={i} className="text-xs text-amber-600 dark:text-amber-400 flex gap-1.5"><AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" /> {g}</p>)}</div>}
      {ev.improvementTip && <p className="text-xs text-primary bg-primary/5 rounded-lg px-3 py-2">💡 {ev.improvementTip}</p>}
    </div>
  )
}

function AnswerCard({ answer, question, panellist, panellists, index }: { answer: AnswerResult; question?: Question; panellist?: Panellist; panellists: Panellist[]; index: number }) {
  const [expanded, setExpanded] = useState(false)
  const ev = answer.evaluation; const fu = answer.followUp
  const fuPanellist = fu ? panellists.find(p => p.id === fu.panellistId) ?? panellist : undefined
  const combinedScore = fu ? Math.round((ev.score + fu.evaluation.score) / 2) : ev.score
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <button onClick={() => setExpanded(e => !e)} className="w-full flex items-center gap-3 p-5 text-left hover:bg-accent/50 transition-colors">
        <span className="text-xl">{panellist?.avatar}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2"><p className="text-sm font-semibold text-foreground">Q{index+1}: {panellist?.name}</p><span className="text-[10px] text-muted-foreground capitalize bg-muted px-1.5 py-0.5 rounded">{question?.category}</span></div>
          <p className="text-xs text-muted-foreground truncate mt-0.5">{question?.question}</p>
        </div>
        <ScoreBadge score={combinedScore} />
        {fu && <span className="text-[10px] text-primary font-medium flex items-center gap-0.5"><MessageSquare className="w-3 h-3" /> {fuPanellist?.name?.split(' ')[0]}</span>}
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      {expanded && (
        <div className="px-5 pb-5 space-y-5 border-t border-border pt-4">
          <div>
            <p className="text-sm text-foreground/80 italic border-l-2 pl-3 mb-3" style={{ borderColor: panellist?.color }}>&quot;{question?.question}&quot;</p>
            <div className="bg-muted rounded-xl px-4 py-3 mb-3"><p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Your answer</p><p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{answer.transcript}</p></div>
            <div className="flex items-center justify-between mb-2"><p className="text-xs font-semibold text-muted-foreground">{panellist?.name}&apos;s assessment</p><ScoreBadge score={ev.score} /></div>
            <EvalBlock ev={ev} />
          </div>
          {fu && (
            <div className="border-t border-dashed border-border pt-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{fuPanellist?.avatar}</span>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-primary flex items-center gap-1"><MessageSquare className="w-3 h-3" /> Follow-up from {fuPanellist?.name}</p>
              </div>
              {fu.interjection && <p className="text-xs text-muted-foreground italic mb-2">{fu.interjection}</p>}
              <p className="text-sm text-foreground/80 italic border-l-2 pl-3 mb-3" style={{ borderColor: fuPanellist?.color }}>&quot;{fu.question}&quot;</p>
              <div className="bg-muted rounded-xl px-4 py-3 mb-3"><p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Your follow-up answer</p><p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{fu.transcript}</p></div>
              <div className="flex items-center justify-between mb-2"><p className="text-xs font-semibold text-muted-foreground">Follow-up assessment</p><ScoreBadge score={fu.evaluation.score} /></div>
              <EvalBlock ev={fu.evaluation} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

export default function InterviewRoom() {
  const params = useParams(); const router = useRouter()
  const interviewId = params.id as string

  const [phase, setPhase] = useState<Phase>('loading')
  const [panellists, setPanellists] = useState<Panellist[]>([])
  const [questions, setQuestions] = useState<Question[]>([])
  const [jobTitle, setJobTitle] = useState('')
  const [currentQ, setCurrentQ] = useState(0)
  const [answers, setAnswers] = useState<AnswerResult[]>([])
  const [transcript, setTranscript] = useState('')
  const [evaluating, setEvaluating] = useState(false)
  const [currentEval, setCurrentEval] = useState<Evaluation | null>(null)
  const [answerStep, setAnswerStep] = useState<AnswerStep>('answering')
  const [followUpQuestion, setFollowUpQuestion] = useState('')
  const [followUpPanellistId, setFollowUpPanellistId] = useState('')
  const [followUpInterjection, setFollowUpInterjection] = useState('')
  const [followUpTranscript, setFollowUpTranscript] = useState('')
  const [followUpEval, setFollowUpEval] = useState<Evaluation | null>(null)
  const [finalFeedback, setFinalFeedback] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
const [interviewStarted, setInterviewStarted] = useState(false)
  const [remainingSeconds, setRemainingSeconds] = useState(15 * 60)
  const INTERVIEW_DURATION = 15 * 60

  const { isListening, interimText, startListening, stopListening } = useSpeechRecognition()
  const { videoRef, active: cameraOn, toggle: toggleCamera } = useWebcam()

  const question = questions[currentQ]
  const speaker = panellists.find(p => p.id === question?.panellistId)
  const followUpSpeaker = panellists.find(p => p.id === followUpPanellistId) ?? speaker
  const isInFollowUp = answerStep === 'follow-up-answering' || answerStep === 'follow-up-evaluated'
  const activeTranscript = isInFollowUp ? followUpTranscript : transcript
  const setActiveTranscript = isInFollowUp ? setFollowUpTranscript : setTranscript

  // Who is currently speaking? Original asker or follow-up panellist
  const currentSpeakerId = isInFollowUp ? followUpPanellistId : question?.panellistId

  const handleTimeUp = useCallback(() => {
    if (isListening) stopListening()
    setPhase('evaluating')
    fetch('/api/interview/complete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ interviewId }) })
      .then(r => r.json()).then(data => { setFinalFeedback(data.feedback); setPhase('results') }).catch(err => setError(err.message))
  }, [interviewId, isListening, stopListening])

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/interview/${interviewId}`)
        if (!res.ok) throw new Error('Failed to load interview')
        const data = await res.json()
        setPanellists(data.interview.panellists); setQuestions(data.interview.questions); setJobTitle(data.interview.jobTitle)
        if (data.interview.answers?.length) {
          setAnswers(data.interview.answers.map((a: any) => ({ questionId: a.questionId, transcript: a.transcript, evaluation: a.evaluation, followUp: a.evaluation?.followUp })))
          setCurrentQ(data.interview.answers.length)
        }
    if (data.interview.status === 'completed') {
          setFinalFeedback(data.interview.feedback); setPhase('results')
        } else if (data.interview.status === 'in_progress' && data.interview.startedAt) {
          // Resume — calculate how much time is left
          const started = new Date(data.interview.startedAt).getTime()
          const elapsed = Math.floor((Date.now() - started) / 1000)
          const left = Math.max(0, INTERVIEW_DURATION - elapsed)
          setRemainingSeconds(left)
          setInterviewStarted(true)
          if (left <= 0) { handleTimeUp() }
          else { setPhase('interview') }
        } else {
          setPhase('lobby')
        }
      } catch (err: any) { setError(err.message) }
    }
    load()
  }, [interviewId])

  const handleStartRecording = useCallback(() => {
    startListening((text) => {
      if (isInFollowUp) setFollowUpTranscript(p => p ? p + ' ' + text : text)
      else setTranscript(p => p ? p + ' ' + text : text)
    })
  }, [startListening, isInFollowUp])

  const submitAnswer = useCallback(async () => {
    const text = transcript.trim(); if (!text || !question) return
    if (isListening) stopListening(); setEvaluating(true); setCurrentEval(null)
    try {
      const res = await fetch('/api/interview/evaluate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ interviewId, questionId: question.id, transcript: text }) })
      if (!res.ok) throw new Error('Evaluation failed')
      const data = await res.json(); setCurrentEval(data.evaluation); setAnswerStep('evaluated')
      // Check for follow-up from any panellist
      try {
        const fuRes = await fetch('/api/interview/follow-up', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ interviewId, questionId: question.id, transcript: text, evaluation: data.evaluation }) })
        if (fuRes.ok) {
          const fuData = await fuRes.json()
          if (fuData.shouldFollowUp && fuData.followUpQuestion) {
            setFollowUpQuestion(fuData.followUpQuestion)
            setFollowUpPanellistId(fuData.followUpPanellistId || question.panellistId)
            setFollowUpInterjection(fuData.interjection || '')
          }
        }
      } catch {}
    } catch (err: any) { setError(err.message) }
    finally { setEvaluating(false) }
  }, [transcript, question, interviewId, isListening, stopListening])

  const submitFollowUp = useCallback(async () => {
    const text = followUpTranscript.trim(); if (!text || !question) return
    if (isListening) stopListening(); setEvaluating(true)
    try {
      const res = await fetch('/api/interview/evaluate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ interviewId, questionId: question.id + '_fu', transcript: text }) })
      if (!res.ok) throw new Error('Follow-up evaluation failed')
      const data = await res.json(); setFollowUpEval(data.evaluation); setAnswerStep('follow-up-evaluated')
    } catch (err: any) { setError(err.message) }
    finally { setEvaluating(false) }
  }, [followUpTranscript, question, interviewId, isListening, stopListening])

  const nextQuestion = useCallback(() => {
    const answer: AnswerResult = { questionId: question.id, transcript: transcript.trim(), evaluation: currentEval! }
    if (followUpEval && followUpTranscript) {
      answer.followUp = { question: followUpQuestion, panellistId: followUpPanellistId, interjection: followUpInterjection, transcript: followUpTranscript.trim(), evaluation: followUpEval }
    }
    setAnswers(p => [...p, answer])
    setCurrentEval(null); setTranscript(''); setFollowUpQuestion(''); setFollowUpPanellistId(''); setFollowUpInterjection(''); setFollowUpTranscript(''); setFollowUpEval(null); setAnswerStep('answering')
    if (currentQ + 1 >= questions.length) {
      setPhase('evaluating')
      fetch('/api/interview/complete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ interviewId }) })
        .then(r => r.json()).then(data => { setFinalFeedback(data.feedback); setPhase('results') }).catch(err => setError(err.message))
    } else setCurrentQ(p => p + 1)
  }, [currentQ, questions.length, interviewId, question, transcript, currentEval, followUpQuestion, followUpPanellistId, followUpInterjection, followUpTranscript, followUpEval])

  // ═══ LOADING ═══
  if (phase === 'loading') return <div className="min-h-screen bg-background flex items-center justify-center"><div className="text-center"><Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-4" /><p className="text-muted-foreground">{error || 'Loading...'}</p>{error && <Link href="/dashboard" className="text-primary text-sm mt-3 inline-block hover:underline">← Back</Link>}</div></div>

  // ═══ LOBBY ═══
  if (phase === 'lobby') return (
    <div className="min-h-screen bg-background"><div className="max-w-4xl mx-auto px-6 py-12">
      <div className="flex items-center justify-between mb-8"><Link href="/dashboard/interview" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="w-4 h-4" /> Back</Link><ThemeToggle /></div>
      <div className="text-center mb-10"><div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4"><Users className="w-7 h-7 text-primary" /></div><h1 className="text-3xl font-bold text-foreground mb-2">Mock Interview</h1><p className="text-lg text-muted-foreground">{jobTitle}</p><p className="text-sm text-muted-foreground mt-1 flex items-center justify-center gap-1.5"><Clock className="w-4 h-4" /> 15 minute time limit</p></div>
      <div className="mb-10"><h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Your interview panel</h2>
        <div className="grid grid-cols-3 gap-4">{panellists.map(p => <div key={p.id} className="rounded-2xl p-5 text-center border border-border bg-card hover:shadow-md transition-shadow"><div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl mx-auto mb-3" style={{ backgroundColor: `${p.color}15` }}>{p.avatar}</div><p className="font-semibold text-sm text-foreground">{p.name}</p><p className="text-xs text-muted-foreground mt-0.5">{p.role}</p></div>)}</div>
      </div>
      <div className="rounded-2xl border border-border bg-card p-6 mb-8"><h3 className="font-semibold text-foreground mb-3 text-sm">How it works</h3>
        <div className="space-y-3 text-sm text-muted-foreground">{[`${questions.length} questions, rotating between panellists`,'Any panellist may jump in with a follow-up based on your answer','Click the microphone to speak — live transcription','You have 15 minutes — timer starts when you begin'].map((t,i) => <div key={i} className="flex gap-3"><span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">{i+1}</span><span>{t}</span></div>)}</div>
      </div>
      <div className="rounded-2xl border border-border bg-card p-4 mb-8"><div className="flex items-center justify-between mb-3"><h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Camera preview</h3><button onClick={toggleCamera} className="text-xs text-primary hover:underline flex items-center gap-1">{cameraOn ? <><VideoOff className="w-3 h-3" /> Off</> : <><Video className="w-3 h-3" /> On</>}</button></div><div className="aspect-video bg-muted rounded-xl overflow-hidden relative"><video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />{!cameraOn && <div className="absolute inset-0 flex items-center justify-center"><p className="text-xs text-muted-foreground">Camera off</p></div>}</div></div>
      <div className="text-center"><button onClick={() => {
  setPhase('interview')
  setInterviewStarted(true)
  setRemainingSeconds(INTERVIEW_DURATION)
  // Save start time to DB
  fetch(`/api/interview/${interviewId}/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }).catch(() => {})
}} className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-lg shadow-lg">Start Interview <ChevronRight className="w-5 h-5" /></button></div>
    </div></div>
  )

  // ═══ EVALUATING ═══
  if (phase === 'evaluating') return <div className="min-h-screen bg-background flex items-center justify-center"><div className="text-center"><div className="flex justify-center gap-3 mb-6">{panellists.map((p,i) => <div key={p.id} className="text-3xl animate-bounce" style={{ animationDelay: `${i*0.2}s` }}>{p.avatar}</div>)}</div><Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-4" /><h2 className="text-xl font-bold text-foreground mb-2">Panel is deliberating...</h2><p className="text-muted-foreground">Reviewing your performance</p></div></div>

  // ═══ RESULTS ═══
  if (phase === 'results' && finalFeedback) {
    const sc = finalFeedback.totalScore; const scoreColor = sc >= 80 ? 'text-emerald-600 dark:text-emerald-400' : sc >= 65 ? 'text-blue-600 dark:text-blue-400' : sc >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'
    return <div className="min-h-screen bg-background"><div className="max-w-4xl mx-auto px-6 py-12">
      <div className="flex items-center justify-between mb-8"><Link href="/dashboard/interview" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="w-4 h-4" /> Back</Link><ThemeToggle /></div>
      <div className="text-center mb-10"><div className="w-24 h-24 rounded-full bg-card border-4 border-border flex items-center justify-center mx-auto mb-4 shadow-lg"><span className={`text-3xl font-bold ${scoreColor}`}>{sc}%</span></div><h1 className="text-2xl font-bold text-foreground mb-1 capitalize">{finalFeedback.verdict}</h1><p className="text-muted-foreground">{jobTitle}</p><p className="text-xs text-muted-foreground mt-1">{finalFeedback.answeredCount} of {finalFeedback.totalQuestions} questions answered</p></div>
      <div className="grid grid-cols-3 gap-4 mb-10">{(finalFeedback.panelSummary ?? []).map((ps: any) => { const p = panellists.find(x => x.id === ps.panellistId); return <div key={ps.panellistId} className="rounded-2xl border border-border bg-card p-5 text-center"><div className="text-3xl mb-2">{p?.avatar}</div><p className="font-semibold text-sm text-foreground">{ps.name}</p><p className="text-xs text-muted-foreground mb-3">{ps.role}</p><p className="text-2xl font-bold" style={{ color: p?.color }}>{ps.averageScore}%</p></div> })}</div>
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Full interview transcript — click to expand</h2>
      <div className="space-y-3">{answers.map((a,idx) => { const q = questions.find(x => x.id === a.questionId); const p = panellists.find(x => x.id === q?.panellistId); return <AnswerCard key={idx} answer={a} question={q} panellist={p} panellists={panellists} index={idx} /> })}</div>
      <div className="text-center mt-10"><button onClick={() => router.push('/dashboard/interview')} className="px-6 py-2.5 rounded-xl bg-card border border-border hover:bg-accent text-foreground font-medium">Back to Interviews</button></div>
    </div></div>
  }

  // ═══ INTERVIEW IN PROGRESS ═══
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-card/80 backdrop-blur">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-foreground">Q{currentQ+1}/{questions.length}</span>
          <span className="text-[10px] text-muted-foreground px-2 py-0.5 rounded-full bg-muted capitalize font-medium">{question?.category}</span>
          {isInFollowUp && <span className="text-[10px] text-primary font-semibold px-2 py-0.5 rounded-full bg-primary/10 flex items-center gap-1"><MessageSquare className="w-3 h-3" /> {followUpSpeaker?.name?.split(' ')[0]} follow-up</span>}
        </div>
        <div className="flex items-center gap-3">
          {isListening && <Timer isRunning={isListening} />}
          {interviewStarted && <CountdownTimer totalSeconds={remainingSeconds} onTimeUp={handleTimeUp} />}
          <ThemeToggle />
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-3 p-3">
        <div className="lg:w-[65%] flex flex-col gap-3">
          {/* Panel grid — highlights whoever is currently speaking */}
          <div className="grid grid-cols-4 gap-2">
            {panellists.map(p => <PanellistCard key={p.id} panellist={p} isSpeaking={p.id === currentSpeakerId && answerStep !== 'follow-up-evaluated' && answerStep !== 'evaluated'} />)}
            <div className="relative rounded-2xl overflow-hidden border-2 border-border bg-muted aspect-[4/3]">
              <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
              {!cameraOn && <div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-xl">🎤</span><p className="text-[10px] text-muted-foreground">You</p></div>}
              <button onClick={toggleCamera} className="absolute bottom-1.5 right-1.5 p-1.5 rounded-full bg-background/80 text-foreground">{cameraOn ? <VideoOff className="w-3 h-3" /> : <Video className="w-3 h-3" />}</button>
              {isListening && <div className="absolute top-1.5 left-1.5 w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />}
            </div>
          </div>

          {/* Original question */}
          {speaker && answerStep === 'answering' && (
            <div className="rounded-2xl p-5 border border-border bg-card shadow-sm">
              <div className="flex items-center gap-2 mb-2"><span className="text-lg">{speaker.avatar}</span><span className="text-sm font-semibold" style={{ color: speaker.color }}>{speaker.name}</span><span className="text-[10px] text-muted-foreground">— {speaker.role}</span></div>
              <p className="text-base text-foreground leading-relaxed">{question?.question}</p>
            </div>
          )}

          {/* Follow-up question from any panellist */}
          {answerStep === 'follow-up-answering' && followUpSpeaker && (
            <div className="rounded-2xl p-5 border-2 border-primary/30 bg-primary/5 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{followUpSpeaker.avatar}</span>
                <span className="text-sm font-semibold" style={{ color: followUpSpeaker.color }}>{followUpSpeaker.name}</span>
                {followUpSpeaker.id !== speaker?.id && <span className="text-[10px] bg-primary/10 text-primary font-semibold px-2 py-0.5 rounded-full">jumping in</span>}
                <span className="text-[10px] text-primary font-semibold px-2 py-0.5 rounded-full bg-primary/10">Follow-up</span>
              </div>
              {followUpInterjection && <p className="text-xs text-muted-foreground italic mb-2">{followUpInterjection}</p>}
              <p className="text-base text-foreground leading-relaxed">{followUpQuestion}</p>
            </div>
          )}

          {/* Main eval + follow-up buttons */}
          {answerStep === 'evaluated' && currentEval && (
            <div className="rounded-2xl p-5 border border-border bg-card shadow-sm space-y-4">
              <div className="flex items-center justify-between"><div className="flex items-center gap-2"><span className="text-lg">{speaker?.avatar}</span><span className="text-sm font-semibold text-foreground">{speaker?.name}&apos;s feedback</span></div><ScoreBadge score={currentEval.score} /></div>
              <EvalBlock ev={currentEval} />
              <div className="flex gap-2 pt-2">
                {followUpQuestion ? (<>
                  <button onClick={() => { setAnswerStep('follow-up-answering'); setFollowUpTranscript(''); setFollowUpEval(null) }}
                    className="flex-1 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-medium flex items-center justify-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    {followUpSpeaker?.id !== speaker?.id ? `${followUpSpeaker?.name?.split(' ')[0]} wants to ask...` : 'Answer Follow-up'}
                  </button>
                  <button onClick={nextQuestion} className="px-4 py-2.5 rounded-xl bg-muted hover:bg-accent text-foreground text-sm font-medium">Skip →</button>
                </>) : (
                  <button onClick={nextQuestion} className="flex-1 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-medium flex items-center justify-center gap-2">{currentQ+1 >= questions.length ? 'Finish Interview' : 'Next Question'} <ChevronRight className="w-4 h-4" /></button>
                )}
              </div>
            </div>
          )}

          {/* Follow-up eval */}
          {answerStep === 'follow-up-evaluated' && followUpEval && (
            <div className="rounded-2xl p-5 border-2 border-primary/20 bg-card shadow-sm space-y-4">
              <div className="flex items-center justify-between"><div className="flex items-center gap-2"><span className="text-lg">{followUpSpeaker?.avatar}</span><span className="text-sm font-semibold text-foreground">{followUpSpeaker?.name}&apos;s follow-up feedback</span></div><ScoreBadge score={followUpEval.score} /></div>
              <EvalBlock ev={followUpEval} />
              <button onClick={nextQuestion} className="w-full py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-medium flex items-center justify-center gap-2">{currentQ+1 >= questions.length ? 'Finish Interview' : 'Next Question'} <ChevronRight className="w-4 h-4" /></button>
            </div>
          )}
        </div>

        {/* Right panel */}
        <div className="lg:w-[35%] flex flex-col gap-3">
          <div className="rounded-2xl border border-border bg-card p-4 flex-1 flex flex-col">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">{isInFollowUp ? `Answer to ${followUpSpeaker?.name?.split(' ')[0]}` : 'Your Answer'}</h3>
            <div className="flex justify-center mb-3">
              {!isListening ? (
                <button onClick={handleStartRecording} disabled={answerStep === 'evaluated' || answerStep === 'follow-up-evaluated' || evaluating}
                  className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 disabled:opacity-40 text-white flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all"><Mic className="w-6 h-6" /></button>
              ) : (
                <button onClick={() => stopListening()} className="w-16 h-16 rounded-full bg-red-600 text-white flex items-center justify-center animate-pulse shadow-lg shadow-red-500/30"><Square className="w-5 h-5" /></button>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground text-center mb-3">{isListening ? 'Listening... click to stop' : 'Click to speak — or type below'}</p>
            <textarea value={activeTranscript + (interimText ? ' ' + interimText : '')} onChange={e => setActiveTranscript(e.target.value)}
              placeholder={isInFollowUp ? `Answer ${followUpSpeaker?.name?.split(' ')[0]}'s follow-up...` : 'Your answer appears here as you speak...'}
              disabled={answerStep === 'evaluated' || answerStep === 'follow-up-evaluated' || evaluating}
              className="flex-1 min-h-[150px] bg-muted border border-border rounded-xl p-3 text-sm text-foreground placeholder-muted-foreground/50 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-40" />
            {interimText && <p className="text-[10px] text-muted-foreground mt-1 animate-pulse">Hearing: &quot;{interimText}&quot;</p>}
            <button onClick={isInFollowUp ? submitFollowUp : submitAnswer} disabled={!activeTranscript.trim() || answerStep === 'evaluated' || answerStep === 'follow-up-evaluated' || evaluating}
              className="mt-3 w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-medium text-sm flex items-center justify-center gap-2">
              {evaluating ? <><Loader2 className="w-4 h-4 animate-spin" /> Scoring...</> : <><CheckCircle2 className="w-4 h-4" /> Submit</>}
            </button>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5"><Clock className="w-3 h-3" /> Progress</h3>
            <div className="space-y-1">{questions.map((q, idx) => {
              const ans = answers.find(a => a.questionId === q.id); const p = panellists.find(x => x.id === q.panellistId); const cur = idx === currentQ
              return <div key={q.id} className={`flex items-center gap-2 text-xs py-1.5 px-2.5 rounded-lg ${cur ? 'bg-primary/10 border border-primary/20' : ans ? 'opacity-60' : ''}`}>
                <span className="text-sm">{p?.avatar}</span>
                <span className={`flex-1 truncate ${cur ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>Q{idx+1}</span>
                {ans && <ScoreBadge score={ans.evaluation.score} />}
                {ans?.followUp && <span className="text-sm">{panellists.find(x => x.id === ans.followUp?.panellistId)?.avatar}</span>}
                {cur && !ans && <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />}
              </div>
            })}</div>
          </div>
        </div>
      </div>
    </div>
  )
}