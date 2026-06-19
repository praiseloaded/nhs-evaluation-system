// app/dashboard/interview/page.tsx
// Thin server component — handles the tier gate via FeatureFlag table.
// The actual UI lives in InterviewClient.tsx (same folder).
// This pattern works for any 'use client' page that needs a server-side gate.

import { FeatureGate } from '@/components/feature-gate'
import { InterviewClient } from './InterviewClient'

export default function InterviewPage() {
  return (
    <FeatureGate featureKey="interview_simulator">
      <InterviewClient />
    </FeatureGate>
  )
}