'use client'

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { signIn } from "next-auth/react"
import { Eye, EyeOff, UserPlus, AlertCircle, Target, Pencil, AlertTriangle, Mic } from "lucide-react"
import { cn } from "@/lib/utils"

// ── Password strength ─────────────────────────────────────────────────────────

function PasswordStrength({ password }: { password: string }) {
  const checks = {
    len:  password.length >= 8,
    up:   /[A-Z]/.test(password),
    num:  /[0-9]/.test(password),
    sym:  /[^A-Za-z0-9]/.test(password),
  }
  const score  = Object.values(checks).filter(Boolean).length
  const colors = ['bg-red-500', 'bg-amber-500', 'bg-teal-500', 'bg-blue-500']

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1">
        {[0,1,2,3].map(i => (
          <div key={i} className={cn(
            'h-0.5 flex-1 rounded-full transition-all duration-300',
            i < score ? colors[score - 1] : 'bg-[#1E3A5F]'
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
            'flex items-center gap-1 text-[13px] transition-colors',
            checks[k] ? 'text-teal-400' : 'text-[#1E3A5F]'
          )}>
            <span className={cn(
              'w-1 h-1 rounded-full',
              checks[k] ? 'bg-teal-400' : 'bg-[#1E3A5F]'
            )} />
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}

// ── Data ──────────────────────────────────────────────────────────────────────

const features = [
  {
    icon: Target,
    title: 'Criteria scoring',
    desc:  'See exactly which gaps will cost you the shortlist.',
  },
  {
    icon: Pencil,
    title: 'Language mirroring',
    desc:  'AI rewrites using exact person spec terminology.',
  },
  {
    icon: AlertTriangle,
    title: 'Rejection analysis',
    desc:  'Know why recruiters might reject you — before they do.',
  },
  {
    icon: Mic,
    title: 'Interview coach',
    desc:  'Practice NHS VBI with real-time STAR scoring.',
  },
]

const stats = [
  { num: '94%',    label: 'Shortlist rate' },
  { num: '12k+',   label: 'Users helped'   },
  { num: '4.9★',   label: 'Rating'         },
  { num: 'Band 2–8', label: 'All NHS roles' },
]

// ── Shared input class ────────────────────────────────────────────────────────

const inp = `
  w-full bg-[#060D1F] border border-[#1E3A5F] rounded-lg px-3 py-2 text-[13px]
  text-[#E2EEF9] placeholder:text-[#1E3A5F] outline-none transition-all
  focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20
`

// ── Page ──────────────────────────────────────────────────────────────────────

export default function RegisterPage() {
  const router = useRouter()

  const [firstName, setFirstName] = useState("")
  const [lastName,  setLastName]  = useState("")
  const [email,     setEmail]     = useState("")
  const [password,  setPassword]  = useState("")
  const [showPw,    setShowPw]    = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/auth/register", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          name: `${firstName} ${lastName}`,
          email,
          password,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Registration failed")
      router.push("/login?registered=true")
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#060D1F] px-6 py-12">
      <div className="w-full lg:w-[60%] max-w-4xl flex border border-[#1E3A5F] rounded-2xl overflow-hidden">

        {/* ── Left: form ───────────────────────────────────────────────── */}
        <div className="flex-1 bg-[#0A1628] px-8 py-10">

          {/* Logo */}
          <div className="flex items-center gap-2 mb-8">
            <div className="w-7 h-7 rounded-lg bg-[#0D2240] border border-[#2A5080] flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-blue-400" />
            </div>
            <span className="text-[16px] font-medium text-[#E2EEF9]">Omni JobReady</span>
          </div>

          {/* Heading */}
          <div className="mb-6">
            <span className="inline-block text-[12px] font-medium tracking-widest text-blue-400 bg-[#0D2240] border border-[#1E4A7A] rounded-full px-3 py-1 mb-3">
              FREE TO START · NO CARD REQUIRED
            </span>
            <h1 className="text-[20px] font-bold text-[#E2EEF9] mb-1.5">
              Create your account
            </h1>
            <p className="text-[12px] text-[#6B8FAE] leading-relaxed">
              Join NHS applicants getting shortlisted faster with AI-powered
              statement optimisation.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 bg-red-950/50 border border-red-800/50 rounded-lg px-3 py-2.5 mb-4 text-[12px] text-red-300">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">

            {/* Name row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[13px] font-medium text-[#4A6A8A] mb-1.5 tracking-wider">
                  FIRST NAME
                </label>
                <input
                  type="text"
                  required
                  placeholder="Jane"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  className={inp}
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#4A6A8A] mb-1.5 tracking-wider">
                  LAST NAME
                </label>
                <input
                  type="text"
                  required
                  placeholder="Smith"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  className={inp}
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-[13px] font-medium text-[#4A6A8A] mb-1.5 tracking-wider">
                EMAIL ADDRESS
              </label>
              <input
                type="email"
                required
                placeholder="jane@nhs.net"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className={inp}
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-[13px] font-medium text-[#4A6A8A] mb-1.5 tracking-wider">
                PASSWORD
              </label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  required
                  minLength={8}
                  placeholder="Min. 8 characters"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className={cn(inp, "pr-10")}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#2A4A6A] hover:text-[#6B8FAE] transition-colors"
                  aria-label={showPw ? "Hide password" : "Show password"}
                >
                  {showPw
                    ? <EyeOff className="w-3.5 h-3.5" />
                    : <Eye    className="w-3.5 h-3.5" />
                  }
                </button>
              </div>
              {password && <PasswordStrength password={password} />}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-blue-700
                         hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed
                         text-white rounded-lg py-2.5 text-[13px] font-medium
                         transition-colors mt-1"
            >
              <UserPlus className="w-3.5 h-3.5" />
              {loading ? "Creating account..." : "Create account"}
            </button>

          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-3.5">
            <div className="flex-1 h-px bg-[#1E3A5F]" />
            <span className="text-[13px] text-[#2A4A6A]">or</span>
            <div className="flex-1 h-px bg-[#1E3A5F]" />
          </div>

          {/* Google */}
          <button
            onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
            className="w-full flex items-center justify-center gap-2 bg-[#060D1F]
                       border border-[#1E3A5F] hover:bg-[#0D2240] hover:border-[#2A5080]
                       rounded-lg py-2.5 text-[12px] font-medium text-[#B8D4EC]
                       transition-all"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          {/* Footer links */}
          <p className="text-center text-[13px] text-[#4A6A8A] mt-4">
            Already have an account?{" "}
            <Link href="/login" className="text-blue-400 hover:underline">
              Sign in
            </Link>
          </p>
          <p className="text-center text-[13px] text-[#2A4A6A] mt-2 leading-relaxed">
            By creating an account you agree to our{" "}
            <Link href="/terms"   className="hover:text-blue-400 transition-colors">Terms</Link>
            {" "}and{" "}
            <Link href="/privacy" className="hover:text-blue-400 transition-colors">Privacy Policy</Link>
          </p>
        </div>

        {/* ── Right: feature panel ─────────────────────────────────────── */}
        <div className="hidden lg:flex w-70 flex-col justify-center bg-[#060D1F] border-l border-[#1E3A5F] px-6 py-10 shrink-0">

          <p className="text-[13px] font-medium tracking-widest text-blue-400 mb-2">
            WHY OMNI
          </p>
          <h2 className="text-[16px] font-semibold text-[#E2EEF9] mb-2 leading-snug">
            The unfair advantage for NHS applicants
          </h2>
          <p className="text-[13px] text-[#4A6A8A] mb-6 leading-relaxed">
            AI trained on NHS recruitment — not generic job boards.
          </p>

          <div className="space-y-4">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-[#0D2240] border border-[#1E4A7A] flex items-center justify-center shrink-0">
                  <Icon className="w-3.5 h-3.5 text-blue-400" />
                </div>
                <div>
                  <p className="text-[15px] font-medium text-[#B8D4EC] mb-0.5">{title}</p>
                  <p className="text-[12px] text-[#4A6A8A] leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 mt-7 pt-6 border-t border-[#1E3A5F]">
            {stats.map(({ num, label }) => (
              <div key={label}>
                <div className="text-[15px] font-semibold text-[#E2EEF9]">{num}</div>
                <div className="text-[13px] text-[#4A6A8A]">{label}</div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}