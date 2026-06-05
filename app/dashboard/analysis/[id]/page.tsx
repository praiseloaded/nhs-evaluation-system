import { AlertTriangle }  from 'lucide-react'
import { Navbar }         from '@/components/navbar'
import { ScoreHeader }    from '@/components/score-header'
import { DimensionPanel } from '@/components/dimension-panel'

import { InsightsPanel } from '@/components/insights-panel'
import { PremiumGate }    from '@/components/premium-gate'
import { BookOpen, Target, Heart, Pen, Zap } from 'lucide-react'
import Link               from 'next/link'
import { notFound }       from 'next/navigation'
import { buildDimensionScores } from '@/lib/types'
import type { AnalysisResult, ScoredBreakdown } from '@/lib/types'
import { auth }           from '@/auth'
import { prisma }         from '@/lib/prisma'
import { getUserTier }             from '@/lib/billing/tier'
import { sanitizeAnalysisForTier } from '@/lib/billing/sanitize-analysis'
import { calculateNhsBandScore }   from '@/lib/scoring/calculate-overall-score'

type Params = { params: Promise<{ id: string }> }

// ─── Types ────────────────────────────────────────────────────────────────────

interface Analysis {
  id: string
  jobTitle: string
  jobDescription?: string
  band?: string | null
  location?: string | null
  createdAt: Date | string
  result: any
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Normalize recommendations: AI may return string[] or {gap,directive}[] */
function normalizeRecommendations(recs: any[]): string[] {
  if (!Array.isArray(recs)) return []
  return recs.map((r: any) => {
    if (typeof r === 'string') return r
    if (r?.directive) return `${r.gap ? r.gap + ': ' : ''}${r.directive}`
    if (r?.recommendation) return r.recommendation
    return String(r)
  })
}

// ─── Data fetching — direct DB, no HTTP round-trip ───────────────────────────

async function getAnalysis(id: string, userId: string): Promise<{ analysis: Analysis; isPro: boolean } | null> {
  try {
    const record = await prisma.analysis.findUnique({ where: { id } })

    if (!record) return null
    if (record.userId !== userId) return null

    const raw = (record.result as any) ?? {}

    // Recompute scoredBreakdown if missing
    if (!raw.scoredBreakdown && raw.breakdown) {
      raw.scoredBreakdown = calculateNhsBandScore(raw)
    }

    // Normalize recommendations format before sanitization
    if (Array.isArray(raw.recommendations)) {
      raw.recommendations = normalizeRecommendations(raw.recommendations)
    }

    // Get tier — handle all possible return values
    const userTier = await getUserTier(userId)
  const tier = userTier === 'pro' ? 'pro' : 'free'

    const filteredResult = sanitizeAnalysisForTier(raw, tier)

    return {
      analysis: {
        id:             record.id,
        jobTitle:       record.jobTitle ?? '',
        jobDescription: record.jobDescription ?? '',
        band:           (record as any).band ?? null,
        location:       (record as any).location ?? null,
        createdAt:      record.createdAt,
        result:         filteredResult,
      },
      isPro: tier === 'pro',
    }
  } catch (err) {
    console.error('[getAnalysis]', err)
    return null
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AnalysisPage({ params }: Params) {
  const { id } = await params

  const session = await auth()

  if (!session?.user?.id) notFound()

  const userId = session.user.id as string
  const data   = await getAnalysis(id, userId)

  if (!data) notFound()

  const { analysis, isPro } = data
  const result = analysis.result ?? {}

  const isIncomplete =
    !result.bandCoaching ||
    !result.rejectionRisk?.gates?.length ||
    (result.nhsValues?.length ?? 0) < 5

  // Build dimension scores — pass both the raw result AND the scored breakdown
  const scored = result.scoredBreakdown ?? null
  const dimensions = buildDimensionScores(result, scored)

  const dimCriteria = dimensions.find(d => d.id === 'criteriaCoverage')
  const dimValues   = dimensions.find(d => d.id === 'valuesAlignment')
  const dimStar     = dimensions.find(d => d.id === 'starCompleteness')
  const dimLanguage = dimensions.find(d => d.id === 'languageMirroring')
  const dimDetail   = dimensions.find(d => d.id === 'specificity')

  const essentialLines = result.criteriaAnalysis
    ?.filter((c: any) => c.type === "essential")
    .map((c: any) => c.criterion) ?? []

  const desirableLines = result.criteriaAnalysis
    ?.filter((c: any) => c.type === "desirable")
    .map((c: any) => c.criterion) ?? []

  const skillLines = result.atsMatch?.keywordsFound ?? []

  const valueLines = result.nhsValues
    ?.map((v: any) => v.name) ?? []

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10 space-y-8">

        <Link
          href="/dashboard/saved-analyses"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back to Analyses
        </Link>

        <ScoreHeader analysis={analysis} isPro={isPro} />

        {/* Incomplete data warning */}
        {isIncomplete && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
            <p className="text-xs text-amber-700 dark:text-amber-300 flex-1">
              This analysis has incomplete data from an earlier run. Re-analyse to see full results.
            </p>
            <Link
              href="/dashboard/new-analysis"
              className="text-xs font-medium text-amber-700 dark:text-amber-300 underline whitespace-nowrap"
            >
              Re-analyse
            </Link>
          </div>
        )}

        {/* ── Job details ──────────────────────────────────────────────── */}
        <section className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="font-semibold text-base text-foreground">Analysis Details</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Job context extracted from your submission</p>
          </div>

          <div className="p-6 space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Job Description</h3>
                <p className="whitespace-pre-wrap text-sm text-foreground/80 leading-relaxed">{analysis.jobDescription || 'N/A'}</p>
              </div>
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Person Specification
                </h3>
                <p className="whitespace-pre-wrap text-sm text-foreground/80 leading-relaxed">
                  {result.statementScan
                    ? `Word count: ${result.statementScan.wordCount}`
                    : 'N/A'}
                </p>
              </div>
            </div>

            <hr className="border-border" />

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Essential Criteria</h3>
                {essentialLines.length > 0 ? (
                  <ul className="space-y-2">
                    {essentialLines.map((item: string, i: number) => (
                      <li key={i} className="flex gap-2 text-sm text-foreground/80">
                        <span className="text-blue-500 shrink-0 mt-0.5">•</span>{item}
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-sm text-muted-foreground">None recorded</p>}
              </div>
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Desirable Criteria</h3>
                {desirableLines.length > 0 ? (
                  <ul className="space-y-2">
                    {desirableLines.map((item: string, i: number) => (
                      <li key={i} className="flex gap-2 text-sm text-foreground/80">
                        <span className="text-muted-foreground shrink-0 mt-0.5">◇</span>{item}
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-sm text-muted-foreground">None recorded</p>}
              </div>
            </div>

            <hr className="border-border" />

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Skills Detected</h3>
                {skillLines.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {skillLines.map((skill: string, i: number) => (
                      <span key={i} className="px-2.5 py-1 rounded bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-medium">{skill}</span>
                    ))}
                  </div>
                ) : <p className="text-sm text-muted-foreground">None recorded</p>}
              </div>
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Values Detected</h3>
                {valueLines.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {valueLines.map((v: string, i: number) => (
                      <span key={i} className="px-2.5 py-1 rounded-full bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 text-xs font-medium">{v}</span>
                    ))}
                  </div>
                ) : <p className="text-sm text-muted-foreground">None recorded</p>}
              </div>
            </div>
          </div>
        </section>

        {/* ── FREE dimensions ───────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-base text-foreground">Evaluation Dimensions</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Click Show details on any card to see evidence and improvement tips</p>
            </div>
            <span className="text-xs font-medium bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800 px-2.5 py-1 rounded-full">Free</span>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {dimCriteria && <DimensionPanel dimension={dimCriteria} icon={<Target className="w-4 h-4" />} />}
            {dimValues   && <DimensionPanel dimension={dimValues}   icon={<Heart  className="w-4 h-4" />} />}
          </div>
        </section>

        {/* ── PRO dimensions ────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-base text-foreground">Advanced Dimensions</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Deeper intelligence that separates shortlisted from rejected</p>
            </div>
            <span className="text-xs font-medium bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 px-2.5 py-1 rounded-full">Pro</span>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <PremiumGate label="STAR structure analysis" reason="star" isPro={isPro}>
              {dimStar     && <DimensionPanel dimension={dimStar}     icon={<Zap      className="w-4 h-4" />} />}
            </PremiumGate>
            <PremiumGate label="Language mirroring" reason="language" isPro={isPro}>
              {dimLanguage && <DimensionPanel dimension={dimLanguage} icon={<Pen      className="w-4 h-4" />} />}
            </PremiumGate>
            <PremiumGate label="Specificity analysis" reason="specificity" isPro={isPro}>
              {dimDetail   && <DimensionPanel dimension={dimDetail}   icon={<BookOpen className="w-4 h-4" />} />}
            </PremiumGate>
          </div>
        </section>

        <InsightsPanel analysis={analysis} isPro={isPro} />

      </main>
    </div>
  )
}