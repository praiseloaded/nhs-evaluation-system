'use client'

import Link from 'next/link'
import { LogOut, User, ChevronDown } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

interface TopNavbarProps {
  userName?: string
  userEmail?: string
}

export function TopNavbar({ userName = 'John Smith', userEmail = 'john@example.com' }: TopNavbarProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const initials = userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()

  return (
    <nav className="fixed top-0 right-0 left-0 md:left-64 h-16 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-40">
      <div className="h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Logo/Branding */}
        <Link href="/home" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
            NHS
          </div>
          <span className="font-bold text-lg hidden sm:inline">Evaluation Engine</span>
        </Link>

        {/* User Menu */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-accent dark:hover:bg-slate-800 transition-colors"
            aria-expanded={isOpen}
            aria-haspopup="true"
          >
            <div className="flex flex-col items-end">
              <p className="text-sm font-semibold text-foreground">{userName}</p>
              <p className="text-xs text-muted-foreground dark:text-slate-400">{userEmail}</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-blue-700 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {initials}
            </div>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown Menu */}
          {isOpen && (
            <div className="absolute right-0 mt-2 w-48 rounded-lg border border-border bg-background shadow-lg">
              <div className="p-3 border-b border-border">
                <p className="text-sm font-semibold text-foreground">{userName}</p>
                <p className="text-xs text-muted-foreground dark:text-slate-400">{userEmail}</p>
              </div>

              <div className="p-2">
                <Link
                  href="/settings"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-foreground hover:bg-accent dark:hover:bg-slate-800 transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  <User className="h-4 w-4" />
                  Profile Settings
                </Link>

                <button
                  onClick={() => {
                    setIsOpen(false)
                    // Handle logout here
                    console.log('Logout clicked')
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-foreground hover:bg-red-100 dark:hover:bg-red-950 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
