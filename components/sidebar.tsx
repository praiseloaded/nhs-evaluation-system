"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Menu, X, LayoutDashboard, Plus, Files,
  PenLine, ListChecks, Video, Settings,
} from "lucide-react"
import { useState } from "react"
import { ThemeSwitcher } from "./theme-switcher"

const NAV_GROUPS = [
  {
    label: "Overview",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/dashboard/new-analysis", label: "New Analysis", icon: Plus },
      { href: "/dashboard/saved-analyses", label: "Saved Analyses", icon: Files },
    ],
  },
  {
    label: "Tools",
    items: [
      { href: "/dashboard/application", label: "Statement Builder", icon: PenLine, badge: "AI" },
      { href: "/dashboard/applications", label: "Track Applications", icon: ListChecks },
      { href: "/dashboard/interview", label: "Interview Simulator", icon: Video, badge: "AI" },
      { href: '/dashboard/career-gps', label: 'Career GPS™', icon: PenLine },
    ],
  },
  {
    label: "Account",
    items: [
      { href: "/dashboard/settings", label: "Settings", icon: Settings },
    ],
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname.startsWith(href)

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed md:hidden bottom-5 right-5 z-50 p-3 rounded-xl bg-[#005EB8] text-white shadow-lg"
        aria-label="Toggle navigation"
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 md:hidden z-40 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-screen w-64 border-r border-border bg-background transition-transform duration-300 z-40 md:translate-x-0 flex flex-col ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand header — same height as topbar so they sit flush */}
        <Link
          href="/dashboard"
          className="h-16 flex items-center gap-3 px-5 border-b border-border shrink-0 hover:bg-accent/50 transition-colors"
        >
          <div className="h-8 w-8 rounded-lg bg-[#005EB8] text-white flex items-center justify-center font-semibold text-[10px] tracking-wide shrink-0">
            NHS
          </div>
          <div>
            <p className="text-sm font-semibold leading-none">JobReady AI</p>
            <p className="text-[10px] text-muted-foreground leading-none mt-0.5">Evaluation Engine</p>
          </div>
        </Link>

        {/* Nav groups */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="text-[10px] font-medium tracking-widest text-muted-foreground uppercase px-3 mb-1">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon
                  const active = isActive(item.href)
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all ${
                        active
                          ? "bg-blue-50 dark:bg-blue-950/50 text-[#185FA5] dark:text-blue-300 font-medium"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="flex-1">{item.label}</span>
                      {item.badge && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-border px-4 py-3 flex items-center justify-between shrink-0">
          <span className="text-xs text-muted-foreground">Theme</span>
          <ThemeSwitcher />
        </div>
      </aside>
    </>
  )
}