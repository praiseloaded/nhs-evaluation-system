import { Analysis } from '@/lib/types'
import { Lightbulb, CheckCircle2 } from 'lucide-react'

interface InsightsPanelProps {
  analysis: Analysis
}

export function InsightsPanel({ analysis }: InsightsPanelProps) {
  return (
    <div className="grid md:grid-cols-2 gap-8">
      {/* Key Insights */}
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          <h3 className="font-bold text-lg text-foreground">Key Insights</h3>
        </div>
        <ul className="space-y-3">
          {analysis.keyInsights.map((insight, idx) => (
            <li key={idx} className="flex gap-3">
              <span className="text-amber-600 dark:text-amber-400 font-bold mt-0.5">→</span>
              <span className="text-foreground/90 dark:text-slate-300">{insight}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Recommendations */}
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
          <h3 className="font-bold text-lg text-foreground">Recommendations</h3>
        </div>
        <ul className="space-y-3">
          {analysis.recommendations.map((rec, idx) => (
            <li key={idx} className="flex gap-3">
              <span className="text-green-600 dark:text-green-400 font-bold mt-0.5">✓</span>
              <span className="text-foreground/90 dark:text-slate-300">{rec}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
