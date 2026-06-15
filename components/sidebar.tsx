"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Menu, X, LayoutDashboard, Plus, Files,
  PenLine, ListChecks, Video, Settings,
  FolderOpen, Target, MapPin, Sparkles, ChevronLeft, ChevronRight,
  BarChart3,
} from "lucide-react"
import { useState, useEffect } from "react"
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
      { href: "/dashboard/application", label: "Statement Builder", icon: PenLine },
      { href: "/dashboard/applications", label: "Track Applications", icon: ListChecks },
      { href: '/dashboard/shortlist-probability', label: 'Shortlist Probability™', icon: Target },
      { href: '/dashboard/momentum', label: 'Momentum Score™', icon: BarChart3 },
      { href: "/dashboard/interview", label: "Interview Simulator", icon: Video, badge: "AI" },
      { href: '/dashboard/career-gps', label: 'Career GPS™', icon: MapPin },
      { href: '/dashboard/evidence-vault', label: 'EvidenceVault™', icon: FolderOpen },
      { href: '/dashboard/interview-probability', label: 'Interview Probability™', icon: Target, badge: "NEW" },
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
  const [collapsed, setCollapsed] = useState(false)

  // Persist collapsed state
  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed")
    if (saved === "true") setCollapsed(true)
  }, [])
  const toggleCollapsed = () => {
    setCollapsed(c => {
      localStorage.setItem("sidebar-collapsed", String(!c))
      return !c
    })
  }

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname.startsWith(href)

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed md:hidden bottom-5 right-5 z-50 p-3.5 rounded-2xl bg-gradient-to-br from-[#005EB8] to-[#003D7A] text-white shadow-lg shadow-blue-900/30 active:scale-95 transition-transform"
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
        className={`fixed left-0 top-0 h-screen border-r border-border bg-background transition-all duration-300 z-40 md:translate-x-0 flex flex-col ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } ${collapsed ? "w-[76px]" : "w-64"}`}
      >
        {/* Brand header */}
        <Link
          href="/"
          className={`h-16 flex items-center gap-3 border-b border-border shrink-0 hover:bg-accent/40 transition-colors relative overflow-hidden ${collapsed ? "justify-center px-0" : "px-5"}`}
        >
          {/* subtle gradient accent */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#005EB8]/[0.04] to-transparent pointer-events-none" />
          <div className="relative h-9 w-9 rounded-xl bg-gradient-to-br from-[#005EB8] to-[#003D7A] text-white flex items-center justify-center font-bold text-[11px] tracking-wide shrink-0 shadow-sm shadow-blue-900/20">
            NHS
          </div>
          {!collapsed && (
            <div className="relative min-w-0">
              <p className="text-sm font-bold leading-none tracking-tight">JobReady AI</p>
              <p className="text-[10px] text-muted-foreground leading-none mt-1 flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5 text-[#005EB8]" /> Evaluation Engine
              </p>
            </div>
          )}
        </Link>

        {/* Nav groups */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5 scrollbar-thin">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              {!collapsed && (
                <p className="text-[10px] font-semibold tracking-[0.15em] text-muted-foreground/70 uppercase px-3 mb-1.5">
                  {group.label}
                </p>
              )}
              {collapsed && <div className="h-px bg-border mx-2 mb-2" />}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon
                  const active = isActive(item.href)
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      title={collapsed ? item.label : undefined}
                      className={`group relative flex items-center gap-3 rounded-xl text-sm transition-all duration-150 ${
                        collapsed ? "justify-center px-0 py-2.5" : "px-3 py-2.5"
                      } ${
                        active
                          ? "bg-gradient-to-r from-[#005EB8]/10 to-[#005EB8]/[0.03] text-[#005EB8] dark:text-blue-300 font-semibold"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      }`}
                    >
                      {/* active indicator bar */}
                      {active && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-full bg-[#005EB8]" />
                      )}
                      <Icon className={`h-4 w-4 shrink-0 transition-transform ${active ? "scale-105" : "group-hover:scale-105"}`} />
                      {!collapsed && (
                        <>
                          <span className="flex-1 truncate">{item.label}</span>
                          {item.badge && (
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                              item.badge === "NEW"
                                ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300"
                                : "bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300"
                            }`}>
                              {item.badge}
                            </span>
                          )}
                        </>
                      )}
                      {/* collapsed badge dot */}
                      {collapsed && item.badge && (
                        <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className={`border-t border-border shrink-0 ${collapsed ? "px-2 py-3 space-y-2" : "px-4 py-3"}`}>
          <div className={`flex items-center ${collapsed ? "flex-col gap-2" : "justify-between"}`}>
            {!collapsed && <span className="text-xs text-muted-foreground font-medium">Theme</span>}
            <ThemeSwitcher />
          </div>

          {/* Collapse toggle — desktop only */}
          <button
            onClick={toggleCollapsed}
            className={`hidden md:flex items-center gap-2 w-full rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors mt-2 px-2 py-2 ${collapsed ? "justify-center" : "justify-start"}`}
          >
            {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <><ChevronLeft className="w-3.5 h-3.5" /> Collapse</>}
          </button>
        </div>
      </aside>

      {/* Spacer to push page content — match aside width */}
      <div className={`hidden md:block shrink-0 transition-all duration-300 ${collapsed ? "w-[76px]" : "w-64"}`} />
    </>
  )
}