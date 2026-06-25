'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Mail, ArrowLeft, ShieldCheck, CheckCircle2, Loader2 } from 'lucide-react'

const inputBase =
  'w-full rounded-xl pl-9 pr-3 py-2.5 text-sm outline-none transition border ' +
  'bg-white text-gray-900 border-gray-200 placeholder:text-gray-400 ' +
  'focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 ' +
  'dark:bg-[#080E1C]/60 dark:text-white dark:border-[#1E3A5F]/70 ' +
  'dark:placeholder:text-[#2D4A6A] dark:focus:border-blue-500'

export default function ForgotPasswordPage() {
  const [email, setEmail]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [sent, setSent]         = useState(false)
  const [error, setError]       = useState<string | null>(null)

  async function handleSubmit() {
    if (!email.trim()) { setError('Please enter your email address'); return }
    setError(null)
    setLoading(true)
    try {
      const res  = await fetch('/api/auth/forgot-password', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: email.trim().toLowerCase() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong')
      setSent(true)
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
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-blue-500 flex items-center justify-center shadow-md shadow-blue-500/20">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            <span className="font-black text-[15px] tracking-tight text-gray-900 dark:text-white">
              OmniJobReady <span className="text-blue-500">AI</span>
            </span>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-gray-200/80 dark:border-[#1E3A5F]/50 bg-white/90 dark:bg-[#0A1628]/90 shadow-xl shadow-blue-500/5 backdrop-blur-sm overflow-hidden">

          {sent ? (
            /* ── Success state ── */
            <div className="px-6 py-8 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7 text-emerald-500" />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900 dark:text-white mb-1">
                  Check your inbox
                </h2>
                <p className="text-[13px] text-gray-500 dark:text-[#4A6A8A] leading-relaxed">
                  If <span className="font-semibold text-gray-700 dark:text-slate-300">{email}</span> is registered, you'll receive a reset link shortly.
                </p>
              </div>
              <p className="text-[12px] text-gray-400 dark:text-[#2D4A6A]">
                Didn't get it? Check your spam folder or{' '}
                <button
                  onClick={() => { setSent(false); setEmail('') }}
                  className="text-blue-500 hover:underline"
                >
                  try again
                </button>
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-[12px] text-blue-600 dark:text-blue-400 hover:underline mt-2"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
              </Link>
            </div>
          ) : (
            /* ── Form state ── */
            <>
              <div className="px-6 pt-6 pb-1">
                <h1 className="text-[15px] font-bold text-gray-900 dark:text-white mb-1">
                  Reset your password
                </h1>
                <p className="text-[12px] text-gray-500 dark:text-[#4A6A8A] leading-relaxed">
                  Enter the email you registered with and we'll send a reset link.
                </p>
              </div>

              <div className="px-6 pb-5 pt-4 space-y-4">

                {/* Error */}
                {error && (
                  <div className="flex items-center gap-2.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 px-3 py-2.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                    <p className="text-[12px] text-red-600 dark:text-red-400">{error}</p>
                  </div>
                )}

                {/* Email input */}
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 dark:text-[#4A6A8A] uppercase tracking-wider mb-1.5">
                    Email address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-[#2D4A6A]" />
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                      className={inputBase}
                      placeholder="you@example.com"
                      autoFocus
                      autoComplete="email"
                    />
                  </div>
                </div>

                {/* Submit */}
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 disabled:opacity-50 text-white rounded-xl py-2.5 text-[13px] font-semibold transition-all active:scale-[0.99] shadow-md shadow-blue-500/20"
                >
                  {loading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Sending link...</>
                  ) : (
                    <>Send reset link</>
                  )}
                </button>

                {/* Back to login */}
                <div className="text-center">
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-1.5 text-[12px] text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
                  </Link>
                </div>
              </div>
            </>
          )}

          {/* Footer */}
          <div className="px-5 py-3 border-t border-gray-100 dark:border-[#1E3A5F]/40 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
            <span className="text-[11px] text-gray-400 dark:text-[#2D4A6A]">
              256-bit SSL encrypted
            </span>
          </div>
        </div>

      </div>
    </div>
  )
}