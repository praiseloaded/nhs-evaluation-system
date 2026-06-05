import type { AnalysisResult } from "@/lib/types"

export function validateResultCompleteness(
  result: AnalysisResult | null | undefined
): string[] {
  const warnings: string[] = []

  if (!result) {
    warnings.push("result is null or undefined")
    return warnings
  }

  if (!result.nhsValues || result.nhsValues.length < 1)
    warnings.push("nhsValues missing or empty")

  if (!result.rejectionRisk?.gates?.length)
    warnings.push("rejectionRisk.gates missing or empty")

  if (!result.operationalRealism?.dimensions?.length)
    warnings.push("operationalRealism.dimensions missing or empty")

  const expected =
    (result.criteriaInventory?.essentialTotal ?? 0) +
    (result.criteriaInventory?.desirableTotal ?? 0)
  const actual = result.criteriaAnalysis?.length ?? 0

  if (expected > 0 && actual < expected * 0.8)
    warnings.push(`criteriaAnalysis possibly incomplete: got ${actual} of ~${expected} expected criteria`)

  if (!result.criteriaAnalysis || result.criteriaAnalysis.length === 0)
    warnings.push("criteriaAnalysis is missing or empty — coverage scoring will fall back to breakdown counts")

  if (!result.bandCoaching?.bandSpecificTips?.length)
    warnings.push("bandCoaching incomplete or missing tips")

  if (!result.breakdown?.starCompleteness?.examples?.length)
    warnings.push("starCompleteness.examples missing or empty")

  if (result.seniority?.targetBand == null)
    warnings.push("seniority.targetBand is null — band gap calculation may be inaccurate")

  return warnings
}