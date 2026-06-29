// app/dashboard/settings/page.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import {
  ArrowLeft, Lock, Bell, Palette, Download, HelpCircle,
  CheckCircle2, Loader2, User, Mail, Edit3, Save, X,
  ExternalLink, Shield, Sparkles,
} from 'lucide-react'
import { ThemeSwitcher } from '@/components/theme-switcher'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface UserData { id: string; name: string; email: string; tier: string }

export default function SettingsPage() {
  const { data: session, update: updateSession } = useSession()
  const [user,       setUser]       = useState<UserData | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [editName,   setEditName]   = useState(false)
  const [nameValue,  setNameValue]  = useState('')
  const [saving,     setSaving]     = useState(false)
  const [saveDone,   setSaveDone]   = useState(false)
  const [exporting,  setExporting]  = useState(false)
  const [error,      setError]      = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(d => { if (d.user) { setUser(d.user); setNameValue(d.user.name || '') } })
      .catch(() => setError('Could not load profile'))
      .finally(() => setLoading(false))
  }, [])

  const saveName = async () => {
    if (!nameValue.trim() || nameValue.trim() === user?.name) { setEditName(false); return }
    setSaving(true); setError(null)
    try {
      const res  = await fetch('/api/settings', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name: nameValue.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Update failed')
      setUser(prev => prev ? { ...prev, name: data.user.name } : prev)
      await updateSession({ name: data.user.name })
      setEditName(false)
      setSaveDone(true)
      setTimeout(() => setSaveDone(false), 3000)
    } catch (e: any) { setError(e.message) }
    finally { setSaving(false) }
  }

  const exportData = async () => {
    setExporting(true)
    try {
      const res  = await fetch('/api/settings', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action: 'export' }),
      })
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `omnijobready-export-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e: any) { setError(e.message) }
    finally { setExporting(false) }
  }

  const tierLabel = user?.tier === 'elite' ? 'Elite' : user?.tier === 'pro' ? 'Pro' : 'Free'
  const tierColor =
    user?.tier === 'elite' ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800' :
    user?.tier === 'pro'   ? 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800' :
                             'bg-muted text-muted-foreground border-border'

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-8">
      <div>
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-3 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
        </Link>
        <h1 className="text-2xl font-black text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your account and preferences</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 dark:bg-red-950/30 dark:border-red-800 rounded-xl px-4 py-3 text-sm text-red-700 dark:text-red-300">
          <X className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {saveDone && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800 rounded-xl px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="w-4 h-4 shrink-0" /> Profile updated successfully
        </div>
      )}

      {/* Account */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-muted/30">
          <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950/50 flex items-center justify-center">
            <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">Account</p>
            <p className="text-xs text-muted-foreground">Your profile information</p>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading…
            </div>
          ) : (
            <>
              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Display name</label>
                {editName ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={nameValue}
                      onChange={e => setNameValue(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditName(false) }}
                      className="flex-1 bg-background border border-border rounded-xl px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                      autoFocus
                    />
                    <Button onClick={saveName} disabled={saving}
                      className="p-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors">
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    </Button>
                    <Button onClick={() => { setEditName(false); setNameValue(user?.name || '') }}
                      className="p-2 rounded-xl border border-border text-muted-foreground hover:text-foreground transition-colors">
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between rounded-xl border border-border bg-muted/20 px-4 py-2.5">
                    <p className="text-sm text-foreground">{user?.name || 'Not set'}</p>
                    <button onClick={() => setEditName(true)}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                      <Edit3 className="w-3.5 h-3.5" /> Edit
                    </button>
                  </div>
                )}
              </div>

              {/* Email — read only */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email address</label>
                <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/20 px-4 py-2.5">
                  <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                  <p className="text-sm text-foreground flex-1">{user?.email}</p>
                  <span className="text-[10px] text-muted-foreground border border-border rounded-full px-2 py-0.5">Read-only</span>
                </div>
              </div>

              {/* Tier */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Account tier</label>
                <div className="flex items-center justify-between rounded-xl border border-border bg-muted/20 px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-muted-foreground" />
                    <span className={`text-xs font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${tierColor}`}>
                      {tierLabel}
                    </span>
                  </div>
                  {user?.tier === 'free' && (
                    <Link href="/upgrade"
                      className="text-xs font-bold text-primary hover:text-primary/80 flex items-center gap-1 transition-colors">
                      <Sparkles className="w-3.5 h-3.5" /> Upgrade to Pro
                    </Link>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Password */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-muted/30">
          <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-950/50 flex items-center justify-center">
            <Lock className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">Password & Security</p>
            <p className="text-xs text-muted-foreground">Manage your login credentials</p>
          </div>
        </div>
        <div className="p-6 space-y-3">
          <p className="text-sm text-muted-foreground">
            Password changes are handled securely via email. Click below to receive a password reset link.
          </p>
          <button
            onClick={async () => {
              if (!user?.email) return
              try {
                await fetch('/api/auth/forgot-password', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ email: user.email }),
                })
                alert('Password reset email sent to ' + user.email)
              } catch { alert('Please contact support to reset your password.') }
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors">
            <Lock className="w-3.5 h-3.5" /> Send password reset email
          </button>
        </div>
      </div>

      {/* Notifications */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-muted/30">
          <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center">
            <Bell className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">Notifications</p>
            <p className="text-xs text-muted-foreground">Control what you receive</p>
          </div>
        </div>
        <div className="p-6">
          <p className="text-sm text-muted-foreground mb-4">
            In-app notifications are sent automatically for analysis completions, application reminders, and account updates.
            View and manage them via the bell icon in the sidebar.
          </p>
          <Link href="/dashboard" className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 font-medium transition-colors">
            <Bell className="w-4 h-4" /> View notifications <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Appearance */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-muted/30">
          <div className="w-9 h-9 rounded-xl bg-teal-100 dark:bg-teal-950/50 flex items-center justify-center">
            <Palette className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">Appearance</p>
            <p className="text-xs text-muted-foreground">Theme and display preferences</p>
          </div>
        </div>
        <div className="p-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">Colour theme</p>
            <p className="text-xs text-muted-foreground mt-0.5">Switches between light and dark mode</p>
          </div>
          <ThemeSwitcher />
        </div>
      </div>

      {/* Export */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-muted/30">
          <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center">
            <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">Export your data</p>
            <p className="text-xs text-muted-foreground">Download everything in JSON format</p>
          </div>
        </div>
        <div className="p-6 space-y-3">
          <p className="text-sm text-muted-foreground">
            Download a full export of your analyses, applications, and CV profiles. Useful for backup or portability.
          </p>
          <button onClick={exportData} disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-sm font-semibold transition-colors">
            {exporting
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Preparing export…</>
              : <><Download className="w-4 h-4" /> Download my data</>}
          </button>
        </div>
      </div>

      {/* Help */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-muted/30">
          <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-950/50 flex items-center justify-center">
            <HelpCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">Help & Support</p>
            <p className="text-xs text-muted-foreground">Get assistance with OmniJobReady</p>
          </div>
        </div>
        <div className="p-6 space-y-3">
          <p className="text-sm text-muted-foreground">
            Having trouble? Contact us and we'll get back to you within one business day.
          </p>
          <a href="mailto:support@omnijobready.com"
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors w-fit">
            <Mail className="w-3.5 h-3.5" /> support@omnijobready.com
          </a>
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground pb-4">OmniJobReady AI™ · All rights reserved</p>
    </div>
  )
}