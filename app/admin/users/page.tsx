// app/admin/users/page.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Search, Loader2, ChevronLeft, ChevronRight, ArrowUpRight, ShieldAlert, CheckSquare, Square, Ban, CheckCircle2, ArrowUpCircle } from 'lucide-react'

interface UserRow {
  id: string; name: string | null; email: string; tier: string; role: string
  suspended: boolean; analysisUsed: number; analysisLimit: number; createdAt: string
  _count: { analyses: number }
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState('')
  const [tier, setTier] = useState('')
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkBusy, setBulkBusy] = useState(false)

  const load = async (p = page) => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(p), limit: '25' })
    if (search) params.set('search', search)
    if (tier) params.set('tier', tier)
    const res = await fetch(`/api/admin/users?${params.toString()}`)
    const d = await res.json()
    setUsers(d.users ?? [])
    setTotal(d.total ?? 0)
    setTotalPages(d.totalPages ?? 1)
    setPage(p)
    setLoading(false)
  }

  useEffect(() => { load(1) }, [tier])

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); load(1) }

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const bulkAction = async (action: 'tier' | 'suspend', value: any) => {
    if (selected.size === 0) return
    setBulkBusy(true)
    await fetch('/api/admin/users/bulk', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userIds: Array.from(selected), action, value }),
    })
    setSelected(new Set())
    setBulkBusy(false)
    load(page)
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">Users</h1>
        <p className="text-[12.5px] mt-1 font-mono text-muted-foreground">{total.toLocaleString()} total</p>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email…"
            className="w-full rounded-lg pl-9 pr-3 py-2 text-[13px] font-mono bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/30" />
        </div>
        <select value={tier} onChange={e => setTier(e.target.value)} className="rounded-lg px-3 py-2 text-[13px] bg-card border border-border text-foreground">
          <option value="">All tiers</option>
          <option value="free">Free</option>
          <option value="pro">Pro</option>
          <option value="elite">Elite</option>
        </select>
        <button type="submit" className="px-4 py-2 rounded-lg text-[13px] font-semibold bg-amber-500 text-amber-950 hover:bg-amber-600 transition-colors">Search</button>
      </form>

      {selected.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg flex-wrap bg-accent/40 border border-border">
          <p className="text-[12.5px] font-medium text-foreground">{selected.size} selected</p>
          <div className="w-px h-4 bg-border" />
          <button disabled={bulkBusy} onClick={() => bulkAction('tier', 'pro')} className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11.5px] font-medium transition-colors hover:opacity-80 text-blue-600 dark:text-blue-400">
            <ArrowUpCircle className="w-3.5 h-3.5" /> Set Pro
          </button>
          <button disabled={bulkBusy} onClick={() => bulkAction('suspend', true)} className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11.5px] font-medium transition-colors hover:opacity-80 text-amber-600 dark:text-amber-400">
            <Ban className="w-3.5 h-3.5" /> Suspend
          </button>
          <button disabled={bulkBusy} onClick={() => bulkAction('suspend', false)} className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11.5px] font-medium transition-colors hover:opacity-80 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" /> Unsuspend
          </button>
          {bulkBusy && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
          <button onClick={() => setSelected(new Set())} className="ml-auto text-[12px] text-muted-foreground">Clear</button>
        </div>
      )}

      <div className="rounded-2xl overflow-hidden bg-card border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr className="text-[10.5px] uppercase tracking-wide text-muted-foreground">
              <th className="text-left px-3 py-3 w-8"></th>
              <th className="text-left px-4 py-3">User</th>
              <th className="text-left px-4 py-3">Tier</th>
              <th className="text-left px-4 py-3">Usage</th>
              <th className="text-left px-4 py-3">Joined</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr><td colSpan={7} className="text-center py-10"><Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" /></td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-10 text-muted-foreground">No users found.</td></tr>
            ) : (
              users.map(u => (
                <tr key={u.id} className="transition-colors hover:bg-accent/30">
                  <td className="px-3 py-3">
                    <button onClick={() => toggle(u.id)} className={selected.has(u.id) ? 'text-blue-500' : 'text-muted-foreground'}>
                      {selected.has(u.id) ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium flex items-center gap-1.5 text-foreground">
                      {u.name ?? 'Unnamed'}
                      {u.role === 'admin' && <ShieldAlert className="w-3 h-3 text-amber-500" />}
                    </p>
                    <p className="text-[11.5px] font-mono text-muted-foreground">{u.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-muted ${u.tier === 'pro' ? 'text-blue-600 dark:text-blue-400' : u.tier === 'elite' ? 'text-violet-600 dark:text-violet-400' : 'text-muted-foreground'}`}>
                      {u.tier}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[12px] font-mono text-muted-foreground">
                    {u._count.analyses} analyses · {u.analysisUsed}/{u.analysisLimit}
                  </td>
                  <td className="px-4 py-3 text-[12px] font-mono text-muted-foreground">
                    {new Date(u.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3">
                    {u.suspended
                      ? <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">Suspended</span>
                      : <span className="text-[11px] text-emerald-600 dark:text-emerald-400">Active</span>}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/users/${u.id}`} className="text-muted-foreground hover:text-foreground transition-colors">
                      <ArrowUpRight className="w-4 h-4" />
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button onClick={() => load(page - 1)} disabled={page <= 1} className="p-2 rounded-lg border border-border text-muted-foreground disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
          <span className="text-[12.5px] font-mono text-muted-foreground">Page {page} of {totalPages}</span>
          <button onClick={() => load(page + 1)} disabled={page >= totalPages} className="p-2 rounded-lg border border-border text-muted-foreground disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
        </div>
      )}
    </div>
  )
}