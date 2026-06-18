// app/admin/AdminShell.tsx
//
// Uses the same Tailwind semantic tokens as the rest of the app
// (bg-background, text-foreground, border-border, etc.) so light/dark
// mode is a real user choice via ThemeSwitcher, not forced. The amber
// accent and monospace data styling still give admin its own identity
// without hardcoding colors that ignore the theme.
'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import {
  LayoutDashboard, Users, ScrollText, Activity, ShieldAlert,
  ArrowLeft, AlertTriangle, Search, Command, X, Loader2, MessageCircle, Settings,
} from 'lucide-react'
import { ThemeSwitcher } from '@/components/theme-switcher'

const NAV = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/mentorship', label: 'Mentorship', icon: MessageCircle },
  { href: '/admin/audit-log', label: 'Audit Log', icon: ScrollText },
  { href: '/admin/system-health', label: 'Usage & AI Health', icon: Activity },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
]

function ImpersonationBanner() {
  const [state, setState] = useState<{ isImpersonating: boolean; targetEmail?: string } | null>(null)
  const router = useRouter()

  useEffect(() => {
    fetch('/api/admin/impersonation-state').then(r => r.json()).then(setState).catch(() => {})
  }, [])

  if (!state?.isImpersonating) return null

  const stop = async () => {
    await fetch('/api/admin/impersonate', { method: 'DELETE' })
    router.refresh()
    window.location.reload()
  }

  return (
    <div className="bg-amber-500 text-amber-950 px-4 py-2 flex items-center justify-between gap-3 text-[13px] font-medium">
      <span className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4" />
        Viewing as {state.targetEmail ?? 'user'} — actions you take affect their account
      </span>
      <button onClick={stop} className="px-3 py-1 rounded-md bg-amber-950 text-amber-50 text-xs font-semibold hover:opacity-85 transition-opacity">
        Stop impersonating
      </button>
    </div>
  )
}

// Quick jump-to-user search — Cmd/Ctrl+K opens it from anywhere in /admin
function CommandSearch() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<{ id: string; name: string | null; email: string; tier: string }[]>([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(o => !o)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
  }, [open])

  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    const t = setTimeout(async () => {
      setLoading(true)
      const res = await fetch(`/api/admin/users?search=${encodeURIComponent(query)}&limit=6`)
      const d = await res.json()
      setResults(d.users ?? [])
      setLoading(false)
    }, 250)
    return () => clearTimeout(t)
  }, [query])

  const goTo = (id: string) => {
    setOpen(false); setQuery('')
    router.push(`/admin/users/${id}`)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/60 border border-border text-muted-foreground text-[12.5px] hover:border-amber-400 dark:hover:border-amber-600 hover:text-foreground transition-colors w-56"
      >
        <Search className="w-3.5 h-3.5 shrink-0" />
        <span className="flex-1 text-left">Jump to user…</span>
        <span className="flex items-center gap-0.5 text-[10px] font-mono opacity-60">
          <Command className="w-2.5 h-2.5" />K
        </span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-start justify-center pt-[12vh]" onClick={() => setOpen(false)}>
          <div onClick={e => e.stopPropagation()} className="w-full max-w-lg mx-4 rounded-xl bg-card border border-border shadow-2xl overflow-hidden">
            <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border">
              <Search className="w-4 h-4 text-muted-foreground shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search by name or email…"
                className="flex-1 bg-transparent text-[14px] text-foreground placeholder:text-muted-foreground focus:outline-none font-mono"
              />
              {loading && <Loader2 className="w-3.5 h-3.5 text-muted-foreground animate-spin" />}
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors"><X className="w-4 h-4" /></button>
            </div>
            {results.length > 0 && (
              <div className="max-h-72 overflow-y-auto py-1.5">
                {results.map(u => (
                  <button key={u.id} onClick={() => goTo(u.id)} className="w-full flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-accent transition-colors text-left">
                    <div className="min-w-0">
                      <p className="text-[13px] text-foreground truncate">{u.name ?? 'Unnamed'}</p>
                      <p className="text-[11px] text-muted-foreground font-mono truncate">{u.email}</p>
                    </div>
                    <span className="text-[9.5px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground shrink-0">{u.tier}</span>
                  </button>
                ))}
              </div>
            )}
            {query && !loading && results.length === 0 && (
              <p className="px-4 py-6 text-center text-[12.5px] text-muted-foreground">No matches.</p>
            )}
          </div>
        </div>
      )}
    </>
  )
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen flex bg-background">
      {/* ── Sidebar ── */}
      <aside className="w-60 shrink-0 border-r border-border bg-card hidden md:flex flex-col">
        <div className="h-14 flex items-center gap-2.5 px-4 border-b border-border">
          <div className="h-7 w-7 rounded-md bg-amber-500 text-amber-950 flex items-center justify-center">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div className="leading-none">
            <p className="text-[13px] font-bold text-foreground">Admin</p>
            <p className="text-[10px] text-muted-foreground font-mono">NHS JobReady</p>
          </div>
        </div>

        <nav className="flex-1 px-2 py-4 space-y-0.5">
          {NAV.map(item => {
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                  active ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'
                }`}
              >
                <item.icon className={`w-4 h-4 ${active ? 'text-amber-600 dark:text-amber-500' : ''}`} />
                {item.label}
                {active && <span className="ml-auto w-1 h-1 rounded-full bg-amber-500" />}
              </Link>
            )
          })}
        </nav>

        <div className="p-3 border-t border-border">
          <Link href="/dashboard" className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12.5px] text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to app
          </Link>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 min-w-0 flex flex-col">
        <ImpersonationBanner />

        {/* Top bar — search + theme switcher live here, reachable from every admin page */}
        <div className="h-14 shrink-0 border-b border-border bg-background flex items-center justify-between px-5">
          <p className="text-[12px] text-muted-foreground font-mono hidden sm:block">
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
          <div className="flex items-center gap-2">
            <CommandSearch />
            <ThemeSwitcher />
          </div>
        </div>

        <main className="flex-1 overflow-y-auto bg-background">{children}</main>
      </div>
    </div>
  )
}