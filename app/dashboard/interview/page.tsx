// app/dashboard/interview/page.tsx
'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Loader2, Users, Play, Clock,
  CheckCircle2, FileText, Lock,
} from 'lucide-react'
import { useSession } from 'next-auth/react'

type Analysis = {
  id: string
  jobTitle: string
  createdAt: string
  overallScore?: number
}

type PastInterview = {
  id: string
  jobTitle: string
  totalScore: number | null
  status: string
  createdAt: string
  completedAt: string | null
}

export default function InterviewLauncher() {
  const { data: session } = useSession()
  const isPro = session?.user?.tier === 'pro'
  const router = useRouter()

  const [analyses, setAnalyses] = useState<Analysis[]>([])
  const [pastInterviews, setPastInterviews] = useState<PastInterview[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState<string | null>(null) // analysisId being generated
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        // Load analyses
        const res = await fetch('/api/analysis/list?page=1&limit=50')
        const data = await res.json()
        setAnalyses(data.results ?? [])

        // Load past interviews
        const intRes = await fetch('/api/interview/list')
        if (intRes.ok) {
          const intData = await intRes.json()
          setPastInterviews(intData.interviews ?? [])
        }
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const startInterview = useCallback(async (analysisId: string) => {
    setGenerating(analysisId)
    setError(null)

    try {
      const res = await fetch('/api/interview/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysisId }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to generate interview')
      }

      const data = await res.json()
      router.push(`/dashboard/interview/${data.interviewId}`)

    } catch (err: any) {
      setError(err.message)
      setGenerating(null)
    }
  }, [router])

  if (!isPro) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-purple-100 dark:bg-purple-950 flex items-center justify-center mx-auto mb-6">
          <Lock className="w-7 h-7 text-purple-600 dark:text-purple-400" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Interview Simulator</h1>
        <p className="text-muted-foreground mb-6">
          Practice with a realistic 3-person NHS interview panel powered by AI.
          Available on the Pro plan.
        </p>
        <Link
          href="/upgrade?reason=interview"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold transition-colors"
        >
          Upgrade to Pro
        </Link>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh] gap-3 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">Loading...</span>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">

      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Back to dashboard
        </Link>
        <h1 className="text-2xl font-bold text-foreground">Interview Simulator</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Select an analysis to practice with a 3-person NHS interview panel
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 p-4">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Select an analysis */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
          <FileText className="w-4 h-4" /> Start New Interview
        </h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {analyses.map(a => (
            <div
              key={a.id}
              className="rounded-xl border border-border bg-card p-5 flex flex-col gap-3"
            >
              <h3 className="font-medium text-sm text-foreground line-clamp-2">{a.jobTitle}</h3>
              <p className="text-xs text-muted-foreground">
                Analysed {new Date(a.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              </p>
              <button
                onClick={() => startInterview(a.id)}
                disabled={generating === a.id}
                className="mt-auto w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors"
              >
                {generating === a.id ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Generating panel...</>
                ) : (
                  <><Play className="w-4 h-4" /> Practice Interview</>
                )}
              </button>
            </div>
          ))}
        </div>

        {analyses.length === 0 && (
          <div className="text-center py-10">
            <p className="text-sm text-muted-foreground mb-3">No analyses yet. Create one first.</p>
            <Link
              href="/dashboard/new-analysis"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm font-medium"
            >
              New Analysis
            </Link>
          </div>
        )}
      </section>

      {/* Past interviews */}
      {pastInterviews.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4" /> Past Interviews
          </h2>
          <div className="space-y-2">
            {pastInterviews.map(int => (
              <Link
                key={int.id}
                href={`/dashboard/interview/${int.id}`}
                className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 hover:shadow-sm transition-shadow"
              >
                <Users className="w-5 h-5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{int.jobTitle}</p>
                  <p className="text-xs text-muted-foreground">
                    {int.completedAt
                      ? `Completed ${new Date(int.completedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
                      : 'In progress'
                    }
                  </p>
                </div>
                {int.totalScore !== null && (
                  <span className={`text-sm font-bold px-2.5 py-0.5 rounded-full ${
                    int.totalScore >= 80 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' :
                    int.totalScore >= 65 ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300' :
                    int.totalScore >= 50 ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' :
                    'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                  }`}>
                    {int.totalScore}%
                  </span>
                )}
                {int.status === 'in_progress' && (
                  <span className="text-xs text-amber-500 font-medium">Resume →</span>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
