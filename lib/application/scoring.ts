// lib/application/scoring.ts
//
// Real-time scoring engine for the Application Builder
// Computes scores locally (no AI needed) for instant feedback.
//
// SCORING MODEL — aligned with NHS JobReady blueprint:
//   Essential Criteria Coverage  35%
//   Relevant Experience (STAR)   20%
//   Clinical / Technical Skills  15%
//   NHS Values Alignment         10%
//   Evidence & Examples          10%
//   Communication Quality         5%
//   Role-Specific Keywords        5%
//   ────────────────────────────────
//   Total                       100%

export interface CriterionScoreInput {
  type:               "essential" | "desirable"
  situation:          string | null
  task:               string | null
  action:             string | null
  result:             string | null
  metrics:            string | null
  reflection:         string | null
  generatedParagraph: string | null
  keywords:           string[]
  criterionText:      string
}

export interface CriterionScore {
  completeness:    number  // 0-100: STAR fields filled
  evidenceStrength:number  // 0-100: evidence quality
  specificity:     number  // 0-100: clinical/technical depth
  keywordMatch:    number  // 0-100: criterion keywords mirrored
  overall:         number  // weighted combination
}

export interface ApplicationScore {
  overall: number
  dimensions: {
    criteriaCoverage:  number  // essential criteria addressed      (35%)
    starCompleteness:  number  // STAR quality / experience depth   (20%)
    specificity:       number  // clinical / technical skills        (15%)
    valuesAlignment:   number  // NHS values presence               (10%)
    evidenceDepth:     number  // evidence & examples quality       (10%)
    languageMirroring: number  // communication quality              (5%)
    keywordScore:      number  // role-specific keywords             (5%)
  }
  // Kept for backward compat with existing UI components
  scoredBreakdown: {
    criteriaCoverage:  number
    starCompleteness:  number
    valuesAlignment:   number
    languageMirroring: number
    specificity:       number
    overallScore:      number
  }
  completeness:      number  // % of fields filled
  essentialCoverage: number  // % of essential criteria done
  desirableCoverage: number  // % of desirable criteria done
  wordCount:         number
  grade:             "excellent" | "strong" | "developing" | "needs_work" | "at_risk"
}

// ─── NHS Clinical terminology signals ────────────────────────────────────────

const CLINICAL_TERMS = [
  'venepuncture','cannulation','catheter','wound care','medication',
  'observations','news2','blood pressure','oxygen saturation','fluid balance',
  'care plan','risk assessment','safeguarding','infection control','coshh',
  'nmc','hcpc','revalidation','delegation','escalation','handover','sbar',
  'ward round','discharge','referral','clinical governance','audit','cpd',
  'manual handling','moving and handling','first aid','resuscitation','als','ils',
  'phlebotomy','ecg','spirometry','urinalysis','blood glucose','peak flow',
  'community','outpatient','inpatient','a&e','theatre','icu','itu','hdu',
  'gp surgery','district nursing','health visitor','midwifery','paediatric',
]

const NHS_VALUE_KEYWORDS = [
  // England
  'working together for patients','respect and dignity','commitment to quality',
  'compassion','improving lives','everyone counts',
  // Scotland
  'care and compassion','dignity and respect','openness honesty and responsibility',
  'quality and teamwork','fairness',
  // Generic NHS
  'person-centred','patient-centred','holistic','safeguarding','equality',
  'diversity','inclusion','confidentiality','dignity','teamwork',
  'multidisciplinary','evidence-based','duty of candour',
]

const GENERIC_PHRASES = [
  'i am passionate','i have always been','i am highly motivated',
  'i am committed to','i always ensure','i have extensive experience',
  'i am a hard worker','i am dedicated','i am a team player',
  'i have experience in','i have good communication',
]

const NHS_OPERATIONAL_TERMS = [
  'care pathway','clinical governance','escalation protocol',
  'caseload management','discharge planning','bed management',
  'patient flow','waiting list','incident report','duty of candour',
  'pressure ulcer','falls prevention','medication round','drug round',
]

// ─── Per-Criterion Scoring ────────────────────────────────────────────────────

export function scoreCriterion(input: CriterionScoreInput): CriterionScore {
  const fields     = [input.situation, input.task, input.action, input.result]
  const filledCount = fields.filter(f => f && f.trim().length > 20).length
  const completeness = (filledCount / 4) * 100
  const allText    = fields.filter(Boolean).join(' ')
  const lower      = allText.toLowerCase()

  // ── Evidence strength (STAR quality) ─────────────────────────────────────
  let evidenceStrength = 0
  if (allText.length > 50)  evidenceStrength += 15
  if (allText.length > 150) evidenceStrength += 15
  if (allText.length > 300) evidenceStrength += 10
  if (input.metrics   && input.metrics.trim().length > 10)   evidenceStrength += 15
  if (input.reflection && input.reflection.trim().length > 20) evidenceStrength += 10
  // "We" penalty — action should be "I"
  if (input.action && /\bwe\b/i.test(input.action)) evidenceStrength -= 15
  // Generic phrase penalty
  for (const phrase of GENERIC_PHRASES) {
    if (lower.includes(phrase)) { evidenceStrength -= 10; break }
  }
  // Result present and specific
  if (input.result && input.result.trim().length > 30) evidenceStrength += 10
  evidenceStrength = Math.max(0, Math.min(100, evidenceStrength))

  // ── Specificity (clinical / technical depth) ──────────────────────────────
  let specificity = 0
  if (/\d+/.test(allText))              specificity += 20  // numbers present
  if (/\d+%/.test(allText))             specificity += 15  // percentages
  if (/\b(ward|unit|department|trust|hospital|clinic|surgery|community|practice)\b/i.test(allText)) specificity += 15 // named setting
  const clinicalFound = CLINICAL_TERMS.filter(t => lower.includes(t)).length
  specificity += Math.min(clinicalFound * 10, 40)  // up to 40 pts for clinical terms
  specificity = Math.max(0, Math.min(100, specificity))

  // ── Keyword matching ─────────────────────────────────────────────────────
  let keywordMatch = 0
  if (input.keywords.length > 0) {
    const searchText = (allText + ' ' + (input.generatedParagraph ?? '')).toLowerCase()
    const matched    = input.keywords.filter(k => searchText.includes(k.toLowerCase()))
    keywordMatch = Math.round((matched.length / input.keywords.length) * 100)
  }

  // ── Weighted overall per criterion ───────────────────────────────────────
  const weight = input.type === 'essential' ? 1.0 : 0.7
  const overall = Math.round(
    (completeness * 0.30 + evidenceStrength * 0.40 + specificity * 0.20 + keywordMatch * 0.10) * weight
  )

  return { completeness, evidenceStrength, specificity, keywordMatch, overall }
}

// ─── Competency Evidence Scoring (Layer 3) ────────────────────────────────────
// Scores a single competency's evidence narrative on 0–100.
// Used by CompetencyScorePanel for the per-competency breakdown.

export function scoreCompetencyEvidence(evidence: string | null, noExperience: boolean): number {
  if (noExperience)       return 20  // development statement — weak but shown
  if (!evidence?.trim()) return 0

  const text  = evidence.trim()
  const words = text.split(/\s+/).filter(Boolean).length
  const lower = text.toLowerCase()

  let score = 0

  // Word count (0–40 pts)
  if      (words >= 150) score += 40
  else if (words >= 100) score += 32
  else if (words >= 60)  score += 24
  else if (words >= 30)  score += 16
  else if (words >= 10)  score += 8

  // STAR signal detection (0–30 pts — 7.5 per element found)
  const starGroups = [
    ['when i','whilst i','during','at the time','i was working','in my role','i was asked'],
    ['my task','i needed to','i was responsible','it was my job','i had to','i was required'],
    ['i decided','i did','i implemented','i arranged','i contacted','i escalated','i ensured','i spoke','i took'],
    ['as a result','the outcome','which led','this meant','the patient','feedback','improved','reduced','achieved'],
  ]
  const starFound = starGroups.filter(group => group.some(kw => lower.includes(kw))).length
  score += starFound * 7.5

  // Clinical/specificity signals (0–20 pts)
  if (/\d+/.test(text))   score += 10
  const clinicalFound = CLINICAL_TERMS.filter(t => lower.includes(t)).length
  score += Math.min(clinicalFound * 5, 10)

  // Generic phrase penalty
  for (const phrase of GENERIC_PHRASES) {
    if (lower.includes(phrase)) { score -= 10; break }
  }

  return Math.max(0, Math.min(100, Math.round(score)))
}

// ─── Application-Level Scoring ────────────────────────────────────────────────

export function scoreApplication(
  criteria:      CriterionScoreInput[],
  introduction:  string | null,
  closing:       string | null,
  fullStatement: string | null,
  nhsValues:     string[]
): ApplicationScore {
  if (criteria.length === 0) {
    const empty = { criteriaCoverage: 0, starCompleteness: 0, valuesAlignment: 0, languageMirroring: 0, specificity: 0, overallScore: 0 }
    return {
      overall: 0,
      dimensions: { criteriaCoverage: 0, starCompleteness: 0, specificity: 0, valuesAlignment: 0, evidenceDepth: 0, languageMirroring: 0, keywordScore: 0 },
      scoredBreakdown: empty,
      completeness: 0, essentialCoverage: 0, desirableCoverage: 0, wordCount: 0, grade: 'at_risk',
    }
  }

  const scores = criteria.map(c => ({ ...scoreCriterion(c), type: c.type }))
  const statementText = (fullStatement ?? '').toLowerCase()

  // ── 1. Essential Criteria Coverage (35%) ─────────────────────────────────
  const essential      = scores.filter(s => s.type === 'essential')
  const desirable      = scores.filter(s => s.type === 'desirable')
  const essentialDone  = essential.filter(s => s.completeness >= 50).length
  const desirableDone  = desirable.filter(s => s.completeness >= 50).length
  const essentialCoverage = essential.length > 0 ? Math.round((essentialDone / essential.length) * 100) : 100
  const desirableCoverage = desirable.length > 0 ? Math.round((desirableDone / desirable.length) * 100) : 100
  // Essential weighted 85%, desirable 15%
  const criteriaCoverage = Math.round(essentialCoverage * 0.85 + desirableCoverage * 0.15)

  // ── 2. Relevant Experience / STAR Quality (20%) ───────────────────────────
  const starCompleteness = essential.length > 0
    ? Math.round(essential.reduce((s, c) => s + c.evidenceStrength, 0) / essential.length)
    : Math.round(scores.reduce((s, c) => s + c.evidenceStrength, 0) / scores.length)

  // ── 3. Clinical / Technical Skills Specificity (15%) ────────────────────
  const avgSpecificity = Math.round(scores.reduce((s, c) => s + c.specificity, 0) / scores.length)
  // Boost for clinical terms in the full statement
  const clinicalInStatement = CLINICAL_TERMS.filter(t => statementText.includes(t)).length
  const clinicalBoost = Math.min(clinicalInStatement * 5, 20)
  const specificity = Math.min(100, Math.round((avgSpecificity + clinicalBoost) / 2 * 2 * 0.5 + avgSpecificity * 0.5))

  // ── 4. NHS Values Alignment (10%) ────────────────────────────────────────
  const valueMatches   = NHS_VALUE_KEYWORDS.filter(v => statementText.includes(v)).length
  const passedNhsValues = (nhsValues ?? []).filter(v => statementText.includes(v.toLowerCase())).length
  const valuesAlignment = Math.min(100, Math.round(((valueMatches / 6) * 70) + Math.min(passedNhsValues * 10, 30)))

  // ── 5. Evidence & Examples Depth (10%) ───────────────────────────────────
  // How many criteria have strong result / outcome statements
  const withOutcome = essential.filter(c => {
    const input = criteria.find(cr => cr.type === 'essential')
    return c.evidenceStrength >= 60
  }).length
  const evidenceDepth = essential.length > 0
    ? Math.round((withOutcome / essential.length) * 100)
    : Math.round(scores.filter(s => s.evidenceStrength >= 60).length / scores.length * 100)

  // ── 6. Communication Quality / Language Mirroring (5%) ──────────────────
  // How well statement mirrors job spec language
  const avgKeyword = Math.round(scores.reduce((s, c) => s + c.keywordMatch, 0) / scores.length)
  // Penalise "we" language in statement
  const weCount = (statementText.match(/\bwe\b/g) ?? []).length
  const wePenalty = Math.min(weCount * 5, 20)
  const languageMirroring = Math.max(0, avgKeyword - wePenalty)

  // ── 7. Role-Specific Keywords (5%) ───────────────────────────────────────
  const operationalFound = NHS_OPERATIONAL_TERMS.filter(t => statementText.includes(t)).length
  const keywordScore = Math.min(100, operationalFound * 15)

  // ── Blueprint-weighted overall ────────────────────────────────────────────
  const overall = Math.round(
    criteriaCoverage  * 0.35 +  // Essential Criteria Coverage  35%
    starCompleteness  * 0.20 +  // Relevant Experience          20%
    specificity       * 0.15 +  // Clinical / Technical Skills  15%
    valuesAlignment   * 0.10 +  // NHS Values Alignment         10%
    evidenceDepth     * 0.10 +  // Evidence & Examples          10%
    languageMirroring * 0.05 +  // Communication Quality         5%
    keywordScore      * 0.05    // Role-Specific Keywords        5%
  )

  // ── Word count ───────────────────────────────────────────────────────────
  const wordCount = (fullStatement ?? '').split(/\s+/).filter(Boolean).length

  // ── Completeness ─────────────────────────────────────────────────────────
  const totalFields  = criteria.length * 4
  const filledFields = criteria.reduce((sum, c) =>
    sum + [c.situation, c.task, c.action, c.result].filter(f => f && f.trim().length > 10).length, 0)
  const completeness = Math.round((filledFields / Math.max(totalFields, 1)) * 100)

  // ── Grade (updated thresholds) ───────────────────────────────────────────
  const grade: ApplicationScore['grade'] =
    overall >= 85 ? 'excellent'  :
    overall >= 70 ? 'strong'     :
    overall >= 55 ? 'developing' :
    overall >= 40 ? 'needs_work' : 'at_risk'

  const dimensions = { criteriaCoverage, starCompleteness, specificity, valuesAlignment, evidenceDepth, languageMirroring, keywordScore }

  // scoredBreakdown keeps the shape expected by ScoreHeader and existing UI
  const scoredBreakdown = {
    criteriaCoverage,
    starCompleteness,
    valuesAlignment,
    languageMirroring,
    specificity,
    overallScore: overall,
  }

  return {
    overall,
    dimensions,
    scoredBreakdown,
    completeness,
    essentialCoverage,
    desirableCoverage,
    wordCount,
    grade,
  }
}