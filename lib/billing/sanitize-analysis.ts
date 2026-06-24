// lib/billing/sanitize-analysis.ts

type Tier = 'free' | 'pro' | 'elite'

export function sanitizeAnalysisForTier(result: any, tier: Tier): any {
  if (!result) return {}
  if (tier === 'pro' || tier === 'elite') return result


  // ── Free tier ─────────────────────────────────────────────────────────────
  // Build a new object — never mutate the original (it is saved to the DB)

  return {
    // ── Always visible ───────────────────────────────────────────────────────

    confidence:        result.confidence,
    seniority:         result.seniority,
    criteriaInventory: result.criteriaInventory,

    // Statement surface scan — all flags visible free
    statementScan: result.statementScan,

    // ATS keyword match — visible free
    atsMatch: result.atsMatch
      ? {
          totalKeywords:   result.atsMatch.totalKeywords,
          foundCount:      result.atsMatch.foundCount,
          missingCount:    result.atsMatch.missingCount,
          keywordsFound:   result.atsMatch.keywordsFound,
          keywordsMissing: result.atsMatch.keywordsMissing,
          missingGrouped:  result.atsMatch.missingGrouped,
        }
      : undefined,

    // Role match suggestions — visible free
    roleMatchSuggestions: result.roleMatchSuggestions,

    // Strengths — claim visible free, evidence locked
    strengths: Array.isArray(result.strengths)
      ? result.strengths.map((s: any) => ({ claim: s.claim }))
      : [],

    // criteriaAnalysis — status visible free, criterion text blurred on page
    criteriaAnalysis: Array.isArray(result.criteriaAnalysis)
      ? result.criteriaAnalysis.map((c: any) => ({
          criterion: c.criterion,
          type:      c.type,
          status:    c.status,
          // evidence and improvement locked
        }))
      : [],

    // ── Scored breakdown — partial free ──────────────────────────────────────
    scoredBreakdown: result.scoredBreakdown
      ? {
          overallScore:      result.scoredBreakdown.overallScore,
          criteriaCoverage:  result.scoredBreakdown.criteriaCoverage,
          valuesAlignment:   result.scoredBreakdown.valuesAlignment,
          // Locked — null so UI renders locked bar
          starCompleteness:  null,
          languageMirroring: null,
          specificity:       null,
        }
      : undefined,

    // Raw breakdown — criteria coverage counts visible free
    breakdown: result.breakdown
      ? {
          criteriaCoverage: result.breakdown.criteriaCoverage,
          // Locked
          starCompleteness:  undefined,
          languageMirroring: undefined,
          specificity:       undefined,
        }
      : undefined,

    // NHS values — classification label visible free, evidence locked
    nhsValues: Array.isArray(result.nhsValues)
      ? result.nhsValues.map((v: any) => ({
          name:           v.name,
          classification: v.classification,
          // evidence stripped for free
        }))
      : [],

    // missingCriteria — criterion names visible free (shows what's not met)
    missingCriteria: Array.isArray(result.missingCriteria)
      ? result.missingCriteria
      : [],

    // ── Locked for free ───────────────────────────────────────────────────────
    // weaknesses:         LOCKED
    // recommendations:    LOCKED
    // rejectionRisk:      LOCKED
    // operationalRealism: LOCKED
    // bandCoaching:       LOCKED
  }
}