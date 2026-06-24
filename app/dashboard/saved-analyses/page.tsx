import { Navbar }  from '@/components/navbar'
import Link        from 'next/link'
import { Plus, FileText, TrendingUp, Award, MapPin, ChevronRight, Sparkles } from 'lucide-react'
import { prisma }  from '@/lib/prisma'
import { getDb }   from '@/lib/db-router'
import { auth }    from '@/auth'

export default async function SavedAnalysesPage() {
  const session = await auth()
  if (!session?.user?.id) {
    return <div>Please sign in</div>
  }

  const userId = session.user.id as string
  const db     = await getDb(userId)

  const analyses = await db.analysis.findMany({
    where:   { userId },
    orderBy: { createdAt: 'desc' },
  })

  const avgScore = analyses.length > 0
    ? Math.round(analyses.reduce((acc, a) => {
        const r = (a.result as any) ?? {}
        return acc + (r.scoredBreakdown?.overallScore ?? r.overallScore ?? r.totalScore ?? 0)
      }, 0) / analyses.length)
    : 0

  const topScore = analyses.length > 0
    ? Math.max(...analyses.map(a => {
        const r = (a.result as any) ?? {}
        return r.scoredBreakdown?.overallScore ?? r.overallScore ?? r.totalScore ?? 0
      }))
    : 0

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10 space-y-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Your Portfolio</p>
            <h1 className="text-3xl font-black text-foreground tracking-tight">Saved Analyses</h1>
            <p className="text-sm text-muted-foreground mt-1.5">
              {analyses.length} evaluation{analyses.length !== 1 ? 's' : ''} tracked
            </p>
          </div>
          <Link
            href="/dashboard/new-analysis"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-foreground text-background text-sm font-bold hover:opacity-90 transition-opacity self-start shadow-sm"
          >
            <Plus className="w-4 h-4" /> New Analysis
          </Link>
        </div>

        {/* Stats strip */}
        {analyses.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Total', value: analyses.length, icon: FileText },
              { label: 'Average Score', value: `${avgScore}%`, icon: TrendingUp },
              { label: 'Top Score', value: `${Math.round(topScore)}%`, icon: Award },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="rounded-2xl border border-border bg-card px-4 py-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xl font-black text-foreground tabular-nums">{value}</p>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* List */}
        {analyses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-5 text-center">
            <div className="w-20 h-20 rounded-3xl bg-muted flex items-center justify-center">
              <Sparkles className="w-9 h-9 text-muted-foreground" />
            </div>
            <div>
              <p className="font-black text-xl text-foreground mb-1">No analyses yet</p>
              <p className="text-sm text-muted-foreground max-w-xs">
                Run your first evaluation to see how your application scores against NHS shortlisting criteria.
              </p>
            </div>
            <Link
              href="/dashboard/new-analysis"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-foreground text-background text-sm font-bold hover:opacity-90 transition-opacity"
            >
              <Plus className="w-4 h-4" /> Start First Analysis
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {analyses.map((analysis) => {
              const result = (analysis.result as any) ?? {}
              const score  = Math.round(result.scoredBreakdown?.overallScore ?? result.overallScore ?? result.totalScore ?? 0)
              const verdict = result.scoredBreakdown
                ? score >= 85 ? 'strong' : score >= 65 ? 'competitive' : score >= 45 ? 'weak' : 'reject'
                : null

              const VERDICT_STYLE: Record<string, { pill: string; ring: string }> = {
                strong:      { pill: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800', ring: 'text-emerald-600' },
                competitive: { pill: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800', ring: 'text-blue-600' },
                weak:        { pill: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800', ring: 'text-amber-600' },
                reject:      { pill: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800', ring: 'text-red-500' },
              }
              const vs = verdict ? VERDICT_STYLE[verdict] : null

              const band     = result.seniority?.targetBand ? `Band ${result.seniority.targetBand}` : null
              const location = (analysis as any).location ?? null

              return (
                <Link
                  key={analysis.id}
                  href={`/dashboard/analysis/${analysis.id}`}
                  className="group flex items-center gap-4 rounded-2xl border border-border bg-card px-5 py-4 hover:border-foreground/15 hover:shadow-md transition-all duration-200"
                >
                  {/* Score ring */}
                  <div className="shrink-0 relative w-14 h-14">
                    <svg width="56" height="56" viewBox="0 0 56 56" className="-rotate-90">
                      <circle cx="28" cy="28" r="22" fill="none" stroke="currentColor"
                        className="text-muted/40" strokeWidth="5" />
                      <circle cx="28" cy="28" r="22" fill="none"
                        stroke="currentColor"
                        className={vs?.ring ?? 'text-muted-foreground'}
                        strokeWidth="5"
                        strokeDasharray={`${2 * Math.PI * 22}`}
                        strokeDashoffset={`${2 * Math.PI * 22 * (1 - score / 100)}`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-[13px] font-black tabular-nums text-foreground">
                      {score}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-1.5">
                      <h3 className="font-bold text-sm text-foreground leading-snug group-hover:text-primary transition-colors line-clamp-1">
                        {analysis.jobTitle}
                      </h3>
                      {verdict && vs && (
                        <span className={`text-[10px] font-bold uppercase tracking-widest border px-2 py-0.5 rounded-full shrink-0 ${vs.pill}`}>
                          {verdict === 'strong' ? 'Strong' : verdict === 'competitive' ? 'Competitive' : verdict === 'weak' ? 'Needs Work' : 'At Risk'}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                      {band && (
                        <span className="flex items-center gap-1">
                          <Award className="w-3 h-3" />{band}
                        </span>
                      )}
                      {location && (
                        <span className="flex items-center gap-1 truncate max-w-[120px]">
                          <MapPin className="w-3 h-3 shrink-0" />{location}
                        </span>
                      )}
                      <span className="font-mono">
                        {new Date(analysis.createdAt).toLocaleDateString('en-GB', {
                          day: 'numeric', month: 'short', year: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>

                  <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                </Link>
              )
            })}
          </div>
        )}

      </main>
    </div>
  )
}