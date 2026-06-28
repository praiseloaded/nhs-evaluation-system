// app/admin/users/page.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Search, Loader2, ChevronLeft, ChevronRight, ArrowUpRight,
  ShieldAlert, CheckSquare, Square, Ban, CheckCircle2,
  ArrowUpCircle, Star, Users, UserX, RefreshCw,
  Eye, Filter, Database,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface UserRow {
  id: string; name: string | null; email: string; tier: string; role: string
  suspended: boolean; analysisUsed: number; analysisLimit: number
  createdAt: string; _db: string
  _count: { analyses: number; applications: number; interviews: number }
}

const TIER_STYLES: Record<string, string> = {
  elite: 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800',
  pro:   'bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800',
  free:  'bg-muted text-muted-foreground border border-border',
}

export default function AdminUsersPage() {
  const [users,      setUsers]      = useState<UserRow[]>([])
  const [total,      setTotal]      = useState(0)
  const [page,       setPage]       = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [search,     setSearch]     = useState('')
  const [tier,       setTier]       = useState('')
  const [loading,    setLoading]    = useState(true)
  const [selected,   setSelected]   = useState<Set<string>>(new Set())
  const [bulkBusy,   setBulkBusy]   = useState(false)
  const [impersonating, setImpersonating] = useState<string | null>(null)

  const load = useCallback(async (p = 1) => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(p), limit: '25' })
    if (search) params.set('search', search)
    if (tier)   params.set('tier', tier)
    const res = await fetch(`/api/admin/users?${params.toString()}`)
    const d   = await res.json()
    setUsers(d.users ?? [])
    setTotal(d.total ?? 0)
    setTotalPages(d.totalPages ?? 1)
    setPage(p)
    setLoading(false)
  }, [search, tier])

  useEffect(() => { load(1) }, [tier])

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); load(1) }

  const toggle = (id: string) => setSelected(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  const toggleAll = () => {
    if (selected.size === users.length) setSelected(new Set())
    else setSelected(new Set(users.map(u => u.id)))
  }

  const bulkAction = async (action: 'tier' | 'suspend', value: any) => {
    if (!selected.size) return
    setBulkBusy(true)
    await fetch('/api/admin/users/bulk', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ userIds: Array.from(selected), action, value }),
    })
    setSelected(new Set())
    setBulkBusy(false)
    load(page)
  }

  const impersonate = async (userId: string, userName: string) => {
    setImpersonating(userId)
    const res = await fetch('/api/admin/impersonate', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ userId, reason: 'Admin user view' }),
    })
    const d = await res.json()
    if (d.success) {
      window.open('/dashboard', '_blank')
    } else {
      alert(d.error ?? 'Impersonation failed')
    }
    setImpersonating(null)
  }

  const setUserTier = async (userId: string, newTier: string) => {
    await fetch(`/api/admin/users/${userId}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ tier: newTier }),
    })
    load(page)
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-black tracking-tight text-foreground flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-500" /> Users
          </h1>
          <p className="text-[12px] mt-1 font-mono text-muted-foreground">
            {total.toLocaleString()} total across both databases
          </p>
        </div>
        <button onClick={() => load(page)}
          className="flex items-center gap-1.5 text-[12px] text-muted-foreground border border-border rounded-lg px-3 py-1.5 hover:bg-muted transition-colors">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Search & filters */}
      <form onSubmit={handleSearch} className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="w-full rounded-xl pl-10 pr-4 py-2.5 text-[13px] bg-card border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/15 transition-all" />
        </div>
        <select value={tier} onChange={e => setTier(e.target.value)}
          className="rounded-xl px-4 py-2.5 text-[13px] bg-card border border-border text-foreground outline-none focus:border-amber-400">
          <option value="">All tiers</option>
          <option value="free">Free</option>
          <option value="pro">Pro</option>
          <option value="elite">Elite</option>
        </select>
        <button type="submit"
          className="px-5 py-2.5 rounded-xl text-[13px] font-bold bg-amber-500 hover:bg-amber-600 text-amber-950 transition-colors flex items-center gap-2">
          <Filter className="w-4 h-4" /> Filter
        </button>
      </form>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-foreground/5 border border-border flex-wrap">
          <p className="text-[13px] font-semibold text-foreground">{selected.size} selected</p>
          <div className="w-px h-4 bg-border" />
          <button disabled={bulkBusy} onClick={() => bulkAction('tier', 'pro')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors disabled:opacity-50">
            <ArrowUpCircle className="w-3.5 h-3.5" /> Set Pro
          </button>
          <button disabled={bulkBusy} onClick={() => bulkAction('tier', 'elite')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors disabled:opacity-50">
            <Star className="w-3.5 h-3.5" /> Set Elite
          </button>
          <button disabled={bulkBusy} onClick={() => bulkAction('suspend', true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-50">
            <UserX className="w-3.5 h-3.5" /> Suspend
          </button>
          <button disabled={bulkBusy} onClick={() => bulkAction('suspend', false)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors disabled:opacity-50">
            <CheckCircle2 className="w-3.5 h-3.5" /> Unsuspend
          </button>
          {bulkBusy && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
          <button onClick={() => setSelected(new Set())}
            className="ml-auto text-[12px] text-muted-foreground hover:text-foreground transition-colors">
            Clear
          </button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-2xl overflow-hidden bg-card border border-border">
        <table className="w-full">
          <thead>
            <tr className="bg-muted/40 border-b border-border text-[10px] uppercase tracking-widest text-muted-foreground">
              <th className="text-left px-4 py-3 w-10">
                <button onClick={toggleAll}
                  className={selected.size === users.length && users.length > 0 ? 'text-amber-500' : 'text-muted-foreground'}>
                  {selected.size === users.length && users.length > 0
                    ? <CheckSquare className="w-4 h-4" />
                    : <Square className="w-4 h-4" />
                  }
                </button>
              </th>
              <th className="text-left px-4 py-3">User</th>
              <th className="text-left px-4 py-3">Tier</th>
              <th className="text-left px-4 py-3">Activity</th>
              <th className="text-left px-4 py-3">Joined</th>
              <th className="text-left px-4 py-3">DB</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={8} className="text-center py-16">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-16">
                  <Users className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
                  <p className="text-[13px] text-muted-foreground">No users found</p>
                </td>
              </tr>
            ) : users.map(u => (
              <tr key={u.id}
                className={cn(
                  'transition-colors hover:bg-muted/30',
                  selected.has(u.id) && 'bg-amber-50/50 dark:bg-amber-950/10',
                  u.suspended && 'opacity-60'
                )}>

                {/* Checkbox */}
                <td className="px-4 py-3.5">
                  <button onClick={() => toggle(u.id)}
                    className={selected.has(u.id) ? 'text-amber-500' : 'text-muted-foreground'}>
                    {selected.has(u.id)
                      ? <CheckSquare className="w-4 h-4" />
                      : <Square className="w-4 h-4" />
                    }
                  </button>
                </td>

                {/* User */}
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-[12px] font-black text-white shrink-0">
                      {(u.name ?? u.email)[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-foreground flex items-center gap-1.5 truncate">
                        {u.name ?? 'Unnamed'}
                        {u.role === 'admin' && (
                          <ShieldAlert className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        )}
                      </p>
                      <p className="text-[11px] font-mono text-muted-foreground truncate">{u.email}</p>
                    </div>
                  </div>
                </td>

                {/* Tier — clickable to cycle */}
                <td className="px-4 py-3.5">
                  <select
                    value={u.tier}
                    onChange={e => setUserTier(u.id, e.target.value)}
                    className={cn(
                      'text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full cursor-pointer border-0 outline-none appearance-none',
                      TIER_STYLES[u.tier] ?? TIER_STYLES.free
                    )}>
                    <option value="free">Free</option>
                    <option value="pro">Pro</option>
                    <option value="elite">Elite</option>
                  </select>
                </td>

                {/* Activity */}
                <td className="px-4 py-3.5">
                  <div className="text-[11px] text-muted-foreground space-y-0.5">
                    <div>{u._count?.analyses ?? 0} analyses</div>
                    <div>{u._count?.applications ?? 0} apps · {u._count?.interviews ?? 0} interviews</div>
                  </div>
                </td>

                {/* Joined */}
                <td className="px-4 py-3.5">
                  <span className="text-[11.5px] font-mono text-muted-foreground">
                    {new Date(u.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </td>

                {/* DB shard */}
                <td className="px-4 py-3.5">
                  <span className={cn(
                    'text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-full flex items-center gap-1 w-fit',
                    u._db === 'primary'
                      ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400'
                      : 'bg-violet-50 dark:bg-violet-950/30 text-violet-600 dark:text-violet-400'
                  )}>
                    <Database className="w-2.5 h-2.5" />
                    {u._db === 'primary' ? 'DB1' : 'DB2'}
                  </span>
                </td>

                {/* Status */}
                <td className="px-4 py-3.5">
                  {u.suspended ? (
                    <span className="text-[11px] font-bold text-red-500 flex items-center gap-1">
                      <UserX className="w-3.5 h-3.5" /> Suspended
                    </span>
                  ) : (
                    <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Active
                    </span>
                  )}
                </td>

                {/* Actions */}
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-1.5 justify-end">
                    {u.role !== 'admin' && (
                      <button
                        onClick={() => impersonate(u.id, u.name ?? u.email)}
                        disabled={impersonating === u.id}
                        title="View as this user (opens in new tab)"
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-muted-foreground hover:text-foreground hover:bg-muted border border-border transition-all disabled:opacity-50">
                        {impersonating === u.id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <Eye className="w-3.5 h-3.5" />
                        }
                        View
                      </button>
                    )}
                    <Link href={`/admin/users/${u.id}`}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-muted-foreground hover:text-foreground hover:bg-muted border border-border transition-all">
                      <ArrowUpRight className="w-3.5 h-3.5" /> Details
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-[12px] text-muted-foreground">
            Showing {(page-1)*25+1}–{Math.min(page*25, total)} of {total.toLocaleString()} users
          </p>
          <div className="flex items-center gap-2">
            <button onClick={() => load(page - 1)} disabled={page <= 1}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-[12px] text-muted-foreground disabled:opacity-30 hover:bg-muted transition-colors">
              <ChevronLeft className="w-4 h-4" /> Prev
            </button>
            <span className="text-[12px] font-mono text-muted-foreground px-2">
              {page} / {totalPages}
            </span>
            <button onClick={() => load(page + 1)} disabled={page >= totalPages}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-[12px] text-muted-foreground disabled:opacity-30 hover:bg-muted transition-colors">
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}