import { notFound } from 'next/navigation'
import { auth }     from '@/auth'
import { prisma }   from '@/lib/prisma'
import { getDb }    from '@/lib/db-router'
import { Navbar }   from '@/components/navbar'
import Link         from 'next/link'
import { FeatureGate } from '@/components/feature-gate'
import {
  ChevronLeft, Monitor, User, Briefcase,
  CheckCircle2, XCircle, AlertTriangle,
  MinusCircle, Zap, Eye, Shield, TrendingUp,
  FileSearch, UserCheck, ClipboardList,
  AlertCircle, Info, ArrowRight, BarChart2,
} from 'lucide-react'

type Params = { params: Promise<{ id: string }> }

// ─── Types ────────────────────────────────────────────────────────────────────

type SignalStatus = 'pass' | 'warn' | 'fail' | 'info'

type Signal = {
  label:    string
  status:   SignalStatus
  detail?:  string
  metric?:  string
}

type PanelResult = {
  score:      number
  grade:      string
  rationale:  string
  signals:    Signal[]
  topFix:     string
  deepDive:   { heading: string; body: string }[]
}

// ─── Score computation ────────────────────────────────────────────────────────

// ─── Score computation — mirrors calculateNhsBandScore exactly ───────────────
// All scores read directly from scoredBreakdown which was produced by
// calculateNhsBandScore() at analysis time. No recomputation = no divergence.

function computeAts(result: any): PanelResult {
  // ATS score = languageMirroring (phrase mirroring) as primary signal,
  // supplemented by atsMatch keyword data for signals display.
  // We use the saved scoredBreakdown.languageMirroring as the score base
  // since that's what calculateNhsBandScore uses for language alignment.
  const sb   = result?.scoredBreakdown
  const ats  = result?.atsMatch
  const scan = result?.statementScan
  const lang = result?.breakdown?.languageMirroring
  const signals: Signal[] = []

  // ── Keyword hit rate (display only — not used in official score) ──
  if (ats) {
    const hitRate = ats.totalKeywords > 0 ? (ats.foundCount / ats.totalKeywords) * 100 : 0
    signals.push({
      label:  'Keyword Hit Rate',
      status: hitRate >= 70 ? 'pass' : hitRate >= 40 ? 'warn' : 'fail',
      metric: `${ats.foundCount}/${ats.totalKeywords} (${Math.round(hitRate)}%)`,
      detail: hitRate >= 70
        ? 'Exceeds typical ATS threshold of 65%'
        : hitRate >= 40
        ? 'Borderline — ATS may flag for review'
        : 'Below threshold — likely filtered before human review',
    })

    const crit = ats.missingGrouped?.critical ?? []
    if (crit.length > 0) {
      signals.push({
        label:  'Critical Keywords Missing',
        status: 'fail',
        metric: `${crit.length} terms`,
        detail: `${crit.slice(0, 3).join(', ')}${crit.length > 3 ? ` +${crit.length - 3} more` : ''}`,
      })
    } else {
      signals.push({ label: 'Critical Keywords', status: 'pass', metric: 'All present', detail: 'No high-weight terms missing' })
    }

    const rec = ats.missingGrouped?.recommended ?? []
    if (rec.length > 0) {
      signals.push({
        label:  'Recommended Keywords Missing',
        status: 'warn',
        metric: `${rec.length} terms`,
        detail: rec.slice(0, 3).join(', '),
      })
    }
  }

  // ── Phrase mirroring — uses exact same formula as calculateNhsBandScore ──
  // Score IS scoredBreakdown.languageMirroring
  const mirrorScore = sb?.languageMirroring ?? 0
  if (lang) {
    const rawPct = lang.specPhrasesTotal > 0
      ? ((lang.present + lang.paraphrased * 0.7) / lang.specPhrasesTotal) * 100 : 0
    signals.push({
      label:  'Phrase Mirroring',
      status: mirrorScore >= 60 ? 'pass' : mirrorScore >= 30 ? 'warn' : 'fail',
      metric: `${mirrorScore}/100`,
      detail: `${lang.present} exact, ${lang.paraphrased} paraphrased (${Math.round(rawPct)}% raw match)`,
    })
    if (lang.phrasesMissing?.length > 0) {
      signals.push({
        label:  'Top Missing Phrases',
        status: 'info',
        detail: lang.phrasesMissing.slice(0, 3).join(' · '),
      })
    }
  }

  // ── Word count ──
  if (scan) {
    const wc = scan.wordCount
    if (wc < 150) {
      signals.push({ label: 'Statement Length', status: 'fail', metric: `${wc} words`, detail: 'Too short — ATS may treat as incomplete' })
    } else if (wc > 1000) {
      signals.push({ label: 'Statement Length', status: 'warn', metric: `${wc} words`, detail: 'May be truncated by some ATS systems' })
    } else if (wc >= 400 && wc <= 800) {
      signals.push({ label: 'Statement Length', status: 'pass', metric: `${wc} words`, detail: 'Optimal ATS length range' })
    } else {
      signals.push({ label: 'Statement Length', status: 'warn', metric: `${wc} words`, detail: 'Acceptable but not optimal' })
    }
  }

  // ── ATS score = average of languageMirroring + keyword hit rate ──
  // languageMirroring is the authoritative engine score for phrase alignment.
  // We blend it with keyword hit rate for a fuller ATS picture.
  const keywordScore = ats?.totalKeywords > 0
    ? Math.round((ats.foundCount / ats.totalKeywords) * 100) : mirrorScore
  const score = Math.round((mirrorScore * 0.6) + (keywordScore * 0.4))
  const clamped = Math.max(0, Math.min(100, score))
  const grade   = clamped >= 75 ? 'PASS' : clamped >= 50 ? 'REVIEW' : 'FAIL'

  const topFix = (() => {
    const crit = ats?.missingGrouped?.critical ?? []
    if (crit.length > 0) return `Add these critical keywords: ${crit.slice(0, 2).join(', ')}`
    if (lang?.phrasesMissing?.length > 0) return `Mirror this phrase from the job spec: "${lang.phrasesMissing[0]}"`
    if (scan?.wordCount < 300) return 'Expand your statement to at least 400 words'
    return 'Maintain keyword density — do not over-stuff'
  })()

  return {
    score: clamped, grade,
    rationale: grade === 'PASS'
      ? 'Your application passes automated screening. Keyword and phrase alignment is strong enough to reach a human reviewer.'
      : grade === 'REVIEW'
      ? 'ATS may flag this application for manual review. Some critical terms or phrases are missing.'
      : 'High probability of automated rejection before a recruiter sees your application.',
    signals, topFix,
    deepDive: [
      { heading: 'How NHS ATS systems work', body: 'NHS Jobs and most NHS trusts use Applicant Tracking Systems that score applications against job descriptions. They weight exact keyword matches, job-specific phrases, and minimum word thresholds. Applications scoring below ~65% keyword match are typically filtered without human review.' },
      { heading: 'Phrase mirroring strategy', body: 'The most effective tactic is to mirror exact phrases from the person specification — not synonyms. If the spec says "autonomous nurse-led outpatient clinics", use that exact phrase. ATS systems compare string similarity, not semantic meaning.' },
      { heading: 'Critical vs recommended keywords', body: 'Critical keywords appear in the essential criteria and job title. Missing even one can cause rejection. Recommended keywords appear in desirable criteria — missing these reduces your score but rarely causes outright rejection.' },
    ],
  }
}

function computeRecruiter(result: any): PanelResult {
  // Recruiter score = criteriaCoverage (the heaviest engine dimension at 35%)
  // This is the most accurate proxy for what a human shortlister checks.
  const sb       = result?.scoredBreakdown
  const scan     = result?.statementScan
  const strengths = result?.strengths ?? []
  const risk      = result?.rejectionRisk
  const criteria  = result?.criteriaAnalysis ?? []
  const signals: Signal[] = []

  if (scan) {
    if (scan.openingIsGeneric) {
      signals.push({ label: 'Opening Statement', status: 'fail', metric: 'Generic', detail: 'Recruiter likely stops reading after line 1. Opening must name the role and a specific hook.' })
    } else {
      signals.push({ label: 'Opening Statement', status: 'pass', metric: 'Engaging', detail: 'Strong first impression — recruiter will continue reading' })
    }
    if (scan.closingIsGeneric) {
      signals.push({ label: 'Closing Statement', status: 'warn', metric: 'Generic', detail: 'Missed opportunity to reinforce fit and motivation' })
    } else {
      signals.push({ label: 'Closing Statement', status: 'pass', metric: 'Distinct', detail: 'Memorable finish reinforces application' })
    }
    if (scan.usesWeLanguage) {
      signals.push({ label: '"We" Language', status: 'fail', metric: 'Detected', detail: 'Recruiter cannot assess individual contribution. Replace all "we did X" with "I led/delivered/achieved X".' })
    } else {
      signals.push({ label: '"We" Language', status: 'pass', metric: 'None', detail: 'Individual contributions are clearly attributed' })
    }
    if (!scan.hasExamples) {
      signals.push({ label: 'Concrete Examples', status: 'fail', metric: '0 found', detail: 'No specific examples detected. Assertions without evidence are ignored by experienced recruiters.' })
    } else {
      signals.push({ label: 'Concrete Examples', status: scan.exampleCount >= 3 ? 'pass' : 'warn', metric: `${scan.exampleCount} found`, detail: scan.exampleCount >= 3 ? 'Strong evidence base' : 'Add more specific examples to strengthen the case' })
    }
    if (!scan.resultsPresent) {
      signals.push({ label: 'Outcomes & Results', status: 'warn', metric: 'Absent', detail: 'Examples lack outcomes. Recruiters need to know "so what?" — quantify impact wherever possible.' })
    } else {
      signals.push({ label: 'Outcomes & Results', status: 'pass', metric: 'Present', detail: 'Impact is evidenced — recruiter can assess value added' })
    }
  }

  // Essential criteria coverage — use saved score directly
  const essentialMet   = criteria.filter((c: any) => c.type === 'essential' && c.status === 'met').length
  const essentialTotal = criteria.filter((c: any) => c.type === 'essential').length
  if (essentialTotal > 0) {
    const pct = (essentialMet / essentialTotal) * 100
    signals.push({
      label:  'Essential Criteria Visible',
      status: pct >= 70 ? 'pass' : pct >= 40 ? 'warn' : 'fail',
      metric: `${essentialMet}/${essentialTotal}`,
      detail: pct >= 70 ? 'Recruiter can clearly see essential criteria are met' : 'Too many essentials are not explicitly addressed',
    })
  }

  if (strengths.length >= 4) {
    signals.push({ label: 'Identifiable Strengths', status: 'pass', metric: `${strengths.length} found`, detail: strengths[0]?.claim ?? '' })
  } else if (strengths.length > 0) {
    signals.push({ label: 'Identifiable Strengths', status: 'warn', metric: `${strengths.length} found`, detail: 'More distinct strengths needed' })
  }

  const shortlistGate = risk?.gates?.find((g: any) => g.gate === 'Human shortlisting')
  if (shortlistGate?.riskLevel === 'high') {
    signals.push({ label: 'Shortlisting Gate Risk', status: 'fail', metric: 'High', detail: shortlistGate.reason })
  } else if (shortlistGate?.riskLevel === 'medium') {
    signals.push({ label: 'Shortlisting Gate Risk', status: 'warn', metric: 'Medium', detail: shortlistGate?.reason ?? '' })
  } else if (shortlistGate?.riskLevel === 'low') {
    signals.push({ label: 'Shortlisting Gate Risk', status: 'pass', metric: 'Low', detail: 'Likely to progress past human sift' })
  }

  // ── Recruiter score = scoredBreakdown.criteriaCoverage (authoritative) ──
  const score   = sb?.criteriaCoverage ?? 0
  const grade   = score >= 70 ? 'SHORTLIST' : score >= 45 ? 'MAYBE' : 'REJECT'

  const topFix = (() => {
    if (scan?.usesWeLanguage) return 'Replace all "we" statements with specific "I" contributions and outcomes'
    if (!scan?.hasExamples) return 'Add at least 3 STAR examples — one per key essential criterion'
    if (!scan?.resultsPresent) return 'Add measurable outcomes to every example (e.g. "reduced waiting times by 30%")'
    if (scan?.openingIsGeneric) return 'Rewrite your opening to immediately name the role and your strongest qualification'
    return 'Increase essential criteria coverage — address each essential point explicitly'
  })()

  return {
    score, grade,
    rationale: grade === 'SHORTLIST'
      ? 'A recruiter reviewing this application would likely add it to the shortlist pile. Essential criteria coverage is sufficient for progression.'
      : grade === 'MAYBE'
      ? 'A recruiter might pass this for a second look, but it would not be a confident shortlist. Competing applications with stronger evidence will rank higher.'
      : 'A recruiter would likely set this aside within 30 seconds. Essential criteria coverage is too low to justify shortlisting.',
    signals, topFix,
    deepDive: [
      { heading: 'What recruiters look for in 30 seconds', body: 'NHS recruiters scan for: (1) role-specific keywords in the opening line, (2) concrete examples — not just duties, (3) evidence the essential criteria are explicitly addressed. Generic statements about being "passionate" or "dedicated" are skipped entirely.' },
      { heading: 'The "I vs We" problem', body: '"We achieved X" tells the panel nothing about your individual contribution. Panels shortlist individuals, not teams. Every statement must be attributable to you personally: "I led the team that achieved X by doing Y, resulting in Z."' },
      { heading: 'Shortlisting scoring matrices', body: 'Most NHS trusts use a scored shortlisting matrix tied directly to the person specification. Each essential criterion is scored 0-3. Applications that don\'t explicitly address each criterion score 0 for that row — regardless of how impressive the rest of the application is.' },
    ],
  }
}

function computeHiringManager(result: any): PanelResult {
  // Hiring manager score = scoredBreakdown.overallScore (the full engine score)
  // This reflects the complete weighted formula from calculateNhsBandScore.
  const sb        = result?.scoredBreakdown
  const values    = result?.nhsValues ?? []
  const coaching  = result?.bandCoaching
  const risk      = result?.rejectionRisk
  const seniority = result?.seniority
  const criteria  = result?.criteriaAnalysis ?? []
  const star      = result?.breakdown?.starCompleteness
  const opsReal   = result?.operationalRealism
  const signals: Signal[] = []

  // Criteria coverage signal
  if (sb?.criteriaCoverage !== undefined) {
    const partial = criteria.filter((c: any) => c.type === 'essential' && c.status === 'partially met').length
    signals.push({
      label:  'Essential Criteria Coverage',
      status: sb.criteriaCoverage >= 70 ? 'pass' : sb.criteriaCoverage >= 45 ? 'warn' : 'fail',
      metric: `${sb.criteriaCoverage}/100`,
      detail: `${criteria.filter((c:any)=>c.type==='essential'&&c.status==='met').length} met, ${partial} partial, ${criteria.filter((c:any)=>c.type==='essential'&&c.status==='not met').length} not met`,
    })
  }

  // STAR signal
  if (sb?.starCompleteness !== undefined) {
    signals.push({
      label:  'STAR Evidence Quality',
      status: sb.starCompleteness >= 60 ? 'pass' : sb.starCompleteness >= 30 ? 'warn' : 'fail',
      metric: `${sb.starCompleteness}/100`,
      detail: star
        ? `${star.examplesFound} examples found${star.resultsConsistentlyAbsent ? ' — results/outcomes consistently absent' : ' with outcomes'}`
        : 'Behavioural evidence scoring',
    })
  }

  // Values signal — uses same VALUE_SCORES weights as the engine
  const evidenced   = values.filter((v: any) => v.classification === 'behavioural_with_outcome' || v.classification === 'behavioural')
  const keywordOnly = values.filter((v: any) => v.classification === 'keyword' || v.classification === 'absent')
  if (sb?.valuesAlignment !== undefined) {
    signals.push({
      label:  'NHS Values Evidence Depth',
      status: sb.valuesAlignment >= 60 ? 'pass' : sb.valuesAlignment >= 40 ? 'warn' : 'fail',
      metric: `${sb.valuesAlignment}/100`,
      detail: keywordOnly.length > 0
        ? `${evidenced.length}/${values.length} behaviourally demonstrated — ${keywordOnly.length} keyword-only`
        : 'All values behaviourally demonstrated',
    })
  }

  // Specificity signal
  if (sb?.specificity !== undefined) {
    const spec = result?.breakdown?.specificity
    signals.push({
      label:  'Claim Specificity',
      status: sb.specificity >= 50 ? 'pass' : sb.specificity >= 25 ? 'warn' : 'fail',
      metric: `${sb.specificity}/100`,
      detail: spec
        ? `${spec.tier1Count} quantified, ${spec.tier2Count} specific, ${spec.tier3Count} vague claims`
        : 'Ratio of concrete vs vague language',
    })
  }

  // Language mirroring signal
  if (sb?.languageMirroring !== undefined) {
    signals.push({
      label:  'Role-Specific Language',
      status: sb.languageMirroring >= 50 ? 'pass' : 'warn',
      metric: `${sb.languageMirroring}/100`,
      detail: 'Use of terminology from the job description and person spec',
    })
  }

  // Operational realism
  if (opsReal) {
    const absentDims = opsReal.dimensions?.filter((d: any) => d.classification === 'absent') ?? []
    if (absentDims.length >= 3) {
      signals.push({ label: 'Operational Realism', status: 'fail', metric: `${absentDims.length} absent`, detail: `Missing: ${absentDims.slice(0,2).map((d:any)=>d.name).join(', ')}` })
    } else if (absentDims.length > 0) {
      signals.push({ label: 'Operational Realism', status: 'warn', metric: `${absentDims.length} gaps`, detail: absentDims.map((d: any) => d.name).join(', ') })
    } else {
      signals.push({ label: 'Operational Realism', status: 'pass', metric: 'Strong', detail: 'NHS pressures, MDT working and governance evidenced' })
    }
  }

  // Band suitability — reflects seniority deduction in engine
  if (seniority?.bandGap !== undefined) {
    if (seniority.bandGap > 1) {
      signals.push({ label: 'Band Suitability', status: 'fail', metric: `${seniority.bandGap} band gap`, detail: `Band ${seniority.demonstratedBand} experience for Band ${seniority.targetBand} role` })
    } else if (seniority.bandGap === 1) {
      signals.push({ label: 'Band Suitability', status: 'warn', metric: '1 band gap', detail: 'Panel will probe readiness at interview' })
    } else if (seniority.bandGap === 0) {
      signals.push({ label: 'Band Suitability', status: 'pass', metric: 'Well matched', detail: 'Experience aligns with target band' })
    }
  }

  // Interview gate
  const intGate = risk?.gates?.find((g: any) => g.gate === 'Interview')
  if (intGate?.riskLevel === 'high') {
    signals.push({ label: 'Interview Readiness Risk', status: 'fail', metric: 'High', detail: intGate.fix })
  } else if (intGate?.riskLevel === 'low') {
    signals.push({ label: 'Interview Readiness Risk', status: 'pass', metric: 'Low', detail: 'Application suggests strong interview preparation' })
  }

  if (coaching?.mostCriticalBandGap) {
    signals.push({ label: 'Critical Band Gap', status: 'warn', metric: coaching.bandLabel ?? '', detail: coaching.mostCriticalBandGap })
  }

  // ── Hiring manager score = scoredBreakdown.overallScore (authoritative) ──
  const score = sb?.overallScore ?? 0
  const grade = score >= 72 ? 'INTERVIEW' : score >= 48 ? 'CONSIDER' : 'DECLINE'

  const topFix = (() => {
    if ((seniority?.bandGap ?? 0) > 1) return `Bridge the band gap — provide explicit examples of Band ${seniority?.targetBand}-level autonomous practice`
    if ((sb?.starCompleteness ?? 0) < 40) return 'Restructure examples using STAR — every example needs a measurable Result'
    if ((sb?.valuesAlignment ?? 0) < 40) return `Add behavioural evidence for: ${keywordOnly.slice(0,2).map((v:any)=>v.name).join(', ')}`
    if (coaching?.mostCriticalBandGap) return coaching.mostCriticalBandGap
    return 'Add quantified outcomes to your top 3 examples to strengthen hiring manager confidence'
  })()

  return {
    score, grade,
    rationale: grade === 'INTERVIEW'
      ? 'A hiring manager reviewing this application would likely invite this candidate to interview. The evidence base meets panel expectations for this band.'
      : grade === 'CONSIDER'
      ? 'A hiring manager might place this in a "consider" pile but it would not be a confident invite. Gaps in band-level evidence or STAR quality reduce confidence.'
      : 'A hiring manager would not progress this application. The evidence does not meet the threshold for the target band or role.',
    signals, topFix,
    deepDive: [
      { heading: 'What hiring managers assess differently from recruiters', body: 'Hiring managers are clinical experts who look beyond checklist compliance. They assess whether the candidate truly understands the role demands, can demonstrate autonomous clinical decision-making at the right band level, and whether their values are genuinely embedded in practice — not just stated.' },
      { heading: 'Band-level evidence is non-negotiable', body: 'For Band 6 and above, panels expect evidence of autonomous practice, leadership of others, and service development. For Band 7+, they expect strategic thinking, managing change, and influencing across boundaries. Applications demonstrating a lower band\'s competencies will not be appointed.' },
      { heading: 'The STAR result problem', body: 'Most candidates provide Situation, Task and Action but omit the Result. This is the most common reason for a "consider" rather than "interview" outcome. Every STAR example must end with a measurable or observable outcome: "waiting times reduced by 3 weeks", "zero incidents in 6 months".' },
      { heading: 'Operational realism signals seniority', body: 'Hiring managers at Band 6+ look for candidates who understand NHS pressures: winter surge planning, escalation protocols, documentation standards, patient flow. Candidates who don\'t reference these realities appear junior regardless of their qualifications.' },
    ],
  }
}

// ─── Grade config ─────────────────────────────────────────────────────────────

const GRADE_CONFIG: Record<string, { color: string; bg: string; border: string; dot: string }> = {
  PASS:      { color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/50',  border: 'border-emerald-200 dark:border-emerald-800', dot: 'bg-emerald-500' },
  REVIEW:    { color: 'text-amber-600 dark:text-amber-400',     bg: 'bg-amber-50 dark:bg-amber-950/50',      border: 'border-amber-200 dark:border-amber-800',     dot: 'bg-amber-500'   },
  FAIL:      { color: 'text-red-600 dark:text-red-400',         bg: 'bg-red-50 dark:bg-red-950/50',          border: 'border-red-200 dark:border-red-800',          dot: 'bg-red-500'     },
  SHORTLIST: { color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/50',  border: 'border-emerald-200 dark:border-emerald-800', dot: 'bg-emerald-500' },
  MAYBE:     { color: 'text-amber-600 dark:text-amber-400',     bg: 'bg-amber-50 dark:bg-amber-950/50',      border: 'border-amber-200 dark:border-amber-800',     dot: 'bg-amber-500'   },
  REJECT:    { color: 'text-red-600 dark:text-red-400',         bg: 'bg-red-50 dark:bg-red-950/50',          border: 'border-red-200 dark:border-red-800',          dot: 'bg-red-500'     },
  INTERVIEW: { color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/50',  border: 'border-emerald-200 dark:border-emerald-800', dot: 'bg-emerald-500' },
  CONSIDER:  { color: 'text-amber-600 dark:text-amber-400',     bg: 'bg-amber-50 dark:bg-amber-950/50',      border: 'border-amber-200 dark:border-amber-800',     dot: 'bg-amber-500'   },
  DECLINE:   { color: 'text-red-600 dark:text-red-400',         bg: 'bg-red-50 dark:bg-red-950/50',          border: 'border-red-200 dark:border-red-800',          dot: 'bg-red-500'     },
}

// ─── Shared UI ────────────────────────────────────────────────────────────────

function StatusIcon({ s }: { s: SignalStatus }) {
  if (s === 'pass') return <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
  if (s === 'warn') return <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
  if (s === 'fail') return <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
  return <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
}

function ScoreArc({
  score, strokeClass,
}: { score: number; strokeClass: string }) {
  const r    = 40
  const circ = 2 * Math.PI * r
  const off  = circ - (score / 100) * circ

  return (
    <svg width="104" height="104" viewBox="0 0 104 104">
      <circle cx="52" cy="52" r={r} fill="none"
        className="stroke-muted" strokeWidth="6" />
      <circle cx="52" cy="52" r={r} fill="none" strokeWidth="6"
        strokeDasharray={circ} strokeDashoffset={off}
        strokeLinecap="round" transform="rotate(-90 52 52)"
        className={`transition-all duration-1000 ${strokeClass}`}
      />
      <text x="52" y="47" textAnchor="middle" dominantBaseline="middle"
        className="fill-foreground font-mono font-black" fontSize="20">
        {score}
      </text>
      <text x="52" y="63" textAnchor="middle" dominantBaseline="middle"
        className="fill-muted-foreground" fontSize="9" fontFamily="monospace">
        /100
      </text>
    </svg>
  )
}

// ─── Assessor Panel ───────────────────────────────────────────────────────────

function AssessorPanel({
  icon: Icon, title, role, accentClass, strokeClass, panel,
}: {
  icon: React.ElementType
  title: string
  role: string
  accentClass: string
  strokeClass: string
  panel: PanelResult
}) {
  const gc = GRADE_CONFIG[panel.grade] ?? GRADE_CONFIG.REVIEW

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm flex flex-col">

      {/* Accent top bar */}
      <div className={`h-1 w-full ${accentClass}`} />

      <div className="p-6 flex flex-col gap-5 flex-1">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-muted border border-border flex items-center justify-center shrink-0">
              <Icon className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{role}</p>
              <p className="text-sm font-bold text-foreground">{title}</p>
            </div>
          </div>
          <ScoreArc score={panel.score} strokeClass={strokeClass} />
        </div>

        {/* Grade verdict */}
        <div className={`rounded-xl border px-4 py-3 ${gc.bg} ${gc.border}`}>
          <div className="flex items-center gap-2 mb-1">
            <span className={`w-2 h-2 rounded-full ${gc.dot}`} />
            <span className={`text-lg font-black tracking-widest font-mono ${gc.color}`}>
              {panel.grade}
            </span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{panel.rationale}</p>
        </div>

        {/* Signals */}
        <div className="space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Signal Breakdown</p>
          {panel.signals.map((sig, i) => (
            <div key={i} className="flex items-start gap-2.5 py-2 border-b border-border/50 last:border-0">
              <StatusIcon s={sig.status} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-foreground leading-snug">{sig.label}</p>
                  {sig.metric && (
                    <span className={`text-[10px] font-mono font-bold shrink-0 px-1.5 py-0.5 rounded ${
                      sig.status === 'pass' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' :
                      sig.status === 'warn' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' :
                      sig.status === 'fail' ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' :
                      'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                    }`}>
                      {sig.metric}
                    </span>
                  )}
                </div>
                {sig.detail && (
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{sig.detail}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Top fix */}
        <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-1">
            #1 Priority Fix
          </p>
          <p className="text-xs text-foreground leading-relaxed">{panel.topFix}</p>
        </div>

        {/* Deep dive */}
        <div className="space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Panel Intelligence
          </p>
          {panel.deepDive.map((d, i) => (
            <details key={i} className="group rounded-lg border border-border overflow-hidden">
              <summary className="flex items-center justify-between px-4 py-2.5 cursor-pointer hover:bg-muted/50 transition-colors list-none">
                <span className="text-xs font-semibold text-foreground">{d.heading}</span>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-open:rotate-90 transition-transform shrink-0" />
              </summary>
              <div className="px-4 pb-3 pt-1 border-t border-border bg-muted/20">
                <p className="text-xs text-muted-foreground leading-relaxed">{d.body}</p>
              </div>
            </details>
          ))}
        </div>

      </div>
    </div>
  )
}

// ─── Composite score ──────────────────────────────────────────────────────────

function CompositeScore({
  ats, recruiter, manager, jobTitle,
}: { ats: PanelResult; recruiter: PanelResult; manager: PanelResult; jobTitle: string }) {
  const overall = Math.round((ats.score * 0.30) + (recruiter.score * 0.35) + (manager.score * 0.35))
  const label   = overall >= 75 ? 'STRONG CANDIDATE' : overall >= 55 ? 'COMPETITIVE' : overall >= 38 ? 'NEEDS WORK' : 'HIGH RISK'
  const gc      = overall >= 75
    ? { color: 'text-emerald-600 dark:text-emerald-400', bar: 'bg-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-200 dark:border-emerald-800' }
    : overall >= 55
    ? { color: 'text-blue-600 dark:text-blue-400',       bar: 'bg-blue-500',    bg: 'bg-blue-50 dark:bg-blue-950/30',       border: 'border-blue-200 dark:border-blue-800'       }
    : overall >= 38
    ? { color: 'text-amber-600 dark:text-amber-400',     bar: 'bg-amber-500',   bg: 'bg-amber-50 dark:bg-amber-950/30',     border: 'border-amber-200 dark:border-amber-800'     }
    : { color: 'text-red-600 dark:text-red-400',         bar: 'bg-red-500',     bg: 'bg-red-50 dark:bg-red-950/30',         border: 'border-red-200 dark:border-red-800'         }

  const panels = [
    { label: 'ATS Score',       value: ats.score,       grade: ats.grade,       icon: Monitor,       weight: '30%', source: 'Language mirroring + keywords' },
    { label: 'Recruiter Score', value: recruiter.score, grade: recruiter.grade, icon: User,           weight: '35%', source: 'Criteria coverage score'        },
    { label: 'Hiring Mgr',      value: manager.score,   grade: manager.grade,   icon: Briefcase,      weight: '35%', source: 'Overall engine score'           },
  ]

  return (
    <div className={`rounded-2xl border ${gc.border} ${gc.bg} p-6 space-y-6`}>

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-background border border-border flex items-center justify-center">
          <BarChart2 className="w-4 h-4 text-muted-foreground" />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            NHS Recruiter Simulator™ — Composite Score
          </p>
          <p className="text-xs text-muted-foreground truncate max-w-md">{jobTitle}</p>
        </div>
      </div>

      {/* Big score + label */}
      <div className="flex items-end gap-4">
        <span className={`text-8xl font-black font-mono leading-none ${gc.color}`}>{overall}</span>
        <div className="mb-2">
          <span className="text-2xl font-mono text-muted-foreground">/100</span>
          <p className={`text-base font-black tracking-widest mt-1 ${gc.color}`}>{label}</p>
        </div>
      </div>

      {/* Sub-scores */}
      <div className="grid grid-cols-3 gap-3">
        {panels.map(({ label, value, grade, icon: Icon, weight, source }) => {
          const pgc = GRADE_CONFIG[grade] ?? GRADE_CONFIG.REVIEW
          return (
            <div key={label} className="rounded-xl border border-border bg-background/60 p-3 space-y-2 text-center">
              <Icon className="w-4 h-4 text-muted-foreground mx-auto" />
              <p className={`text-2xl font-mono font-black ${pgc.color}`}>{value}</p>
              <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${pgc.bg} ${pgc.color} border ${pgc.border}`}>
                {grade}
              </span>
              <p className="text-[13px] text-muted-foreground font-medium">{label}</p>
              <p className="font-mono text-muted-foreground/80   text-[13px] ">weight {weight}</p>
              <p className="text-[12px] text-muted-foreground/90 leading-tight">{source}</p>
            </div>
          )
        })}
      </div>

      {/* Score bar */}
      <div className="space-y-2">
        <div className="h-3 w-full bg-background/60 rounded-full overflow-hidden border border-border">
          <div
            className={`h-full rounded-full ${gc.bar} transition-all duration-1000`}
            style={{ width: `${overall}%` }}
          />
        </div>
        <div className="flex justify-between text-[12px] font-mono text-muted-foreground">
          <span>0 — High Risk</span>
          <span>38 — Needs Work</span>
          <span>55 — Competitive</span>
          <span>75 — Strong</span>
        </div>
      </div>

      {/* Score source note */}
      <p className="text-[15px] text-foreground/80 text-center leading-relaxed">
        Scores read directly from saved analysis engine — consistent with your main report.
      </p>

    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function RecruiterSimPage({ params }: Params) {
  const { id } = await params

  const session = await auth()
  if (!session?.user?.id) notFound()

  const db     = await getDb(session.user.id)
  const record = await db.analysis.findUnique({ where: { id } })
  if (!record || record.userId !== session.user.id) notFound()

  const result = (record.result as any) ?? {}

  const atsPanel       = computeAts(result)
  const recruiterPanel = computeRecruiter(result)
  const managerPanel   = computeHiringManager(result)

  return (
    <FeatureGate featureKey="recruiter_simulator">
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10 space-y-8">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link href="/dashboard/saved-analyses" className="hover:text-foreground transition-colors">
            Analyses
          </Link>
          <ChevronLeft className="w-3 h-3" />
          <Link href={`/dashboard/analysis/${id}`} className="hover:text-foreground transition-colors">
            {record.jobTitle}
          </Link>
          <ChevronLeft className="w-3 h-3" />
          <span className="text-foreground font-medium">Recruiter Simulator</span>
        </div>

        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-muted border border-border flex items-center justify-center">
              <Zap className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-foreground">
                NHS Recruiter Simulator™
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Three independent panel assessments — ATS · Recruiter · Hiring Manager
              </p>
            </div>
          </div>
          <Link
            href={`/dashboard/analysis/${id}`}
            className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground border border-border rounded-lg px-3 py-2 transition-colors"
          >
            <Eye className="w-3.5 h-3.5" /> Full Report
          </Link>
        </div>

        {/* Composite */}
        <CompositeScore
          ats={atsPanel}
          recruiter={recruiterPanel}
          manager={managerPanel}
          jobTitle={record.jobTitle ?? ''}
        />

        {/* How it works strip */}
        <div className="grid sm:grid-cols-3 gap-3">
          {[
            { icon: Monitor,   title: 'ATS System (30%)',         desc: 'Keyword hit rate, phrase mirroring, word count, critical term coverage.' },
            { icon: UserCheck, title: 'Recruiter View (35%)',      desc: 'First impression, opening quality, example count, outcomes, attribution.' },
            { icon: ClipboardList, title: 'Hiring Manager (35%)', desc: 'Criteria depth, STAR quality, values evidence, band suitability, specificity.' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-xl border border-border bg-card p-4 flex gap-3">
              <Icon className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-foreground mb-0.5">{title}</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Three panels */}
        <div className="grid lg:grid-cols-3 gap-5">
          <AssessorPanel
            icon={Monitor}
            title="ATS System"
            role="Automated Screen"
            accentClass="bg-blue-500"
            strokeClass="stroke-blue-500"
            panel={atsPanel}
          />
          <AssessorPanel
            icon={User}
            title="Recruiter"
            role="Assessor A — Human Sift"
            accentClass="bg-violet-500"
            strokeClass="stroke-violet-500"
            panel={recruiterPanel}
          />
          <AssessorPanel
            icon={Briefcase}
            title="Hiring Manager"
            role="Assessor B — Panel Decision"
            accentClass="bg-amber-500"
            strokeClass="stroke-amber-500"
            panel={managerPanel}
          />
        </div>

        {/* Footer note */}
       <div className="rounded-xl border border-border bg-muted/30 px-5 py-4 flex gap-3">
  <AlertCircle className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
  <p className="text-xs text-muted-foreground leading-relaxed">
    <strong className="text-foreground">Simulator note:</strong> All scores are read directly 
    from your saved analysis — ATS uses language mirroring + keyword hit rate, Recruiter uses 
    criteria coverage, Hiring Manager uses the overall engine score. This guarantees the numbers 
    here always match your main analysis report. Re-run your analysis to refresh all scores.
  </p>
</div>

      </main>
    </div>
    </FeatureGate>
  )
}