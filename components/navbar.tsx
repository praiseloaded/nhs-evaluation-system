"use client"

import Link from "next/link"
import { ThemeSwitcher } from "./theme-switcher"
import { signOut, useSession } from "next-auth/react"

export function Navbar() {
  const { data: session, status } = useSession()

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">

          {/* Logo */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                NHS
              </div>

              <span className="font-bold text-lg hidden sm:inline">
                Evaluation Engine
              </span>
            </Link>

            {session && (
              <div className="hidden md:flex gap-6 text-sm">

                <Link
                  href="/dashboard"
                  className="font-medium hover:text-primary transition-colors"
                >
                  Dashboard
                </Link>

                <Link
                  href="/dashboard/new-analysis"
                  className="font-medium hover:text-primary transition-colors"
                >
                  New Analysis
                </Link>

                <Link
                  href="/upgrade"
                  className="font-medium hover:text-primary transition-colors"
                >
                  Upgrade
                </Link>

              </div>
            )}
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-3">

            <ThemeSwitcher />

            {status === "loading" ? null : session ? (
              <>
                <span className="hidden sm:block text-sm text-muted-foreground">
                  {session.user?.name}
                </span>

                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="rounded-lg border px-3 py-2 text-sm hover:bg-muted transition-colors"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-lg border px-3 py-2 text-sm hover:bg-muted transition-colors"
                >
                  Login
                </Link>

                <Link
                  href="/register"
                  className="rounded-lg bg-primary text-primary-foreground px-3 py-2 text-sm"
                >
                  Register
                </Link>
              </>
            )}

          </div>
        </div>
      </div>
    </nav>
  )
}