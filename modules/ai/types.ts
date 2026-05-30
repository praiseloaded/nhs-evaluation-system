// modules/ai/types.ts

export interface AIExtractionResult {
  strengths: any[]
  weaknesses: string[]
  recommendations: string[]
  missingCriteria: string[]
  nhsValues: any[]
  criteriaAnalysis: any[]
  breakdown: {
    criteriaCoverage: number
    starCompleteness: number
    valuesAlignment: number
    languageMirroring: number
    specificity: number
  }
}