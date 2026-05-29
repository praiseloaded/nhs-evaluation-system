// modules/ai/prompt-builder.ts

interface PromptInput {
  jobTitle: string
  jobSpec: string
  cv: string
  statement: string
}

export function buildAnalysisPrompt(input: PromptInput) {
  return `
You are an elite NHS recruitment evaluation engine.

You MUST return ONLY valid JSON.
No markdown.
No explanations.
No code blocks.

Analyse this NHS application using the five-dimension scoring framework.

==================================================
JOB TITLE
==================================================

${input.jobTitle}

==================================================
JOB SPECIFICATION
==================================================

${input.jobSpec}

==================================================
CV
==================================================

${input.cv}

==================================================
SUPPORTING STATEMENT
==================================================

${input.statement}

==================================================
SCORING DIMENSIONS
==================================================

1. Criteria Coverage (35%)
2. STAR Completeness (25%)
3. NHS Values Alignment (20%)
4. Language Mirroring (12%)
5. Specificity & Evidence (8%)

==================================================
OUTPUT RULES
==================================================

- Return ONLY JSON
- No markdown
- No commentary
- No triple backticks
- All scores must be integers between 0 and 100
- verdict must be:
  "strong"
  "competitive"
  "weak"
  "reject"

==================================================
RETURN THIS EXACT JSON STRUCTURE
==================================================

{
  "totalScore": 0,
  "verdict": "weak",
  "shortlistProbability": 0,

  "breakdown": {
    "criteriaCoverage": 0,
    "starCompleteness": 0,
    "valuesAlignment": 0,
    "languageMirroring": 0,
    "specificity": 0
  },

  "strengths": [
    ""
  ],

  "weaknesses": [
    ""
  ],

  "missingCriteria": [
    ""
  ],

  "recommendations": [
    ""
  ],

  "nhsValues": [
    {
      "name": "",
      "score": 0,
      "evidence": ""
    }
  ],

  "criteriaAnalysis": [
    {
      "criterion": "",
      "type": "essential",
      "status": "met",
      "evidence": "",
      "improvement": ""
    }
  ]
}
`.trim()
}