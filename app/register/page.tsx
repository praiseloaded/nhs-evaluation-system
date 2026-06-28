'use client'

import { useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { signIn } from "next-auth/react"
import { Eye, EyeOff, UserPlus, AlertCircle, Target, Pencil, AlertTriangle, Mic, ShieldCheck } from "lucide-react"
import { cn } from "@/lib/utils"

// ── Password strength ──────────────────────────────────────────────────────────

function PasswordStrength({ password }: { password: string }) {
  const checks = {
    len: password.length >= 8,
    up:  /[A-Z]/.test(password),
    num: /[0-9]/.test(password),
    sym: /[^A-Za-z0-9]/.test(password),
  }
  const score  = Object.values(checks).filter(Boolean).length
  const colors = ['bg-red-500', 'bg-amber-400', 'bg-blue-400', 'bg-emerald-500']

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1">
        {[0,1,2,3].map(i => (
          <div key={i} className={cn(
            'h-0.5 flex-1 rounded-full transition-all duration-300',
            i < score ? colors[score - 1] : 'bg-border'
          )} />
        ))}
      </div>
      <div className="flex gap-3 flex-wrap">
        {([
          ['len', '8+ chars'],
          ['up',  'Uppercase'],
          ['num', 'Number'],
          ['sym', 'Symbol'],
        ] as const).map(([k, label]) => (
          <span key={k} className={cn(
            'flex items-center gap-1 text-[11px] transition-colors',
            checks[k] ? 'text-emerald-500 dark:text-emerald-400' : 'text-muted-foreground'
          )}>
            <span className={cn(
              'w-1 h-1 rounded-full',
              checks[k] ? 'bg-emerald-500 dark:bg-emerald-400' : 'bg-muted-foreground'
            )} />
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}

// ── Data ───────────────────────────────────────────────────────────────────────

const features = [
  { icon: Target,        title: 'Criteria scoring',   desc: 'See exactly which gaps will cost you the shortlist.'     },
  { icon: Pencil,        title: 'Language mirroring', desc: 'AI rewrites using exact person spec terminology.'        },
  { icon: AlertTriangle, title: 'Rejection analysis', desc: 'Know why recruiters might reject you — before they do.' },
  { icon: Mic,           title: 'Interview coach',    desc: 'Practice NHS VBI with real-time STAR scoring.'           },
]

const stats = [
  { num: '94%',      label: 'Shortlist rate' },
  { num: '12k+',     label: 'Users helped'   },
  { num: '4.9★',     label: 'Rating'         },
  { num: 'Band 2–8', label: 'All NHS roles'  },
]

// ── Input class — uses CSS variables, respects dark/light ─────────────────────

const inp = `
  w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm
  text-foreground placeholder:text-muted-foreground/50 outline-none transition-all
  focus:border-primary focus:ring-2 focus:ring-primary/20
`

// ── Form ───────────────────────────────────────────────────────────────────────

function RegisterForm() {
  const router       = useRouter()
  const searchParams = useSearchParams()

  const returnTo = searchParams.get('returnTo') ?? ''
  const jobUrl   = searchParams.get('jobUrl')   ?? ''
  const jobTitle = searchParams.get('jobTitle') ?? ''

  const [firstName, setFirstName] = useState('')
  const [lastName,  setLastName]  = useState('')
  const [email,     setEmail]     = useState('')
  const [password,  setPassword]  = useState('')
  const [showPw,    setShowPw]    = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')

  function getPostRegisterUrl(): string {
    if (jobUrl) {
      const params = new URLSearchParams()
      params.set('jobUrl', jobUrl)
      if (jobTitle) params.set('jobTitle', jobTitle)
      return `/dashboard/new-analysis?${params.toString()}`
    }
    if (returnTo) return returnTo
    return '/dashboard'
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res  = await fetch('/api/auth/register', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name: `${firstName} ${lastName}`, email, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Registration failed')

      const signInResult = await signIn('credentials', { email, password, redirect: false })

      if (signInResult?.error) {
        router.push(`/login?registered=true&jobUrl=${encodeURIComponent(jobUrl)}&jobTitle=${encodeURIComponent(jobTitle)}`)
        return
      }

      router.push(getPostRegisterUrl())
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function handleGoogle() {
    signIn('google', { callbackUrl: getPostRegisterUrl() })
  }

  return (
    <div className="w-full lg:w-[70%] max-w-4xl flex rounded-2xl border border-border overflow-hidden shadow-xl shadow-black/5">

      {/* ── Left: form ──────────────────────────────────────────────── */}
      <div className="flex-1 bg-card px-8 py-10">

        {/* Logo */}
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-amber-500 flex items-center justify-center shadow-md shadow-blue-500/20">
            <ShieldCheck className="w-4 h-4 text-white" />
          </div>
          <span className="font-black text-[15px] tracking-tight text-foreground">
            OmniJobReady <span className="text-blue-500">AI</span>
          </span>
        </div>

        {/* Heading */}
        <div className="mb-6">
          <span className="inline-block text-[11px] font-bold tracking-widest text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-full px-3 py-1 mb-3">
            FREE TO START · NO CARD REQUIRED
          </span>
          <h1 className="text-xl font-black text-foreground mb-1.5 tracking-tight">
            Create your account
          </h1>
          <p className="text-[12px] text-muted-foreground leading-relaxed">
            {jobTitle
              ? <>Register to analyse <strong className="text-foreground">"{jobTitle}"</strong> and get your instant shortlist score.</>
              : <>Join NHS applicants getting shortlisted faster with AI-powered statement optimisation.</>
            }
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl px-3 py-2.5 mb-4">
            <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
            <span className="text-[12px] text-red-600 dark:text-red-400">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">

          {/* Name row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">First Name</label>
              <input type="text" required placeholder="Jane" value={firstName}
                onChange={e => setFirstName(e.target.value)} className={inp} />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Last Name</label>
              <input type="text" required placeholder="Smith" value={lastName}
                onChange={e => setLastName(e.target.value)} className={inp} />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Email Address</label>
            <input type="email" required placeholder="jane@nhs.net" value={email}
              onChange={e => setEmail(e.target.value)} className={inp} />
          </div>

          {/* Password */}
          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                required minLength={8} placeholder="Min. 8 characters"
                value={password} onChange={e => setPassword(e.target.value)}
                className={cn(inp, 'pr-10')}
              />
              <button type="button" onClick={() => setShowPw(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                {showPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            {password && <PasswordStrength password={password} />}
          </div>

          {/* Submit */}
          <button type="submit" disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl py-2.5 text-[13px] font-semibold transition-all active:scale-[0.99] shadow-md shadow-blue-500/20 mt-1">
            <UserPlus className="w-3.5 h-3.5" />
            {loading
              ? 'Creating account…'
              : jobTitle
                ? `Register & analyse "${jobTitle.slice(0, 28)}${jobTitle.length > 28 ? '…' : ''}"`
                : 'Create account'
            }
          </button>

        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-border" />
          <span className="text-[11px] text-muted-foreground">or continue with</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Google */}
        <button onClick={handleGoogle}
          className="w-full flex items-center justify-center gap-2.5 bg-background border border-border hover:bg-muted hover:border-primary/20 rounded-xl py-2.5 text-[13px] font-medium text-foreground transition-all">
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        {/* Footer */}
        <p className="text-center text-[12px] text-muted-foreground mt-4">
          Already have an account?{' '}
          <Link href={`/login${jobUrl ? `?jobUrl=${encodeURIComponent(jobUrl)}&jobTitle=${encodeURIComponent(jobTitle)}` : ''}`}
            className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
            Sign in
          </Link>
        </p>
        <p className="text-center text-[11px] text-muted-foreground/60 mt-2 leading-relaxed">
          By creating an account you agree to our{' '}
          <Link href="/terms"   className="hover:text-foreground transition-colors underline">Terms</Link>
          {' '}and{' '}
          <Link href="/privacy" className="hover:text-foreground transition-colors underline">Privacy Policy</Link>
        </p>
      </div>

      {/* ── Right: feature panel ─────────────────────────────────────── */}
      <div className="hidden lg:flex w-72 flex-col justify-center bg-muted/30 border-l border-border px-6 py-10 shrink-0">
        <p className="text-[10px] font-bold tracking-widest text-blue-600 dark:text-blue-400 mb-2 uppercase">Why OmniJobReady</p>
        <h2 className="text-[15px] font-black text-foreground mb-2 leading-snug tracking-tight">The unfair advantage for NHS applicants</h2>
        <p className="text-[12px] text-muted-foreground mb-6 leading-relaxed">AI trained on NHS recruitment — not generic job boards.</p>
        <div className="space-y-4">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 flex items-center justify-center shrink-0">
                <Icon className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-foreground mb-0.5">{title}</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 mt-7 pt-6 border-t border-border">
          {stats.map(({ num, label }) => (
            <div key={label}>
              <div className="text-[15px] font-black text-foreground">{num}</div>
              <div className="text-[11px] text-muted-foreground">{label}</div>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6 py-12">
      <Suspense fallback={
        <div className="w-full max-w-4xl h-[500px] bg-card border border-border rounded-2xl animate-pulse" />
      }>
        <RegisterForm />
      </Suspense>
    </div>
  )
}