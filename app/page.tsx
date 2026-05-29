'use client'

import Link from 'next/link'
import { Check, ArrowRight, ChevronDown, BarChart3, Shield, Zap, Users, Lock, TrendingUp } from 'lucide-react'
import { useState } from 'react'
import { ThemeSwitcher } from '@/components/theme-switcher'

export default function HomePage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0)

  const faqItems = [
    {
      question: 'How does the evaluation engine work?',
      answer: 'Our system uses advanced clinical methodology to evaluate candidates across five key dimensions: Essential Criteria, STAR examples, Values Alignment, Language & Clarity, and Specificity. Each dimension is scored and weighted to provide a comprehensive assessment.',
    },
    {
      question: 'Is my data secure and GDPR compliant?',
      answer: 'Yes. The NHS Evaluation Engine is built with healthcare compliance standards in mind. All data is encrypted in transit and at rest, with role-based access control and comprehensive audit trails.',
    },
    {
      question: 'Can I customize evaluation criteria?',
      answer: 'Absolutely. You can configure your own evaluation criteria, weightings, and competency frameworks to match your specific organizational requirements.',
    },
    {
      question: 'How long does an evaluation take?',
      answer: 'Our system can complete a full evaluation in 5-10 minutes, compared to 30+ minutes with manual review processes. This saves significant time while improving consistency.',
    },
    {
      question: 'What support is available?',
      answer: 'We offer comprehensive support including email, phone, and dedicated account managers for enterprise customers. Full training and onboarding is included.',
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
      description: 'Comprehensive assessment across 5 key dimensions with evidence-based scoring',
    },
    {
      icon: Shield,
      title: 'Clinical Methodology',
      description: 'Built on best practices from healthcare and recruitment expertise',
    },
    {
      icon: Zap,
      title: 'Lightning Fast',
      description: 'Complete evaluations in minutes instead of hours',
    },
    {
      icon: Users,
      title: 'Collaborative',
      description: 'Share evaluations, add comments, and reach consensus with your team',
    },
    {
      icon: Lock,
      title: 'Secure & Compliant',
      description: 'NHS-grade security with full GDPR and compliance support',
    },
    {
      icon: TrendingUp,
      title: 'Data-Driven',
      description: 'Advanced analytics to identify trends and improve your hiring process',
    },
  ]

  const processSteps = [
    {
      number: 1,
      title: 'Input Information',
      description: 'Upload job specifications, person specs, and CVs into the system',
    },
    {
      number: 2,
      title: 'Automated Analysis',
      description: 'System analyzes against your configured evaluation criteria',
    },
    {
      number: 3,
      title: 'Dimensional Assessment',
      description: 'Candidate evaluated across 5 key dimensions with evidence collection',
    },
    {
      number: 4,
      title: 'Scoring & Verdicts',
      description: 'Automated scoring with clinical verdict (Excellent, Good, Acceptable, Needs Work)',
    },
    {
      number: 5,
      title: 'Generate Report',
      description: 'Professional evaluation report ready for stakeholder review',
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 text-white flex items-center justify-center font-bold text-sm">
                NHS
              </div>
              <span className="font-bold text-lg">Evaluation Engine</span>
            </Link>

            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="px-4 py-2 rounded-lg text-foreground hover:bg-accent dark:hover:bg-slate-800 transition-colors font-medium"
              >
                Dashboard
              </Link>
              <ThemeSwitcher />
              <Link
                href="/dashboard"
                className="px-6 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity font-semibold"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 sm:py-32">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-slate-50 dark:from-slate-900 dark:to-slate-800" />
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-200 dark:bg-blue-900 rounded-full blur-3xl opacity-20" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-slate-200 dark:bg-slate-700 rounded-full blur-3xl opacity-20" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950 mb-6">
              <span className="w-2 h-2 rounded-full bg-blue-600" />
              <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">Trusted by NHS Teams</span>
            </div>

            <h1 className="text-5xl sm:text-6xl font-bold text-foreground mb-6 leading-tight">
              Intelligent Candidate Evaluation Engine
            </h1>

            <p className="text-xl text-muted-foreground dark:text-slate-400 mb-8">
              Transform your recruitment process with our clinical methodology evaluation system. Score candidates consistently, fairly, and efficiently across five key dimensions.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/dashboard"
                className="px-8 py-4 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold hover:shadow-lg transition-all hover:shadow-blue-500/50 flex items-center justify-center gap-2"
              >
                Get Started Free
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                href="#features"
                className="px-8 py-4 rounded-lg border-2 border-border text-foreground font-semibold hover:bg-accent dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
              >
                Learn More
                <ChevronDown className="h-5 w-5" />
              </Link>
            </div>
          </div>

          {/* Hero Image */}
          <div className="mt-16 rounded-xl border border-border bg-card p-8 shadow-2xl dark:shadow-slate-900">
            <div className="aspect-video bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <BarChart3 className="h-16 w-16 text-slate-400 dark:text-slate-500 mx-auto mb-4" />
                <p className="text-slate-500 dark:text-slate-400 font-medium">Dashboard Preview</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 sm:py-32 bg-slate-50 dark:bg-slate-900/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold text-foreground mb-4">Powerful Features</h2>
            <p className="text-xl text-muted-foreground dark:text-slate-400 max-w-2xl mx-auto">
              Everything you need to evaluate candidates with clinical precision and efficiency
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, idx) => {
              const Icon = feature.icon
              return (
                <div key={idx} className="rounded-lg border border-border bg-background p-8 hover:shadow-lg transition-shadow dark:hover:shadow-slate-900">
                  <Icon className="h-10 w-10 text-blue-600 dark:text-blue-400 mb-4" />
                  <h3 className="text-xl font-bold text-foreground mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground dark:text-slate-400">{feature.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold text-foreground mb-4">How It Works</h2>
            <p className="text-xl text-muted-foreground dark:text-slate-400 max-w-2xl mx-auto">
              A simple 5-step process to comprehensive candidate evaluation
            </p>
          </div>

          <div className="space-y-8">
            {processSteps.map((step, idx) => (
              <div key={idx} className="flex gap-8 items-start">
                <div className="flex-shrink-0">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-blue-700 text-white font-bold text-lg">
                    {step.number}
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-foreground mb-2">{step.title}</h3>
                  <p className="text-muted-foreground dark:text-slate-400">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Compliance Section */}
      <section className="py-20 sm:py-32 bg-slate-50 dark:bg-slate-900/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold text-foreground mb-6">Enterprise-Grade Security</h2>
              <p className="text-lg text-muted-foreground dark:text-slate-400 mb-8">
                Built specifically for NHS and healthcare organizations, our platform meets the highest standards for data protection and compliance.
              </p>

              <ul className="space-y-3">
                {[
                  'GDPR Compliant',
                  'NHS IG Toolkit Verified',
                  'ISO 27001 Certified',
                  'End-to-end Encryption',
                  'Regular Penetration Testing',
                  'Comprehensive Audit Trails',
                ].map((item, idx) => (
                  <li key={idx} className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                    <span className="text-foreground font-medium">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-lg border border-border bg-background p-8">
              <div className="aspect-square bg-gradient-to-br from-green-200 to-emerald-200 dark:from-green-900 dark:to-emerald-900 rounded-lg flex items-center justify-center">
                <Lock className="h-20 w-20 text-green-600 dark:text-green-400 opacity-50" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold text-foreground mb-4">Transparent Pricing</h2>
            <p className="text-xl text-muted-foreground dark:text-slate-400 max-w-2xl mx-auto">
              Choose the plan that fits your organization's needs
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {subscriptionPlans.map((plan, idx) => (
              <div
                key={idx}
                className={`rounded-lg border-2 p-8 transition-all ${
                  plan.featured
                    ? 'border-blue-600 bg-gradient-to-br from-blue-50 to-slate-50 dark:from-blue-950 dark:to-slate-900 shadow-lg'
                    : 'border-border bg-background'
                }`}
              >
                {plan.featured && (
                  <div className="mb-4 inline-flex px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 text-sm font-semibold">
                    Most Popular
                  </div>
                )}

                <h3 className="text-2xl font-bold text-foreground mb-2">{plan.name}</h3>
                <p className="text-muted-foreground dark:text-slate-400 mb-6">{plan.description}</p>

                <div className="mb-6">
                  <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                  <span className="text-muted-foreground dark:text-slate-400 ml-2">{plan.period}</span>
                </div>

                <button
                  className={`w-full py-3 rounded-lg font-semibold mb-8 transition-all ${
                    plan.featured
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'border-2 border-border text-foreground hover:bg-accent dark:hover:bg-slate-800'
                  }`}
                >
                  Get Started
                </button>

                <div className="space-y-4">
                  {plan.features.map((feature, fidx) => (
                    <div key={fidx} className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                      <span className="text-foreground">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 sm:py-32 bg-slate-50 dark:bg-slate-900/50">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold text-foreground mb-4">Frequently Asked Questions</h2>
            <p className="text-xl text-muted-foreground dark:text-slate-400">
              Find answers to common questions about our platform
            </p>
          </div>

          <div className="space-y-4">
            {faqItems.map((item, idx) => (
              <div key={idx} className="rounded-lg border border-border bg-background overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-accent dark:hover:bg-slate-800 transition-colors text-left font-semibold text-foreground"
                >
                  {item.question}
                  <ChevronDown
                    className={`h-5 w-5 text-muted-foreground transition-transform ${
                      openFaq === idx ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {openFaq === idx && (
                  <div className="px-6 py-4 border-t border-border text-muted-foreground dark:text-slate-400">
                    {item.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 sm:py-32 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl sm:text-5xl font-bold mb-6">Ready to Transform Your Hiring?</h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join healthcare organizations using our evaluation engine to hire better candidates, faster.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/dashboard"
              className="px-8 py-4 rounded-lg bg-white text-blue-600 font-semibold hover:bg-slate-100 transition-colors flex items-center justify-center gap-2"
            >
              Start Free Trial
              <ArrowRight className="h-5 w-5" />
            </Link>
            <button className="px-8 py-4 rounded-lg border-2 border-white text-white font-semibold hover:bg-white/10 transition-colors">
              Schedule Demo
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-slate-50 dark:bg-slate-900 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 text-white flex items-center justify-center font-bold text-sm">
                  NHS
                </div>
                <span className="font-bold text-lg">Evaluation Engine</span>
              </div>
              <p className="text-sm text-muted-foreground dark:text-slate-400">Clinical methodology for recruitment</p>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground dark:text-slate-400">
                <li><a href="#features" className="hover:text-foreground">Features</a></li>
                <li><a href="#" className="hover:text-foreground">Pricing</a></li>
                <li><a href="#" className="hover:text-foreground">Security</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground dark:text-slate-400">
                <li><a href="#" className="hover:text-foreground">About</a></li>
                <li><a href="#" className="hover:text-foreground">Blog</a></li>
                <li><a href="#" className="hover:text-foreground">Contact</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground dark:text-slate-400">
                <li><a href="#" className="hover:text-foreground">Privacy</a></li>
                <li><a href="#" className="hover:text-foreground">Terms</a></li>
                <li><a href="#" className="hover:text-foreground">Security</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-border pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground dark:text-slate-400">
              © 2024 NHS Evaluation Engine. All rights reserved.
            </p>
            <div className="flex gap-6 text-sm">
              <a href="#" className="text-muted-foreground dark:text-slate-400 hover:text-foreground">Twitter</a>
              <a href="#" className="text-muted-foreground dark:text-slate-400 hover:text-foreground">LinkedIn</a>
              <a href="#" className="text-muted-foreground dark:text-slate-400 hover:text-foreground">GitHub</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
