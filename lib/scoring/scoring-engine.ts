export function calculateScore(breakdown: {
  criteriaCoverage: number
  starCompleteness: number
  valuesAlignment: number
  languageMirroring: number
  specificity: number
}) {
  const score =
    breakdown.criteriaCoverage * 0.35 +
    breakdown.starCompleteness * 0.25 +
    breakdown.valuesAlignment * 0.20 +
    breakdown.languageMirroring * 0.12 +
    breakdown.specificity * 0.08

  return Math.round(score)
}