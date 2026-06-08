'use client'

import { useEffect, useState } from "react"

/* ───────────────────────── THEME ───────────────────────── */

export function useTheme() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    const saved = localStorage.getItem("theme") as 'dark' | 'light' | null
    if (saved) setTheme(saved)
  }, [])

  useEffect(() => {
    localStorage.setItem("theme", theme)
    document.documentElement.classList.toggle("dark", theme === "dark")
  }, [theme])

  return { theme, setTheme }
}

/* ───────────────────────── TOAST ───────────────────────── */

export function useToast() {
  const [toasts, setToasts] = useState<
    { id: number; msg: string; type: "success" | "error" }[]
  >([])

  const toast = (msg: string, type: "success" | "error" = "success") => {
    const id = Date.now()
    setToasts((t) => [...t, { id, msg, type }])

    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id))
    }, 3000)
  }

  const ToastContainer = () => (
    <div className="fixed bottom-5 right-5 space-y-2 z-50">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`
            px-4 py-2 rounded-lg shadow-md text-sm border
            ${
              t.type === "success"
                ? "bg-green-500/10 text-green-600 border-green-500/20"
                : "bg-red-500/10 text-red-600 border-red-500/20"
            }
          `}
        >
          {t.msg}
        </div>
      ))}
    </div>
  )

  return { toast, ToastContainer }
}