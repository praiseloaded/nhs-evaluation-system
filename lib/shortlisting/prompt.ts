// lib/shortlisting/prompt.ts

export interface ShortlistInput {
  jobTitle: string
  band: string | null
  employer: string | null
  jobDescription: string
  parsedSpec: any
  cvText: string | null
  supportingStatement: string | null
  liveScore: any
  cvScore: any
  criteriaBreakdown: Array<{
    criterionText: string
    type: string
    category: string | null
    hasEvidence: boolean
    paragraphScore: number | null
  }>
}

export function buildShortlistPrompt(input: ShortlistInput): string {
  const essentialCriteria = input.criteriaBreakdown.filter(c => c.type === 'essential')
  const desirableCriteria = input.criteriaBreakdown.filter(c => c.type === 'desirable')
  const essentialCovered = essentialCriteria.filter(c => c.hasEvidence).length
  const desirableCovered = desirableCriteria.filter(c => c.hasEvidence).length

  const essentialList = essentialCriteria.map(c =>
    `- [${c.hasEvidence ? '✓ ADDRESSED' : '✗ MISSING'}] ${c.criterionText} ${c.paragraphScore !== null ? `(score: ${c.paragraphScore}%)` : ''}`
  ).join('\n')

  const desirableList = desirableCriteria.map(c =>
    `- [${c.hasEvidence ? '✓ ADDRESSED' : '✗ MISSING'}] ${c.criterionText} ${c.paragraphScore !== null ? `(score: ${c.paragraphScore}%)` : ''}`
  ).join('\n')

  const existingScores = input.liveScore ? `
EXISTING APPLICATION SCORES:
- Overall: ${input.liveScore.overall ?? 'N/A'}%
- Criteria Coverage: ${input.liveScore.dimensions?.criteriaCoverage ?? 'N/A'}%
- Evidence Strength: ${input.liveScore.dimensions?.evidenceStrength ?? 'N/A'}%
- NHS Values: ${input.liveScore.dimensions?.nhsValuesAlignment ?? 'N/A'}%
- Language Mirroring: ${input.liveScore.dimensions?.languageMirroring ?? 'N/A'}%
- Operational Realism: ${input.liveScore.dimensions?.operationalRealism ?? 'N/A'}%` : ''

  const cvScoreInfo = input.cvScore ? `
CV OPTIMISER RESULTS:
- ATS Match: ${input.cvScore.atsMatch?.score ?? 'N/A'}%
- Values Alignment: ${input.cvScore.valuesAlignment?.score ?? 'N/A'}%
- Clinical Relevance: ${input.cvScore.clinicalRelevance?.score ?? 'N/A'}%
- Missing Keywords: ${input.cvScore.atsMatch?.criticalMissing?.join(', ') ?? 'None identified'}` : ''

  return `
You are a senior NHS shortlisting panel consisting of:
- A Clinical Lead who assesses clinical competence and patient safety
- An HR Representative who evaluates values alignment and professional conduct
- A Service Manager who reviews operational capability and leadership

You are shortlisting for:
JOB: ${input.jobTitle}
${input.band ? `BAND: ${input.band}` : ''}
${input.employer ? `EMPLOYER: ${input.employer}` : ''}

JOB DESCRIPTION:
${input.jobDescription.slice(0, 3000)}

ESSENTIAL CRITERIA (${essentialCovered}/${essentialCriteria.length} addressed):
${essentialList}

DESIRABLE CRITERIA (${desirableCovered}/${desirableCriteria.length} addressed):
${desirableList}
${existingScores}
${cvScoreInfo}

CANDIDATE'S CV:
${(input.cvText ?? 'No CV provided').slice(0, 3000)}

CANDIDATE'S SUPPORTING STATEMENT:
${(input.supportingStatement ?? 'No statement generated').slice(0, 4000)}

────────────────────────────────
ASSESSMENT INSTRUCTIONS
────────────────────────────────

Assess this candidate AS A REAL NHS SHORTLISTING PANEL WOULD.

Score each of the 12 dimensions below from 0-100. Be brutally honest. NHS panels reject candidates every day for weak evidence — mirror that rigour.

SCORING CALIBRATION:
- 85-100: Evidence exceeds band requirements. Specific, measurable, clinically grounded.
- 70-84: Solid evidence that meets expectations. Clear STAR examples with outcomes.
- 55-69: Adequate but generic. Claims exist but lack specificity or measurability.
- 40-54: Weak. Vague statements, responsibilities listed instead of achievements.
- 25-39: Very weak. Critical gaps. Panel would flag concerns.
- 0-24: Missing or irrelevant. Automatic sift-out risk.

For status: 70+ = "strong", 50-69 = "moderate", below 50 = "weak"

RISK DETECTION RULES:
- Any essential criterion with NO evidence = HIGH risk
- No measurable outcomes anywhere = HIGH risk
- No safeguarding evidence for clinical roles = HIGH risk
- Generic statements without specific examples = MEDIUM risk
- No MDT evidence = MEDIUM risk
- Band-inappropriate language (too junior/senior) = MEDIUM risk
- Keyword misalignment with job spec = LOW risk
- Missing desirable criteria = LOW risk

RECRUITER VIEW RULES:
- Write exactly as a shortlisting panel chair would summarise to HR
- Maximum 150 words
- Reference specific evidence present or absent
- End with a recommendation: "Recommend shortlist" / "Borderline" / "Do not shortlist"

RECOMMENDATION RULES:
- Maximum 5 recommendations
- Rank by expected impact on shortlisting success
- Each must be actionable and specific
- Reference the dimension it would improve

Return ONLY valid JSON:
{
  "dimensions": {
    "essentialCriteriaCoverage": { "score": <0-100>, "status": "strong|moderate|weak", "rationale": "..." },
    "desirableCriteriaCoverage": { "score": <0-100>, "status": "strong|moderate|weak", "rationale": "..." },
    "nhsValuesAlignment": { "score": <0-100>, "status": "strong|moderate|weak", "rationale": "..." },
    "clinicalRealism": { "score": <0-100>, "status": "strong|moderate|weak", "rationale": "..." },
    "operationalAwareness": { "score": <0-100>, "status": "strong|moderate|weak", "rationale": "..." },
    "leadershipEvidence": { "score": <0-100>, "status": "strong|moderate|weak", "rationale": "..." },
    "mdtCollaboration": { "score": <0-100>, "status": "strong|moderate|weak", "rationale": "..." },
    "safeguardingEvidence": { "score": <0-100>, "status": "strong|moderate|weak", "rationale": "..." },
    "measurableOutcomes": { "score": <0-100>, "status": "strong|moderate|weak", "rationale": "..." },
    "communicationQuality": { "score": <0-100>, "status": "strong|moderate|weak", "rationale": "..." },
    "bandAppropriateness": { "score": <0-100>, "status": "strong|moderate|weak", "rationale": "..." },
    "atsAlignment": { "score": <0-100>, "status": "strong|moderate|weak", "rationale": "..." }
  },
  "risks": [
    { "title": "...", "severity": "high|medium|low", "explanation": "..." }
  ],
  "competitiveness": {
    "overallScore": <0-100>,
    "shortlistLikelihood": <0-100>,
    "competitivenessBand": "Highly Competitive|Strong|Competitive|Weak|Unlikely"
  },
  "recruiterView": {
    "summary": "Panel chair summary. Max 150 words. Ends with recommendation."
  },
  "recommendations": [
    { "priority": 1, "title": "...", "action": "...", "expectedImpact": "high|medium|low", "dimension": "..." }
  ]
}
`.trim()
}