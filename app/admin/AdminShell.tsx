// app/admin/AdminShell.tsx
'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import {
  LayoutDashboard, Users, ScrollText, Activity, ShieldAlert,
  AlertTriangle, Search, X, Loader2, MessageCircle,
  Settings, ChevronLeft, ChevronRight,
  Menu, Sparkles, ShoppingBag,
} from 'lucide-react'
import { ThemeSwitcher } from '@/components/theme-switcher'
import { Button } from '@/components/ui/button'

const NAV_GROUPS = [
  {
    label: 'Platform',
    items: [
      { href: '/admin',              label: 'Overview',           icon: LayoutDashboard },
      { href: '/admin/users',        label: 'Users',              icon: Users           },
      { href: '/admin/mentorship',   label: 'Mentorship',         icon: MessageCircle   },
      { href: '/admin/marketplace',  label: 'Marketplace',        icon: ShoppingBag, badge: 'NEW' },
    ],
  },
  {
    label: 'Finance',
    items: [
      { href: '/admin/settings',     label: 'Settings & Pricing', icon: Settings, badge: 'Stripe' },
    ],
  },
  {
    label: 'System',
    items: [
      { href: '/admin/system-health',label: 'AI Health',          icon: Activity  },
      { href: '/admin/audit-log',    label: 'Audit Log',          icon: ScrollText},
    ],
  },
]

// ── Command search ─────────────────────────────────────────────────────────────

function CommandSearch() {
  const [open,    setOpen]    = useState(false)
  const [query,   setQuery]   = useState('')
  const [results, setResults] = useState<{ id: string; name: string | null; email: string; tier: string }[]>([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const router   = useRouter()

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setOpen(o => !o) }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 50) }, [open])

  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    const t = setTimeout(async () => {
      setLoading(true)
      const res = await fetch(`/api/admin/users?search=${encodeURIComponent(query)}&limit=6`)
      const d   = await res.json()
      setResults(d.users ?? [])
      setLoading(false)
    }, 250)
    return () => clearTimeout(t)
  }, [query])

  const goTo = (id: string) => { setOpen(false); setQuery(''); router.push(`/admin/users/${id}`) }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-start justify-center pt-[15vh]"
      onClick={() => setOpen(false)}>
      <div onClick={e => e.stopPropagation()}
        className="w-full max-w-md mx-4 rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search users by email or name…"
            className="flex-1 text-[14px] bg-transparent text-foreground placeholder:text-muted-foreground outline-none" />
          {loading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground shrink-0" />}
          <Button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground shrink-0">
            <X className="w-4 h-4" />
          </Button>
        </div>
        {results.length > 0 && (
          <div className="divide-y divide-border max-h-72 overflow-y-auto">
            {results.map(u => (
              <Button key={u.id} onClick={() => goTo(u.id)}
                className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-muted/50 transition-colors">
                <div>
                  <p className="text-[14px] font-medium text-foreground">{u.name ?? 'Unnamed'}</p>
                  <p className="text-[12px] font-mono text-muted-foreground">{u.email}</p>
                </div>
                <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-full ${
                  u.tier === 'elite' ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300' :
                  u.tier === 'pro'   ? 'bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300' :
                  'bg-muted text-muted-foreground'
                }`}>{u.tier}</span>
              </Button>
            ))}
          </div>
        )}
        {query && !loading && results.length === 0 && (
          <p className="px-4 py-5 text-[13px] text-muted-foreground text-center">No users found for "{query}"</p>
        )}
      </div>
    </div>
  )
}

// ── Impersonation banner ───────────────────────────────────────────────────────

function ImpersonationBanner() {
  const [state, setState] = useState<{ isImpersonating: boolean; targetEmail?: string } | null>(null)
  const router = useRouter()

  useEffect(() => {
    fetch('/api/admin/impersonation-state').then(r => r.json()).then(setState).catch(() => {})
  }, [])

  if (!state?.isImpersonating) return null

  const stop = async () => {
    await fetch('/api/admin/impersonate', { method: 'DELETE' })
    window.location.reload()
  }

  return (
    <div className="bg-amber-500 text-amber-950 px-4 py-2.5 flex items-center justify-between gap-3 text-[13px] font-semibold shrink-0">
      <span className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4" />
        Viewing as {state.targetEmail ?? 'user'} — actions affect their real account
      </span>
      <button onClick={stop}
        className="px-3 py-1 rounded-lg bg-amber-950 text-amber-50 text-[12px] font-bold hover:opacity-85 transition-opacity">
        Stop impersonating
      </button>
    </div>
  )
}

// ── Admin shell ────────────────────────────────────────────────────────────────

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname  = usePathname()
  const [isOpen,    setIsOpen]    = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('admin-sidebar-collapsed')
    if (saved === 'true') setCollapsed(true)
  }, [])

  const toggleCollapsed = () => {
    setCollapsed(c => {
      localStorage.setItem('admin-sidebar-collapsed', String(!c))
      return !c
    })
  }

  const isActive = (href: string) =>
    href === '/admin' ? pathname === href : pathname.startsWith(href)

  return (
    <div className="min-h-screen bg-background flex">
      <CommandSearch />

      {/* Mobile overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm md:hidden z-40"
          onClick={() => setIsOpen(false)} />
      )}

      {/* ── Sidebar ── */}
      <aside className={`fixed left-0 top-0 h-screen flex flex-col z-40 transition-all duration-300 md:translate-x-0
        bg-card border-r border-border
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        ${collapsed ? 'w-[72px]' : 'w-[260px]'}`}>

        {/* Brand */}
        <div className={`h-[64px] flex items-center gap-3 border-b border-border shrink-0 ${collapsed ? 'justify-center px-3' : 'px-5'}`}>
          <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center shrink-0 shadow-md shadow-amber-500/25">
            <ShieldAlert className="w-5 h-5 text-amber-950" />
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-black text-foreground tracking-tight leading-none">Admin</p>
              <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1 leading-none">
                <Sparkles className="w-3 h-3 shrink-0" />
                <span>Elite · Unlimited access</span>
              </p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 space-y-5 scrollbar-thin">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className={collapsed ? 'px-2' : 'px-3'}>
              {!collapsed && (
                <p className="text-[11px] font-bold tracking-[0.12em] text-muted-foreground/50 uppercase px-2 mb-2">
                  {group.label}
                </p>
              )}
              {collapsed && <div className="h-px bg-border/60 mb-2" />}

              <div className="space-y-0.5">
                {group.items.map(item => {
                  const Icon   = item.icon
                  const active = isActive(item.href)
                  return (
                    <Link key={item.href} href={item.href}
                      onClick={() => setIsOpen(false)}
                      title={collapsed ? item.label : undefined}
                      className={`group relative flex items-center gap-3 rounded-xl text-[14px] font-medium transition-all duration-150
                        ${collapsed ? 'justify-center py-3 px-1' : 'px-3 py-2.5'}
                        ${active
                          ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        }`}>

                      {active && !collapsed && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-amber-500" />
                      )}

                      <Icon className={`h-5 w-5 shrink-0 transition-all ${active ? 'text-amber-600 dark:text-amber-400' : ''}`} />

                      {!collapsed && (
                        <>
                          <span className="flex-1 truncate">{item.label}</span>
                          {(item as any).badge && (
                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full shrink-0 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                              {(item as any).badge}
                            </span>
                          )}
                        </>
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}

          {/* Search button */}
          {!collapsed && (
            <div className="px-3">
              <button
                onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }))}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] text-muted-foreground border border-border hover:bg-muted transition-colors">
                <Search className="w-4 h-4 shrink-0" />
                <span className="flex-1 text-left">Search users…</span>
                <kbd className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded border border-border">⌘K</kbd>
              </button>
            </div>
          )}
        </nav>

        {/* Footer */}
        <div className={`border-t border-border shrink-0 py-3 ${collapsed ? 'px-2 flex flex-col items-center gap-2' : 'px-3 space-y-2'}`}>
          {!collapsed ? (
            <div className="flex items-center justify-between px-1">
              <Link href="/dashboard" className="text-[12px] text-muted-foreground hover:text-foreground transition-colors">
                ← Back to app
              </Link>
              <ThemeSwitcher />
            </div>
          ) : (
            <ThemeSwitcher />
          )}

          <button onClick={toggleCollapsed}
            className={`hidden md:flex items-center w-full rounded-lg text-[12px] text-muted-foreground/50 hover:text-foreground hover:bg-muted transition-colors px-2 py-1.5 ${collapsed ? 'justify-center' : 'gap-2'}`}>
            {collapsed
              ? <ChevronRight className="w-4 h-4" />
              : <><ChevronLeft className="w-4 h-4" /><span>Collapse</span></>
            }
          </button>
        </div>
      </aside>

      {/* Desktop spacer */}
      <div className={`hidden md:block shrink-0 transition-all duration-300 ${collapsed ? 'w-[72px]' : 'w-[260px]'}`} />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <ImpersonationBanner />

        {/* Mobile header */}
        <div className="md:hidden flex items-center gap-3 h-14 px-4 border-b border-border bg-card shrink-0">
          <Button onClick={() => setIsOpen(true)}
            className="w-9 h-9 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            <Menu className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4 text-amber-950" />
            </div>
            <span className="text-[14px] font-black text-foreground">Admin</span>
          </div>
        </div>

        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  )
}