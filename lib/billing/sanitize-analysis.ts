// lib/billing/sanitize-analysis.ts



type Tier = 'free' | 'pro'

export function sanitizeAnalysisForTier(result: any, tier: Tier): any {
  if (!result) return {}

  if (tier === 'pro') return result

  // ── Free tier ─────────────────────────────────────────────────────────────
  // Build a new object — never mutate the original (it is saved to the DB)

  return {
    // ── Always visible ───────────────────────────────────────────────────────

    confidence:      result.confidence,
    seniority:       result.seniority,
    criteriaInventory: result.criteriaInventory,

    // Statement surface scan — all flags visible free
    statementScan:   result.statementScan,

    // ATS keyword match — visible free
    atsMatch:        result.atsMatch
      ? {
          totalKeywords:  result.atsMatch.totalKeywords,
          foundCount:     result.atsMatch.foundCount,
          missingCount:   result.atsMatch.missingCount,
          // Show found keywords free, missing grouped free (drives upgrade)
          keywordsFound:  result.atsMatch.keywordsFound,
          keywordsMissing: result.atsMatch.keywordsMissing,
          missingGrouped: result.atsMatch.missingGrouped,
        }
      : undefined,

    // Role match suggestions — visible free
    roleMatchSuggestions: result.roleMatchSuggestions,

    // Strengths — claim visible free, evidence locked
    strengths: Array.isArray(result.strengths)
      ? result.strengths.map((s: any) => ({ claim: s.claim }))
      : [],

    // ── Scored breakdown — partial free ──────────────────────────────────────
    // overallScore, criteriaCoverage, valuesAlignment visible free.
    // starCompleteness, languageMirroring, specificity locked.
    scoredBreakdown: result.scoredBreakdown
      ? {
          overallScore:      result.scoredBreakdown.overallScore,
          criteriaCoverage:  result.scoredBreakdown.criteriaCoverage,
          valuesAlignment:   result.scoredBreakdown.valuesAlignment,
          // Locked — return null so UI knows to render the locked bar
          starCompleteness:  null,
          languageMirroring: null,
          specificity:       null,
        }
      : undefined,

    // Raw breakdown — criteria coverage counts visible free (needed for
    // buildDimensionScores to render the criteria dimension card).
    // STAR examples, language phrases, specificity tiers locked.
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

    // ── Locked for free ───────────────────────────────────────────────────────
    // These fields are intentionally omitted — undefined in the returned object.
    // The UI checks for their presence and renders the locked state.

    // criteriaAnalysis:   LOCKED
    // weaknesses:         LOCKED
    // missingCriteria:    LOCKED
    // recommendations:    LOCKED
    // rejectionRisk:      LOCKED
    // operationalRealism: LOCKED
    // bandCoaching:       LOCKED
  }
}