'use client'

import { useState }  from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Loader2 } from 'lucide-react'

export function ReanalyseButton({ analysisId }: { analysisId: string }) {
  const router = useRouter()
  const [running, setRunning] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const handleReanalyse = async () => {
    setRunning(true)
    setError(null)

    try {
      const res  = await fetch(`/api/analysis/${analysisId}/reanalyse`, { method: 'POST' })
      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error ?? 'Re-analysis failed')
      }

      router.push(`/dashboard/analysis/${analysisId}?reanalysed=1`)
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
          Re-analysing this takes around 30 seconds or more depending on how big yor upload his.
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

  return null
}