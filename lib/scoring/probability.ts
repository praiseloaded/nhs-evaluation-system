export function calculateShortlistProbability(totalScore: number): number {
  const s = Math.max(0, Math.min(100, totalScore))

  if (s >= 85) return Math.min(95, Math.round(s + 3))
  if (s >= 70) return Math.round(s + 1)
  if (s >= 60) return Math.round(s - 1)
  if (s >= 50) return Math.round(s - 4)
  if (s >= 40) return Math.round(s - 8)
  if (s >= 25) return Math.round(s - 12)
  if (s >= 10) return Math.round(s - 6)

  return Math.max(0, Math.round(s * 0.4))
}