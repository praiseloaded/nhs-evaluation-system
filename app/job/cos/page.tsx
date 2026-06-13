// app/job/cos/page.tsx
// Server component — checks auth, passes to COS-specific client

import { auth } from '@/auth'
import { CosJobsClient } from './CosJobsClient'

export default async function CosJobsPage() {
  const session = await auth()
  return <CosJobsClient isLoggedIn={!!session?.user?.id} />
}