// components/app-layout.tsx
'use client'

import { ReactNode } from 'react'
import { Sidebar }   from './sidebar'
import { TopNavbar } from './top-navbar'

interface AppLayoutProps {
  children:   ReactNode
  userName?:  string
  userEmail?: string
}

export function AppLayout({ children, userName, userEmail }: AppLayoutProps) {
  const Nav = TopNavbar as any
  return (
    <div className="min-h-screen bg-background">
      <Nav userName={userName} userEmail={userEmail} />
      <Sidebar />
      <main className="pt-16 md:ml-64 min-h-screen">
        {children}
      </main>
    </div>
  )
}