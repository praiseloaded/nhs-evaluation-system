// app/dashboard/layout.tsx
import { AppLayout }             from '@/components/app-layout'
import { FeatureAccessProvider } from '@/components/providers/feature-access-provider'
import { ImpersonationBanner }   from '@/components/impersonation-banner'
import { DashboardAssistant }    from '@/components/dashboard-assistant'
import { ReactNode }             from 'react'
import { EvidenceVaultNudge } from '@/components/evidence-vault-nudge'

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AppLayout>
      <FeatureAccessProvider>
        <ImpersonationBanner />
        <EvidenceVaultNudge />
        {children}
        <DashboardAssistant />
      </FeatureAccessProvider>
    </AppLayout>
  )
}