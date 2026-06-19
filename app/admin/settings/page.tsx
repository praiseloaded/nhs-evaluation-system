'use client'

import { useState, useEffect } from 'react'
import { Loader2, Settings as SettingsIcon, Power, Check } from 'lucide-react'

interface FlagRow { id: string; key: string; label: string; description: string | null; minTier: string; enabled: boolean }
interface LimitRow { id: string; tier: string; key: string; value: number }

const TIERS = ['free', 'pro', 'elite'] as const
const TIER_LABEL: Record<string, string> = { free: 'Free', pro: 'Pro', elite: 'Elite' }
const TIER_COLOR: Record<string, string> = {
  free:  'bg-muted text-muted-foreground',
  pro:   'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300',
  elite: 'bg-violet-100 dark:bg-violet-900 text-violet-700 dark:text-violet-300',
}

const GROUP_LABELS: Record<string, string> = {
  page:      'Page-level gates',
  score:     'Score sub-dimensions',
  analysis:  'Analysis report elements',
  dashboard: 'Dashboard elements',
}

const LIMIT_LABELS: Record<string, string> = {
  analysisLimit:      'Analyses per month',
  cvProfileLimit:     'CV profiles',
  evidenceEntryLimit: 'EvidenceVault entries',
}

export default function AdminSettingsPage() {
  const [flags, setFlags] = useState<FlagRow[]>([])
  const [limits, setLimits] = useState<LimitRow[]>([])
  const [loading, setLoading] = useState(true)
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [savedKey, setSavedKey] = useState<string | null>(null)

  const load = async () => {
    const [flagsRes, limitsRes] = await Promise.all([
      fetch('/api/admin/feature-flags').then(r => r.json()),
      fetch('/api/admin/tier-limits').then(r => r.json()),
    ])
    setFlags(flagsRes.flags ?? [])
    setLimits(limitsRes.limits ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const flash = (key: string) => { setSavedKey(key); setTimeout(() => setSavedKey(null), 1200) }

  const setFlagTier = async (key: string, minTier: string) => {
    setSavingKey(key)
    await fetch('/api/admin/feature-flags', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key, minTier }) })
    setFlags(prev => prev.map(f => f.key === key ? { ...f, minTier } : f))
    setSavingKey(null); flash(key)
  }

  const toggleEnabled = async (key: string, enabled: boolean) => {
    setSavingKey(key)
    await fetch('/api/admin/feature-flags', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key, enabled }) })
    setFlags(prev => prev.map(f => f.key === key ? { ...f, enabled } : f))
    setSavingKey(null); flash(key)
  }

  const setLimit = async (tier: string, key: string, value: number) => {
    const id = `${tier}:${key}`
    setSavingKey(id)
    await fetch('/api/admin/tier-limits', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tier, key, value }) })
    setLimits(prev => prev.map(l => l.tier === tier && l.key === key ? { ...l, value } : l))
    setSavingKey(null); flash(id)
  }

  if (loading) return <div className="flex justify-center py-24"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>

  // Group flags by their 'group' field (we store group in description prefix workaround)
  // Actually flags from DB don't store group — group comes from FEATURE_CATALOG
  // We derive it from the key pattern:
  const getGroup = (key: string): string => {
    if (['mentorship','interview_simulator','career_gps','recruiter_simulator',
         'interview_probability','evidence_vault','cv_builder','shortlist_probability','momentum_score'].includes(key)) return 'page'
    if (key.startsWith('score_')) return 'score'
    if (key.startsWith('dashboard_')) return 'dashboard'
    return 'analysis'
  }

  const grouped: Record<string, FlagRow[]> = {}
  for (const f of flags) {
    const g = getGroup(f.key)
    if (!grouped[g]) grouped[g] = []
    grouped[g].push(f)
  }

  const limitKeys = [...new Set(limits.map(l => l.key))]

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-amber-600 dark:text-amber-500" /> Platform Settings
        </h1>
        <p className="text-[12.5px] mt-1 text-muted-foreground">
          Control which tier unlocks each feature and UI element. Changes apply immediately — no redeploy needed.
        </p>
      </div>

      {/* Feature groups */}
      {(['page','score','analysis','dashboard'] as const).map(group => {
        const groupFlags = grouped[group] ?? []
        if (groupFlags.length === 0) return null
        return (
          <div key={group} className="rounded-2xl bg-card border border-border overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border bg-muted/30">
              <p className="text-[13px] font-bold text-foreground">{GROUP_LABELS[group]}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {group === 'page' && 'Gate entire dashboard pages — locks users out completely'}
                {group === 'score' && 'Individual sub-score pills shown on analysis rows and reports'}
                {group === 'analysis' && 'Elements within the analysis report and detail views'}
                {group === 'dashboard' && 'KPI cards and charts on the main dashboard page'}
              </p>
            </div>
            <div className="divide-y divide-border">
              {groupFlags.map(f => (
                <div key={f.key} className={`px-5 py-4 flex items-center justify-between gap-4 flex-wrap ${!f.enabled ? 'opacity-50' : ''}`}>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[13.5px] font-medium text-foreground">{f.label}</p>
                      {savedKey === f.key && <Check className="w-3.5 h-3.5 text-emerald-500" />}
                      {savingKey === f.key && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
                      {!f.enabled && <span className="text-[10px] font-bold uppercase text-red-500 bg-red-50 dark:bg-red-950/40 px-1.5 py-0.5 rounded">Disabled</span>}
                    </div>
                    {f.description && <p className="text-[11.5px] text-muted-foreground mt-0.5">{f.description}</p>}
                    <p className="text-[10.5px] font-mono text-muted-foreground/60 mt-0.5">{f.key}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex rounded-full border border-border overflow-hidden">
                      {TIERS.map(t => (
                        <button key={t} onClick={() => setFlagTier(f.key, t)}
                          className={`px-3 py-1.5 text-[11.5px] font-semibold transition-colors ${f.minTier === t ? TIER_COLOR[t] : 'text-muted-foreground hover:bg-accent'}`}>
                          {TIER_LABEL[t]}+
                        </button>
                      ))}
                    </div>
                    <button onClick={() => toggleEnabled(f.key, !f.enabled)} title={f.enabled ? 'Disable globally' : 'Enable globally'}
                      className={`p-1.5 rounded-lg transition-colors ${f.enabled ? 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40' : 'text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40'}`}>
                      <Power className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {/* Tier limits */}
      <div className="rounded-2xl bg-card border border-border overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border bg-muted/30">
          <p className="text-[13px] font-bold text-foreground">Tier Limits</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Numeric caps per tier. Enter -1 for unlimited.</p>
        </div>
        <div className="divide-y divide-border">
          {limitKeys.map(key => (
            <div key={key} className="px-5 py-4">
              <p className="text-[13px] font-medium text-foreground mb-2.5">{LIMIT_LABELS[key] ?? key}</p>
              <div className="grid grid-cols-3 gap-3">
                {TIERS.map(tier => {
                  const row = limits.find(l => l.tier === tier && l.key === key)
                  const compositeId = `${tier}:${key}`
                  return (
                    <div key={tier}>
                      <label className="block text-[10.5px] font-semibold uppercase text-muted-foreground mb-1">{TIER_LABEL[tier]}</label>
                      <div className="relative">
                        <input type="number" defaultValue={row?.value ?? 0}
                          onBlur={e => setLimit(tier, key, Number(e.target.value))}
                          className="w-full rounded-lg px-3 py-1.5 text-[13px] font-mono bg-background border border-border text-foreground" />
                        {savedKey === compositeId && <Check className="w-3.5 h-3.5 text-emerald-500 absolute right-2 top-1/2 -translate-y-1/2" />}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}