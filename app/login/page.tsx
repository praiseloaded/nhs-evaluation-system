'use client'

import { signIn } from "next-auth/react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Eye, EyeOff, LogIn, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

const inp = `
  w-full bg-[#060D1F] border border-[#1E3A5F] rounded-lg px-3 py-2 text-[13px]
  text-[#E2EEF9] placeholder:text-[#1E3A5F] outline-none transition-all
  focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20
`

export default function LoginPage() {
  const [email,    setEmail]    = useState("")
  const [password, setPassword] = useState("")
  const [showPw,   setShowPw]   = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const router = useRouter()

  const handleCredentialsLogin = async () => {
    if (!email || !password) {
      setError("Please enter your email and password.")
      return
    }

    setLoading(true)
    setError(null)

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    })

    setLoading(false)

    if (res?.error) {
      setError("Invalid email or password.")
      return
    }

    router.push("/dashboard")
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#060D1F] px-6 py-12">
      <div className="w-full lg:w-[40%] max-w-md border border-[#1E3A5F] rounded-2xl overflow-hidden">
        <div className="bg-[#0A1628] px-8 py-10">

          {/* Logo */}
          <div className="flex items-center gap-2 mb-8">
            <div className="w-7 h-7 rounded-lg bg-[#0D2240] border border-[#2A5080] flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-blue-400" />
            </div>
            <span className="text-[20px] font-medium text-[#E2EEF9]">Omni JobReady</span>
          </div>

          {/* Heading */}
          <div className="mb-6">
            <span className="inline-block text-[12px] font-medium tracking-widest text-blue-400 bg-[#0D2240] border border-[#1E4A7A] rounded-full px-3 py-1 mb-3">
              NHS APPLICATION PLATFORM
            </span>
            <h1 className="text-[19px] font-semibold text-[#E2EEF9] mb-4">
              Welcome back
            </h1>
            <p className="text-[14px] text-[#6B8FAE] leading-relaxed">
              Sign in to your NHS dashboard and continue where you left off.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 bg-red-950/50 border border-red-800/50 rounded-lg px-3 py-2.5 mb-4 text-[12px] text-red-300">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-3">

            {/* Email */}
            <div>
              <label className="block text-[13px] font-medium text-[#4A6A8A] mb-1.5 tracking-wider">
                EMAIL ADDRESS
              </label>
              <input
                type="email"
                placeholder="jane@nhs.net"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleCredentialsLogin()}
                className={inp}
              />
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[13px] font-medium text-[#4A6A8A] tracking-wider">
                  PASSWORD
                </label>
                <Link href="/forgot-password" className="text-[10px] text-blue-400 hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleCredentialsLogin()}
                  className={cn(inp, "pr-10")}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#2A4A6A] hover:text-[#6B8FAE] transition-colors"
                  aria-label={showPw ? "Hide password" : "Show password"}
                >
                  {showPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Sign in */}
            <button
              onClick={handleCredentialsLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-blue-700
                         hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed
                         text-white rounded-lg py-2.5 text-[13px] font-medium
                         transition-colors mt-1"
            >
              <LogIn className="w-3.5 h-3.5" />
              {loading ? "Signing in..." : "Sign in"}
            </button>

          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 my-3.5">
            <div className="flex-1 h-px bg-[#1E3A5F]" />
            <span className="text-[10px] text-[#2A4A6A]">or</span>
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

          {/* Footer */}
          <p className="text-center text-[11px] text-[#4A6A8A] mt-4">
            Don't have an account?{" "}
            <Link href="/register" className="text-blue-400 hover:underline">
              Create one free
            </Link>
          </p>
          <p className="text-center text-[10px] text-[#2A4A6A] mt-2 leading-relaxed">
            By signing in you agree to our{" "}
            <Link href="/terms" className="hover:text-blue-400 transition-colors">Terms</Link>
            {" "}and{" "}
            <Link href="/privacy" className="hover:text-blue-400 transition-colors">Privacy Policy</Link>
          </p>

        </div>
      </div>
    </div>
  )
}