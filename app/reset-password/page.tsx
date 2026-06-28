'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Lock, Eye, EyeOff, ShieldCheck, CheckCircle2, Loader2, AlertCircle } from 'lucide-react'

const inputBase =
  'w-full rounded-xl pl-9 pr-10 py-2.5 text-sm outline-none transition border ' +
  'bg-white text-gray-900 border-gray-200 placeholder:text-gray-400 ' +
  'focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 ' +
  'dark:bg-[#080E1C]/60 dark:text-white dark:border-[#1E3A5F]/70 ' +
  'dark:placeholder:text-[#2D4A6A] dark:focus:border-blue-500'

function ResetPasswordForm() {
  const params   = useSearchParams()
  const router   = useRouter()
  const token    = params.get('token') ?? ''
  const email    = params.get('email') ?? ''

  const [password,  setPassword]  = useState('')
  const [confirm,   setConfirm]   = useState('')
  const [showPw,    setShowPw]    = useState(false)
  const [showConf,  setShowConf]  = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [done,      setDone]      = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  const strength = password.length === 0 ? 0
    : password.length < 6 ? 1
    : password.length < 10 ? 2
    : /[A-Z]/.test(password) && /[0-9]/.test(password) ? 4 : 3

  const strengthLabel = ['', 'Too short', 'Weak', 'Good', 'Strong']
  const strengthColor = ['', 'bg-red-400', 'bg-amber-400', 'bg-blue-400', 'bg-emerald-400']

  useEffect(() => {
    if (!token || !email) setError('Invalid or expired reset link. Please request a new one.')
  }, [token, email])

  async function handleSubmit() {
    setError(null)
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    if (password !== confirm) { setError('Passwords do not match'); return }
    setLoading(true)
    try {
      const res  = await fetch('/api/auth/reset-password', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ token, email, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Reset failed')
      setDone(true)
      setTimeout(() => router.push('/login'), 3000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 dark:from-[#030812] dark:via-[#060D1F] dark:to-[#080E1C] px-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-amber-500 flex items-center justify-center shadow-md shadow-blue-500/20">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            <span className="font-black text-[15px] tracking-tight text-gray-900 dark:text-white">
              OmniJobReady <span className="text-blue-500">AI</span>
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200/80 dark:border-[#1E3A5F]/50 bg-white/90 dark:bg-[#0A1628]/90 shadow-xl shadow-blue-500/5 backdrop-blur-sm overflow-hidden">

          {done ? (
            <div className="px-6 py-8 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7 text-emerald-500" />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900 dark:text-white mb-1">Password updated</h2>
                <p className="text-[13px] text-gray-500 dark:text-[#4A6A8A]">
                  Redirecting you to sign in…
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="px-6 pt-6 pb-1">
                <h1 className="text-[15px] font-bold text-gray-900 dark:text-white mb-1">Choose a new password</h1>
                <p className="text-[12px] text-gray-500 dark:text-[#4A6A8A]">
                  {email && <span>For <span className="font-semibold text-gray-700 dark:text-slate-300">{email}</span></span>}
                </p>
              </div>

              <div className="px-6 pb-5 pt-4 space-y-4">

                {error && (
                  <div className="flex items-start gap-2.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 px-3 py-2.5">
                    <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-[12px] text-red-600 dark:text-red-400">{error}</p>
                  </div>
                )}

                {/* New password */}
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 dark:text-[#4A6A8A] uppercase tracking-wider mb-1.5">
                    New password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-[#2D4A6A]" />
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className={inputBase}
                      placeholder="Minimum 8 characters"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-[#4A6A8A] hover:text-gray-600 dark:hover:text-slate-300 transition"
                    >
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {/* Strength bar */}
                  {password.length > 0 && (
                    <div className="mt-2 space-y-1">
                      <div className="flex gap-1">
                        {[1,2,3,4].map(i => (
                          <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= strength ? strengthColor[strength] : 'bg-gray-200 dark:bg-[#1E3A5F]/40'}`} />
                        ))}
                      </div>
                      <p className="text-[11px] text-gray-400 dark:text-[#2D4A6A]">{strengthLabel[strength]}</p>
                    </div>
                  )}
                </div>

                {/* Confirm password */}
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 dark:text-[#4A6A8A] uppercase tracking-wider mb-1.5">
                    Confirm password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-[#2D4A6A]" />
                    <input
                      type={showConf ? 'text' : 'password'}
                      value={confirm}
                      onChange={e => setConfirm(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                      className={`${inputBase} ${confirm && confirm !== password ? 'border-red-300 dark:border-red-700 focus:border-red-400' : ''}`}
                      placeholder="Re-enter your password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConf(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-[#4A6A8A] hover:text-gray-600 dark:hover:text-slate-300 transition"
                    >
                      {showConf ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {confirm && confirm !== password && (
                    <p className="text-[11px] text-red-500 mt-1">Passwords do not match</p>
                  )}
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={loading || !token}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 disabled:opacity-50 text-white rounded-xl py-2.5 text-[13px] font-semibold transition-all active:scale-[0.99] shadow-md shadow-blue-500/20"
                >
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Updating…</> : 'Set new password'}
                </button>

                <div className="text-center">
                  <Link href="/login" className="text-[12px] text-blue-600 dark:text-blue-400 hover:underline">
                    Back to sign in
                  </Link>
                </div>
              </div>
            </>
          )}

          <div className="px-5 py-3 border-t border-gray-100 dark:border-[#1E3A5F]/40 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
            <span className="text-[11px] text-gray-400 dark:text-[#2D4A6A]">256-bit SSL encrypted · NHS compliant</span>
          </div>
        </div>

      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  )
}