"use client"

import Link from "next/link"
import { LogOut, User, ChevronDown, Sparkles } from "lucide-react"
import { useState, useRef, useEffect } from "react"
import { useSession, signOut } from "next-auth/react"

function TierBadge({ tier }: { tier: string }) {
  const isPro = tier === "pro" || tier === "premium"
  return (
    <span
      className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
        isPro
          ? "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300"
          : "bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
      }`}
    >
      {isPro ? "Pro" : "Free"}
    </span>
  )
}

export function TopNavbar() {
  const { data: session, status } = useSession()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const userTier = (session?.user as any)?.tier ?? "free"

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  if (status === "loading") {
    return <nav className="fixed top-0 right-0 left-0 md:left-64 h-16 border-b border-border bg-background z-30" />
  }

  const userName = session?.user?.name || "User"
  const userEmail = session?.user?.email || ""
  const initials = userName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)

  return (
    <nav className="fixed top-0 right-0 left-0 md:left-64 h-16 border-b border-border bg-background/95 backdrop-blur z-30">
      <div className="h-full px-5 flex items-center justify-end">

        {!session ? (
          <div className="flex items-center gap-2">
            <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5">
              Log in
            </Link>
            <Link href="/register" className="text-sm font-medium bg-[#005EB8] text-white px-4 py-1.5 rounded-lg hover:bg-[#004f9f] transition-colors">
              Get started
            </Link>
          </div>
        ) : (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg border border-border hover:bg-accent transition-colors"
            >
              <TierBadge tier={userTier} />
              <div className="hidden sm:block text-right">
                <p className="text-xs font-semibold leading-none">{userName}</p>
                <p className="text-[10px] text-muted-foreground leading-none mt-0.5">{userEmail}</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-[#005EB8] flex items-center justify-center text-white font-semibold text-xs shrink-0">
                {initials}
              </div>
              <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
            </button>

            {isOpen && (
              <div className="absolute right-0 mt-2 w-52 rounded-xl border border-border bg-background shadow-lg overflow-hidden">
                <div className="p-3 border-b border-border bg-muted/30">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-[#005EB8] flex items-center justify-center text-white font-semibold text-xs shrink-0">
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{userName}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{userEmail}</p>
                    </div>
                  </div>
                  <div className="mt-2">
                    <TierBadge tier={userTier} />
                  </div>
                </div>

                <div className="p-1.5">
                  <Link
                    href="/dashboard/settings"
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-accent transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    <User className="h-4 w-4 text-muted-foreground" />
                    Account settings
                  </Link>

                  {userTier === "free" && (
                    <Link
                      href="/dashboard/upgrade"
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-violet-50 dark:hover:bg-violet-900/20 text-violet-700 dark:text-violet-300 transition-colors"
                      onClick={() => setIsOpen(false)}
                    >
                      <Sparkles className="h-4 w-4" />
                      Upgrade to Pro
                    </Link>
                  )}

                  <div className="border-t border-border my-1" />

                  <button
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    Log out
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}