export interface ExplanationInput {
  jobTitle: string
  jobSpec: string
  cv: string
  statement: string

  analysis: {
    totalScore: number
    breakdown: {
      criteriaCoverage: number
      starCompleteness: number
      valuesAlignment: number
      languageMirroring: number
      specificity: number
    }
    criteriaAnalysis: any[]
    strengths: any[]
    weaknesses: string[]
    missingCriteria: string[]
  }
}

export function buildExplanationPrompt(input: ExplanationInput): string {
  return `
You are a SENIOR NHS CAREER ANALYST.

Your role is to explain why a candidate received their score.

IMPORTANT RULES:
- Do NOT change or recalculate scores
- Do NOT evaluate eligibility
- Only explain reasoning behind existing analysis
- Be factual and evidence-based
- No hallucinations

==================================================
INPUT CONTEXT
==================================================

JOB TITLE:
${input.jobTitle}

JOB SPEC:
${input.jobSpec}

CV:
${input.cv}

STATEMENT:
${input.statement}

==================================================
SCORING RESULT (DO NOT CHANGE)
==================================================

Total Score: ${input.analysis.totalScore}

Breakdown:
- Criteria Coverage: ${input.analysis.breakdown.criteriaCoverage}
- STAR Completeness: ${input.analysis.breakdown.starCompleteness}
- Values Alignment: ${input.analysis.breakdown.valuesAlignment}
- Language Mirroring: ${input.analysis.breakdown.languageMirroring}
- Specificity: ${input.analysis.breakdown.specificity}

Missing Criteria:
${JSON.stringify(input.analysis.missingCriteria)}

Weaknesses:
${JSON.stringify(input.analysis.weaknesses)}

Strengths:
${JSON.stringify(input.analysis.strengths)}

Criteria Analysis:
${JSON.stringify(input.analysis.criteriaAnalysis)}

==================================================
TASK
==================================================

Return ONLY valid JSON:

{
  "summary": "",
  "whyScoreThis": [
    "Clear reason 1",
    "Clear reason 2"
  ],
  "scoreDrivers": {
    "positiveDrivers": [],
    "negativeDrivers": []
  },
  "risks": [],
  "improvementPlan": [
    "Actionable step 1",
    "Actionable step 2"
  ],
  "interviewFocusAreas": [
    "What interviewer should probe"
  ]
}
`.trim()
}