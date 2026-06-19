import { Navbar }         from '@/components/navbar'
import { ScoreHeader }    from '@/components/score-header'
import { DimensionPanel } from '@/components/dimension-panel'
import { InsightsPanel }  from '@/components/insights-panel'
import { PremiumGate }    from '@/components/premium-gate'
import { ReanalyseButton }       from '@/components/reanalyse-button'
import { ShortlistPopupTrigger } from '@/components/shortlisting/ShortlistPopupTrigger'
import { AnalysisTabs }          from '@/components/AnalysisTabs'
import {
  BookOpen, Target, Heart, Pen, Zap,
  CheckCircle2, XCircle, MinusCircle,
  ChevronRight, Stethoscope, FileText,
  Award, Shield
} from 'lucide-react'
import Link             from 'next/link'
import { notFound }     from 'next/navigation'
import { buildDimensionScores } from '@/lib/types'
import { auth }         from '@/auth'
import { prisma }       from '@/lib/prisma'
import { getUserTier }             from '@/lib/billing/tier'
import { sanitizeAnalysisForTier } from '@/lib/billing/sanitize-analysis'
import { calculateNhsBandScore }   from '@/lib/scoring/calculate-overall-score'

type Params = { params: Promise<{ id: string }> }

interface Analysis {
  id: string
  jobTitle: string
  jobDescription?: string
  band?: string | null
  location?: string | null
  createdAt: Date | string
  result: any
}

function normalizeRecommendations(recs: any[]): string[] {
  if (!Array.isArray(recs)) return []
  return recs.map((r: any) => {
    if (typeof r === 'string') return r
    if (r?.directive) return `${r.gap ? r.gap + ': ' : ''}${r.directive}`
    if (r?.recommendation) return r.recommendation
    return String(r)
  })
}

async function getAnalysis(id: string, userId: string) {
  try {
    const record = await prisma.analysis.findUnique({ where: { id } })
    if (!record || record.userId !== userId) return null

    const raw = (record.result as any) ?? {}
    if (!raw.scoredBreakdown && raw.breakdown) {
      raw.scoredBreakdown = calculateNhsBandScore(raw)
    }
    if (Array.isArray(raw.recommendations)) {
      raw.recommendations = normalizeRecommendations(raw.recommendations)
    }

    const userTier = await getUserTier(userId)
    const tier     = ['pro','elite'].includes(userTier) ? 'pro' : 'free'
    const filtered = sanitizeAnalysisForTier(raw, tier)

    return {
      analysis: {
        id:             record.id,
        jobTitle:       record.jobTitle          ?? '',
        jobDescription: record.jobDescription    ?? '',
        band:           (record as any).band     ?? null,
        location:       (record as any).location ?? null,
        createdAt:      record.createdAt,
        result:         filtered,
      },
      record: {
        essentialCriteria: record.essentialCriteria ?? '',
        desirableCriteria: record.desirableCriteria ?? '',
        personSpec:        record.personSpec        ?? '',
        jobDescription:    record.jobDescription    ?? '',
        band:              (record as any).band     ?? null,
      },
      // isPro still needed for server-side button logic (Generate Full Report)
      isPro: ['pro','elite'].includes(userTier),
    }
  } catch (err) {
    console.error('[getAnalysis]', err)
    return null
  }
}

function CriterionStatusIcon({ status }: { status: string }) {
  if (status === 'met')           return <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
  if (status === 'partially met') return <MinusCircle  className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
  return <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
}

function Section({ label, badge, badgeColor = 'blue', children }: {
  label: string; badge?: string; badgeColor?: 'blue'|'green'|'purple'|'amber'; children: React.ReactNode
}) {
  const badgeStyles = {
    blue:   'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800',
    green:  'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800',
    purple: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950 dark:text-violet-300 dark:border-violet-800',
    amber:  'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800',
  }
  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold uppercase tracking-widest text-foreground/50">{label}</h2>
        {badge && (
          <span className={`text-[10px] font-semibold uppercase tracking-wider border px-2.5 py-1 rounded-full ${badgeStyles[badgeColor]}`}>
            {badge}
          </span>
        )}
      </div>
      {children}
    </section>
  )
}

export default async function AnalysisPage({ params }: Params) {
  const { id }  = await params
  const session = await auth()
  if (!session?.user?.id) notFound()

  const userId = session.user.id as string
  const data   = await getAnalysis(id, userId)
  if (!data) notFound()

  const { analysis, record, isPro } = data
  const result = analysis.result ?? {}

  const scored     = result.scoredBreakdown ?? null
  const dimensions = buildDimensionScores(result, scored)

  const dimCriteria = dimensions.find(d => d.id === 'criteriaCoverage')
  const dimValues   = dimensions.find(d => d.id === 'valuesAlignment')
  const dimStar     = dimensions.find(d => d.id === 'starCompleteness')
  const dimLanguage = dimensions.find(d => d.id === 'languageMirroring')
  const dimDetail   = dimensions.find(d => d.id === 'specificity')

  const essentialCriteria = result.criteriaAnalysis?.filter((c: any) => c.type === 'essential') ?? []
  const desirableCriteria = result.criteriaAnalysis?.filter((c: any) => c.type === 'desirable') ?? []
  const skillLines        = result.atsMatch?.keywordsFound ?? []
  const valueLines        = result.nhsValues?.map((v: any) => v.name) ?? []

  const createdAt = new Date(analysis.createdAt).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* isPro removed — ShortlistPopupTrigger's child (ShortlistScorePopup)
          reads its own access via useFeatureAccess('shortlist_factors_pro') */}
      <ShortlistPopupTrigger
        analysisId={analysis.id}
        result={result}
        showOnMount={true}
      />

      <main className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10 space-y-8">

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link href="/dashboard/saved-analyses" className="hover:text-foreground transition-colors">
            Analyses
          </Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-foreground font-medium truncate max-w-xs">{analysis.jobTitle || 'Untitled'}</span>
        </div>

        <ReanalyseButton analysisId={analysis.id} />

        {/* ScoreHeader reads its own feature access via hooks internally */}
        <ScoreHeader analysis={analysis} />

        <div className="flex flex-wrap gap-3">
          <Link
            href={`/dashboard/analysis/${analysis.id}/recruiter-sim`}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-700 transition-colors"
          >
            <Zap className="w-4 h-4 text-amber-400" />
            Open Recruiter Simulator™
          </Link>
          <Link
            href={`/dashboard/analysis/${analysis.id}/summary`}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-800 text-sm font-semibold hover:bg-gray-50 transition-colors"
          >
            <BookOpen className="w-4 h-4" />
            Generate Summary
          </Link>
          {/* isPro still used here — purely server-side button rendering,
              no hook needed for this static conditional */}
          {isPro ? (
            <Link
              href={`/dashboard/analysis/${analysis.id}/report`}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
            >
              <FileText className="w-4 h-4" />
              Generate Full Report
            </Link>
          ) : (
            <Link
              href="/upgrade"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 text-sm font-semibold hover:bg-blue-100 transition-colors"
            >
              <FileText className="w-4 h-4" />
              Generate Full Report
              <span className="text-xs bg-blue-600 text-white px-1.5 py-0.5 rounded-full">Pro</span>
            </Link>
          )}
        </div>

        <div className="flex flex-wrap gap-3">
          {analysis.band && (
            <div className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground/70 bg-muted border border-border rounded-full px-3 py-1.5">
              <Award className="w-3.5 h-3.5" />{analysis.band}
            </div>
          )}
          {analysis.location && (
            <div className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground/70 bg-muted border border-border rounded-full px-3 py-1.5">
              <Stethoscope className="w-3.5 h-3.5" />{analysis.location}
            </div>
          )}
          <div className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground/70 bg-muted border border-border rounded-full px-3 py-1.5">
            <FileText className="w-3.5 h-3.5" />Analysed {createdAt}
          </div>
          {result.statementScan?.wordCount > 0 && (
            <div className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground/70 bg-muted border border-border rounded-full px-3 py-1.5">
              <Shield className="w-3.5 h-3.5" />{result.statementScan.wordCount} words in statement
            </div>
          )}
        </div>

        {/* AnalysisTabs and InsightsPanel read their own access via hooks */}
        <AnalysisTabs
          analysisId={analysis.id}
          jobTitle={analysis.jobTitle}
          result={result}
          record={record}
        >

          <Section label="Criteria Breakdown" badge="Essential & Desirable" badgeColor="blue">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="px-4 py-3 border-b border-border bg-muted/40 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-foreground/60">Essential</span>
                  <span className="text-xs text-muted-foreground">
                    {essentialCriteria.filter((c: any) => c.status === 'met').length} of {essentialCriteria.length} met
                  </span>
                </div>
                <ul className="divide-y divide-border">
                  {essentialCriteria.length > 0 ? essentialCriteria.map((c: any, i: number) => (
                    <li key={i} className="flex items-start gap-3 px-4 py-3">
                      <CriterionStatusIcon status={c.status} />
                      <span className="text-sm text-foreground/80 leading-snug">{c.criterion}</span>
                    </li>
                  )) : <li className="px-4 py-4 text-sm text-muted-foreground">None recorded</li>}
                </ul>
              </div>
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="px-4 py-3 border-b border-border bg-muted/40 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-foreground/60">Desirable</span>
                  <span className="text-xs text-muted-foreground">
                    {desirableCriteria.filter((c: any) => c.status === 'met').length} of {desirableCriteria.length} met
                  </span>
                </div>
                <ul className="divide-y divide-border">
                  {desirableCriteria.length > 0 ? desirableCriteria.map((c: any, i: number) => (
                    <li key={i} className="flex items-start gap-3 px-4 py-3">
                      <CriterionStatusIcon status={c.status} />
                      <span className="text-sm text-foreground/80 leading-snug">{c.criterion}</span>
                    </li>
                  )) : <li className="px-4 py-4 text-sm text-muted-foreground">None recorded</li>}
                </ul>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-5 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Met</span>
              <span className="flex items-center gap-1.5"><MinusCircle  className="w-3.5 h-3.5 text-amber-400"   /> Partially met</span>
              <span className="flex items-center gap-1.5"><XCircle      className="w-3.5 h-3.5 text-red-400"     /> Not met</span>
            </div>
          </Section>

          <Section label="Keywords & Values" badgeColor="green">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="rounded-xl border border-border bg-card p-5 space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-foreground/50">Skills Detected</p>
                {skillLines.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {skillLines.map((skill: string, i: number) => (
                      <span key={i} className="px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-medium">
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : <p className="text-sm text-muted-foreground">None detected</p>}
              </div>
              <div className="rounded-xl border border-border bg-card p-5 space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-foreground/50">NHS Values Demonstrated</p>
                {valueLines.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {valueLines.map((v: string, i: number) => (
                      <span key={i} className="px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-medium">
                        {v}
                      </span>
                    ))}
                  </div>
                ) : <p className="text-sm text-muted-foreground">None detected</p>}
              </div>
            </div>
          </Section>

          <Section label="Evaluation Dimensions" badge="Included" badgeColor="green">
            <div className="grid sm:grid-cols-2 gap-4">
              {dimCriteria && <DimensionPanel dimension={dimCriteria} icon={<Target className="w-4 h-4" />} />}
              {dimValues   && <DimensionPanel dimension={dimValues}   icon={<Heart  className="w-4 h-4" />} />}
            </div>
          </Section>

          {/* Advanced Dimensions — featureKey drives each gate via admin Settings */}
          <Section label="Advanced Dimensions" badge="Pro" badgeColor="purple">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <PremiumGate label="STAR structure analysis" reason="star" featureKey="score_star">
                {dimStar     && <DimensionPanel dimension={dimStar}     icon={<Zap      className="w-4 h-4" />} />}
              </PremiumGate>
              <PremiumGate label="Language mirroring" reason="language" featureKey="score_language">
                {dimLanguage && <DimensionPanel dimension={dimLanguage} icon={<Pen      className="w-4 h-4" />} />}
              </PremiumGate>
              <PremiumGate label="Specificity analysis" reason="specificity" featureKey="score_specificity">
                {dimDetail   && <DimensionPanel dimension={dimDetail}   icon={<BookOpen className="w-4 h-4" />} />}
              </PremiumGate>
            </div>
          </Section>

          {/* InsightsPanel reads each section's own feature access via hooks */}
          <InsightsPanel analysis={analysis} />

        </AnalysisTabs>

      </main>
    </div>
  )
}