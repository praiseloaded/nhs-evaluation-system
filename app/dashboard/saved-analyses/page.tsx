import { Navbar } from '@/components/navbar'
import { mockAnalyses } from '@/lib/mock-data'
import Link from 'next/link'
import { Search, Plus } from 'lucide-react'

export default function SavedAnalysesPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Saved Analyses</h1>
            <p className="text-muted-foreground dark:text-slate-400">
              Browse and manage all your evaluations
            </p>
          </div>

          <Link
            href="/new-analysis"
            className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2 font-semibold hover:opacity-90 transition-opacity"
          >
            <Plus className="h-5 w-5" />
            New Analysis
          </Link>
        </div>

        {/* Filter and Search */}
        <div className="mb-8 rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground dark:text-slate-400">
            <Search className="h-5 w-5" />
            <input
              type="text"
              placeholder="Search analyses..."
              className="flex-1 bg-transparent outline-none text-foreground placeholder-muted-foreground dark:placeholder-slate-500"
            />
          </div>
        </div>

        {/* Analyses Table/Grid */}
        <div className="space-y-4">
          {mockAnalyses.map((analysis) => (
            <Link
              key={analysis.id}
              href={`/analysis/${analysis.id}`}
              className="block rounded-lg border border-border bg-card p-6 hover:shadow-lg transition-all dark:hover:shadow-slate-900"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-foreground hover:text-primary transition-colors">
                    {analysis.jobTitle}
                  </h3>
                  <p className="text-sm text-muted-foreground dark:text-slate-400 mt-1">
                    {analysis.title}
                  </p>

                  <div className="flex flex-wrap gap-3 mt-4 text-sm text-foreground/70 dark:text-slate-400">
                    <span>Band: {analysis.band}</span>
                    <span>•</span>
                    <span>{analysis.location}</span>
                    <span>•</span>
                    <span>Created {analysis.createdAt.toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <div className={`inline-flex items-center px-4 py-2 rounded-lg font-bold text-lg ${
                    analysis.overallScore >= 85
                      ? 'bg-green-100 dark:bg-green-950 text-green-900 dark:text-green-100'
                      : analysis.overallScore >= 75
                      ? 'bg-blue-100 dark:bg-blue-950 text-blue-900 dark:text-blue-100'
                      : analysis.overallScore >= 65
                      ? 'bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-100'
                      : 'bg-red-100 dark:bg-red-950 text-red-900 dark:text-red-100'
                  }`}>
                    {analysis.overallScore}%
                  </div>
                  <p className="text-xs text-muted-foreground dark:text-slate-500">
                    Overall Score
                  </p>
                </div>
              </div>

              {/* Dimension Scores Row */}
              <div className="grid grid-cols-5 gap-2 mt-4 pt-4 border-t border-border">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground dark:text-slate-500 mb-1">Criteria</p>
                  <p className="font-bold text-foreground">{analysis.criteria.score}%</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground dark:text-slate-500 mb-1">STAR</p>
                  <p className="font-bold text-foreground">{analysis.star.score}%</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground dark:text-slate-500 mb-1">Values</p>
                  <p className="font-bold text-foreground">{analysis.valuesAlignment.score}%</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground dark:text-slate-500 mb-1">Language</p>
                  <p className="font-bold text-foreground">{analysis.language.score}%</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground dark:text-slate-500 mb-1">Specificity</p>
                  <p className="font-bold text-foreground">{analysis.specificity.score}%</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}
