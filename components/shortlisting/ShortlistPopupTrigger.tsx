'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams }       from 'next/navigation'
import { ShortlistScorePopup }             from '@/components/shortlisting/ShortlistScorePopup'
import { calculateShortlistProbability, emptyVault } from '@/lib/billing/evidence-vault'
import { extractCriticalGaps }            from '@/lib/billing/detect-evidence-vault'
import type { RichEvidenceVault }         from '@/lib/billing/detect-evidence-vault'

interface Props {
  analysisId:  string
  result:      any
  isPro:       boolean
  showOnMount: boolean
}

export function ShortlistPopupTrigger({ analysisId, result, isPro, showOnMount }: Props) {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const [showPopup, setShowPopup] = useState(false)
  const [popupData, setPopupData] = useState<any>(null)

  const buildAndShow = useCallback((r: any) => {
    const vault = (r?.evidenceVault as RichEvidenceVault) ?? null

    // Pass full result — scoring reads directly from scoredBreakdown, criteriaAnalysis, atsMatch
    const breakdown = calculateShortlistProbability(
      r,
      vault ?? emptyVault(),
    )

    // Override missing evidence with job-specific gaps when rich vault available
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

    // Strip trigger param from URL without re-navigating
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
      isPro={isPro}
      onClose={() => setShowPopup(false)}
    />
  )
}