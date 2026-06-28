// app/dashboard/layout.tsx
import { AppLayout }              from '@/components/app-layout'
import { FeatureAccessProvider }  from '@/components/providers/feature-access-provider'
import { ImpersonationBanner }    from '@/components/impersonation-banner'
import { ReactNode }              from 'react'

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AppLayout>
      <FeatureAccessProvider>
        <ImpersonationBanner />
        {children}
      </FeatureAccessProvider>
    </AppLayout>
  )
}