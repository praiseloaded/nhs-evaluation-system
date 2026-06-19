// app/dashboard/career-gps/page.tsx
import { FeatureGate } from '@/components/feature-gate'
import { CareerGpsClient } from './CareerGpsClient'

export default function CareerGpsPage() {
  return (
    <FeatureGate featureKey="career_gps">
      <CareerGpsClient />
    </FeatureGate>
  )
}