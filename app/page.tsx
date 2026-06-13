'use client'

import Link from 'next/link'
import {
  Check,
  ArrowRight,
  ChevronDown,
  BarChart3,
  Shield,
  Zap,
  Users,
  Lock,
  TrendingUp,
  Search,
  LayoutDashboard,
} from 'lucide-react'
import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { ThemeSwitcher } from '@/components/theme-switcher'

// ─────────────────────────────────────────────
// Auth-aware Navbar
// ─────────────────────────────────────────────
function Navbar() {
  const { data: session, status } = useSession()
  const isLoading = status === 'loading'

  const initials =
    session?.user?.name
      ?.split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() ?? ''

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <div className="h-8 w-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-semibold text-[11px] tracking-wide select-none">
              NHS
            </div>
            <span className="font-semibold text-[15px] text-foreground leading-none">
              JobReady
              <span className="ml-1.5 text-[10px] font-normal text-muted-foreground bg-accent dark:bg-slate-800 px-1.5 py-0.5 rounded border border-border align-middle">
                AI
              </span>
            </span>
          </Link>

          {/* Right side */}
          <div className="flex items-center gap-1">

            {/* Browse Jobs — always visible */}
            <Link
              href="/jobs"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] text-muted-foreground hover:text-foreground hover:bg-accent dark:hover:bg-slate-800 transition-colors"
            >
              <Search className="h-3.5 w-3.5" />
              Browse jobs
            </Link>

            {/* Loading skeleton */}
            {isLoading && (
              <div className="flex items-center gap-2 ml-2">
                <div className="h-7 w-14 rounded-md bg-accent dark:bg-slate-800 animate-pulse" />
                <div className="h-7 w-28 rounded-lg bg-accent dark:bg-slate-800 animate-pulse" />
              </div>
            )}

            {/* Authenticated */}
            {!isLoading && session && (
              <>
            
               <div className="hidden sm:block w-px h-5 bg-border mx-1.5" />

                <ThemeSwitcher />

                {/* Avatar */}
                <div
                  title={session.user?.name ?? ''}
                  className="h-8 w-8 rounded-full bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 flex items-center justify-center ml-1 cursor-default select-none"
                >
                  <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                    {initials || '?'}
                  </span>
                </div>

                <Link
                  href="/dashboard"
                  className="hidden sm:flex items-center gap-1.5 ml-1.5 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-[13px] font-semibold transition-colors"
                >
                  Dashboard
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </>
            )}

            {/* Unauthenticated */}
            {!isLoading && !session && (
              <>
                <Link
                  href="/#features"
                  className="hidden md:block px-3 py-1.5 rounded-md text-[13px] text-muted-foreground hover:text-foreground hover:bg-accent dark:hover:bg-slate-800 transition-colors"
                >
                  Features
                </Link>
                <Link
                  href="/#pricing"
                  className="hidden md:block px-3 py-1.5 rounded-md text-[13px] text-muted-foreground hover:text-foreground hover:bg-accent dark:hover:bg-slate-800 transition-colors"
                >
                  Pricing
                </Link>

                <div className="hidden sm:block w-px h-5 bg-border mx-1.5" />

                <ThemeSwitcher />

                <Link
                  href="/login"
                  className="px-3 py-1.5 rounded-lg text-[13px] font-medium text-foreground border border-border hover:bg-accent dark:hover:bg-slate-800 transition-colors"
                >
                  Sign in
                </Link>

                <Link
                  href="/register"
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-[13px] font-semibold transition-colors"
                >
                  Get started free
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

// ─────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────
export default function HomePage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0)

  const faqItems = [
    {
      question: 'How does the evaluation engine work?',
      answer:
        'Our system uses advanced clinical methodology to evaluate candidates across five key dimensions: Essential Criteria, STAR examples, Values Alignment, Language & Clarity, and Specificity. Each dimension is scored and weighted to provide a comprehensive assessment.',
    },
    {
      question: 'Is my data secure and GDPR compliant?',
      answer:
        'Yes. The NHS Evaluation Engine is built with healthcare compliance standards in mind. All data is encrypted in transit and at rest, with role-based access control and comprehensive audit trails.',
    },
    {
      question: 'Can I customise evaluation criteria?',
      answer:
        'Absolutely. You can configure your own evaluation criteria, weightings, and competency frameworks to match your specific organisational requirements.',
    },
    {
      question: 'How long does an evaluation take?',
      answer:
        'Our system can complete a full evaluation in 5–10 minutes, compared to 30+ minutes with manual review processes. This saves significant time while improving consistency.',
    },
    {
      question: 'What support is available?',
      answer:
        'We offer comprehensive support including email, phone, and dedicated account managers for enterprise customers. Full training and onboarding is included with every plan.',
    },
  ]

  const subscriptionPlans = [
    {
      name: 'Starter',
      price: '£299',
      period: 'per month',
      description: 'Perfect for small teams getting started',
      features: [
        'Up to 10 concurrent evaluations',
        '5 users',
        'Basic reporting',
        'Email support',
        'Standard templates',
      ],
    },
    {
      name: 'Professional',
      price: '£799',
      period: 'per month',
      description: 'For growing recruitment operations',
      featured: true,
      features: [
        'Unlimited evaluations',
        '25 users',
        'Advanced analytics & reporting',
        'Priority email & phone support',
        'Custom evaluation frameworks',
        'API access',
        'Single sign-on (SSO)',
      ],
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      period: 'Custom pricing',
      description: 'For large-scale NHS operations',
      features: [
        'Unlimited everything',
        'Unlimited users',
        'Advanced compliance & audit tools',
        '24/7 dedicated support',
        'Custom integrations',
        'White-label option',
        'SLA guarantee',
        'Onsite training',
      ],
    },
  ]

  const features = [
    {
      icon: BarChart3,
      title: 'Dimensional Evaluation',
      description:
        'Comprehensive assessment across 5 key dimensions with evidence-based scoring.',
    },
    {
      icon: Shield,
      title: 'Clinical Methodology',
      description:
        'Built on best practices from healthcare and recruitment expertise.',
    },
    {
      icon: Zap,
      title: 'Lightning Fast',
      description: 'Complete evaluations in minutes instead of hours.',
    },
    {
      icon: Users,
      title: 'Collaborative',
      description:
        'Share evaluations, add comments, and reach consensus with your team.',
    },
    {
      icon: Lock,
      title: 'Secure & Compliant',
      description: 'NHS-grade security with full GDPR and compliance support.',
    },
    {
      icon: TrendingUp,
      title: 'Data-Driven',
      description:
        'Advanced analytics to identify trends and improve your hiring process.',
    },
  ]

  const processSteps = [
    {
      number: 1,
      title: 'Input information',
      description:
        'Upload job specifications, person specs, and CVs into the system.',
    },
    {
      number: 2,
      title: 'Automated analysis',
      description: 'System analyses against your configured evaluation criteria.',
    },
    {
      number: 3,
      title: 'Dimensional assessment',
      description:
        'Candidate evaluated across 5 key dimensions with evidence collection.',
    },
    {
      number: 4,
      title: 'Scoring & verdicts',
      description:
        'Automated scoring with clinical verdict — Excellent, Good, Acceptable, or Needs Work.',
    },
    {
      number: 5,
      title: 'Generate report',
      description: 'Professional evaluation report ready for stakeholder review.',
    },
  ]

  const stats = [
    { value: '94%', label: 'Shortlisting accuracy' },
    { value: '8×', label: 'Faster than manual review' },
    { value: '120+', label: 'NHS trusts onboarded' },
    { value: '£0', label: 'Cost to get started' },
  ]

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden py-20 sm:py-32">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-slate-50 dark:from-slate-900 dark:to-slate-800" />
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-200 dark:bg-blue-900 rounded-full blur-3xl opacity-10 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-slate-200 dark:bg-slate-700 rounded-full blur-3xl opacity-10 pointer-events-none" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-[13px] font-semibold text-blue-600 dark:text-blue-400">
                Trusted by NHS teams across all four nations
              </span>
            </div>

            <h1 className="text-5xl sm:text-6xl font-bold text-foreground mb-6 leading-[1.08] tracking-tight">
              Intelligent Candidate{' '}
              <span className="text-blue-600 dark:text-blue-400">
                Evaluation Engine
              </span>
            </h1>

            <p className="text-lg text-muted-foreground dark:text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
              Score NHS job applications consistently, fairly, and efficiently
              across five clinical dimensions — in minutes, not hours.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/register"
                className="px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-[15px] transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
              >
                Get started — it's free
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="#features"
                className="px-8 py-3.5 rounded-xl border border-border text-foreground font-semibold text-[15px] hover:bg-accent dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
              >
                See how it works
                <ChevronDown className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto mb-14">
            {stats.map((s, i) => (
              <div
                key={i}
                className="rounded-xl border border-border bg-background/80 backdrop-blur px-4 py-4 text-center"
              >
                <p className="text-2xl font-bold text-foreground mb-0.5">{s.value}</p>
                <p className="text-[12px] text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Dashboard mockup */}
          <div className="rounded-2xl border border-border bg-card/80 p-2 shadow-2xl dark:shadow-slate-900 ring-1 ring-black/5 dark:ring-white/5">
            <div className="rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 aspect-[16/7] flex items-center justify-center">
              <div className="text-center">
                <BarChart3 className="h-12 w-12 text-slate-400 dark:text-slate-500 mx-auto mb-3" />
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                  Live dashboard preview
                </p>
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

      {/* ── Features ── */}
      <section id="features" className="py-20 sm:py-32 bg-slate-50 dark:bg-slate-900/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-4xl sm:text-5xl font-bold text-foreground mb-4 tracking-tight">
              Powerful features
            </h2>
            <p className="text-lg text-muted-foreground dark:text-slate-400 max-w-xl mx-auto">
              Everything you need to evaluate candidates with clinical precision and efficiency.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((feature, idx) => {
              const Icon = feature.icon
              return (
                <div
                  key={idx}
                  className="rounded-xl border border-border bg-background p-7 hover:shadow-md hover:border-blue-200 dark:hover:border-blue-800 transition-all duration-200 group"
                >
                  <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-100 dark:border-blue-900 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                    <Icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-[16px] font-semibold text-foreground mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-[14px] text-muted-foreground dark:text-slate-400 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="py-20 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-4xl sm:text-5xl font-bold text-foreground mb-4 tracking-tight">
              How it works
            </h2>
            <p className="text-lg text-muted-foreground dark:text-slate-400 max-w-xl mx-auto">
              A simple five-step process to comprehensive candidate evaluation.
            </p>
          </div>

          <div className="max-w-2xl mx-auto space-y-0">
            {processSteps.map((step, idx) => (
              <div key={idx} className="flex gap-6 items-start relative">
                {/* Connector line */}
                {idx < processSteps.length - 1 && (
                  <div className="absolute left-5 top-12 w-px h-10 bg-border" />
                )}
                <div className="flex-shrink-0">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-[13px] shadow shadow-blue-600/30">
                    {step.number}
                  </div>
                </div>
                <div className="flex-1 pb-10">
                  <h3 className="text-[16px] font-semibold text-foreground mb-1">
                    {step.title}
                  </h3>
                  <p className="text-[14px] text-muted-foreground dark:text-slate-400 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Security / Compliance ── */}
      <section className="py-20 sm:py-32 bg-slate-50 dark:bg-slate-900/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-14 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950 mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                <span className="text-[12px] font-semibold text-green-600 dark:text-green-400">
                  Enterprise-grade security
                </span>
              </div>
              <h2 className="text-4xl font-bold text-foreground mb-5 tracking-tight leading-tight">
                Built for NHS compliance from day one
              </h2>
              <p className="text-[15px] text-muted-foreground dark:text-slate-400 mb-8 leading-relaxed">
                Our platform meets the highest standards for data protection and
                compliance — designed specifically for NHS and wider healthcare
                organisations.
              </p>

              <ul className="space-y-3">
                {[
                  'GDPR compliant',
                  'NHS IG Toolkit verified',
                  'ISO 27001 certified',
                  'End-to-end encryption',
                  'Regular penetration testing',
                  'Comprehensive audit trails',
                ].map((item, idx) => (
                  <li key={idx} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center shrink-0">
                      <Check className="h-3 w-3 text-green-600 dark:text-green-400" />
                    </div>
                    <span className="text-[14px] text-foreground font-medium">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-border bg-background p-8">
              <div className="aspect-square bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-950 dark:to-emerald-900 rounded-xl flex items-center justify-center">
                <Lock className="h-16 w-16 text-green-500 dark:text-green-400 opacity-50" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="py-20 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-4xl sm:text-5xl font-bold text-foreground mb-4 tracking-tight">
              Transparent pricing
            </h2>
            <p className="text-lg text-muted-foreground dark:text-slate-400 max-w-xl mx-auto">
              Choose the plan that fits your organisation's needs. No hidden fees.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {subscriptionPlans.map((tier, idx) => (
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
                    Most popular
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
                      <div className="w-4 h-4 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="h-2.5 w-2.5 text-green-600 dark:text-green-400" />
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
            <h2 className="text-4xl sm:text-5xl font-bold text-foreground mb-4 tracking-tight">
              Common questions
            </h2>
            <p className="text-lg text-muted-foreground dark:text-slate-400">
              Everything you need to know before getting started.
            </p>
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
                Ready to transform your hiring?
              </h2>
              <p className="text-lg text-blue-100 mb-10 max-w-xl mx-auto leading-relaxed">
                Join healthcare organisations using our evaluation engine to hire
                better candidates, faster.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="/register"
                  className="px-8 py-3.5 rounded-xl bg-white text-blue-600 font-semibold text-[15px] hover:bg-blue-50 transition-colors flex items-center justify-center gap-2 shadow-lg"
                >
                  Start free trial
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <button className="px-8 py-3.5 rounded-xl border-2 border-white/40 text-white font-semibold text-[15px] hover:bg-white/10 transition-colors">
                  Schedule a demo
                </button>
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
                Clinical methodology for smarter NHS recruitment.
              </p>
            </div>

            {[
              {
                heading: 'Product',
                links: ['Features', 'Pricing', 'Security', 'Browse jobs'],
                hrefs: ['/#features', '/#pricing', '#', '/jobs'],
              },
              {
                heading: 'Company',
                links: ['About', 'Blog', 'Contact'],
                hrefs: ['#', '#', '#'],
              },
              {
                heading: 'Legal',
                links: ['Privacy', 'Terms', 'Cookies'],
                hrefs: ['#', '#', '#'],
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
            <div className="flex gap-5">
              {['Twitter', 'LinkedIn', 'GitHub'].map((s) => (
                <a
                  key={s}
                  href="#"
                  className="text-[12px] text-muted-foreground dark:text-slate-400 hover:text-foreground transition-colors"
                >
                  {s}
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}