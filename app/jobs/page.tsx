// app/jobs/page.tsx
// Server component — checks auth status, passes to client search UI.

import { auth } from '@/auth'
import { JobsClient } from './JobsClient'

export default async function JobsPage() {
  const session = await auth()
  const isLoggedIn = !!session?.user?.id

  return <JobsClient isLoggedIn={isLoggedIn} />
}