// app/admin/system-health/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { Loader2, Activity, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button';

interface EventRow {
  id: string; type: string; provider: string | null; endpoint: string | null
  statusCode: number | null; durationMs: number | null; errorMessage: string | null
  createdAt: string
}

const TYPE_COLORS: Record<string, string> = {
  ai_call: 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300',
  ai_error: 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300',
  api_error: 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300',
  scrape_failure: 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300',
  payment_event: 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300',
}

export default function AdminSystemHealthPage() {
  const [events, setEvents] = useState<EventRow[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [type, setType] = useState('')
  const [loading, setLoading] = useState(true)

  const load = async (p = 1) => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(p), limit: '50' })
    if (type) params.set('type', type)
    const res = await fetch(`/api/admin/system-events?${params.toString()}`)
    const d = await res.json()
    setEvents(d.events ?? []); setTotalPages(d.totalPages ?? 1); setPage(p)
    setLoading(false)
  }

  useEffect(() => { load(1) }, [type])

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Activity className="w-6 h-6" /> Usage & AI Health</h1>
        <p className="text-sm text-muted-foreground mt-1">Raw event feed from AI calls, errors, and scraper failures.</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {['', 'ai_call', 'ai_error', 'api_error', 'scrape_failure', 'payment_event'].map(t => (
          <button key={t} onClick={() => setType(t)}
            className={`px-3 py-1.5 rounded-full text-[12px] font-medium border transition-colors ${type === t ? 'bg-foreground text-background border-foreground' : 'border-border text-muted-foreground hover:text-foreground'}`}>
            {t === '' ? 'All' : t.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card divide-y divide-border">
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : events.length === 0 ? (
          <div className="text-center py-10 space-y-2">
            <AlertCircle className="w-6 h-6 text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground">No events logged yet. Wire up <code className="text-xs bg-muted px-1 rounded">logSystemEvent()</code> from your AI call routes to populate this.</p>
          </div>
        ) : (
          events.map(e => (
            <div key={e.id} className="px-5 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full shrink-0 ${TYPE_COLORS[e.type] ?? 'bg-muted text-muted-foreground'}`}>
                    {e.type.replace(/_/g, ' ')}
                  </span>
                  {e.provider && <span className="text-[11px] text-muted-foreground capitalize">{e.provider}</span>}
                  <span className="text-[12px] text-foreground font-mono truncate">{e.endpoint ?? '—'}</span>
                </div>
                {e.errorMessage && <p className="text-[11.5px] text-red-500 mt-1 truncate">{e.errorMessage}</p>}
              </div>
              <div className="text-right shrink-0">
                {e.durationMs != null && <p className="text-[11px] text-muted-foreground">{e.durationMs}ms</p>}
                <p className="text-[10.5px] text-muted-foreground">{new Date(e.createdAt).toLocaleString('en-GB')}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button onClick={() => load(page - 1)} disabled={page <= 1} className="p-2 rounded-lg border border-border disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></Button>
          <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
          <Button onClick={() => load(page + 1)} disabled={page >= totalPages} className="p-2 rounded-lg border border-border disabled:opacity-30"><ChevronRight className="w-4 h-4" /></Button>
        </div>
      )}
    </div>
  )
}