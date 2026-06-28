'use client'

import Link from 'next/link'
import { Check, ArrowRight, ChevronDown, Search, FlaskConical, Flame, Globe, Zap, MessageCircle, FolderOpen, Shield, Star, TrendingUp } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { Navbar } from '@/components/navbar'
import { HomepageChatWidget } from '@/components/homepage-chat-widget'

// ── Scoring demo ───────────────────────────────────────────────────────────────

const SAMPLE_STATEMENT =
  "In my current role I led the safeguarding response for a complex paediatric case, working closely with the MDT to ensure the family's needs were met within 48 hours."

const SCORING_LINES = [
  { label: 'Essential criteria',   detail: 'Safeguarding experience — matched against person spec',                       status: 'pass' as const },
  { label: 'STAR completeness',    detail: 'Situation, Task, Action present — Result is implied, not stated',             status: 'warn' as const },
  { label: 'NHS values alignment', detail: '"Working with the MDT" evidences Compassion and Teamwork',                    status: 'pass' as const },
  { label: 'Language mirroring',   detail: '"Safeguarding response" lifted directly from the job description',            status: 'pass' as const },
  { label: 'Specificity',          detail: 'No outcome stated — what happened after the 48 hours?',                      status: 'fail' as const },
]

function ScoringDemo() {
  const [activeLine,  setActiveLine]  = useState(-1)
  const [typedChars,  setTypedChars]  = useState(0)
  const [hasStarted,  setHasStarted]  = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setHasStarted(true) },
      { threshold: 0.2 }
    )
    if (containerRef.current) obs.observe(containerRef.current)
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    if (!hasStarted) return
    const t = setInterval(() => setTypedChars(c => {
      if (c >= SAMPLE_STATEMENT.length) { clearInterval(t); return c }
      return c + 2
    }), 16)
    return () => clearInterval(t)
  }, [hasStarted])

  useEffect(() => {
    if (!hasStarted || typedChars < SAMPLE_STATEMENT.length) return
    const t = setInterval(() => setActiveLine(l => {
      if (l >= SCORING_LINES.length - 1) { clearInterval(t); return l }
      return l + 1
    }), 500)
    return () => clearInterval(t)
  }, [hasStarted, typedChars])

  return (
    <div ref={containerRef} className="rounded-2xl border border-border bg-card shadow-2xl shadow-blue-500/5 overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-border bg-muted/40">
        <div className="flex gap-1.5">
          <span className="w-3 h-3 rounded-full bg-red-400" />
          <span className="w-3 h-3 rounded-full bg-amber-400" />
          <span className="w-3 h-3 rounded-full bg-emerald-400" />
        </div>
        <span className="text-[11px] font-mono tracking-wide text-muted-foreground mx-auto">Supporting Statement — Recruiter Analysis</span>
      </div>

      <div className="px-6 pt-5 pb-4 min-h-[90px]">
        <p className="text-[15px] text-foreground leading-relaxed">
          {SAMPLE_STATEMENT.slice(0, typedChars)}
          {typedChars < SAMPLE_STATEMENT.length && (
            <span className="inline-block w-[2px] h-[16px] bg-blue-500 ml-0.5 align-middle animate-pulse" />
          )}
        </p>
      </div>

      <div className="border-t border-border">
        {SCORING_LINES.map((line, i) => (
          <div key={i} className={`flex items-start gap-3 px-5 py-3 border-b border-border/60 last:border-0 transition-all duration-500 ${i <= activeLine ? 'opacity-100' : 'opacity-0'}`}>
            <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${line.status === 'pass' ? 'bg-emerald-500' : line.status === 'warn' ? 'bg-amber-400' : 'bg-red-500'}`} />
            <div>
              <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{line.label}</p>
              <p className="text-[13px] text-foreground leading-snug mt-0.5">{line.detail}</p>
            </div>
          </div>
        ))}
      </div>

      <div className={`flex items-center justify-between px-5 py-4 border-t border-border bg-muted/40 transition-opacity duration-700 ${activeLine >= SCORING_LINES.length - 1 ? 'opacity-100' : 'opacity-0'}`}>
        <span className="text-[12px] text-muted-foreground font-medium">Shortlist probability Score</span>
        <span className="text-[22px] font-black font-mono text-amber-500">62%</span>
      </div>
    </div>
  )
}

// ── Moat features ──────────────────────────────────────────────────────────────

const MOATS = [
  {
    icon:    FlaskConical,
    label:   'Statement A/B Testing',
    tagline: 'Know which version to submit',
    desc:    'Score two supporting statements in parallel. AI compares every dimension — criteria coverage, STAR quality, NHS values, language mirroring — and tells you exactly why one wins.',
    color:   'text-violet-600 dark:text-violet-400',
    bg:      'bg-violet-50 dark:bg-violet-950/30',
    border:  'border-violet-200 dark:border-violet-800',
    badge:   'bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300',
    detail:  ['Parallel scoring across 5 dimensions', 'Dimension-by-dimension comparison', 'Quick wins for the winner', 'Full history saved'],
  },
  {
    icon:    Flame,
    label:   'Shortlist Intelligence™',
    tagline: 'See through the recruiter\'s eyes',
    desc:    'Goes beyond listing criteria. Reveals how the panel actually scores them — hidden criteria, recruiter heat map, exactly what evidence earns full marks vs zero.',
    color:   'text-red-600 dark:text-red-400',
    bg:      'bg-red-50 dark:bg-red-950/30',
    border:  'border-red-200 dark:border-red-800',
    badge:   'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300',
    detail:  ['Hidden criteria detection', '🔴 Critical / 🟡 Important heat map', 'Scoring guide per criterion', 'STAR opportunity finder'],
  },
  {
    icon:    FolderOpen,
    label:   'EvidenceVault™ Auto-Pull',
    tagline: 'Write once, apply everywhere',
    desc:    'Store your best STAR examples once. When you apply for any role, AI automatically matches your evidence to each criterion — review, approve, and your application is pre-filled.',
    color:   'text-blue-600 dark:text-blue-400',
    bg:      'bg-blue-50 dark:bg-blue-950/30',
    border:  'border-blue-200 dark:border-blue-800',
    badge:   'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300',
    detail:  ['AI matches vault to criteria', 'Match strength 1–10 score', 'Auto-approves strong matches', 'Usage tracking per entry'],
  },
  {
    icon:    Globe,
    label:   'COS & Sponsorship Navigator',
    tagline: 'Built for overseas applicants',
    desc:    'Instantly check whether an NHS role is likely to offer visa sponsorship. Health & Care Worker vs Skilled Worker visa eligibility, salary thresholds, trust profiles, and a full action plan.',
    color:   'text-cyan-600 dark:text-cyan-400',
    bg:      'bg-cyan-50 dark:bg-cyan-950/30',
    border:  'border-cyan-200 dark:border-cyan-800',
    badge:   'bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300',
    detail:  ['Sponsorship likelihood score', 'Shortage Occupation List check', 'NMC/HCPC registration timeline', 'Salary threshold verification'],
  },
  {
    icon:    MessageCircle,
    label:   'Mentorship',
    tagline: 'A direct line to the team',
    desc:    'Ask questions about your application, interview preparation, or career strategy and get a direct reply. Not a chatbot — a real conversation with the OmniJobReady team.',
    color:   'text-emerald-600 dark:text-emerald-400',
    bg:      'bg-emerald-50 dark:bg-emerald-950/30',
    border:  'border-emerald-200 dark:border-emerald-800',
    badge:   'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300',
    detail:  ['Direct messaging inbox', 'Threaded conversations', 'Unread notifications', 'Available on Pro & Elite'],
  },
]

// ── Pricing ────────────────────────────────────────────────────────────────────

const PLANS = [
  {
    name:     'Free',
    price:    '£0',
    period:   'forever',
    desc:     'One full analysis, no card required',
    features: ['1 job analysis', 'Criteria & values scoring', 'Basic shortlist probability', 'NHS jobs search'],
  },
  {
    name:     'Pro',
    price:    '£19',
    period:   '/month',
    desc:     'For active NHS applicants',
    featured: true,
    features: ['Unlimited analyses', 'A/B Statement Testing', 'EvidenceVault™ Auto-Pull', 'Interview Simulator', 'Career GPS™', 'Mentorship access'],
  },
  {
    name:     'Elite',
    price:    '£39',
    period:   '/month',
    desc:     'Full platform, no limits',
    features: ['Everything in Pro', 'Shortlist Intelligence™', 'COS Navigator', 'Priority mentorship', 'PDF reports', 'Dedicated support'],
  },
]

// ── FAQ ────────────────────────────────────────────────────────────────────────

const FAQS = [
  {
    q: 'How is the score actually calculated?',
    a: 'Five dimensions, each weighted: essential criteria coverage, STAR completeness, NHS values alignment, language mirroring against the person specification, and specificity of evidence. No single AI guess — a deterministic breakdown you can audit line by line.',
  },
  {
    q: 'What makes this different from ChatGPT or other AI tools?',
    a: 'Generic AI has no knowledge of NHS shortlisting methodology, band-specific expectations, or what recruiters actually score. Every feature here is built specifically for NHS recruitment — the criteria extraction, STAR enforcement, visa intelligence, and sponsorship data are all NHS-specific.',
  },
  {
    q: 'Can it help overseas nurses or doctors applying to the NHS?',
    a: 'Yes — the COS & Sponsorship Navigator is built specifically for this. It analyses any NHS role for sponsorship likelihood, checks visa route eligibility, verifies salary thresholds against Home Office requirements, and maps out your NMC or HCPC registration timeline.',
  },
  {
    q: 'Will it write my statement for me?',
    a: 'The Statement Builder drafts from your real evidence stored in the EvidenceVault — but the final statement is yours to edit. We score honestly, including flagging when a claim has no evidence behind it.',
  },
  {
    q: 'Does this work for NHS Scotlands Jobtrain format?',
    a: 'Yes. The Statement Builder auto-detects the nation from the employer name and adjusts for Scotland\'s three-question Jobtrain format, the NHS Scotland values framework, and the 500-word limit per question.',
  },
  {
    q: 'Is my data secure?',
    a: 'Encrypted in transit and at rest. We do not sell or share applicant data. Your CV, statements, and evidence stay private to your account.',
  },
]

// ── Page ──────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [loaded,  setLoaded]  = useState(false)

  useEffect(() => { setLoaded(true) }, [])

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden pt-20 pb-24 sm:pt-28 sm:pb-32">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-blue-50/80 via-background to-background dark:from-blue-950/20 dark:via-background" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-blue-400/10 dark:bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

          {/* Badge */}
          <div className={`flex justify-center mb-8 transition-all duration-700 ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/50">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-[12px] font-semibold text-blue-600 dark:text-blue-400">NHS Career Operating System — not just an AI writer</span>
            </div>
          </div>

          {/* Headline */}
          <div className={`text-center max-w-4xl mx-auto mb-8 transition-all duration-700 delay-75 ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-foreground leading-[1.04] tracking-tight mb-6">
              Get shortlisted.<br />
              <span className="bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
                Not overlooked.
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              The AI platform built on NHS shortlisting methodology. Score your statement, find hidden criteria, match your evidence automatically, and know your sponsorship chances — before you submit.
            </p>
          </div>

          {/* CTAs */}
          <div className={`flex flex-col sm:flex-row gap-3 justify-center mb-16 transition-all duration-700 delay-150 ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
            <Link href="/register"
              className="px-7 py-3.5 rounded-xl bg-gradient-to-br from-red-500 to-amber-500 hover:bg-blue-700 text-white font-bold text-[15px] transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25">
              Start free <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="#features"
              className="px-7 py-3.5 rounded-xl border border-border text-foreground font-semibold text-[15px] hover:bg-muted transition-colors flex items-center justify-center gap-2">
              See all features
            </Link>
          </div>

          {/* Hero demo + stats */}
          <div className={`grid lg:grid-cols-[1fr_340px] gap-8 items-start max-w-5xl mx-auto transition-all duration-700 delay-200 ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}>
            <ScoringDemo />

            <div className="space-y-4">
              {[
                { n: '5',      label: 'scoring dimensions on every statement'              },
                { n: '4',      label: 'UK nations including NHS Scotland Jobtrain format'  },
                { n: 'Band\n2–8', label: 'Agenda for Change bands, mapped end to end'     },
                { n: '5',      label: 'exclusive moat features competitors can\'t copy'   },
              ].map(({ n, label }) => (
                <div key={label} className="rounded-2xl border border-border bg-card px-5 py-4 flex items-center gap-4">
                  <p className="text-2xl font-black text-blue-600 dark:text-blue-400 shrink-0 whitespace-pre-line leading-tight">{n}</p>
                  <p className="text-[12px] text-muted-foreground leading-snug">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── NHS Jobs search ── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-4 relative z-10 mb-6">
        <Link href="/jobs"
          className="group block rounded-2xl border border-border bg-card hover:border-blue-300 dark:hover:border-blue-700 p-5 transition-all shadow-sm hover:shadow-md">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 flex items-center justify-center shrink-0">
                <Search className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-[14px] font-semibold text-foreground flex items-center gap-2">
                  Search live NHS vacancies
                  <span className="text-[9px] font-black bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full">LIVE</span>
                </p>
                <p className="text-[12px] text-muted-foreground">England, Wales, NI and Scotland — then analyse instantly</p>
              </div>
            </div>
            <span className="flex items-center gap-1 text-[13px] font-semibold text-blue-600 dark:text-blue-400">
              Browse jobs <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </div>
        </Link>
      </section>

      {/* ── Five moat features ── */}
      <section id="features" className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

          <div className="text-center max-w-3xl mx-auto mb-16">
            <p className="text-[12px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-3">Five exclusive features</p>
            <h2 className="text-4xl sm:text-5xl font-black text-foreground tracking-tight mb-4">
              What no other NHS tool has
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Most competitors have a statement generator and an interview question list. OmniJobReady AI™ has five features built from the ground up that cannot be recreated by prompting ChatGPT.
            </p>
          </div>

          <div className="space-y-5">
            {MOATS.map((m, i) => {
              const Icon = m.icon
              return (
                <div key={i} className={`rounded-2xl border ${m.border} ${m.bg} p-6 sm:p-8`}>
                  <div className="grid sm:grid-cols-[1fr_auto] gap-6 items-start">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl border ${m.border} bg-background flex items-center justify-center shrink-0`}>
                          <Icon className={`w-5 h-5 ${m.color}`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-[15px] font-black text-foreground">{m.label}</h3>
                            <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${m.badge}`}>PRO+</span>
                          </div>
                          <p className={`text-[12px] font-semibold ${m.color}`}>{m.tagline}</p>
                        </div>
                      </div>
                      <p className="text-[14px] text-foreground/80 leading-relaxed max-w-xl">{m.desc}</p>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-1 gap-2 shrink-0 sm:w-56">
                      {m.detail.map((d, j) => (
                        <div key={j} className="flex items-start gap-2 text-[12px] text-foreground/70">
                          <Check className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${m.color}`} />
                          {d}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="text-center mt-10">
            <Link href="/register"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-foreground text-background font-bold text-[14px] hover:opacity-90 transition-opacity">
              Access all features <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Five scoring dimensions ── */}
      <section id="method" className="py-24 sm:py-32 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mb-14">
            <p className="text-[12px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-3">The method</p>
            <h2 className="text-4xl sm:text-5xl font-black text-foreground tracking-tight mb-4">
              Five dimensions. No guessing.
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Every statement is assessed against the same criteria used by NHS shortlisting panels — a meaningful score and actionable feedback on where to improve.
            </p>
          </div>

          <div className="grid md:grid-cols-5 gap-4">
            {[
              { n: '01', name: 'Essential criteria',   desc: 'Every mandatory requirement checked against your statement, line by line.' },
              { n: '02', name: 'STAR completeness',    desc: 'Every example checked for Situation, Task, Action, and Result. Missing parts highlighted.' },
              { n: '03', name: 'NHS values alignment', desc: 'Matched to specific evidenced examples using the values framework for your nation.' },
              { n: '04', name: 'Language mirroring',   desc: 'Uses exact terminology from the person specification — not generic alternatives.' },
              { n: '05', name: 'Specificity',          desc: 'Vague claims flagged and challenged. Evidence must be concrete, named, and measurable.' },
            ].map(d => (
              <div key={d.n} className="rounded-2xl border border-border bg-card p-6 hover:border-blue-200 dark:hover:border-blue-800 transition-colors">
                <p className="text-[11px] font-black text-blue-600 dark:text-blue-400 font-mono mb-4">{d.n}</p>
                <h3 className="text-[14px] font-black text-foreground mb-2 leading-snug">{d.name}</h3>
                <p className="text-[12px] text-muted-foreground leading-relaxed">{d.desc}</p>
              </div>
            ))}
          </div>

          {/* Shortlist Probability callout */}
          <div className="mt-8 rounded-2xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 p-7 flex items-center justify-between gap-6 flex-wrap">
            <div className="max-w-xl">
              <p className="text-[11px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1.5">Shortlist Probability™</p>
              <p className="text-[15px] text-foreground font-semibold leading-relaxed">
                See your likely shortlisting outcome — broken down across 7 scoring factors with clear actions to improve each one.
              </p>
            </div>
            <Link href="/register"
              className="shrink-0 px-6 py-3 rounded-xl bg-gradient-to-br from-red-500 to-amber-500 hover:bg-blue-700 text-white font-bold text-[13px] transition-colors flex items-center gap-2 shadow-md shadow-blue-500/20">
              Predict my chances <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Evidence first ── */}
      <section className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-14 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50 mb-6">
                <Shield className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span className="text-[12px] font-semibold text-amber-700 dark:text-amber-400">Evidence, not assumptions</span>
              </div>
              <h2 className="text-4xl font-black text-foreground tracking-tight leading-tight mb-5">
                We flag claims that aren't backed by evidence.
              </h2>
              <p className="text-[15px] text-muted-foreground mb-8 leading-relaxed">
                Most tools generate confident-sounding statements regardless of whether you have the evidence. We do the opposite — every claim is checked against your stored evidence, and unsupported claims are flagged before they cost you an interview.
              </p>
              <ul className="space-y-3">
                {[
                  'Evidence stored once, reused across every application',
                  'Unsupported claims flagged before you submit, not after rejection',
                  'STAR structure enforced — no "I am eager to" fillers allowed',
                  'Band-by-band map of what you\'re missing for promotion',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <span className="text-[14px] text-foreground font-medium">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Evidence check card */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-lg">
              <div className="flex items-center justify-between mb-5 pb-4 border-b border-border">
                <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Evidence check</span>
                <span className="text-[10px] font-semibold text-muted-foreground">3 claims analysed</span>
              </div>
              <div className="space-y-5">
                {[
                  { dot: 'bg-emerald-500', claim: '"Led the MDT safeguarding response"', note: 'Backed by 2 STAR examples in your vault', ok: true },
                  { dot: 'bg-red-500',     claim: '"Significantly improved patient outcomes"', note: 'No supporting evidence found — name a specific result', ok: false },
                  { dot: 'bg-emerald-500', claim: '"Mentored two newly qualified nurses"', note: 'Matches vault entry, March 2025', ok: true },
                ].map((r, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${r.dot}`} />
                    <div>
                      <p className="text-[13px] font-semibold text-foreground">{r.claim}</p>
                      <p className={`text-[11.5px] mt-0.5 ${r.ok ? 'text-muted-foreground' : 'text-red-500 dark:text-red-400'}`}>{r.note}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-5 pt-4 border-t border-border flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">Evidence coverage</span>
                <span className="text-[14px] font-black text-amber-500">67%</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="py-24 sm:py-32 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-[12px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-3">Pricing</p>
            <h2 className="text-4xl sm:text-5xl font-black text-foreground tracking-tight mb-4">
              Start free. Upgrade when it counts.
            </h2>
            <p className="text-lg text-muted-foreground">No hidden fees. Cancel any time.</p>
          </div>

              {/* Pricing cards */}
          <div className="grid lg:grid-cols-3 gap-5 max-w-5xl mx-auto">

            {/* Free */}
            <div className="rounded-2xl border-2 border-border bg-card p-7 flex flex-col">
              <div className="mb-6">
                <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-2">Free</p>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-4xl font-black text-foreground">£0</span>
                  <span className="text-[12px] text-muted-foreground">forever</span>
                </div>
                <p className="text-[12px] text-muted-foreground">One full analysis, no card needed</p>
              </div>
              <Link href="/register"
                className="block w-full py-2.5 rounded-xl font-bold text-[13px] text-center border border-border hover:bg-muted transition-colors mb-6">
                Get started free
              </Link>
              <div className="space-y-3 flex-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Includes</p>
                {[
                  ["1 job analysis", true],
                  ["5-dimension scoring", true],
                  ["Criteria & values check", true],
                  ["Shortlist probability", true],
                  ["NHS jobs search", true],
                  ["Statement A/B Testing", false],
                  ["EvidenceVault™ Auto-Pull", false],
                  ["Interview Simulator", false],
                  ["Career GPS™", false],
                  ["Mentorship", false],
                ].map(([f, ok], j) => (
                  <div key={j} className={`flex items-center gap-2.5 text-[12.5px] ${ok ? "text-foreground" : "text-muted-foreground/40 line-through"}`}>
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${ok ? "bg-emerald-100 dark:bg-emerald-950/50" : "bg-muted"}`}>
                      {ok
                        ? <Check className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
                        : <span className="w-1.5 h-px bg-muted-foreground/30 block" />
                      }
                    </div>
                    {f}
                  </div>
                ))}
              </div>
            </div>

            {/* Pro */}
            <div className="rounded-2xl border-2 border-blue-600 dark:border-blue-500 bg-blue-50/40 dark:bg-blue-950/20 p-7 flex flex-col relative shadow-xl shadow-blue-500/10">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <span className="bg-gradient-to-br from-red-500 to-amber-500 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-md">
                  Most popular
                </span>
              </div>
              <div className="mb-6">
                <p className="text-[11px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-2">Pro</p>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-4xl font-black text-foreground">£19</span>
                  <span className="text-[12px] text-muted-foreground">/month</span>
                </div>
                <p className="text-[12px] text-muted-foreground">For active NHS applicants</p>
              </div>
              <Link href="/register"
                className="block w-full py-2.5 rounded-xl font-bold text-[13px] text-center bg-gradient-to-br from-red-500 to-amber-500 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 transition-colors mb-6">
                Start Pro
              </Link>
              <div className="space-y-3 flex-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Everything in Free, plus</p>
                {[
                  ["Unlimited analyses", "bg-blue-100 dark:bg-blue-950/50", "text-blue-600 dark:text-blue-400"],
                  ["Statement A/B Testing", "bg-blue-100 dark:bg-blue-950/50", "text-blue-600 dark:text-blue-400"],
                  ["EvidenceVault™ Auto-Pull", "bg-blue-100 dark:bg-blue-950/50", "text-blue-600 dark:text-blue-400"],
                  ["Interview Simulator", "bg-blue-100 dark:bg-blue-950/50", "text-blue-600 dark:text-blue-400"],
                  ["Career GPS™ band mapping", "bg-blue-100 dark:bg-blue-950/50", "text-blue-600 dark:text-blue-400"],
                  ["Mentorship inbox", "bg-blue-100 dark:bg-blue-950/50", "text-blue-600 dark:text-blue-400"],
                  ["PDF analysis reports", "bg-blue-100 dark:bg-blue-950/50", "text-blue-600 dark:text-blue-400"],
                ].map(([f, bg, color], j) => (
                  <div key={j} className="flex items-center gap-2.5 text-[12.5px] text-foreground">
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${bg}`}>
                      <Check className={`w-2.5 h-2.5 ${color}`} />
                    </div>
                    {f}
                  </div>
                ))}
              </div>
            </div>

            {/* Elite */}
            <div className="rounded-2xl border-2 border-amber-300 dark:border-amber-700 bg-amber-50/40 dark:bg-amber-950/10 p-7 flex flex-col">
              <div className="mb-6">
                <p className="text-[11px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 mb-2">Elite</p>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-4xl font-black text-foreground">£39</span>
                  <span className="text-[12px] text-muted-foreground">/month</span>
                </div>
                <p className="text-[12px] text-muted-foreground">Full platform, nothing locked</p>
              </div>
              <Link href="/register"
                className="block w-full py-2.5 rounded-xl font-bold text-[13px] text-center bg-amber-500 hover:bg-amber-600 text-white transition-colors mb-6">
                Start Elite
              </Link>
              <div className="space-y-3 flex-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Everything in Pro, plus</p>
                {[
                  ["Shortlist Intelligence™", "bg-red-100 dark:bg-red-950/40", "text-red-600 dark:text-red-400"],
                  ["Hidden criteria detection", "bg-red-100 dark:bg-red-950/40", "text-red-600 dark:text-red-400"],
                  ["COS & Sponsorship Navigator", "bg-cyan-100 dark:bg-cyan-950/40", "text-cyan-600 dark:text-cyan-400"],
                  ["Visa route intelligence", "bg-cyan-100 dark:bg-cyan-950/40", "text-cyan-600 dark:text-cyan-400"],
                  ["Priority mentorship", "bg-amber-100 dark:bg-amber-950/40", "text-amber-600 dark:text-amber-400"],
                  ["Dedicated support", "bg-amber-100 dark:bg-amber-950/40", "text-amber-600 dark:text-amber-400"],
                ].map(([f, bg, color], j) => (
                  <div key={j} className="flex items-center gap-2.5 text-[12.5px] text-foreground">
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${bg}`}>
                      <Check className={`w-2.5 h-2.5 ${color}`} />
                    </div>
                    {f}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Feature comparison note */}
          <p className="text-center text-[12px] text-muted-foreground mt-6">
            All plans include NHS jobs search, CV builder, and application tracker.
            <Link href="/register" className="text-blue-600 dark:text-blue-400 hover:underline ml-1">Compare all features →</Link>
          </p>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-24 sm:py-32">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-[12px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-3">FAQ</p>
            <h2 className="text-4xl sm:text-5xl font-black text-foreground tracking-tight">Before you start</h2>
          </div>
          <div className="space-y-2">
            {FAQS.map((item, i) => (
              <div key={i} className="rounded-xl border border-border bg-card overflow-hidden">
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full px-5 py-4 flex items-center justify-between hover:bg-muted/50 transition-colors text-left gap-4">
                  <span className="text-[14px] font-semibold text-foreground">{item.q}</span>
                  <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200 ${openFaq === i ? 'rotate-180' : ''}`} />
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-4 pt-2 text-[13.5px] text-muted-foreground leading-relaxed border-t border-border">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-24 sm:py-32 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl overflow-hidden relative" style={{ background: 'linear-gradient(135deg, #1d40c4 0%, #2563eb 50%, #38bdf8 100%)' }}>
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '28px 28px' }} />
            <div className="relative px-10 py-16 sm:px-16 sm:py-20 text-center">
              <h2 className="text-4xl sm:text-5xl font-black text-white mb-4 tracking-tight">
                Your next statement deserves a real score.
              </h2>
              <p className="text-lg text-white/70 mb-10 max-w-xl mx-auto leading-relaxed">
                Free for your first analysis. No card required. Five minutes to find out what the panel will see.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/register"
                  className="px-8 py-3.5 rounded-xl bg-white text-blue-600 font-bold text-[15px] hover:bg-blue-50 transition-colors flex items-center justify-center gap-2 shadow-lg">
                  Score my statement <ArrowRight className="w-4 h-4" />
                </Link>
                <Link href="/jobs"
                  className="px-8 py-3.5 rounded-xl border-2 border-white/30 text-white font-semibold text-[15px] hover:bg-white/10 transition-colors flex items-center justify-center gap-2">
                  Browse NHS jobs
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border bg-muted/20 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-10 mb-10">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-amber-500 flex items-center justify-center">
                  <span className="text-white text-[9px] font-black">OJR</span>
                </div>
                <span className="font-black text-[14px] text-foreground">OmniJobReady <span className="font-light text-muted-foreground">AI</span></span>
              </div>
              <p className="text-[12px] text-muted-foreground leading-relaxed">The NHS Career Operating System.</p>
            </div>
            {[
              { heading: 'Product', links: [['Method', '/#method'], ['Pricing', '/#pricing'], ['Browse jobs', '/jobs']] },
              { heading: 'Company', links: [['About', '#'], ['Contact', '#']] },
              { heading: 'Legal',   links: [['Privacy', '#'], ['Terms', '#']] },
            ].map(col => (
              <div key={col.heading}>
                <h4 className="text-[12px] font-black uppercase tracking-wider text-foreground mb-4">{col.heading}</h4>
                <ul className="space-y-2">
                  {col.links.map(([label, href]) => (
                    <li key={label}>
                      <Link href={href} className="text-[13px] text-muted-foreground hover:text-foreground transition-colors">{label}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-border pt-8">
            <p className="text-[11px] text-muted-foreground">© {new Date().getFullYear()} OmniJobReady AI™. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* AI Chat Widget */}
      <HomepageChatWidget />
    </div>
  )
}