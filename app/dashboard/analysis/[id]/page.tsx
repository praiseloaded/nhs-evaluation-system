import { Navbar } from '@/components/navbar'
import { ScoreHeader } from '@/components/score-header'
import { DimensionPanel } from '@/components/dimension-panel'
import { InsightsPanel } from '@/components/insights-panel'
import { BookOpen, Target, Heart, Pen, Zap } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

// -------------------- types --------------------

type Params = {
  params: Promise<{ id: string }>
}

// -------------------- icons --------------------

const dimensionIcons = {
  criteria: Target,
  star: Zap,
  valuesAlignment: Heart,
  language: Pen,
  specificity: BookOpen,
}

// -------------------- fetch --------------------

async function getAnalysis(id: string) {
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'

  const res = await fetch(`${baseUrl}/api/analysis/${id}`, {
    cache: 'no-store',
  })

  if (!res.ok) return null

  return res.json()
}

// -------------------- helpers --------------------

function toList(value?: string | null): string[] {
  if (!value) return []
  return value.split('\n').map(v => v.trim()).filter(Boolean)
}

function toCommaList(value?: string | null): string[] {
  if (!value) return []
  return value.split(',').map(v => v.trim()).filter(Boolean)
}

// -------------------- page --------------------

export default async function AnalysisPage({ params }: Params) {
  const { id } = await params

  const analysis = await getAnalysis(id)

  if (!analysis) notFound()

  const essentialCriteria = toList(analysis.essentialCriteria)
  const desirableCriteria = toList(analysis.desirableCriteria)

  const skills = toCommaList(analysis.skills)

  // FIX: API uses organizationalValues, not values
  const values = toCommaList(analysis.organizationalValues)

  // ---------------- safe dimension fallback ----------------

  const dimensions = {
    criteria: analysis.criteria ?? {},
    star: analysis.star ?? {},
    valuesAlignment: analysis.valuesAlignment ?? {},
    language: analysis.language ?? {},
    specificity: analysis.specificity ?? {},
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">

        <Link
          href="/dashboard/saved-analyses"
          className="inline-flex items-center gap-2 text-primary hover:underline font-medium mb-8 dark:text-blue-400"
        >
          ← Back to Analyses
        </Link>

        <ScoreHeader analysis={analysis} />

        <div className="rounded-lg border border-border bg-card p-8 mb-8">
          <h2 className="text-2xl font-bold mb-6">Analysis Details</h2>

          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-semibold mb-3">Job Description</h3>
              <p className="whitespace-pre-wrap text-foreground/80 dark:text-slate-300">
                {analysis.jobDescription ?? 'N/A'}
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Person Specification</h3>
              <p className="whitespace-pre-wrap text-foreground/80 dark:text-slate-300">
                {analysis.personSpec ?? 'N/A'}
              </p>
            </div>
          </div>

          <hr className="my-8 border-border" />

          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-semibold mb-3">Essential Criteria</h3>
              <ul className="space-y-2">
                {essentialCriteria.map((item, i) => (
                  <li key={i} className="flex gap-2 text-foreground/80">
                    • {item}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Desirable Criteria</h3>
              <ul className="space-y-2">
                {desirableCriteria.map((item, i) => (
                  <li key={i} className="flex gap-2 text-foreground/80">
                    ◇ {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <hr className="my-8 border-border" />

          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-semibold mb-3">Skills</h3>
              <div className="flex flex-wrap gap-2">
                {skills.map((skill, i) => (
                  <span key={i} className="px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-950 text-sm">
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Values</h3>
              <div className="flex flex-wrap gap-2">
                {values.map((v, i) => (
                  <span key={i} className="px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-950 text-sm">
                    {v}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <h2 className="text-2xl font-bold mb-6">Evaluation Dimensions</h2>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          <DimensionPanel dimension={dimensions.criteria} icon={dimensionIcons.criteria} />
          <DimensionPanel dimension={dimensions.star} icon={dimensionIcons.star} />
          <DimensionPanel dimension={dimensions.valuesAlignment} icon={dimensionIcons.valuesAlignment} />
          <DimensionPanel dimension={dimensions.language} icon={dimensionIcons.language} />
          <DimensionPanel dimension={dimensions.specificity} icon={dimensionIcons.specificity} />
        </div>

        <InsightsPanel analysis={analysis} />
      </main>
    </div>
  )
}