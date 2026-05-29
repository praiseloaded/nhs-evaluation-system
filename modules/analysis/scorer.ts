export function computeFinalScore(dimensions: any[]) {
  const weights = {
    coverage: 0.35,
    star: 0.25,
    values: 0.2,
    language: 0.12,
    specificity: 0.08
  };

  let total = 0;

  for (const d of dimensions) {
    total += (d.score || 0) * (weights[d.id as keyof typeof weights] || 0);
  }

  return Math.round(total);
}