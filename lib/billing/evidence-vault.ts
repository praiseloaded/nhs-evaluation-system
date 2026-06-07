// lib/billing/evidence-vault.ts

export interface EvidenceEntry {
  label:    string
  present:  boolean
  detail?:  string
  addedAt?: string
}

export interface EvidenceVault {
  employment: {
    nhs:          EvidenceEntry
    careHome:     EvidenceEntry
    research:     EvidenceEntry
    volunteering: EvidenceEntry
  }
  clinical: {
    venepuncture:     EvidenceEntry
    ecg:              EvidenceEntry
    vitals:           EvidenceEntry
    specimenHandling: EvidenceEntry
  }
  behaviour: {
    teamwork:      EvidenceEntry
    communication: EvidenceEntry
    compassion:    EvidenceEntry
    respect:       EvidenceEntry
  }
  leadership: {
    supervision: EvidenceEntry
    mentoring:   EvidenceEntry
    teaching:    EvidenceEntry
  }
}

export type EvidenceCategory = keyof EvidenceVault
export type EvidenceKey<C extends EvidenceCategory> = keyof EvidenceVault[C]

export function emptyVault(): EvidenceVault {
  const entry = (): EvidenceEntry => ({ label: '', present: false })
  return {
    employment: {
      nhs:          { ...entry(), label: 'NHS'          },
      careHome:     { ...entry(), label: 'Care Home'    },
      research:     { ...entry(), label: 'Research'     },
      volunteering: { ...entry(), label: 'Volunteering' },
    },
    clinical: {
      venepuncture:     { ...entry(), label: 'Venepuncture'      },
      ecg:              { ...entry(), label: 'ECG'               },
      vitals:           { ...entry(), label: 'Vitals'            },
      specimenHandling: { ...entry(), label: 'Specimen Handling' },
    },
    behaviour: {
      teamwork:      { ...entry(), label: 'Teamwork'      },
      communication: { ...entry(), label: 'Communication' },
      compassion:    { ...entry(), label: 'Compassion'    },
      respect:       { ...entry(), label: 'Respect'       },
    },
    leadership: {
      supervision: { ...entry(), label: 'Supervision' },
      mentoring:   { ...entry(), label: 'Mentoring'   },
      teaching:    { ...entry(), label: 'Teaching'    },
    },
  }
}

export function vaultToPromptContext(vault: EvidenceVault): string {
  const lines: string[] = ['CANDIDATE EVIDENCE VAULT (pre-verified):']
  const categories: [string, Record<string, EvidenceEntry>][] = [
    ['Employment', vault.employment as any],
    ['Clinical',   vault.clinical   as any],
    ['Behaviour',  vault.behaviour  as any],
    ['Leadership', vault.leadership as any],
  ]
  for (const [cat, entries] of categories) {
    const present = Object.values(entries).filter(e => e.present)
    const absent  = Object.values(entries).filter(e => !e.present)
    lines.push(`\n${cat.toUpperCase()}:`)
    lines.push(`  Confirmed: ${present.length ? present.map(e => e.label).join(', ') : 'None'}`)
    lines.push(`  Missing:   ${absent.length  ? absent.map(e => e.label).join(', ')  : 'None'}`)
  }
  lines.push('\nNote: Use confirmed entries as evidence anchors in your assessment.')
  lines.push('Flag missing entries under the relevant dimensions as evidence gaps.')
  return lines.join('\n')
}

export interface ShortlistProbabilityBreakdown {
  overall: number
  band: 'Highly Competitive' | 'Strong' | 'Competitive' | 'Weak' | 'Unlikely'
  factors: {
    essentialCriteriaMatch:      number
    desirableCriteriaMatch:      number
    nhsValuesEvidence:           number
    clinicalCompetencies:        number
    atsCompatibility:            number
    supportingStatementStrength: number
    evidenceDepth:               number
  }
  missingEvidence: string[]
  vaultSummary: {
    employment: Record<string, boolean>
    clinical:   Record<string, boolean>
    behaviour:  Record<string, boolean>
    leadership: Record<string, boolean>
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// All scores come strictly from what's stored in the DB result.
// scoredBreakdown fields (from your actual data):
//   overallScore      → the real overall (e.g. 33)
//   criteriaCoverage  → essential match score (e.g. 41)
//   valuesAlignment   → NHS values score (e.g. 46)
//   languageMirroring → ATS/language match (e.g. 75)
//   starCompleteness  → statement/STAR score (e.g. 0)
//   specificity       → evidence depth proxy (e.g. 0)
//
// breakdown.criteriaCoverage fields:
//   desirableMet, desirableNotMet, desirablePartial → desirable %
//
// atsMatch:
//   foundCount / totalKeywords → ATS %
//
// vault presence → clinical competencies
// ─────────────────────────────────────────────────────────────────────────────

export function calculateShortlistProbability(
  result: any,           // the full result object from DB
  vault:  EvidenceVault,
): ShortlistProbabilityBreakdown {

  const sb = result?.scoredBreakdown ?? {}
  const bd = result?.breakdown       ?? {}
  const am = result?.atsMatch        ?? {}

  // ── Overall — read directly from DB, never recalculate ───────────────────
  const overall: number = typeof sb.overallScore === 'number'
    ? Math.round(sb.overallScore)
    : 0

  // ── Essential criteria match ──────────────────────────────────────────────
  // Use criteriaAnalysis if available for precision, else scoredBreakdown
  const essentialCriteria = Array.isArray(result?.criteriaAnalysis)
    ? result.criteriaAnalysis.filter((c: any) => c.type === 'essential')
    : []

  const essentialScore: number = essentialCriteria.length > 0
    ? Math.round(
        (essentialCriteria.filter((c: any) => c.status === 'met').length +
         essentialCriteria.filter((c: any) => c.status === 'partially met').length * 0.5) /
        essentialCriteria.length * 100
      )
    : typeof sb.criteriaCoverage === 'number'
      ? Math.round(sb.criteriaCoverage)
      : 0

  // ── Desirable criteria match ──────────────────────────────────────────────
  const desirableCriteria = Array.isArray(result?.criteriaAnalysis)
    ? result.criteriaAnalysis.filter((c: any) => c.type === 'desirable')
    : []

  const desirableScore: number = desirableCriteria.length > 0
    ? Math.round(
        (desirableCriteria.filter((c: any) => c.status === 'met').length +
         desirableCriteria.filter((c: any) => c.status === 'partially met').length * 0.5) /
        desirableCriteria.length * 100
      )
    : bd.criteriaCoverage
      ? Math.round(
          ((bd.criteriaCoverage.desirableMet ?? 0) /
           Math.max((bd.criteriaCoverage.desirableMet ?? 0) + (bd.criteriaCoverage.desirableNotMet ?? 0) + (bd.criteriaCoverage.desirablePartial ?? 0), 1)) * 100
        )
      : 0

  // ── NHS values ────────────────────────────────────────────────────────────
  const nhsValuesScore: number = typeof sb.valuesAlignment === 'number'
    ? Math.round(sb.valuesAlignment)
    : 0

  // ── ATS compatibility — use languageMirroring + atsMatch foundCount ───────
  const atsFromMatch: number | null = am.totalKeywords > 0
    ? Math.round((am.foundCount / am.totalKeywords) * 100)
    : null

  const atsFromLanguage: number | null = typeof sb.languageMirroring === 'number'
    ? Math.round(sb.languageMirroring)
    : null

  const atsScore: number = atsFromMatch !== null && atsFromLanguage !== null
    ? Math.round((atsFromMatch * 0.5) + (atsFromLanguage * 0.5))
    : atsFromMatch ?? atsFromLanguage ?? 0

  // ── Statement strength — starCompleteness is real ─────────────────────────
  const statementScore: number = typeof sb.starCompleteness === 'number'
    ? Math.round(sb.starCompleteness)
    : 0

  // ── Clinical competencies — vault presence (real detected data) ───────────
  const clinicalEntries  = Object.values(vault.clinical)
  const presentClinical  = clinicalEntries.filter(e => e.present).length
  const clinicalScore: number = Math.round((presentClinical / clinicalEntries.length) * 100)

  // ── Evidence depth — specificity + vault breadth ──────────────────────────
  const behaviourEntries  = Object.values(vault.behaviour)
  const employmentEntries = Object.values(vault.employment)
  const vaultBehaviourPct = Math.round((behaviourEntries.filter(e => e.present).length  / behaviourEntries.length)  * 100)
  const vaultEmploymentPct= Math.round((employmentEntries.filter(e => e.present).length / employmentEntries.length) * 100)
  const specificityScore  = typeof sb.specificity === 'number' ? Math.round(sb.specificity) : 0

  const evidenceDepth: number = Math.round(
    (specificityScore  * 0.4) +
    (vaultEmploymentPct * 0.2) +
    (clinicalScore      * 0.2) +
    (vaultBehaviourPct  * 0.2)
  )

  // ── Band — derived from the real overall ──────────────────────────────────
  const band =
    overall >= 85 ? 'Highly Competitive' :
    overall >= 70 ? 'Strong'             :
    overall >= 55 ? 'Competitive'        :
    overall >= 40 ? 'Weak'              : 'Unlikely'

  // ── Missing evidence — job-specific gaps from criteriaAnalysis ────────────
  const missingEvidence: string[] = []

  // Pull from actual not-met essential criteria first
  if (Array.isArray(result?.criteriaAnalysis)) {
    result.criteriaAnalysis
      .filter((c: any) => c.type === 'essential' && c.status === 'not met')
      .slice(0, 4)
      .forEach((c: any) => missingEvidence.push(c.criterion))
  }

  // Supplement with vault gaps if under 4
  if (missingEvidence.length < 4) {
    if (!vault.clinical.ecg.present)              missingEvidence.push('ECG evidence')
    if (!vault.clinical.specimenHandling.present) missingEvidence.push('Specimen handling')
    if (!vault.employment.research.present)       missingEvidence.push('Research experience')
    if (!vault.leadership.supervision.present)    missingEvidence.push('Supervision experience')
  }

  const toRecord = (entries: Record<string, EvidenceEntry>) =>
    Object.fromEntries(Object.entries(entries).map(([k, v]) => [k, v.present]))

  return {
    overall,
    band,
    factors: {
      essentialCriteriaMatch:      essentialScore,
      desirableCriteriaMatch:      desirableScore,
      nhsValuesEvidence:           nhsValuesScore,
      clinicalCompetencies:        clinicalScore,
      atsCompatibility:            atsScore,
      supportingStatementStrength: statementScore,
      evidenceDepth,
    },
    missingEvidence: missingEvidence.slice(0, 6),
    vaultSummary: {
      employment: toRecord(vault.employment as any),
      clinical:   toRecord(vault.clinical   as any),
      behaviour:  toRecord(vault.behaviour  as any),
      leadership: toRecord(vault.leadership as any),
    },
  }
}