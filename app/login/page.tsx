"use client";

import { signIn } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Eye,
  EyeOff,
  LogIn,
  AlertCircle,
  Moon,
  Sun,
  Mail,
  Lock,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import Toastify from "toastify-js";
import "toastify-js/src/toastify.css";

const inputBase =
  "w-full rounded-xl pl-9 pr-3 py-2.5 text-sm outline-none transition border " +
  "bg-white text-gray-900 border-gray-200 placeholder:text-gray-400 " +
  "focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 " +
  "dark:bg-[#080E1C]/60 dark:text-white dark:border-[#1E3A5F]/70 " +
  "dark:placeholder:text-[#2D4A6A] dark:focus:border-blue-500";

function showSuccessToast() {
  const node = document.createElement("div");
  node.style.cssText =
    "display:flex;align-items:center;gap:10px;font-family:system-ui,sans-serif";

  const iconWrap = document.createElement("div");
  iconWrap.style.cssText =
    "width:22px;height:22px;border-radius:50%;background:rgba(255,255,255,0.25);" +
    "display:flex;align-items:center;justify-content:center;flex-shrink:0;" +
    "animation:rollIn 0.4s ease-out;";
  iconWrap.innerHTML = `<svg width="11" height="11" viewBox="0 0 12 12" fill="none">
    <path d="M2 6l3 3 5-5" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;

  const textWrap = document.createElement("div");
  textWrap.innerHTML = `
    <div style="font-size:13px;font-weight:600;color:#fff;line-height:1.2">Login successful</div>
    <div style="font-size:11px;color:rgba(255,255,255,0.65);margin-top:2px">Redirecting to your dashboard…</div>
  `;

  // Inject keyframe once
  if (!document.getElementById("toast-keyframe")) {
    const style = document.createElement("style");
    style.id = "toast-keyframe";
    style.textContent = `
      @keyframes rollIn {
        from { transform: rotate(-180deg) scale(0.5); opacity: 0; }
        to   { transform: rotate(0deg) scale(1);    opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }

  node.appendChild(iconWrap);
  node.appendChild(textWrap);

  Toastify({
    node,
    duration: 3500,
    gravity: "top",
    position: "right",
    stopOnFocus: true,
    style: {
      background: "linear-gradient(135deg, #1d4ed8, #2563eb)",
      borderRadius: "12px",
      padding: "12px 16px",
      boxShadow: "0 8px 24px rgba(37,99,235,0.35)",
      border: "1px solid rgba(96,165,250,0.3)",
      minWidth: "220px",
    },
  }).showToast();
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  const router = useRouter();

  useEffect(() => {
    const saved = localStorage.getItem("theme") as "light" | "dark" | null;
    const initial =
      saved ??
      (window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light");
    setTheme(initial);
    document.documentElement.classList.toggle("dark", initial === "dark");
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
  };

  const login = async () => {
    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);
    setError(null);

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      setError("Invalid credentials. Please try again.");
      return;
    }

    if (res?.ok) {
      showSuccessToast();
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 1500);
    } else {
      setError("Something went wrong. Please try again.");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") login();
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f0f4ff] via-[#e8effe] to-[#f0f4ff] dark:from-[#050A16] dark:via-[#060D1F] dark:to-[#050A16] px-6 overflow-hidden">

      {/* Background glows */}
      <div className="absolute w-[420px] h-[420px] bg-blue-500/[0.07] blur-[80px] rounded-full top-[-100px] left-[-100px] pointer-events-none" />
      <div className="absolute w-[320px] h-[320px] bg-indigo-500/[0.07] blur-[70px] rounded-full bottom-[-100px] right-[-80px] pointer-events-none" />
      <div className="absolute w-[200px] h-[200px] bg-blue-400/[0.05] blur-[50px] rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="relative w-full max-w-[400px]"
      >
        <div className="rounded-[20px] border border-gray-200/80 dark:border-[#1E3A5F]/80 bg-white/90 dark:bg-[#0B1220]/85 backdrop-blur-xl overflow-hidden shadow-2xl">

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-[#1E3A5F]/60">
            <div className="flex items-center gap-2.5">
              <div className="w-[34px] h-[34px] rounded-[10px] bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-md">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-4 0v2"/><line x1="12" y1="12" x2="12" y2="16"/><circle cx="12" cy="12" r="1" fill="white"/>
                </svg>
              </div>
              <span className="font-semibold text-[14px] tracking-tight text-gray-900 dark:text-slate-200">
                Omni JobReady
              </span>
            </div>

            <button
              onClick={toggleTheme}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 dark:hover:bg-[#13213A] transition text-gray-500 dark:text-[#7AA2C6]"
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4 text-yellow-400" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Body */}
          <div className="p-5 flex flex-col gap-4">

            {/* Title */}
            <div>
              <p className="text-[10px] font-bold tracking-[0.1em] text-blue-600 dark:text-blue-400 uppercase">
                NHS Application Platform
              </p>
              <h1 className="text-[22px] font-bold tracking-tight text-gray-900 dark:text-slate-100 mt-1">
                Welcome back
              </h1>
              <p className="text-[13px] text-gray-500 dark:text-[#64748b] mt-0.5">
                Sign in to your dashboard
              </p>
            </div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-start gap-2 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-xl px-3 py-2.5 text-[12px] text-red-600 dark:text-red-300"
                >
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold tracking-[0.07em] text-gray-400 dark:text-[#4A6A8A] uppercase">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-[#4A6A8A] pointer-events-none" />
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={handleKeyDown}
                  type="email"
                  className={inputBase}
                  placeholder="jane@nhs.net"
                />
              </div>
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold tracking-[0.07em] text-gray-400 dark:text-[#4A6A8A] uppercase">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-[#4A6A8A] pointer-events-none" />
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className={cn(inputBase, "pr-10")}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-[#4A6A8A] hover:text-gray-600 dark:hover:text-slate-300 transition"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Forgot */}
            <div className="-mt-2 text-right">
              <Link
                href="/forgot-password"
                className="text-[12px] text-blue-600 dark:text-blue-400 hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            {/* Sign in button */}
            <button
              onClick={login}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 disabled:opacity-50 text-white rounded-xl py-2.5 text-[13px] font-semibold transition-all active:scale-[0.99] shadow-md shadow-blue-500/20"
            >
              {loading ? (
                <>
                  <svg
                    className="w-4 h-4 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12" cy="12" r="10"
                      stroke="currentColor" strokeWidth="3"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    />
                  </svg>
                  Signing in...
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Sign in
                </>
              )}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="h-px bg-gray-200 dark:bg-[#1E3A5F]/60 flex-1" />
              <span className="text-[11px] text-gray-400 dark:text-[#2D4A6A]">
                or continue with
              </span>
              <div className="h-px bg-gray-200 dark:bg-[#1E3A5F]/60 flex-1" />
            </div>

            {/* Google */}
            <button
              onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
              className="w-full border border-gray-200 dark:border-[#1E3A5F]/70 rounded-xl py-2.5 text-[13px] flex items-center justify-center gap-2.5 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-[#13213A] hover:border-blue-300 dark:hover:border-blue-500/30 hover:text-gray-900 dark:hover:text-slate-200 transition"
            >
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google
            </button>

            {/* Register */}
            <p className="text-center text-[12px] text-gray-500 dark:text-[#2D4A6A]">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="text-blue-600 dark:text-blue-400 hover:underline">
                Create one
              </Link>
            </p>
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-gray-100 dark:border-[#1E3A5F]/40 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
            <span className="text-[11px] text-gray-400 dark:text-[#2D4A6A]">
              256-bit SSL encrypted · NHS compliant
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}