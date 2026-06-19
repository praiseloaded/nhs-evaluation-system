'use client'

import { useEffect, useCallback }     from 'react'
import { useState }                   from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ShortlistScorePopup }        from '@/components/shortlisting/ShortlistScorePopup'
import { calculateShortlistProbability, emptyVault } from '@/lib/billing/evidence-vault'
import { extractCriticalGaps }        from '@/lib/billing/detect-evidence-vault'
import type { RichEvidenceVault }     from '@/lib/billing/detect-evidence-vault'

// isPro prop removed — ShortlistScorePopup reads its own access via
// useFeatureAccess('shortlist_factors_pro') internally.
interface Props {
  analysisId:  string
  result:      any
  showOnMount: boolean
}

export function ShortlistPopupTrigger({ analysisId, result, showOnMount }: Props) {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const [showPopup, setShowPopup] = useState(false)
  const [popupData, setPopupData] = useState<any>(null)

  const buildAndShow = useCallback((r: any) => {
    const vault = (r?.evidenceVault as RichEvidenceVault) ?? null

    const breakdown = calculateShortlistProbability(
      r,
      vault ?? emptyVault(),
    )

    if (vault) {
      const vaultGaps = extractCriticalGaps(vault)
      if (vaultGaps.length > 0) breakdown.missingEvidence = vaultGaps
    }

    setPopupData(breakdown)
    setShowPopup(true)
  }, [])

  useEffect(() => {
    const isNew        = searchParams.get('new')        === '1'
    const isReanalysed = searchParams.get('reanalysed') === '1'
    if (!isNew && !isReanalysed) return

    const next = new URLSearchParams(searchParams.toString())
    next.delete('new')
    next.delete('reanalysed')
    const clean = next.toString() ? `?${next.toString()}` : ''
    router.replace(`/dashboard/analysis/${analysisId}${clean}`, { scroll: false })

    buildAndShow(result)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (!showPopup || !popupData) return null

  return (
    <ShortlistScorePopup
      data={popupData}
      onClose={() => setShowPopup(false)}
    />
  )
}