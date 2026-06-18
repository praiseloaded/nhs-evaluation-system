// app/admin/audit-log/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { Loader2, ScrollText, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button';

interface LogEntry {
  id: string; adminEmail: string; action: string; targetType: string
  targetEmail: string | null; notes: string | null; createdAt: string
}

const ACTION_COLORS: Record<string, string> = {
  tier_change: 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300',
  role_change: 'bg-violet-100 dark:bg-violet-900 text-violet-700 dark:text-violet-300',
  suspend: 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300',
  unsuspend: 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300',
  delete_user: 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300',
  impersonate: 'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300',
  refund: 'bg-pink-100 dark:bg-pink-900 text-pink-700 dark:text-pink-300',
}

export default function AdminAuditLogPage() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)

  const load = async (p = 1) => {
    setLoading(true)
    const res = await fetch(`/api/admin/audit-log?page=${p}&limit=50`)
    const d = await res.json()
    setLogs(d.logs ?? []); setTotalPages(d.totalPages ?? 1); setPage(p)
    setLoading(false)
  }

  useEffect(() => { load(1) }, [])

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><ScrollText className="w-6 h-6" /> Audit Log</h1>
        <p className="text-sm text-muted-foreground mt-1">Every admin action, in order. This log cannot be edited or deleted.</p>
      </div>

      <div className="rounded-2xl border border-border bg-card divide-y divide-border">
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : logs.length === 0 ? (
          <p className="text-center py-10 text-sm text-muted-foreground">No admin actions yet.</p>
        ) : (
          logs.map(log => (
            <div key={log.id} className="px-5 py-3.5 flex items-start justify-between gap-3">
              <div>
                <p className="text-[13px] text-foreground">
                  <span className="font-semibold">{log.adminEmail}</span>
                  {' '}
                  <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full ${ACTION_COLORS[log.action] ?? 'bg-muted text-muted-foreground'}`}>
                    {log.action.replace(/_/g, ' ')}
                  </span>
                  {log.targetEmail && <> on <span className="font-medium">{log.targetEmail}</span></>}
                </p>
                {log.notes && <p className="text-[11.5px] text-muted-foreground mt-1">{log.notes}</p>}
              </div>
              <span className="text-[11px] text-muted-foreground shrink-0">{new Date(log.createdAt).toLocaleString('en-GB')}</span>
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