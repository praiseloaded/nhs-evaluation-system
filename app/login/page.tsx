"use client"

import { signIn }   from "next-auth/react"
import { useState } from "react"
import Link         from "next/link"
import { Eye, EyeOff, AlertCircle, Loader2 } from "lucide-react"
import { cn }       from "@/lib/utils"

export default function LoginPage() {
  const [email,    setEmail]    = useState("")
  const [password, setPassword] = useState("")
  const [showPw,   setShowPw]   = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  async function login() {
    if (!email || !password) { setError("Please enter your email and password."); return }
    setLoading(true); setError(null)
    const res = await signIn("credentials", { email, password, redirect: false })
    setLoading(false)
    if (res?.error) { setError("Incorrect email or password."); return }
    if (res?.ok) window.location.href = "/dashboard"
    else setError("Something went wrong. Please try again.")
  }

  return (
    <div className="min-h-screen flex items-stretch bg-white dark:bg-[#09090b]">

      {/* ── Left panel ────────────────────────────────────────────────────────── */}
      <div
        className="hidden lg:flex lg:w-[42%] xl:w-[56%] flex-col relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #0d1634 10%, #091a3e 100%, #0a223a 70%, #06171e 100%)" }}
      >
        {/* Mesh overlay */}
        <div className="absolute inset-0 opacity-20"
          style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />

        {/* Large faded circle */}
        <div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] rounded-full bg-white/10" />
        <div className="absolute -top-20 -right-20 w-[300px] h-[300px] rounded-full bg-white/10" />

        <div className="relative flex flex-col justify-between h-full px-14 py-14">

          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur border border-white/30 flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <span className="text-white font-black text-[17px] tracking-tight">OmniJobReady <span className="font-light opacity-70">AI</span></span>
          </div>

          {/* Main content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur border border-white/20 rounded-full px-4 py-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
                <span className="text-white/90 text-[11px] font-semibold tracking-widest uppercase">NHS Application Platform</span>
              </div>
              <h1 className="text-[44px] font-black text-white leading-[1.1] tracking-tight">
                Get shortlisted.<br />
                <span className="text-white/50">Not overlooked.</span>
              </h1>
              <p className="text-white/60 text-[15px] leading-relaxed max-w-sm">
                AI trained on NHS recruitment. Know exactly how recruiters score your statement before you submit it.
              </p>
            </div>

            {/* Score card preview */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-5 max-w-sm space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest">Live Analysis</p>
                  <p className="text-white text-sm font-semibold mt-0.5">Band 7 Advanced Nurse Practitioner</p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-black text-white">84</div>
                  <div className="text-white/40 text-[10px]">/100</div>
                </div>
              </div>
              <div className="space-y-2.5">
                {[
                  { label: "Criteria coverage", pct: 88 },
                  { label: "NHS values",         pct: 72 },
                  { label: "STAR quality",        pct: 65 },
                ].map(({ label, pct }) => (
                  <div key={label}>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-white/60">{label}</span>
                      <span className="text-white font-bold">{pct}%</span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-white/70" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="pt-3 border-t border-white/10">
                <p className="text-white/50 text-[11px] italic">
                  "Strong candidate — 3 essential criteria need stronger STAR evidence."
                </p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-10">
            {[["94%","Shortlist rate"],["12k+","Users"],["4.9★","Rating"]].map(([n, l]) => (
              <div key={l}>
                <div className="text-2xl font-black text-white">{n}</div>
                <div className="text-white/40 text-[11px] mt-0.5">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right panel: form ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-12">
        <div className="w-full max-w-[380px] space-y-8">

          {/* Mobile logo */}
          <div className="flex items-center gap-2 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <span className="font-black text-[15px] tracking-tight text-foreground">OmniJobReady <span className="text-muted-foreground font-light">AI</span></span>
          </div>

          {/* Heading */}
          <div>
            <h2 className="text-[26px] font-black text-foreground tracking-tight">Welcome back</h2>
            <p className="text-muted-foreground text-sm mt-1">Sign in to your account</p>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2.5 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 rounded-xl px-4 py-3">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <p className="text-[12px] text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Fields */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Email</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && login()}
                placeholder="jane@nhs.net" autoFocus autoComplete="email"
                className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Password</label>
                <Link href="/forgot-password" className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"} value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && login()}
                  placeholder="••••••••" autoComplete="current-password"
                  className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 pr-11 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                />
                <button type="button" onClick={() => setShowPw(p => !p)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground transition-colors p-0.5">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Sign in button */}
            <button onClick={login} disabled={loading}
              className="w-full flex items-center justify-center cursor-pointer gap-2 py-3 rounded-xl text-[13px] font-bold text-white transition-all active:scale-[0.99] disabled:opacity-60 shadow-lg shadow-blue-500/25"
              style={{ background: "linear-gradient(135deg, #2463ec, #2463ec, #2463ec)" }}
            >
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in…</>
                : "Sign in"
              }
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-zinc-100 dark:bg-zinc-800" />
            <span className="text-[11px] text-muted-foreground">or</span>
            <div className="flex-1 h-px bg-zinc-100 dark:bg-zinc-800" />
          </div>

          {/* Google */}
          <button onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
            className="w-full cursor-pointer flex items-center justify-center gap-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl py-3 text-[13px] font-medium text-foreground transition-all">
            <svg width="16" height="16" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          {/* Register */}
          <p className="text-center text-[12px] text-muted-foreground">
            No account yet?{" "}
            <Link href="/register" className="text-blue-600 dark:text-blue-400 font-semibold hover:underline">
              Create one free →
            </Link>
          </p>

          {/* Trust */}
          <div className="flex items-center justify-center gap-1.5 pt-2">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground/40">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            <span className="text-[11px] text-muted-foreground/40">256-bit SSL encrypted · NHS compliant</span>
          </div>
        </div>
      </div>

    </div>
  )
}