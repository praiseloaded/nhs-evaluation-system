import { DimensionScore } from '@/lib/types'
import { VerdictBadge } from './verdict-badge'
import { CheckCircle, AlertCircle, TrendingUp } from 'lucide-react'

interface DimensionPanelProps {
  dimension: DimensionScore
  icon?: React.ReactNode
}

export function DimensionPanel({ dimension, icon }: DimensionPanelProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-6 hover:shadow-lg transition-shadow dark:hover:shadow-lg dark:hover:shadow-slate-900">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            {icon && <span className="text-xl">{icon}</span>}
            <h3 className="font-bold text-lg text-foreground">{dimension.name}</h3>
          </div>
          <VerdictBadge verdict={dimension.verdict} score={dimension.score} />
        </div>
      </div>

      {/* Evidence */}
      {dimension.evidence.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            Evidence
          </h4>
          <ul className="space-y-1">
            {dimension.evidence.map((item, idx) => (
              <li key={idx} className="text-sm text-muted-foreground dark:text-slate-400">
                • {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Improvements */}
      {dimension.improvements.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            Areas for Improvement
          </h4>
          <ul className="space-y-1">
            {dimension.improvements.map((item, idx) => (
              <li key={idx} className="text-sm text-muted-foreground dark:text-slate-400">
                • {item}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
