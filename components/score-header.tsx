import { Analysis } from '@/lib/types'
import { Award, BarChart3 } from 'lucide-react'

interface ScoreHeaderProps {
  analysis: Analysis
}

export function ScoreHeader({ analysis }: ScoreHeaderProps) {
  const getVerdictColor = (score: number) => {
    if (score >= 85) return 'text-green-600 dark:text-green-400'
    if (score >= 75) return 'text-blue-600 dark:text-blue-400'
    if (score >= 65) return 'text-amber-600 dark:text-amber-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getVerdictBg = (score: number) => {
    if (score >= 85) return 'bg-green-50 dark:bg-green-950'
    if (score >= 75) return 'bg-blue-50 dark:bg-blue-950'
    if (score >= 65) return 'bg-amber-50 dark:bg-amber-950'
    return 'bg-red-50 dark:bg-red-950'
  }

  return (
    <div className={`rounded-lg border border-border ${getVerdictBg(analysis.overallScore)} p-8 mb-8`}>
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">{analysis.jobTitle}</h1>
          <p className="text-foreground/70 dark:text-slate-400 mb-4">{analysis.title}</p>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground dark:text-slate-500 font-medium">Band</p>
              <p className="text-foreground font-semibold">{analysis.band}</p>
            </div>
            <div>
              <p className="text-muted-foreground dark:text-slate-500 font-medium">Location</p>
              <p className="text-foreground font-semibold">{analysis.location}</p>
            </div>
            <div>
              <p className="text-muted-foreground dark:text-slate-500 font-medium">Created</p>
              <p className="text-foreground font-semibold">{analysis.createdAt.toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-muted-foreground dark:text-slate-500 font-medium">Updated</p>
              <p className="text-foreground font-semibold">{analysis.updatedAt.toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        <div className="lg:text-center">
          <div className="inline-flex flex-col items-center gap-2">
            <div className={`text-7xl font-bold ${getVerdictColor(analysis.overallScore)}`}>
              {analysis.overallScore}
            </div>
            <p className="text-sm font-semibold text-muted-foreground dark:text-slate-400">Overall Score</p>
            <div className="flex items-center gap-2 mt-3 text-foreground">
              <Award className="h-5 w-5" />
              <span className="text-lg font-semibold">
                {analysis.overallScore >= 85 ? 'Excellent Fit' : analysis.overallScore >= 75 ? 'Good Fit' : analysis.overallScore >= 65 ? 'Acceptable' : 'Needs Review'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
