export function calculateShortlistProbability(
  totalScore: number
) {
  if (totalScore < 50)
    return Math.max(0, totalScore - 10)

  if (totalScore < 70)
    return totalScore - 5

  if (totalScore < 85)
    return totalScore - 2

  return Math.min(95, totalScore + 2)
}