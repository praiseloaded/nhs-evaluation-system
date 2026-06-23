// lib/application/anti-hallucination-guard.ts
// Validates competency evidence before statement generation.
// Blocks or warns if evidence is too thin, missing, or shows signs
// of the candidate intending to let the AI fabricate experience.

export type EvidenceQuality = 'strong' | 'adequate' | 'thin' | 'empty' | 'no_experience'

export type CompetencyCheck = {
  competencyId:    string
  competencyLabel: string
  quality:         EvidenceQuality
  wordCount:       number
  isEssential:     boolean
  warning?:        string
  suggestion?:     string   // transferable experience suggestion
}

export type GuardResult = {
  canGenerate:    boolean
  blockedReason?: string
  checks:         CompetencyCheck[]
  warnings:       string[]
  essentialGaps:  string[]   // labels of essential competencies with no/thin evidence
}

// Phrases that suggest the candidate is not providing real evidence
const PLACEHOLDER_SIGNALS = [
  'i have done this',
  'yes i have experience',
  'i have this',
  'n/a',
  'not applicable',
  'will provide',
  'see cv',
  'as above',
  'same as above',
  'yes',
  'no',
]

function detectPlaceholder(text: string): boolean {
  const lower = text.trim().toLowerCase()
  return PLACEHOLDER_SIGNALS.some(s => lower === s || lower.startsWith(s + ' '))
}

function scoreQuality(text: string | null, noExp: boolean): { quality: EvidenceQuality; wordCount: number } {
  if (noExp) return { quality: 'no_experience', wordCount: 0 }
  if (!text?.trim()) return { quality: 'empty', wordCount: 0 }

  const words = text.trim().split(/\s+/).filter(Boolean)
  const wc = words.length

  if (detectPlaceholder(text)) return { quality: 'empty', wordCount: wc }
  if (wc < 20)  return { quality: 'thin',     wordCount: wc }
  if (wc < 50)  return { quality: 'adequate', wordCount: wc }
  return { quality: 'strong', wordCount: wc }
}

// Transferable experience suggestions per competency domain
const TRANSFERABLE_SUGGESTIONS: Record<string, string> = {
  clinical_assessment:  'Consider experience from care homes, schools, community settings, or any role where you assessed someone\'s wellbeing or needs.',
  patient_safety:       'Think about health and safety responsibilities in any job — reporting hazards, following procedures, or responding to emergencies.',
  communication:        'Communication experience from any customer-facing, teaching, volunteering, or caring role counts here.',
  person_centred:       'Caring for a family member, volunteering, or any role working with vulnerable people demonstrates person-centred values.',
  teamwork:             'Any experience working in a team — sports, retail, hospitality, community groups — shows teamwork skills.',
  leadership:           'Supervising others, organising a group, or leading a project in any context demonstrates leadership.',
  clinical_skills:      'If you have no formal clinical skills, mention any first aid training, care certificate work, or relevant simulation training.',
  evidence_based:       'Any CPD, online learning, university study, or reading of clinical guidelines counts as evidence-based practice.',
  organisation:         'Managing competing priorities in any busy role — retail, hospitality, teaching, admin — demonstrates organisation.',
  digital:              'Computer literacy, data entry, scheduling software, or any digital tools used in previous roles are relevant.',
  professional:         'Confidentiality experience from any role (banking, legal, social care, schools) demonstrates professional standards.',
  other:                'Think about any life or work experience that might be relevant to this requirement, even from outside healthcare.',
}

export function validateEvidence(
  competencyEvidence: Record<string, {
    label:       string
    criteriaIds: string[]
    evidence:    string | null
    noExperience: boolean
  }>,
  // Pass true for competencies that cover at least one essential criterion
  essentialCompetencyIds: Set<string>
): GuardResult {

  const checks: CompetencyCheck[] = []
  const warnings: string[] = []
  const essentialGaps: string[] = []

  for (const [id, ce] of Object.entries(competencyEvidence)) {
    const isEssential = essentialCompetencyIds.has(id)
    const { quality, wordCount } = scoreQuality(ce.evidence, ce.noExperience)

    const check: CompetencyCheck = {
      competencyId:    id,
      competencyLabel: ce.label,
      quality,
      wordCount,
      isEssential,
    }

    // Assign warning and suggestion
    if (quality === 'empty' && isEssential) {
      check.warning    = `No evidence provided for "${ce.label}" — this covers essential criteria and will weaken your statement.`
      check.suggestion = TRANSFERABLE_SUGGESTIONS[id]
      essentialGaps.push(ce.label)
    } else if (quality === 'thin' && isEssential) {
      check.warning = `Evidence for "${ce.label}" is very short (${wordCount} words). Add more detail — a specific example with an outcome.`
    } else if (quality === 'no_experience' && isEssential) {
      check.warning    = `You marked "${ce.label}" as no experience — the AI will write a development statement but this weakens your shortlist chances.`
      check.suggestion = TRANSFERABLE_SUGGESTIONS[id]
    }

    if (check.warning && isEssential) warnings.push(check.warning)
    checks.push(check)
  }

  // Block if more than 40% of essential competencies have no evidence
  const essentialChecks     = checks.filter(c => c.isEssential)
  const emptyEssentialCount = essentialChecks.filter(c => c.quality === 'empty').length
  const essentialTotal      = essentialChecks.length

  const blockThreshold = Math.ceil(essentialTotal * 0.4)
  const canGenerate    = emptyEssentialCount < blockThreshold

  const blockedReason = !canGenerate
    ? `${emptyEssentialCount} of ${essentialTotal} essential competency areas have no evidence. Please go back and answer at least ${essentialTotal - blockThreshold + 1} more before generating.`
    : undefined

  return { canGenerate, blockedReason, checks, warnings, essentialGaps }
}