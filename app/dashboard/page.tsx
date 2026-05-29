'use client'

import { mockAnalyses } from '@/lib/mock-data'
import Link from 'next/link'
import { Plus, FileText, TrendingUp } from 'lucide-react'

export default function DashboardPage() {
  const recentAnalyses = mockAnalyses.slice(0, 2)

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero Section */}
      <div className="mb-12">
        <h1 className="text-4xl font-bold text-foreground mb-3">Dashboard</h1>
        <p className="text-lg text-muted-foreground dark:text-slate-400 mb-6">
          Overview of your evaluations and recent analyses
        </p>

        <Link
          href="/dashboard/new-analysis"
          className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-6 py-3 font-semibold hover:opacity-90 transition-opacity"
        >
          <Plus className="h-5 w-5" />
          Start New Analysis
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-3 gap-6 mb-12">
        <div className="rounded-lg border border-border bg-card p-6 dark:bg-slate-950 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground dark:text-slate-500">Total Analyses</p>
              <p className="text-3xl font-bold text-foreground mt-1">{mockAnalyses.length}</p>
            </div>
            <FileText className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-6 dark:bg-slate-950 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground dark:text-slate-500">Average Score</p>
              <p className="text-3xl font-bold text-foreground mt-1">
                {Math.round(mockAnalyses.reduce((acc, a) => acc + a.overallScore, 0) / mockAnalyses.length)}%
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-6 dark:bg-slate-950 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground dark:text-slate-500">Excellent Fit</p>
              <p className="text-3xl font-bold text-foreground mt-1">
                {mockAnalyses.filter(a => a.overallScore >= 85).length}
              </p>
            </div>
            <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-950 flex items-center justify-center">
              <span className="text-green-600 dark:text-green-400 font-bold">★</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Analyses */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-foreground">Recent Analyses</h2>
          <Link
            href="/dashboard/saved-analyses"
            className="text-primary hover:underline font-medium dark:text-blue-400"
          >
            View All →
          </Link>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {recentAnalyses.map((analysis) => (
            <Link
              key={analysis.id}
              href={`/dashboard/analysis/${analysis.id}`}
              className="group rounded-lg border border-border bg-card p-6 hover:shadow-lg transition-all dark:hover:shadow-slate-900 dark:hover:shadow-lg"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">
                    {analysis.jobTitle}
                  </h3>
                  <p className="text-sm text-muted-foreground dark:text-slate-400">{analysis.title}</p>
                </div>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${
                  analysis.overallScore >= 85
                    ? 'bg-green-100 dark:bg-green-950 text-green-900 dark:text-green-100'
                    : analysis.overallScore >= 75
                    ? 'bg-blue-100 dark:bg-blue-950 text-blue-900 dark:text-blue-100'
                    : 'bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-100'
                }`}>
                  {analysis.overallScore}%
                </span>
              </div>

              <div className="flex items-center justify-between text-sm text-muted-foreground dark:text-slate-400 mb-4">
                <span>{analysis.band}</span>
                <span>{analysis.location}</span>
              </div>

              <p className="text-sm text-foreground/80 dark:text-slate-300 group-hover:text-foreground transition-colors">
                Updated {analysis.updatedAt.toLocaleDateString()}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
