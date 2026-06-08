"use client";

import { signIn } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, LogIn, AlertCircle, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const inputBase =
  "w-full rounded-xl px-3 py-2 text-sm outline-none transition border " +
  "bg-white text-gray-900 border-gray-200 placeholder:text-gray-400 " +
  "focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 " +
  "dark:bg-[#0B1220] dark:text-white dark:border-[#1E3A5F]";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const router = useRouter();

  // ── Theme init ──
  useEffect(() => {
    const saved = localStorage.getItem("theme") as "light" | "dark" | null;
    const initial =
      saved ?? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");

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
      setError("Please enter email and password");
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
      setError("Invalid credentials");
      return;
    }

    router.push("/dashboard");
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-[#050A16] dark:via-[#060D1F] dark:to-[#050A16] px-6 overflow-hidden">

      {/* Background glow (Auth0 style depth) */}
      <div className="absolute w-[500px] h-[500px] bg-blue-500/10 blur-3xl rounded-full top-[-120px] left-[-120px]" />
      <div className="absolute w-[400px] h-[400px] bg-indigo-500/10 blur-3xl rounded-full bottom-[-120px] right-[-120px]" />

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="relative w-full max-w-md"
      >
        <div className="rounded-2xl border border-gray-200 dark:border-[#1E3A5F] bg-white/80 dark:bg-[#0B1220]/80 backdrop-blur-xl shadow-2xl overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-[#1E3A5F]">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-md">
                <div className="w-2 h-2 bg-white rounded-full" />
              </div>
              <span className="font-semibold text-gray-900 dark:text-white">
                Omni JobReady
              </span>
            </div>

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#13213A] transition"
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4 text-yellow-400" />
              ) : (
                <Moon className="w-4 h-4 text-gray-700" />
              )}
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-5">

            {/* Title */}
            <div>
              <p className="text-xs tracking-widest text-blue-600 dark:text-blue-400 font-semibold">
                NHS APPLICATION PLATFORM
              </p>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                Welcome back
              </h1>
              <p className="text-sm text-gray-500 dark:text-[#7AA2C6] mt-1">
                Sign in to continue your dashboard
              </p>
            </div>

            {/* Error */}
            {error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-start gap-2 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl px-3 py-2 text-sm text-red-600 dark:text-red-300"
              >
                <AlertCircle className="w-4 h-4 mt-0.5" />
                {error}
              </motion.div>
            )}

            {/* Email */}
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-[#6B8FAE]">
                EMAIL
              </label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputBase}
                placeholder="jane@nhs.net"
              />
            </div>

            {/* Password */}
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-[#6B8FAE]">
                PASSWORD
              </label>

              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={cn(inputBase, "pr-10")}
                  placeholder="••••••••"
                />

                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-white"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Login */}
            <button
              onClick={login}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-semibold transition-all active:scale-[0.99]"
            >
              <LogIn className="w-4 h-4" />
              {loading ? "Signing in..." : "Sign in"}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="h-px bg-gray-200 dark:bg-[#1E3A5F] flex-1" />
              <span className="text-xs text-gray-400">or</span>
              <div className="h-px bg-gray-200 dark:bg-[#1E3A5F] flex-1" />
            </div>

            {/* Google */}
            <button
              onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
              className="w-full border border-gray-200 dark:border-[#1E3A5F] rounded-xl py-2.5 text-sm flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-[#13213A] transition"
            >
              Continue with Google
            </button>

            {/* Footer */}
            <p className="text-center text-xs text-gray-500 dark:text-[#6B8FAE]">
              Don’t have an account?{" "}
              <Link href="/register" className="text-blue-600 hover:underline">
                Create one
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}