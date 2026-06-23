import { AppLayout } from '@/components/app-layout'
import { FeatureAccessProvider } from '@/components/providers/feature-access-provider'
import { ReactNode } from 'react'

interface DashboardLayoutProps {
  children: ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <AppLayout>
      <FeatureAccessProvider>
        {children}
      </FeatureAccessProvider>
    </AppLayout>
  )
}