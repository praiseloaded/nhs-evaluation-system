import { Suspense } from 'react'
import UpgradeClient from './UpgradeClient'

export default function Page() {
  return (
    <Suspense fallback={<div>Loading upgrade page...</div>}>
      <UpgradeClient />
    </Suspense>
  )
}