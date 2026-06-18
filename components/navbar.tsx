"use client"

import Link from "next/link"
import { ThemeSwitcher } from "./theme-switcher"
import { signOut, useSession } from "next-auth/react"
import { ArrowRight, Search, Menu, X } from "lucide-react"
import { useState } from "react"
import { Button } from "./ui/button"
import { NotificationBell } from "./notification-bell"

export function Navbar() {
  const { data: session, status } = useSession()
  const isLoading = status === 'loading'
  const [mobileOpen, setMobileOpen] = useState(false)

  const initials =
    session?.user?.name
      ?.split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() ?? ''

  // Close mobile menu on route change/hash navigation
  const closeMobile = () => setMobileOpen(false)

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between">

          <Link href="/" className="flex items-center gap-2.5 shrink-0" onClick={closeMobile}>
            <div className="h-8 w-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-semibold text-[11px] tracking-wide select-none">
              NHS
            </div>
            <span className="font-semibold text-[15px] text-foreground leading-none">
              JobReady
              <span className="ml-1.5 text-[10px] font-normal text-muted-foreground bg-accent dark:bg-slate-800 px-1.5 py-0.5 rounded border border-border align-middle">
                AI
              </span>
            </span>
          </Link>

          {/* ── Desktop nav ── */}
          <div className="hidden sm:flex items-center gap-1">

            <Link
              href="/jobs"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] text-muted-foreground hover:text-foreground hover:bg-accent dark:hover:bg-slate-800 transition-colors"
            >
              <Search className="h-3.5 w-3.5" />
              Browse jobs
            </Link>

            {isLoading && (
              <div className="flex items-center gap-2 ml-2">
                <div className="h-7 w-14 rounded-md bg-accent dark:bg-slate-800 animate-pulse" />
                <div className="h-7 w-28 rounded-lg bg-accent dark:bg-slate-800 animate-pulse" />
              </div>
            )}

            {!isLoading && session && (
              <>
                <div className="w-px h-5 bg-border mx-1.5" />
                <ThemeSwitcher />
                <div
                  title={session.user?.name ?? ''}
                  className="h-8 w-8 rounded-full bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 flex items-center justify-center ml-1 cursor-default select-none"
                >
                  <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                    {initials || '?'}
                  </span>
                </div>
                <Link
                  href="/dashboard"
                  className="flex items-center gap-1.5 ml-1.5 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-[13px] font-semibold transition-colors"
                >
                  Dashboard
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </>
            )}

            {!isLoading && !session && (
              <>
                <div className="w-px h-5 bg-border mx-1.5" />
                <ThemeSwitcher />
                <Link
                  href="/login"
                  className="px-3 py-1.5 rounded-lg text-[13px] font-medium text-foreground border border-border hover:bg-accent dark:hover:bg-slate-800 transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  href="/register"
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-[13px] font-semibold transition-colors"
                >
                  Get started free
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </>
            )}
          </div>

          {/* ── Mobile: theme switcher + hamburger ── */}
          <div className="flex sm:hidden items-center gap-1.5">
            {!isLoading && session && (
              <div
                title={session.user?.name ?? ''}
                className="h-7 w-7 rounded-full bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 flex items-center justify-center cursor-default select-none"
              >
                <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400">
                  {initials || '?'}
                </span>
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileOpen((o) => !o)}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
              className="p-2 rounded-md text-foreground hover:bg-accent dark:hover:bg-slate-800 transition-colors"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>

          
        </div>
      </div>

      {/* ── Mobile menu panel ── */}
      {mobileOpen && (
        <div className="sm:hidden border-t border-border bg-background">
          <div className="px-4 py-4 space-y-1">

            <Link
              href="/jobs"
              onClick={closeMobile}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[14px] font-medium text-foreground hover:bg-accent dark:hover:bg-slate-800 transition-colors"
            >
              <Search className="h-4 w-4 text-muted-foreground" />
              Browse jobs
            </Link>

            {isLoading && (
              <div className="space-y-2 px-3 py-2">
                <div className="h-9 w-full rounded-lg bg-accent dark:bg-slate-800 animate-pulse" />
                <div className="h-9 w-full rounded-lg bg-accent dark:bg-slate-800 animate-pulse" />
              </div>
            )}

            {!isLoading && session && (
              <>
                <Link
                  href="/dashboard"
                  onClick={closeMobile}
                  className="flex items-center justify-between px-3 py-2.5 rounded-lg text-[14px] font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors mt-2"
                >
                  Dashboard
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <div className="flex items-center justify-between px-3 py-3 mt-1">
                  <span className="text-[13px] text-muted-foreground">Theme</span>
                  <ThemeSwitcher />
                </div>
              </>
            )}

            {!isLoading && !session && (
              <>
                <div className="border-t border-border my-2" />

                <Link
                  href="/login"
                  onClick={closeMobile}
                  className="flex items-center justify-center px-3 py-2.5 rounded-lg text-[14px] font-medium text-foreground border border-border hover:bg-accent dark:hover:bg-slate-800 transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  href="/register"
                  onClick={closeMobile}
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[14px] font-semibold transition-colors mt-1"
                >
                  Get started free
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>

                <div className="flex items-center justify-between px-3 py-3 mt-1">
                  <span className="text-[13px] text-muted-foreground">Theme</span>
                  <ThemeSwitcher />
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}