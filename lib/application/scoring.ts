// lib/application/scoring.ts
//
// Real-time scoring engine for the Application Builder
// Computes scores locally (no AI needed) for instant feedback
// AI-based deep scoring available via API endpoint

export interface CriterionScoreInput {
  type: "essential" | "desirable"
  situation: string | null
  task: string | null
  action: string | null
  result: string | null
  metrics: string | null
  reflection: string | null
  generatedParagraph: string | null
  keywords: string[]
  criterionText: string
}

export interface CriterionScore {
  completeness: number    // 0-100: are all STAR fields filled?
  evidenceStrength: number // 0-100: quality of evidence
  keywordMatch: number    // 0-100: criterion keywords mirrored
  overall: number         // weighted combination
}

export interface ApplicationScore {
  overall: number
  dimensions: {
    criteriaCoverage: number    // % of criteria addressed (weight: 30%)
    evidenceStrength: number   // quality of STAR evidence (weight: 30%)
    nhsValuesAlignment: number // NHS values presence (weight: 15%)
    operationalRealism: number // NHS-specific language/context (weight: 10%)
    languageMirroring: number  // keyword usage from spec (weight: 15%)
  }
  completeness: number         // % of fields filled
  essentialCoverage: number    // % of essential criteria done
  desirableCoverage: number    // % of desirable criteria done
  wordCount: number
  grade: "excellent" | "strong" | "developing" | "weak" | "incomplete"
}

// ─── Per-Criterion Scoring (instant, no AI) ──────────────────────────────────

export function scoreCriterion(input: CriterionScoreInput): CriterionScore {
  // Completeness: are STAR fields filled?
  const fields = [input.situation, input.task, input.action, input.result]
  const filledCount = fields.filter(f => f && f.trim().length > 20).length
  const completeness = (filledCount / 4) * 100

  // Evidence strength: length + specificity signals
  let evidenceStrength = 0
  const allText = fields.filter(Boolean).join(' ')

  if (allText.length > 50) evidenceStrength += 15
  if (allText.length > 150) evidenceStrength += 15
  if (allText.length > 300) evidenceStrength += 10

  // Specificity signals
  if (/\d+/.test(allText)) evidenceStrength += 15          // has numbers
  if (/\d+%/.test(allText)) evidenceStrength += 10         // has percentages
  if (/\b(ward|unit|team|trust|hospital|clinic|practice|community)\b/i.test(allText)) evidenceStrength += 10 // named setting
  if (input.metrics && input.metrics.trim().length > 10) evidenceStrength += 10 // has metrics
  if (input.reflection && input.reflection.trim().length > 20) evidenceStrength += 5 // has reflection

  // Penalty for "we" language in action
  if (input.action && /\bwe\b/i.test(input.action)) evidenceStrength -= 15

  // Penalty for generic phrases
  const genericPhrases = ['i am passionate', 'i have experience', 'i always ensure', 'i am committed']
  for (const phrase of genericPhrases) {
    if (allText.toLowerCase().includes(phrase)) evidenceStrength -= 10
  }

  evidenceStrength = Math.max(0, Math.min(100, evidenceStrength))

  // Keyword matching
  let keywordMatch = 0
  if (input.keywords.length > 0) {
    const textLower = (allText + ' ' + (input.generatedParagraph ?? '')).toLowerCase()
    const matched = input.keywords.filter(k => textLower.includes(k.toLowerCase()))
    keywordMatch = Math.round((matched.length / input.keywords.length) * 100)
  }

  // Weighted overall
  const weight = input.type === 'essential' ? 1.0 : 0.7
  const overall = Math.round(
    (completeness * 0.3 + evidenceStrength * 0.4 + keywordMatch * 0.3) * weight
  )

  return { completeness, evidenceStrength, keywordMatch, overall }
}

// ─── Application-Level Scoring (instant, no AI) ──────────────────────────────

export function scoreApplication(
  criteria: CriterionScoreInput[],
  introduction: string | null,
  closing: string | null,
  fullStatement: string | null,
  nhsValues: string[]
): ApplicationScore {
  if (criteria.length === 0) {
    return {
      overall: 0,
      dimensions: { criteriaCoverage: 0, evidenceStrength: 0, nhsValuesAlignment: 0, operationalRealism: 0, languageMirroring: 0 },
      completeness: 0, essentialCoverage: 0, desirableCoverage: 0, wordCount: 0, grade: 'incomplete',
    }
  }

  const scores = criteria.map(c => ({ ...scoreCriterion(c), type: c.type }))

  // 1. Criteria coverage (30%)
  const essential = scores.filter(s => s.type === 'essential')
  const desirable = scores.filter(s => s.type === 'desirable')
  const essentialDone = essential.filter(s => s.completeness >= 50).length
  const desirableDone = desirable.filter(s => s.completeness >= 50).length
  const essentialCoverage = essential.length > 0 ? (essentialDone / essential.length) * 100 : 100
  const desirableCoverage = desirable.length > 0 ? (desirableDone / desirable.length) * 100 : 100
  const criteriaCoverage = Math.round(essentialCoverage * 0.8 + desirableCoverage * 0.2)

  // 2. Evidence strength (30%)
  const avgEvidence = scores.length > 0
    ? Math.round(scores.reduce((s, c) => s + c.evidenceStrength, 0) / scores.length)
    : 0

  // 3. NHS values alignment (15%)
  const statementText = (fullStatement ?? '').toLowerCase()
  const valueKeywords = [
    'compassion', 'dignity', 'respect', 'person-centred', 'patient-centred',
    'quality', 'safety', 'teamwork', 'multidisciplinary', 'evidence-based',
    'equality', 'diversity', 'inclusion', 'improvement', 'excellence',
  ]
  const valueMatches = valueKeywords.filter(v => statementText.includes(v)).length
  const nhsValuesAlignment = Math.min(100, Math.round((valueMatches / 8) * 100))

  // 4. Operational realism (10%)
  const nhsTerms = [
    'care pathway', 'clinical governance', 'safeguarding', 'escalation',
    'caseload', 'discharge planning', 'risk assessment', 'audit',
    'nmc', 'duty of candour', 'incident report', 'handover',
    'bed management', 'patient flow', 'waiting list',
  ]
  const nhsMatches = nhsTerms.filter(t => statementText.includes(t)).length
  const operationalRealism = Math.min(100, Math.round((nhsMatches / 5) * 100))

  // 5. Language mirroring (15%)
  const avgKeyword = scores.length > 0
    ? Math.round(scores.reduce((s, c) => s + c.keywordMatch, 0) / scores.length)
    : 0

  // Weighted overall
  const overall = Math.round(
    criteriaCoverage * 0.30 +
    avgEvidence * 0.30 +
    nhsValuesAlignment * 0.15 +
    operationalRealism * 0.10 +
    avgKeyword * 0.15
  )

  // Word count
  const wordCount = (fullStatement ?? '').split(/\s+/).filter(Boolean).length

  // Completeness
  const totalFields = criteria.length * 4 // S, T, A, R per criterion
  const filledFields = criteria.reduce((sum, c) => {
    return sum + [c.situation, c.task, c.action, c.result]
      .filter(f => f && f.trim().length > 10).length
  }, 0)
  const completeness = Math.round((filledFields / Math.max(totalFields, 1)) * 100)

  // Grade
  const grade: ApplicationScore['grade'] =
    overall >= 85 ? 'excellent' :
    overall >= 70 ? 'strong' :
    overall >= 50 ? 'developing' :
    overall >= 25 ? 'weak' : 'incomplete'

  return {
    overall,
    dimensions: {
      criteriaCoverage,
      evidenceStrength: avgEvidence,
      nhsValuesAlignment,
      operationalRealism,
      languageMirroring: avgKeyword,
    },
    completeness,
    essentialCoverage,
    desirableCoverage,
    wordCount,
    grade,
  }
}