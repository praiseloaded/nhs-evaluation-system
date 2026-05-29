export interface AnalysisInput {
  id: string
  analysis_id: string
  full_text: string
  job_title: string
  job_description: string
  person_spec: string
  band: string
  location: string
  essential_criteria: string[]
  desirable_criteria: string[]
  skills: string[]
  values: string[]
  source_url?: string
  cv_filename?: string
  created_at: Date
  updated_at: Date
}

export interface DimensionScore {
  name: string
  score: number // 0-100
  verdict: 'excellent' | 'good' | 'acceptable' | 'poor'
  evidence: string[]
  improvements: string[]
}

export interface Analysis {
  id: string
  title: string
  jobTitle: string
  jobDescription: string
  personSpec: string
  band: string
  location: string
  essentialCriteria: string[]
  desirableCriteria: string[]
  skills: string[]
  organizationalValues: string[]
  sourceUrl?: string
  cvFilename?: string
  createdAt: Date
  updatedAt: Date
  
  // Analysis Results
  criteria: DimensionScore
  star: DimensionScore
  valuesAlignment: DimensionScore
  language: DimensionScore
  specificity: DimensionScore
  
  overallScore: number // Average of all dimensions
  keyInsights: string[]
  recommendations: string[]
}

export type VerdictType = 'excellent' | 'good' | 'acceptable' | 'poor'
