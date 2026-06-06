'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Loader2 } from 'lucide-react'

export function ReanalyseButton({ analysisId }: { analysisId: string }) {
  const router = useRouter()
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleReanalyse = async () => {
    setRunning(true)
    setError(null)

    try {
      const res = await fetch(`/api/analysis/${analysisId}/reanalyse`, {
        method: 'POST',
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error ?? 'Re-analysis failed')
      }

      // Refresh the page to show updated results
      router.refresh()
    } catch (err: any) {
      setError(err.message)
      setRunning(false)
    }
  }

  if (running) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
        <Loader2 className="w-4 h-4 text-blue-500 shrink-0 animate-spin" />
        <p className="text-xs text-blue-700 dark:text-blue-300 flex-1">
          Re-analysing with latest AI… this takes around 30 seconds.
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800">
        <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
        <p className="text-xs text-red-700 dark:text-red-300 flex-1">{error}</p>
        <button
          onClick={handleReanalyse}
          className="text-xs font-medium text-red-700 dark:text-red-300 underline whitespace-nowrap"
        >
          Try again
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800">
      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
      <p className="text-xs text-amber-700 dark:text-amber-300 flex-1">
        This analysis has incomplete data from an earlier run.
      </p>
      <button
        onClick={handleReanalyse}
        className="text-xs font-medium text-amber-700 dark:text-amber-300 underline whitespace-nowrap"
      >
        Re-analyse
      </button>
    </div>
  )
}