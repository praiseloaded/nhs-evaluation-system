'use client'

import Link from 'next/link'
import {
  Check,
  ArrowRight,
  ChevronDown,
  Search,
  Lock,
  Sparkles,
  Menu,
  X,
} from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { ThemeSwitcher } from '@/components/theme-switcher'
import { Navbar } from '@/components/navbar'

// ─────────────────────────────────────────────
// Auth-aware Navbar — unchanged from your existing pattern
// ─────────────────────────────────────────────


// ─────────────────────────────────────────────
// Hero signature — live scoring strip
// Demonstrates the actual product mechanism rather than
// a generic "dashboard preview" placeholder block.
// ─────────────────────────────────────────────

const SAMPLE_STATEMENT =
  "In my current role I led the safeguarding response for a complex paediatric case, working closely with the MDT to ensure the family's needs were met within 48 hours."

const SCORING_LINES = [
  { label: 'Essential criteria', detail: 'Safeguarding experience — matched against person spec', status: 'pass' as const },
  { label: 'STAR completeness', detail: 'Situation, Task, Action present — Result is implied, not stated', status: 'warn' as const },
  { label: 'NHS values alignment', detail: '"Working with the MDT" evidences Compassion and Teamwork', status: 'pass' as const },
  { label: 'Language mirroring', detail: '"Safeguarding response" lifted directly from the job description', status: 'pass' as const },
  { label: 'Specificity', detail: 'No outcome stated — what happened after the 48 hours?', status: 'fail' as const },
]

function ScoringHero() {
  const [activeLine, setActiveLine] = useState(-1)
  const [typedChars, setTypedChars] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const [hasStarted, setHasStarted] = useState(false)

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setHasStarted(true) },
      { threshold: 0.2 }
    )
    if (containerRef.current) obs.observe(containerRef.current)
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    if (!hasStarted) return
    const typeInterval = setInterval(() => {
      setTypedChars((c) => {
        if (c >= SAMPLE_STATEMENT.length) {
          clearInterval(typeInterval)
          return c
        }
        return c + 2
      })
    }, 16)
    return () => clearInterval(typeInterval)
  }, [hasStarted])

  useEffect(() => {
    if (!hasStarted || typedChars < SAMPLE_STATEMENT.length) return
    const lineInterval = setInterval(() => {
      setActiveLine((l) => {
        if (l >= SCORING_LINES.length - 1) {
          clearInterval(lineInterval)
          return l
        }
        return l + 1
      })
    }, 500)
    return () => clearInterval(lineInterval)
  }, [hasStarted, typedChars])

  const statusClasses = (s: 'pass' | 'warn' | 'fail') =>
    s === 'pass'
      ? 'bg-emerald-500'
      : s === 'warn'
        ? 'bg-amber-500'
        : 'bg-red-500'

  return (
    <div ref={containerRef} className="rounded-2xl border border-border bg-card shadow-xl dark:shadow-slate-900 ring-1 ring-black/5 dark:ring-white/5 overflow-hidden">
      {/* Form header bar */}
      <div className="flex items-center justify-between px-6 py-3.5 border-b border-border bg-muted/40">
        <span className="text-[11px] font-mono tracking-wide text-muted-foreground uppercase">
          Supporting Statement — Q2 of 3
        </span>
        <span className="text-[11px] font-mono text-muted-foreground">
          Band 6 · Safeguarding Lead
        </span>
      </div>

      {/* Statement being typed */}
      <div className="px-6 pt-6 pb-5 min-h-[108px]">
        <p className="text-[16px] text-foreground leading-relaxed">
          {SAMPLE_STATEMENT.slice(0, typedChars)}
          {typedChars < SAMPLE_STATEMENT.length && (
            <span className="inline-block w-[2px] h-[18px] bg-blue-600 ml-0.5 align-middle animate-pulse" />
          )}
        </p>
      </div>

      {/* Scoring lines */}
      <div className="border-t border-border">
        {SCORING_LINES.map((line, i) => (
          <div
            key={line.label}
            className={`flex items-start gap-3.5 px-6 py-3.5 border-b border-border/60 last:border-b-0 transition-all duration-500 ${
              i <= activeLine ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-2'
            }`}
          >
            <span className={`mt-[5px] h-[7px] w-[7px] rounded-full shrink-0 ${statusClasses(line.status)}`} />
            <div className="flex-1 min-w-0">
              <span className="text-[10.5px] font-mono uppercase tracking-wide text-muted-foreground">
                {line.label}
              </span>
              <p className="text-[13.5px] text-foreground mt-0.5 leading-snug">
                {line.detail}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Score footer */}
      <div className={`flex items-center justify-between px-6 py-5 border-t border-border bg-muted/40 transition-opacity duration-700 ${activeLine >= SCORING_LINES.length - 1 ? 'opacity-100' : 'opacity-0'}`}>
        <span className="text-[13.5px] text-muted-foreground">Shortlist probability</span>
        <span className="text-[24px] font-bold font-mono text-amber-600 dark:text-amber-400">62%</span>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────
export default function HomePage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => { setLoaded(true) }, [])

  const faqItems = [
    {
      question: 'How is the score actually calculated?',
      answer:
        'Five dimensions, each weighted: essential criteria coverage, STAR completeness, NHS values alignment, language mirroring against the person specification, and specificity of evidence. No single AI guess — a deterministic breakdown you can audit line by line.',
    },
    {
      question: 'Will this write my statement for me?',
      answer:
        'It drafts from your real evidence, stored in your EvidenceVault, but the final statement is yours to edit. We score honestly — including telling you when a claim has no evidence behind it.',
    },
    {
      question: 'Is my data secure?',
      answer:
        'Encrypted in transit and at rest. We do not sell or share applicant data. Your CV, statements, and evidence stay private to your account.',
    },
    {
      question: 'Does this work for NHS Scotland, Wales, and Northern Ireland?',
      answer:
        'Yes. The Statement Builder auto-detects the nation from the employer name and adjusts the question format, values framework, and word limits — including the three-question Jobtrain format used in Scotland.',
    },
    {
      question: 'What if this is my first NHS application?',
      answer:
        'Career GPS maps the fastest route to your target band, including which certificates and experience you are missing — useful whether this is your first application or your fifth promotion.',
    },
  ]

  const pricingPlans = [
    {
      name: 'Free',
      price: '£0',
      period: 'forever',
      description: 'One full analysis, no card required',
      features: [
        '1 job analysis',
        'Criteria & values scoring',
        'Basic shortlist probability',
        'NHS jobs search',
      ],
    },
    {
      name: 'Pro',
      price: '£19',
      period: 'per month',
      description: 'For active applicants',
      featured: true,
      features: [
        'Unlimited analyses',
        'Full 5-dimension breakdown',
        'EvidenceVault & STAR builder',
        'Interview simulator',
        'Career GPS & band mapping',
        'PDF reports',
      ],
    },
    {
      name: 'Trust',
      price: 'Custom',
      period: 'for organisations',
      description: 'For recruitment teams and colleges',
      features: [
        'Bulk candidate evaluation',
        'Custom scoring frameworks',
        'Cohort analytics',
        'Dedicated support',
        'SSO & audit trails',
      ],
    },
  ]

  const dimensions = [
    { n: '1', name: 'Essential criteria', desc: 'Every mandatory requirement checked against your statement, line by line.' },
    { n: '2', name: 'STAR completeness', desc: 'Situation, Task, Action, Result — flagged when any element is missing or implied.' },
    { n: '3', name: 'NHS values alignment', desc: 'Compassion, respect, teamwork — matched to specific, evidenced examples.' },
    { n: '4', name: 'Language mirroring', desc: 'Terminology lifted directly from the person specification, not paraphrased.' },
    { n: '5', name: 'Specificity', desc: 'Vague claims are surfaced and challenged — "improved patient care" is not evidence.' },
  ]

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden py-20 sm:py-28">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-slate-50 dark:from-slate-900 dark:to-slate-800" />
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-200 dark:bg-blue-900 rounded-full blur-3xl opacity-10 pointer-events-none" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

          <div className={`max-w-2xl mb-14 transition-all duration-700 ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950 mb-7">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-[13px] font-semibold text-blue-600 dark:text-blue-400">
                Built on NHS shortlisting methodology
              </span>
            </div>

            <h1 className="text-5xl sm:text-6xl font-bold text-foreground mb-6 leading-[1.06] tracking-tight">
              Know your score{' '}
              <span className="text-blue-600 dark:text-blue-400">before</span>{' '}
              the panel does.
            </h1>

            <p className="text-lg text-muted-foreground dark:text-slate-400 mb-9 max-w-xl leading-relaxed">
              We score your NHS supporting statement the way a real shortlisting panel would — five dimensions, evidence-checked, with the exact gaps named.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/register"
                className="px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-[15px] transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
              >
                Score your first statement — free
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="#method"
                className="px-8 py-3.5 rounded-xl border border-border text-foreground font-semibold text-[15px] hover:bg-accent dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
              >
                See the method
                <ChevronDown className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* Scoring strip + stat rail */}
          <div className={`grid lg:grid-cols-[minmax(0,560px)_1fr] gap-10 lg:gap-14 items-start transition-all duration-700 delay-150 ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}>
            <ScoringHero />

            <div className="grid grid-cols-3 lg:grid-cols-1 gap-6 lg:gap-8 lg:pt-3">
              <div className="rounded-xl border border-border bg-background/80 backdrop-blur px-4 py-4 lg:px-5 lg:py-5 lg:flex lg:items-center lg:gap-4">
                <p className="text-2xl lg:text-3xl font-bold text-foreground mb-0.5 lg:mb-0">5</p>
                <p className="text-[12px] text-muted-foreground leading-snug">scored dimensions, run on every statement</p>
              </div>
              <div className="rounded-xl border border-border bg-background/80 backdrop-blur px-4 py-4 lg:px-5 lg:py-5 lg:flex lg:items-center lg:gap-4">
                <p className="text-2xl lg:text-3xl font-bold text-foreground mb-0.5 lg:mb-0">4</p>
                <p className="text-[12px] text-muted-foreground leading-snug">UK nations, including NHS Scotland's Jobtrain format</p>
              </div>
              <div className="rounded-xl border border-border bg-background/80 backdrop-blur px-4 py-4 lg:px-5 lg:py-5 lg:flex lg:items-center lg:gap-4">
                <p className="text-2xl lg:text-3xl font-bold text-foreground mb-0.5 lg:mb-0">2–8a</p>
                <p className="text-[12px] text-muted-foreground leading-snug">Agenda for Change bands, mapped end to end</p>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ── NHS Jobs Search Banner ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 relative z-10">
        <Link
          href="/jobs"
          className="group block rounded-2xl border border-border bg-card shadow-md hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-700 p-5 sm:p-6 transition-all duration-200"
        >
          <div className="flex items-center justify-between gap-6 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Search className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-[15px] font-semibold text-foreground flex items-center gap-2">
                  Search live NHS jobs
                  <span className="text-[10px] font-bold bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full">
                    NEW
                  </span>
                </h3>
                <p className="text-[13px] text-muted-foreground mt-0.5">
                  Browse vacancies across England, Wales, NI and Scotland — then get instant AI analysis.
                </p>
              </div>
            </div>
            <span className="flex items-center gap-1 text-[13px] font-semibold text-blue-600 dark:text-blue-400 shrink-0">
              Browse jobs
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </div>
        </Link>
      </section>

      {/* ── Method / Five dimensions ── */}
      <section id="method" className="py-20 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-14">
            <span className="text-[13px] font-mono uppercase tracking-widest text-blue-600 dark:text-blue-400">The method</span>
            <h2 className="text-4xl sm:text-5xl font-bold text-foreground mt-3 mb-4 tracking-tight">
              Five dimensions. No guessing.
            </h2>
            <p className="text-lg text-muted-foreground dark:text-slate-400 leading-relaxed">
              Every statement is run against the same rubric a clinical shortlisting panel uses — so your score means something, and the gaps are specific enough to act on.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-5">
            {dimensions.map((d) => (
              <div
                key={d.n}
                className="rounded-xl border border-border bg-background p-6 hover:shadow-md hover:border-blue-200 dark:hover:border-blue-800 transition-all duration-200"
              >
                <span className="text-[13px] font-mono font-semibold text-blue-600 dark:text-blue-400">{d.n}</span>
                <h3 className="text-[16px] font-semibold text-foreground mt-3 mb-2 leading-snug">
                  {d.name}
                </h3>
                <p className="text-[13.5px] text-muted-foreground dark:text-slate-400 leading-relaxed">
                  {d.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Evidence-first philosophy ── */}
      <section className="py-20 sm:py-32 bg-slate-50 dark:bg-slate-900/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-14 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950 mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                <span className="text-[12px] font-semibold text-amber-700 dark:text-amber-400">
                  Evidence, not invention
                </span>
              </div>
              <h2 className="text-4xl font-bold text-foreground mb-5 tracking-tight leading-tight">
                We will tell you when a claim has nothing behind it.
              </h2>
              <p className="text-[15px] text-muted-foreground dark:text-slate-400 mb-8 leading-relaxed">
                Most tools generate confident-sounding statements regardless of whether you actually have the evidence. We do the opposite: every claim is checked against your stored evidence, and unsupported claims are flagged, not hidden.
              </p>

              <ul className="space-y-3">
                {[
                  'Evidence stored once, reused across every application',
                  'Unsupported claims flagged before you submit, not after rejection',
                  'Real interview question practice, scored the same way',
                  'A band-by-band map of what you are missing for promotion',
                ].map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <span className="text-[14px] text-foreground font-medium">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-border bg-background p-7">
              <div className="flex items-center justify-between mb-5 pb-5 border-b border-border">
                <span className="text-[11px] font-mono uppercase tracking-wide text-muted-foreground">Evidence check</span>
                <Lock className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <div className="space-y-5">
                <div className="flex items-start gap-3">
                  <span className="h-[7px] w-[7px] rounded-full bg-emerald-500 mt-[6px] shrink-0" />
                  <div>
                    <p className="text-[14px] text-foreground font-medium">"Led the MDT safeguarding response"</p>
                    <p className="text-[12.5px] text-muted-foreground mt-0.5">Backed by 2 STAR examples in your vault</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="h-[7px] w-[7px] rounded-full bg-red-500 mt-[6px] shrink-0" />
                  <div>
                    <p className="text-[14px] text-foreground font-medium">"Significantly improved patient outcomes"</p>
                    <p className="text-[12.5px] text-muted-foreground mt-0.5">No supporting evidence found — name a specific result</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="h-[7px] w-[7px] rounded-full bg-emerald-500 mt-[6px] shrink-0" />
                  <div>
                    <p className="text-[14px] text-foreground font-medium">"Mentored two newly qualified nurses"</p>
                    <p className="text-[12.5px] text-muted-foreground mt-0.5">Matches reference vault entry, March 2025</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="py-20 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="text-[13px] font-mono uppercase tracking-widest text-blue-600 dark:text-blue-400">Pricing</span>
            <h2 className="text-4xl sm:text-5xl font-bold text-foreground mt-3 mb-4 tracking-tight">
              Start free. Upgrade when it counts.
            </h2>
            <p className="text-lg text-muted-foreground dark:text-slate-400 max-w-xl mx-auto">
              No hidden fees. Cancel any time.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {pricingPlans.map((tier, idx) => (
              <div
                key={idx}
                className={`rounded-2xl border-2 p-8 transition-all ${
                  tier.featured
                    ? 'border-blue-600 dark:border-blue-500 bg-gradient-to-b from-blue-50 to-white dark:from-blue-950 dark:to-slate-900 shadow-xl shadow-blue-600/10'
                    : 'border-border bg-background'
                }`}
              >
                {tier.featured && (
                  <div className="mb-4 inline-flex px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 text-[12px] font-semibold">
                    Recommended
                  </div>
                )}

                <h3 className="text-xl font-bold text-foreground mb-1">{tier.name}</h3>
                <p className="text-[13px] text-muted-foreground mb-6">{tier.description}</p>

                <div className="mb-6 flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-foreground">{tier.price}</span>
                  <span className="text-[13px] text-muted-foreground">{tier.period}</span>
                </div>

                <Link
                  href="/register"
                  className={`block w-full py-2.5 rounded-xl font-semibold text-[14px] text-center mb-8 transition-all ${
                    tier.featured
                      ? 'bg-blue-600 hover:bg-blue-700 text-white shadow shadow-blue-600/30'
                      : 'border border-border text-foreground hover:bg-accent dark:hover:bg-slate-800'
                  }`}
                >
                  Get started
                </Link>

                <ul className="space-y-3">
                  {tier.features.map((feature, fidx) => (
                    <li key={fidx} className="flex items-start gap-3">
                      <div className="w-4 h-4 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="h-2.5 w-2.5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <span className="text-[13px] text-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-20 sm:py-32 bg-slate-50 dark:bg-slate-900/50">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="text-[13px] font-mono uppercase tracking-widest text-blue-600 dark:text-blue-400">Questions</span>
            <h2 className="text-4xl sm:text-5xl font-bold text-foreground mt-3 mb-4 tracking-tight">
              Before you start
            </h2>
          </div>

          <div className="space-y-3">
            {faqItems.map((item, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-border bg-background overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-accent dark:hover:bg-slate-800 transition-colors text-left text-[14px] font-semibold text-foreground gap-4"
                >
                  {item.question}
                  <ChevronDown
                    className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200 ${
                      openFaq === idx ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {openFaq === idx && (
                  <div className="px-6 pb-5 text-[14px] text-muted-foreground dark:text-slate-400 leading-relaxed border-t border-border pt-4">
                    {item.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-gradient-to-br from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-800 p-12 sm:p-16 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative">
              <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4 tracking-tight">
                Your next statement deserves a real score.
              </h2>
              <p className="text-lg text-blue-100 mb-10 max-w-xl mx-auto leading-relaxed">
                Free for your first analysis. No card. Five minutes to find out what the panel will see.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="/register"
                  className="px-8 py-3.5 rounded-xl bg-white text-blue-600 font-semibold text-[15px] hover:bg-blue-50 transition-colors flex items-center justify-center gap-2 shadow-lg"
                >
                  Score your statement
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/jobs"
                  className="px-8 py-3.5 rounded-xl border-2 border-white/40 text-white font-semibold text-[15px] hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
                >
                  Browse NHS jobs
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border bg-slate-50 dark:bg-slate-900 py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-10 mb-12">
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <div className="h-8 w-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-semibold text-[11px] tracking-wide">
                  NHS
                </div>
                <span className="font-semibold text-[15px] text-foreground">JobReady AI</span>
              </div>
              <p className="text-[13px] text-muted-foreground dark:text-slate-400 leading-relaxed">
                Know your score before the panel does.
              </p>
            </div>

            {[
              {
                heading: 'Product',
                links: ['Method', 'Pricing', 'Browse jobs'],
                hrefs: ['/#method', '/#pricing', '/jobs'],
              },
              {
                heading: 'Company',
                links: ['About', 'Contact'],
                hrefs: ['#', '#'],
              },
              {
                heading: 'Legal',
                links: ['Privacy', 'Terms'],
                hrefs: ['#', '#'],
              },
            ].map((col) => (
              <div key={col.heading}>
                <h4 className="text-[13px] font-semibold text-foreground mb-4">{col.heading}</h4>
                <ul className="space-y-2.5">
                  {col.links.map((link, i) => (
                    <li key={link}>
                      <Link
                        href={col.hrefs[i]}
                        className="text-[13px] text-muted-foreground dark:text-slate-400 hover:text-foreground transition-colors"
                      >
                        {link}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="border-t border-border pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-[12px] text-muted-foreground dark:text-slate-400">
              © {new Date().getFullYear()} NHS JobReady AI. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}