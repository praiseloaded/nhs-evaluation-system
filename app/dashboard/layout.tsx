'use client'

import { AppLayout } from '@/components/app-layout'
import { ReactNode } from 'react'

interface DashboardLayoutProps {
  children: ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <AppLayout userName="John Smith" userEmail="john.smith@nhs.uk">
      {children}
    </AppLayout>
  )
}
