// lib/shortlisting/types.ts

// ─── 12-Dimension Assessment ──────────────────────────────────────────────────

export interface DimensionScore {
  score: number           // 0-100
  status: "strong" | "moderate" | "weak"
  rationale: string       // 1-2 sentence explanation
}

export interface ShortlistDimensions {
  essentialCriteriaCoverage: DimensionScore
  desirableCriteriaCoverage: DimensionScore
  nhsValuesAlignment: DimensionScore
  clinicalRealism: DimensionScore
  operationalAwareness: DimensionScore
  leadershipEvidence: DimensionScore
  mdtCollaboration: DimensionScore
  safeguardingEvidence: DimensionScore
  measurableOutcomes: DimensionScore
  communicationQuality: DimensionScore
  bandAppropriateness: DimensionScore
  atsAlignment: DimensionScore
}

// ─── Risk Detection ───────────────────────────────────────────────────────────

export interface ShortlistRisk {
  title: string
  severity: "high" | "medium" | "low"
  explanation: string
}

// ─── Competitiveness ──────────────────────────────────────────────────────────

export type CompetitivenessBand =
  | "Highly Competitive"  // 90-100
  | "Strong"              // 75-89
  | "Competitive"         // 60-74
  | "Weak"                // 40-59
  | "Unlikely"            // 0-39

export interface CompetitivenessScore {
  overallScore: number            // 0-100
  shortlistLikelihood: number     // 0-100 probability
  competitivenessBand: CompetitivenessBand
}

// ─── Recruiter View ───────────────────────────────────────────────────────────

export interface RecruiterView {
  summary: string                 // max 150 words, panel reasoning simulation
}

// ─── Improvement Intelligence ─────────────────────────────────────────────────

export interface ImprovementRecommendation {
  priority: number                // 1 = highest impact
  title: string
  action: string                  // specific instruction
  expectedImpact: "high" | "medium" | "low"
  dimension: string               // which dimension this improves
}

// ─── Full Assessment Output ───────────────────────────────────────────────────

export interface ShortlistAssessment {
  dimensions: ShortlistDimensions
  risks: ShortlistRisk[]
  competitiveness: CompetitivenessScore
  recruiterView: RecruiterView
  recommendations: ImprovementRecommendation[]
  assessedAt: string
}