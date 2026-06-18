// app/admin/users/[id]/interview/[interviewId]/page.tsx
// Full Interview Simulator session detail — panellists, questions,
// and every answer with its transcript and per-answer evaluation.
'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, Mic, Award, AlertTriangle } from 'lucide-react'

function scoreColor(score: number | null | undefined) {
  if (score === null || score === undefined) return 'text-muted-foreground'
  return score >= 70 ? 'text-emerald-600 dark:text-emerald-400' : score >= 45 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'
}

export default function AdminInterviewDetailPage() {
  const { id, interviewId } = useParams<{ id: string; interviewId: string }>()
  const [interview, setInterview] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/admin/users/${id}/interviews/${interviewId}`)
      .then(r => r.json())
      .then(d => { if (d.error) throw new Error(d.error); setInterview(d.interview) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [id, interviewId])

  if (loading) return <div className="flex justify-center py-24"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
  if (error || !interview) return <div className="p-8 text-sm text-red-500">{error ?? 'Not found'}</div>

  const panellists = (interview.panellists as any[]) ?? []
  const questions = (interview.questions as any[]) ?? []
  const answers = interview.answers ?? []

  // Index answers by questionId for easy lookup against the questions array
  const answersByQuestion: Record<string, any[]> = {}
  for (const ans of answers) {
    if (!answersByQuestion[ans.questionId]) answersByQuestion[ans.questionId] = []
    answersByQuestion[ans.questionId].push(ans)
  }

  const panellistById: Record<string, any> = {}
  for (const p of panellists) panellistById[p.id ?? p.panellistId ?? p.name] = p

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
      <Link href={`/admin/users/${id}`} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to user
      </Link>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Mic className="w-5 h-5 text-primary" /> {interview.jobTitle}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {interview.band && `${interview.band} · `}
            {new Date(interview.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            {' · '}<span className="capitalize">{interview.status}</span>
          </p>
        </div>
        {interview.totalScore !== null && (
          <div className="text-right">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase">Overall score</p>
            <p className={`text-2xl font-black ${scoreColor(interview.totalScore)}`}>{interview.totalScore}%</p>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 px-4 py-2.5 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
        <p className="text-[12px] text-amber-700 dark:text-amber-300">Admin view — full session transcript and panel scoring.</p>
      </div>

      {/* Panellists */}
      {panellists.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-sm font-bold text-foreground mb-3">Panel</p>
          <div className="flex gap-3 flex-wrap">
            {panellists.map((p, i) => (
              <div key={i} className="px-3 py-1.5 rounded-full bg-muted text-[12px] font-medium text-foreground">
                {p.name ?? p.role ?? `Panellist ${i + 1}`} {p.role && p.name && <span className="text-muted-foreground">· {p.role}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Questions + answers, in order */}
      <div className="space-y-4">
        {questions.map((q: any, i: number) => {
          const qId = q.id ?? q.questionId ?? String(i)
          const qAnswers = answersByQuestion[qId] ?? []
          return (
            <div key={qId} className="rounded-2xl border border-border bg-card p-5 space-y-3">
              <p className="text-[13px] font-semibold text-foreground">Q{i + 1}. {q.question ?? q.text}</p>
              {q.panellistId && panellistById[q.panellistId] && (
                <p className="text-[11px] text-muted-foreground">Asked by {panellistById[q.panellistId].name ?? q.panellistId}</p>
              )}

              {qAnswers.length === 0 ? (
                <p className="text-[12px] text-muted-foreground italic">Not yet answered.</p>
              ) : (
                qAnswers.map(ans => (
                  <div key={ans.id} className="border-l-2 border-primary/40 pl-3 py-1 space-y-1.5">
                    <p className="text-[12.5px] text-foreground whitespace-pre-wrap">{ans.transcript || 'No transcript recorded.'}</p>
                    {ans.audioUrl && (
                      <audio controls src={ans.audioUrl} className="h-8 mt-1" />
                    )}
                    <div className="flex items-center justify-between">
                      {ans.score !== null && (
                        <span className={`text-[12px] font-bold ${scoreColor(ans.score)}`}>Score: {ans.score}%</span>
                      )}
                      <span className="text-[10.5px] text-muted-foreground">{new Date(ans.answeredAt).toLocaleString('en-GB')}</span>
                    </div>
                    {ans.evaluation && (
                      <details className="mt-1">
                        <summary className="text-[11px] text-primary cursor-pointer">Evaluation detail</summary>
                        <pre className="text-[10px] text-muted-foreground mt-1 whitespace-pre-wrap overflow-x-auto">{JSON.stringify(ans.evaluation, null, 2)}</pre>
                      </details>
                    )}
                  </div>
                ))
              )}
            </div>
          )
        })}
      </div>

      {/* Overall feedback */}
      {interview.feedback && (
        <div className="rounded-2xl border border-border bg-card p-5 space-y-2">
          <p className="text-sm font-bold text-foreground flex items-center gap-2"><Award className="w-4 h-4" /> Overall Feedback</p>
          <pre className="text-[10.5px] text-muted-foreground whitespace-pre-wrap overflow-x-auto">{JSON.stringify(interview.feedback, null, 2)}</pre>
        </div>
      )}
    </div>
  )
}