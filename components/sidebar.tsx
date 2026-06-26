"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import {
  Menu, X, LayoutDashboard, Plus, Files,
  PenLine, ListChecks, Video, Settings,
  FolderOpen, Target, MapPin, Sparkles,
  ChevronLeft, ChevronRight, BarChart3,
  FileText, MessageCircle, Lock, FlaskConical, Flame,
  Globe,
} from "lucide-react"
import { useState, useEffect } from "react"
import { ThemeSwitcher } from "./theme-switcher"
import { NotificationBell } from "./notification-bell"

const NAV_GROUPS = [
  {
    label: "Overview",
    items: [
      { href: "/dashboard",               label: "Dashboard",            icon: LayoutDashboard },
      { href: "/dashboard/new-analysis",  label: "New Analysis",         icon: Plus            },
      { href: "/dashboard/saved-analyses",label: "My Analyses",          icon: Files           },
    ],
  },
  {
    label: "Tools",
    items: [
      { href: "/dashboard/application",           label: "Statement Builder",     icon: PenLine,       },
      { href: "/dashboard/ab-test",               label: "A/B Statement Test",    icon: FlaskConical,  badge: "NEW" },
      { href: "/dashboard/criteria-explorer",      label: "Shortlist Intelligence™", icon: Flame,         badge: "NEW" },
      { href: "/dashboard/cos-navigator",           label: "COS Navigator™",          icon: Globe,         badge: "NEW" },
      { href: "/dashboard/applications",          label: "Track Applications",    icon: ListChecks,    },
      { href: "/dashboard/shortlist-probability", label: "Shortlist Probability™",icon: Target,        },
      { href: "/dashboard/momentum",              label: "Momentum Score™",       icon: BarChart3,     },
      { href: "/dashboard/interview",             label: "Interview Simulator",   icon: Video,         badge: "AI", featureKey: "interview_simulator"   },
      { href: "/dashboard/career-gps",            label: "Career GPS™",           icon: MapPin,        featureKey: "career_gps"                     },
      { href: "/dashboard/evidence-vault",        label: "EvidenceVault™",        icon: FolderOpen,    },
      { href: "/dashboard/evidence-vault/match",  label: "Auto-Match Evidence",   icon: Sparkles,      badge: "NEW" },
      { href: "/dashboard/interview-probability", label: "Interview Probability™",icon: Target,        featureKey: "interview_probability"          },
      { href: "/dashboard/cv-builder",            label: "CV Builder",            icon: FileText,      },
      { href: "/dashboard/mentorship",            label: "Mentorship",            icon: MessageCircle, featureKey: "mentorship"                     },
    ],
  },
  {
    label: "Account",
    items: [
      { href: "/dashboard/settings", label: "Settings", icon: Settings },
    ],
  },
]

const TIER_RANK: Record<string, number> = { free: 0, pro: 1, elite: 2 }
type FlagMap = Record<string, { minTier: string; enabled: boolean }>

export function Sidebar() {
  const pathname  = usePathname()
  const { data: session } = useSession()
  const userTier  = (session?.user as any)?.tier ?? "free"
  const userRank  = TIER_RANK[userTier] ?? 0

  const [isOpen,    setIsOpen]    = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [flagMap,   setFlagMap]   = useState<FlagMap>({})

  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed")
    if (saved === "true") setCollapsed(true)
  }, [])

  useEffect(() => {
    fetch("/api/feature-flags")
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d?.flags) return
        const map: FlagMap = {}
        for (const f of d.flags) map[f.key] = { minTier: f.minTier, enabled: f.enabled }
        setFlagMap(map)
      })
      .catch(() => {})
  }, [])

  const toggleCollapsed = () => {
    setCollapsed(c => {
      localStorage.setItem("sidebar-collapsed", String(!c))
      return !c
    })
  }

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname.startsWith(href)

  const isLocked = (featureKey?: string): boolean => {
    if (!featureKey) return false
    const flag = flagMap[featureKey]
    if (!flag) return false
    if (!flag.enabled) return true
    return userRank < (TIER_RANK[flag.minTier] ?? 0)
  }

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed md:hidden bottom-5 right-5 z-50 p-3.5 rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/30 active:scale-95 transition-transform"
        aria-label="Toggle navigation"
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 md:hidden z-40 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 h-screen flex flex-col z-40 transition-all duration-300 md:translate-x-0
        bg-card border-r border-border
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
        ${collapsed ? "w-[68px]" : "w-[228px]"}`}
      >

        {/* ── Brand ───────────────────────────────────────────────────── */}
        <div className={`h-[56px] flex items-center gap-3 border-b border-border shrink-0 ${collapsed ? "justify-center px-3" : "px-4"}`}>
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-blue-500 flex items-center justify-center shrink-0 shadow-sm shadow-blue-500/25">
            <span className="text-white text-[9px] font-black tracking-tight">OJR</span>
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-black text-foreground tracking-tight leading-none">OmniJobReady</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1 leading-none">
                <Sparkles className="w-2.5 h-2.5 text-blue-500 shrink-0" />
                <span>AI™ Platform</span>
              </p>
            </div>
          )}
          {!collapsed && <div className="shrink-0"><NotificationBell /></div>}
        </div>

        {/* ── Nav ─────────────────────────────────────────────────────── */}
        <nav className="flex-1 overflow-y-auto py-3 space-y-5 scrollbar-thin">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className={collapsed ? "px-2" : "px-3"}>
              {!collapsed && (
                <p className="text-[9px] font-bold tracking-[0.18em] text-muted-foreground/40 uppercase px-2 mb-1.5">
                  {group.label}
                </p>
              )}
              {collapsed && <div className="h-px bg-border/60 mb-2" />}

              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon   = item.icon
                  const active = isActive(item.href)
                  const locked = isLocked((item as any).featureKey)

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      title={collapsed ? item.label : undefined}
                      className={`group relative flex items-center gap-2.5 rounded-lg text-[12.5px] font-medium transition-all duration-150
                        ${collapsed ? "justify-center py-2.5 px-1" : "px-2.5 py-2"}
                        ${active
                          ? "bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400"
                          : locked
                          ? "text-muted-foreground/35 hover:bg-muted/40 cursor-default"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                    >
                      {/* Active bar */}
                      {active && !collapsed && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-[18px] w-[3px] rounded-r-full bg-blue-600 dark:bg-blue-400" />
                      )}

                      <Icon className={`h-[15px] w-[15px] shrink-0 transition-all
                        ${active ? "text-blue-600 dark:text-blue-400" : ""}
                        ${!active && !locked ? "group-hover:scale-110" : ""}
                      `} />

                      {!collapsed && (
                        <>
                          <span className="flex-1 truncate">{item.label}</span>
                          {locked ? (
                            <Lock className="w-3 h-3 shrink-0 opacity-30" />
                          ) : (item as any).badge ? (
                            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full shrink-0 tracking-wide ${
                              (item as any).badge === "NEW"
                                ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300"
                                : "bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300"
                            }`}>
                              {(item as any).badge}
                            </span>
                          ) : null}
                        </>
                      )}

                      {/* Collapsed badge dot */}
                      {collapsed && !locked && (item as any).badge && (
                        <span className={`absolute top-1 right-1 w-1.5 h-1.5 rounded-full ${
                          (item as any).badge === 'NEW' ? 'bg-emerald-400' : 'bg-violet-400'
                        }`} />
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* ── Footer ──────────────────────────────────────────────────── */}
        <div className={`border-t border-border shrink-0 py-3 ${collapsed ? "px-2 flex flex-col items-center gap-2" : "px-3 space-y-2"}`}>

          {/* Tier + theme */}
          {!collapsed ? (
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full ${
                  userTier === 'elite' ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800' :
                  userTier === 'pro'   ? 'bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800' :
                                         'bg-muted text-muted-foreground border border-border'
                }`}>
                  {userTier}
                </span>
                {userTier === 'free' && (
                  <Link href="/upgrade" className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline font-semibold">
                    Upgrade
                  </Link>
                )}
              </div>
              <ThemeSwitcher />
            </div>
          ) : (
            <>
              <NotificationBell />
              <ThemeSwitcher />
            </>
          )}

          {/* Collapse toggle — desktop only */}
          <button
            onClick={toggleCollapsed}
            className={`hidden md:flex items-center w-full rounded-lg text-[11px] text-muted-foreground/50 hover:text-foreground hover:bg-muted transition-colors px-2 py-1.5 ${collapsed ? "justify-center" : "gap-2"}`}
          >
            {collapsed
              ? <ChevronRight className="w-3.5 h-3.5" />
              : <><ChevronLeft className="w-3.5 h-3.5" /><span>Collapse</span></>
            }
          </button>
        </div>

      </aside>

      {/* Desktop spacer */}
      <div className={`hidden md:block shrink-0 transition-all duration-300 ${collapsed ? "w-[68px]" : "w-[228px]"}`} />
    </>
  )
}