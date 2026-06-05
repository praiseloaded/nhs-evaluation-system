// ─────────────────────────────────────────────────────────────────────────────
// CORE CLASSIFICATION TYPES (RAW AI OUTPUT ONLY)
// ─────────────────────────────────────────────────────────────────────────────

export type NhsValueClassification =
  | "behavioural_with_outcome"
  | "behavioural"
  | "referenced"
  | "keyword"
  | "absent"

export type StarElementStatus = "present" | "weak" | "absent"

export type RiskLevel = "high" | "medium" | "low"

export type OperationalClass = "demonstrated" | "implied" | "absent"

export type OperationalLevel = "strong" | "adequate" | "weak"

// ─────────────────────────────────────────────────────────────────────────────
// RAW CONTENT MODELS (FROM AI - NO SCORING HERE)
// ─────────────────────────────────────────────────────────────────────────────

export interface NhsValue {
  name: string
  classification: NhsValueClassification
  evidence?: string
}

export interface CriteriaItem {
  criterion: string
  type: "essential" | "desirable"
  status: "met" | "partially met" | "not met"
  evidence: string
  improvement: string
}

export interface StarExample {
  ref: string
  summary: string
  situation: StarElementStatus
  task: StarElementStatus
  action: StarElementStatus
  result: StarElementStatus
  weLanguageDetected: boolean
}

export interface OperationalDimension {
  name: string
  classification: OperationalClass
  evidence: string
  gap: string
}

// ─────────────────────────────────────────────────────────────────────────────
// ATS + RISK + STRUCTURED ANALYSIS SIGNALS
// ─────────────────────────────────────────────────────────────────────────────

export interface AtsMatch {
  totalKeywords: number
  foundCount: number
  missingCount: number
  keywordsFound: string[]
  keywordsMissing: string[]
  missingGrouped: {
    critical: string[]
    recommended: string[]
  }
}

export interface RejectionGate {
  gate: string
  riskLevel: RiskLevel
  reason: string
  fix: string
}

export interface RejectionRisk {
  overall: RiskLevel
  gates: RejectionGate[]
}

export interface StatementScan {
  wordCount: number
  hasExamples: boolean
  exampleCount: number
  resultsPresent: boolean
  usesWeLanguage: boolean
  openingIsGeneric: boolean
  closingIsGeneric: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// SENIORITY MODEL
// ─────────────────────────────────────────────────────────────────────────────

export interface Seniority {
  demonstratedBand: number | null
  targetBand: number | null
  bandGap: number
}

// ─────────────────────────────────────────────────────────────────────────────
// RAW AI RESULT (SOURCE OF TRUTH BEFORE SCORING)
// ─────────────────────────────────────────────────────────────────────────────

export interface AnalysisResult {
  seniority: Seniority

  criteriaInventory: {
    essentialTotal: number
    desirableTotal: number
  }

  criteriaAnalysis: CriteriaItem[]

  breakdown: {
    criteriaCoverage: {
      essentialMet: number
      essentialPartial: number
      essentialNotMet: number
      desirableMet: number
      desirablePartial: number
      desirableNotMet: number
    }

    starCompleteness: {
      examplesFound: number
      resultsConsistentlyAbsent: boolean
      examples: StarExample[]
    }

    specificity: {
      totalClaims: number
      tier1Count: number
      tier2Count: number
      tier3Count: number
    }

    languageMirroring: {
      specPhrasesTotal: number
      present: number
      paraphrased: number
      absent: number
      phrasesFound: string[]
      phrasesMissing: string[]
    }
  }

  nhsValues: NhsValue[]

  atsMatch?: AtsMatch
  statementScan?: StatementScan

  rejectionRisk?: RejectionRisk
  operationalRealism?: {
    level: OperationalLevel
    dimensions: OperationalDimension[]
  }

  bandCoaching?: {
    targetBand: number
    bandLabel: string
    coreExpectation: string
    whatPanelsLookFor: string[]
    candidateGaps: string[]
    bandSpecificTips: string[]
    mostCriticalBandGap: string
  }

  roleMatchSuggestions?: {
    roleTitle: string
    bandRange: string
    reason: string
  }[]

  confidence?: number
}

// ─────────────────────────────────────────────────────────────────────────────
// SCORING OUTPUT (ONLY FROM calculateNhsBandScore)
// ─────────────────────────────────────────────────────────────────────────────

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
// FINAL ANALYSIS RECORD (DATABASE SHAPE)
// ─────────────────────────────────────────────────────────────────────────────

export interface Analysis {
  id: string
  jobTitle: string
  jobDescription?: string
  band?: string
  location?: string
  createdAt: string | Date

  result: AnalysisResult

  // derived
  overallScore?: number
  shortlistProbability?: number
  verdict?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// UI DIMENSION MODELS
// ─────────────────────────────────────────────────────────────────────────────

export type DimensionVerdict = "excellent" | "good" | "acceptable" | "poor"

export interface DimensionScore {
  id: string
  name: string
  score: number
  verdict: DimensionVerdict
  weight: number
  improvements: string[]
  detail?: DimensionDetail
}

export type DimensionDetail =
  | {
      type: "criteria"
      items: CriteriaItem[]
      essentialMet: number
      essentialTotal: number
      desirableMet: number
      desirableTotal: number
    }
  | {
      type: "star"
      examples: StarExample[]
      examplesFound: number
      resultsConsistentlyAbsent: boolean
    }
  | {
      type: "values"
      values: NhsValue[]
    }
  | {
      type: "language"
      present: number
      paraphrased: number
      absent: number
      specPhrasesTotal: number
      phrasesFound: string[]
      phrasesMissing: string[]
    }
  | {
      type: "specificity"
      tier1Count: number
      tier2Count: number
      tier3Count: number
      totalClaims: number
    }

// ─────────────────────────────────────────────────────────────────────────────
// UI HELPER
// ─────────────────────────────────────────────────────────────────────────────

export function buildDimensionScores(
  result: AnalysisResult,
  scored?: ScoredBreakdown
): DimensionScore[] {
  const raw = result.breakdown

  // ─────────────────────────────────────────────
  // HARD GUARD (prevents your runtime crash)
  // ─────────────────────────────────────────────

  if (!scored) {
    return []
  }

  if (!raw) {
    return []
  }

  return [
    {
      id: "criteriaCoverage",
      name: "Criteria Coverage",
      score: scored.criteriaCoverage,
      verdict: verdict(scored.criteriaCoverage),
      weight: 35,
      improvements: result.criteriaAnalysis
        ? result.criteriaAnalysis
            .filter(c => c.status === "not met")
            .map(c => c.criterion)
        : [],
      detail:
        raw.criteriaCoverage
          ? {
              type: "criteria",
              items: result.criteriaAnalysis ?? [],
              essentialMet: raw.criteriaCoverage.essentialMet ?? 0,
              essentialTotal:
                result.criteriaInventory?.essentialTotal ?? 0,
              desirableMet: raw.criteriaCoverage.desirableMet ?? 0,
              desirableTotal:
                result.criteriaInventory?.desirableTotal ?? 0,
            }
          : undefined,
    },

    {
      id: "starCompleteness",
      name: "STAR Completeness",
      score: scored.starCompleteness,
      verdict: verdict(scored.starCompleteness),
      weight: 25,
      improvements: [],
      detail: raw.starCompleteness
        ? {
            type: "star",
            examples: raw.starCompleteness.examples ?? [],
            examplesFound: raw.starCompleteness.examplesFound ?? 0,
            resultsConsistentlyAbsent:
              raw.starCompleteness.resultsConsistentlyAbsent ?? false,
          }
        : undefined,
    },

    {
      id: "valuesAlignment",
      name: "NHS Values",
      score: scored.valuesAlignment,
      verdict: verdict(scored.valuesAlignment),
      weight: 20,
      improvements: [],
      detail: result.nhsValues
        ? {
            type: "values",
            values: result.nhsValues,
          }
        : undefined,
    },

    {
      id: "languageMirroring",
      name: "Language Mirroring",
      score: scored.languageMirroring,
      verdict: verdict(scored.languageMirroring),
      weight: 12,
      improvements: raw.languageMirroring?.phrasesMissing ?? [],
      detail: raw.languageMirroring
        ? {
            type: "language",
            present: raw.languageMirroring.present ?? 0,
            paraphrased: raw.languageMirroring.paraphrased ?? 0,
            absent: raw.languageMirroring.absent ?? 0,
            specPhrasesTotal:
              raw.languageMirroring.specPhrasesTotal ?? 0,
            phrasesFound: raw.languageMirroring.phrasesFound ?? [],
            phrasesMissing:
              raw.languageMirroring.phrasesMissing ?? [],
          }
        : undefined,
    },

    {
      id: "specificity",
      name: "Specificity",
      score: scored.specificity,
      verdict: verdict(scored.specificity),
      weight: 8,
      improvements: [],
      detail: raw.specificity
        ? {
            type: "specificity",
            tier1Count: raw.specificity.tier1Count ?? 0,
            tier2Count: raw.specificity.tier2Count ?? 0,
            tier3Count: raw.specificity.tier3Count ?? 0,
            totalClaims: raw.specificity.totalClaims ?? 0,
          }
        : undefined,
    },
  ]
}

// ─────────────────────────────────────────────────────────────────────────────
// INTERNAL
// ─────────────────────────────────────────────────────────────────────────────

function verdict(score: number): DimensionVerdict {
  if (score >= 85) return "excellent"
  if (score >= 70) return "good"
  if (score >= 50) return "acceptable"
  return "poor"
}