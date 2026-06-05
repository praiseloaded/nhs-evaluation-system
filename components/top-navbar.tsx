"use client"

import Link from "next/link"
import { LogOut, User, ChevronDown } from "lucide-react"
import { useState, useRef, useEffect } from "react"
import { useSession, signOut } from "next-auth/react"

export function TopNavbar() {
  const { data: session, status } = useSession()

  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  if (status === "loading") {
    return (
      <nav className="fixed top-0 right-0 left-0 md:left-64 h-16 border-b border-border bg-background z-40" />
    )
  }

  const userName = session?.user?.name || "User"
  const userEmail = session?.user?.email || ""
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()

  return (
    <nav className="fixed top-0 right-0 left-0 md:left-64 h-16 border-b border-border bg-background/95 backdrop-blur z-40">
      <div className="h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between">

        {/* Brand */}
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
            NHS
          </div>
          <span className="font-bold text-lg hidden sm:inline">
            Evaluation Engine
          </span>
        </Link>

        {/* If NOT logged in */}
        {!session ? (
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium hover:text-primary"
            >
              Login
            </Link>

            <Link
              href="/register"
              className="text-sm font-medium bg-primary text-white px-3 py-1.5 rounded-lg"
            >
              Register
            </Link>
          </div>
        ) : (
          /* User Menu */
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent transition-colors"
            >
              <div className="flex flex-col items-end">
                <p className="text-sm font-semibold">{userName}</p>
                <p className="text-xs text-muted-foreground">{userEmail}</p>
              </div>

              <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white font-bold text-sm">
                {initials}
              </div>

              <ChevronDown
                className={`h-4 w-4 transition-transform ${
                  isOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {isOpen && (
              <div className="absolute right-0 mt-2 w-48 rounded-lg border bg-background shadow-lg">
                <div className="p-3 border-b">
                  <p className="text-sm font-semibold">{userName}</p>
                  <p className="text-xs text-muted-foreground">
                    {userEmail}
                  </p>
                </div>

                <div className="p-2">
                  <Link
                    href="/dashboard/settings"
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-accent"
                    onClick={() => setIsOpen(false)}
                  >
                    <User className="h-4 w-4" />
                    Settings
                  </Link>

                  <button
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-red-50 text-red-600"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
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