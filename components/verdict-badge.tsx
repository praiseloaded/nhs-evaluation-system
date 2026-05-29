import { VerdictType } from '@/lib/types'

interface VerdictBadgeProps {
  verdict: VerdictType
  score: number
}

const verdictConfig = {
  excellent: {
    bg: 'bg-green-100 dark:bg-green-950',
    text: 'text-green-900 dark:text-green-100',
    border: 'border-green-300 dark:border-green-700',
    badge: 'bg-green-200 dark:bg-green-800 text-green-900 dark:text-green-100',
  },
  good: {
    bg: 'bg-blue-100 dark:bg-blue-950',
    text: 'text-blue-900 dark:text-blue-100',
    border: 'border-blue-300 dark:border-blue-700',
    badge: 'bg-blue-200 dark:bg-blue-800 text-blue-900 dark:text-blue-100',
  },
  acceptable: {
    bg: 'bg-amber-100 dark:bg-amber-950',
    text: 'text-amber-900 dark:text-amber-100',
    border: 'border-amber-300 dark:border-amber-700',
    badge: 'bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100',
  },
  poor: {
    bg: 'bg-red-100 dark:bg-red-950',
    text: 'text-red-900 dark:text-red-100',
    border: 'border-red-300 dark:border-red-700',
    badge: 'bg-red-200 dark:bg-red-800 text-red-900 dark:text-red-100',
  },
}

const verdictLabel = {
  excellent: 'Excellent',
  good: 'Good',
  acceptable: 'Acceptable',
  poor: 'Poor',
}

export function VerdictBadge({ verdict, score }: VerdictBadgeProps) {
  const config = verdictConfig[verdict]
  
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${config.badge} font-medium text-sm`}>
      <span>{verdictLabel[verdict]}</span>
      <span className="font-bold">{score}%</span>
    </div>
  )
}
