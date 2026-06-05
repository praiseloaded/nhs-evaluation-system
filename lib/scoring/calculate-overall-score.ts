// lib/scoring/calculate-nhs-band-score.ts

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface CriteriaCoverage {
  essentialMet: number
  essentialPartial: number
  essentialNotMet: number
  desirableMet: number
  desirablePartial: number
  desirableNotMet: number
}

interface StarExample {
  situation: "present" | "weak" | "absent"
  task: "present" | "weak" | "absent"
  action: "present" | "weak" | "absent"
  result: "present" | "weak" | "absent"
  weLanguageDetected: boolean
}

interface StarCompleteness {
  examplesFound: number
  resultsConsistentlyAbsent: boolean
  examples: StarExample[]
}

interface Specificity {
  totalClaims: number
  tier1Count: number
  tier2Count: number
  tier3Count: number
}

interface LanguageMirroring {
  specPhrasesTotal: number
  present: number
  paraphrased: number
  absent: number
}

interface NHSValue {
  classification:
    | "behavioural_with_outcome"
    | "behavioural"
    | "referenced"
    | "keyword"
    | "absent"
}

interface Seniority {
  bandGap: number
}

interface CriteriaInventory {
  essentialTotal: number
  desirableTotal: number
}

// Matches the full AnalysisResult shape from types.ts
export interface AnalysisResult {
  seniority: Seniority
  criteriaInventory: CriteriaInventory

  // Primary source: per-criterion detail rows
  criteriaAnalysis?: Array<{
    criterion: string
    type: "essential" | "desirable"
    status: "met" | "partially met" | "not met"
    evidence: string
    improvement: string
  }>

  breakdown: {
    // Fallback source: pre-aggregated counts
    criteriaCoverage: CriteriaCoverage
    starCompleteness: StarCompleteness
    specificity: Specificity
    languageMirroring: LanguageMirroring
  }

  nhsValues: NHSValue[]
}

export interface ScoredBreakdown {
  criteriaCoverage: number
  starCompleteness: number
  valuesAlignment: number
  languageMirroring: number
  specificity: number
  overallScore: number
  _internal: {
    essentialRatio: number
    essentialCeiling: number
    desirableRatio: number
    desirablePenalty: number
    seniorityDeduction: number
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CEILING + PENALTIES
// ─────────────────────────────────────────────────────────────────────────────

const ESSENTIAL_CEILING_TABLE: [number, number][] = [
  [1.0, 100],
  [0.9,  88],
  [0.8,  78],
  [0.75, 72],
  [0.7,  66],
  [0.6,  56],
  [0.5,  48],
  [0.4,  38],
  [0.25, 28],
  [0.1,  16],
  [0.0,   8],
]

function interpolateCeiling(ratio: number): number {
  if (ratio >= 1) return 100
  if (ratio <= 0) return 8

  for (let i = 0; i < ESSENTIAL_CEILING_TABLE.length - 1; i++) {
    const [r1, c1] = ESSENTIAL_CEILING_TABLE[i]
    const [r2, c2] = ESSENTIAL_CEILING_TABLE[i + 1]

    if (ratio <= r1 && ratio >= r2) {
      const t = (ratio - r2) / (r1 - r2)
      return Math.round(c2 + t * (c1 - c2))
    }
  }

  return 8
}

function desirablePenalty(ratio: number): number {
  if (ratio >= 0.8) return 0
  if (ratio >= 0.6) return 8
  if (ratio >= 0.4) return 16
  if (ratio >= 0.2) return 24
  return 32
}

// ─────────────────────────────────────────────────────────────────────────────
// COVERAGE — single source of truth
//
// Strategy (in priority order):
//   1. Re-derive from criteriaAnalysis[] rows if present and non-empty.
//   2. Fall back to the pre-aggregated breakdown.criteriaCoverage counts.
//   3. Return all-zeros only if neither source exists.
// ─────────────────────────────────────────────────────────────────────────────

function recomputeCoverage(result: AnalysisResult): CriteriaCoverage {
  const rows = result.criteriaAnalysis

  // ── Source 1: per-criterion rows ──────────────────────────────────────────
  if (rows && rows.length > 0) {
    let essentialMet = 0
    let essentialPartial = 0
    let essentialNotMet = 0
    let desirableMet = 0
    let desirablePartial = 0
    let desirableNotMet = 0

    for (const item of rows) {
      const status = item?.status
      const type   = item?.type

      // Weighted contribution: met=1, partially met=0.5, not met=0
      const weight =
        status === "met"           ? 1   :
        status === "partially met" ? 0.5 : 0

      if (type === "essential") {
        essentialMet += weight
        if (status === "partially met") essentialPartial++
        if (status === "not met")       essentialNotMet++
      } else {
        desirableMet += weight
        if (status === "partially met") desirablePartial++
        if (status === "not met")       desirableNotMet++
      }
    }

    return {
      essentialMet,
      essentialPartial,
      essentialNotMet,
      desirableMet,
      desirablePartial,
      desirableNotMet,
    }
  }

  // ── Source 2: pre-aggregated breakdown counts ─────────────────────────────
  const bc = result.breakdown?.criteriaCoverage
  if (bc) {
    return {
      essentialMet:     bc.essentialMet     ?? 0,
      essentialPartial: bc.essentialPartial ?? 0,
      essentialNotMet:  bc.essentialNotMet  ?? 0,
      desirableMet:     bc.desirableMet     ?? 0,
      desirablePartial: bc.desirablePartial ?? 0,
      desirableNotMet:  bc.desirableNotMet  ?? 0,
    }
  }

  // ── Source 3: nothing available ───────────────────────────────────────────
  return {
    essentialMet: 0, essentialPartial: 0, essentialNotMet: 0,
    desirableMet: 0, desirablePartial: 0, desirableNotMet: 0,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SCORING: CRITERIA COVERAGE
// ─────────────────────────────────────────────────────────────────────────────

function scoreCriteriaCoverage(
  coverage: CriteriaCoverage,
  inventory: CriteriaInventory,
  bandGap: number
) {
  // Guard against divide-by-zero; default to 1 so a single met criterion
  // still produces a meaningful ratio rather than NaN.
  const essentialTotal = Math.max(inventory.essentialTotal ?? 0, 1)
  const desirableTotal = Math.max(inventory.desirableTotal ?? 0, 1)

  const essentialRatio = Math.min(coverage.essentialMet / essentialTotal, 1)
  const desirableRatio = Math.min(coverage.desirableMet / desirableTotal, 1)

  const essentialCeiling = interpolateCeiling(essentialRatio)
  const penalty          = desirablePenalty(desirableRatio)

  // Cap the seniority deduction so it never alone pushes the score to zero
  // when the candidate actually meets criteria.
  const rawDeduction = bandGap * 10
  const deduction    = Math.min(rawDeduction, essentialCeiling - 8)

  const score = Math.max(0, essentialCeiling - penalty - deduction)

  return {
    score,
    essentialRatio,
    essentialCeiling,
    desirableRatio,
    penalty,
    deduction,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SCORING: STAR COMPLETENESS
// ─────────────────────────────────────────────────────────────────────────────

function elementScore(v: "present" | "weak" | "absent"): number {
  if (v === "present") return 1
  if (v === "weak")    return 0.5
  return 0
}

function scoreStarExample(ex: StarExample): number {
  const s = elementScore(ex.situation)
  const t = elementScore(ex.task)
  // "We" language taints the action element — treat it as absent
  const a = ex.weLanguageDetected ? 0 : elementScore(ex.action)
  const r = elementScore(ex.result)

  const raw = ((s + t + a + r) / 4) * 100

  const presentCount = [
    ex.situation === "present",
    ex.task      === "present",
    !ex.weLanguageDetected && ex.action === "present",
    ex.result    === "present",
  ].filter(Boolean).length

  let cap =
    presentCount === 4 ? 100 :
    presentCount === 3 ?  65 :
    presentCount === 2 ?  40 :
    presentCount === 1 ?  18 : 0

  // No result → hard cap at 50
  if (r === 0) cap = Math.min(cap, 50)

  return Math.min(raw, cap)
}

function scoreStarCompleteness(star: StarCompleteness, bandGap: number): number {
  if (!star?.examples?.length) return 0

  const avg =
    star.examples.reduce((sum, e) => sum + scoreStarExample(e), 0) /
    star.examples.length

  const penalised = star.resultsConsistentlyAbsent
    ? Math.min(avg, 50)
    : avg

  // Cap the band-gap deduction to avoid wiping out genuine STAR quality
  const deduction = Math.min(bandGap * 10, Math.max(0, penalised - 8))

  return Math.max(0, Math.round(penalised - deduction))
}

// ─────────────────────────────────────────────────────────────────────────────
// SCORING: NHS VALUES ALIGNMENT
// ─────────────────────────────────────────────────────────────────────────────

const VALUE_SCORES: Record<string, number> = {
  behavioural_with_outcome: 80,
  behavioural:              61,
  referenced:               41,
  keyword:                  23,
  absent:                    8,
}

function scoreValuesAlignment(values: NHSValue[]): number {
  if (!values?.length) return 0

  const total = values.reduce(
    (sum, v) => sum + (VALUE_SCORES[v.classification] ?? 8),
    0
  )

  return Math.round(total / values.length)
}

// ─────────────────────────────────────────────────────────────────────────────
// SCORING: LANGUAGE MIRRORING
// ─────────────────────────────────────────────────────────────────────────────

function scoreLanguageMirroring(lm: LanguageMirroring): number {
  if (!lm?.specPhrasesTotal) return 0

  // Paraphrased counts at 70% of a direct match
  const match =
    ((lm.present + lm.paraphrased * 0.7) / lm.specPhrasesTotal) * 100

  let score: number

  if      (match >= 90) score = 90
  else if (match >= 70) score = 70 + (match - 70)
  else if (match >= 50) score = 45 + (match - 50)
  else if (match >= 30) score = 20 + (match - 30)
  else if (match >= 10) score =  5 + (match - 10)
  else                  score = match / 2

  // Hard cap below 45% match
  if (match < 45) score = Math.min(score, 44)

  return Math.round(score)
}

// ─────────────────────────────────────────────────────────────────────────────
// SCORING: SPECIFICITY
// ─────────────────────────────────────────────────────────────────────────────

function scoreSpecificity(spec: Specificity): number {
  if (!spec?.totalClaims) return 0

  // Tier 1 = quantified/named; Tier 2 = contextual; Tier 3 = vague
  const raw =
    ((spec.tier1Count + spec.tier2Count * 0.5) / spec.totalClaims) * 100

  // If majority of claims are vague, cap the score
  if (spec.tier3Count > spec.totalClaims / 2) {
    return Math.min(Math.round(raw), 40)
  }

  return Math.round(raw)
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────────────────────────────────────

export function calculateNhsBandScore(result: AnalysisResult): ScoredBreakdown {
  const rawGap    = result.seniority?.bandGap ?? 0
  const bandGap   = Math.max(0, Math.min(5, Math.abs(rawGap)))
  const inventory = result.criteriaInventory ?? { essentialTotal: 1, desirableTotal: 1 }

  const coverage = scoreCriteriaCoverage(
    recomputeCoverage(result),
    inventory,
    bandGap
  )

  const star   = scoreStarCompleteness(result.breakdown.starCompleteness, bandGap)
  const values = scoreValuesAlignment(result.nhsValues ?? [])
  const lang   = scoreLanguageMirroring(result.breakdown.languageMirroring)
  const spec   = scoreSpecificity(result.breakdown.specificity)

  // Weighted overall — weights sum to 1.0
  const overall =
    coverage.score * 0.35 +
    star            * 0.25 +
    values          * 0.20 +
    lang            * 0.12 +
    spec            * 0.08

 const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)))

  return {
    criteriaCoverage:  clamp(coverage.score),
    starCompleteness:  clamp(star),
    valuesAlignment:   clamp(values),
    languageMirroring: clamp(lang),
    specificity:       clamp(spec),
    overallScore:      clamp(overall),
    _internal: {
      essentialRatio:    coverage.essentialRatio,
      essentialCeiling:  coverage.essentialCeiling,
      desirableRatio:    coverage.desirableRatio,
      desirablePenalty:  coverage.penalty,
      seniorityDeduction: coverage.deduction,
    },
  }
}