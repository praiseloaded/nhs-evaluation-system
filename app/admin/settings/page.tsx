// app/admin/settings/page.tsx — Enhanced with pricing & Stripe management
'use client'

import { useState, useEffect } from 'react'
import {
  Loader2, Settings as SettingsIcon, Power, Check,
  CreditCard, Zap, AlertTriangle, ExternalLink,
  RefreshCw, DollarSign, Package, ArrowUpRight,
} from 'lucide-react'

interface FlagRow   { id: string; key: string; label: string; description: string | null; minTier: string; enabled: boolean }
interface LimitRow  { id: string; tier: string; key: string; value: number }

const TIERS = ['free', 'pro', 'elite'] as const
const TIER_LABEL: Record<string, string> = { free: 'Free', pro: 'Pro', elite: 'Elite' }
const TIER_COLOR: Record<string, string> = {
  free:  'bg-muted text-muted-foreground',
  pro:   'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300',
  elite: 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300',
}

const LIMIT_LABELS: Record<string, string> = {
  analysisLimit:      'Analyses per month',
  cvProfileLimit:     'CV profiles',
  evidenceEntryLimit: 'EvidenceVault entries',
}

const GROUP_LABELS: Record<string, string> = {
  page:      'Page-level feature gates',
  score:     'Score sub-dimensions',
  analysis:  'Analysis report elements',
  dashboard: 'Dashboard elements',
}

type Tab = 'features' | 'limits' | 'pricing' | 'stripe'

// ── Pricing card ───────────────────────────────────────────────────────────────

function PricingCard({
  tier, currentPrice, onSave,
}: {
  tier: string
  currentPrice: number
  onSave: (tier: string, price: number) => Promise<any>
}) {
  const [price,   setPrice]   = useState(currentPrice.toString())
  const [saving,  setSaving]  = useState(false)
  const [result,  setResult]  = useState<any>(null)
  const [error,   setError]   = useState<string | null>(null)

  const isFree = tier === 'free'

  async function save() {
    setSaving(true); setError(null); setResult(null)
    const res = await onSave(tier, parseFloat(price))
    if (res.error) setError(res.stripeError ?? res.error)
    else setResult(res)
    setSaving(false)
  }

  return (
    <div className={`rounded-2xl border-2 p-5 space-y-4 ${
      tier === 'pro'   ? 'border-blue-300 dark:border-blue-700' :
      tier === 'elite' ? 'border-amber-300 dark:border-amber-700' :
      'border-border'
    }`}>
      <div className="flex items-center justify-between">
        <div>
          <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${TIER_COLOR[tier]}`}>
            {TIER_LABEL[tier]}
          </span>
          <p className="text-[11px] text-muted-foreground mt-1.5">
            {tier === 'free' ? 'Always £0 — marketing tier' : `Billed monthly via Stripe`}
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-black text-foreground">£{isFree ? '0' : price || '—'}</p>
          <p className="text-[10px] text-muted-foreground">/month</p>
        </div>
      </div>

      {!isFree && (
        <div className="space-y-2">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Monthly price (£)
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">£</span>
              <input type="number" value={price} onChange={e => setPrice(e.target.value)}
                min="0" step="0.01" placeholder="19.00"
                className="w-full pl-7 pr-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
              />
            </div>
            <button onClick={save} disabled={saving}
              className={`px-4 py-2 rounded-xl text-[13px] font-bold text-white transition-all disabled:opacity-50 ${
                tier === 'pro' ? 'bg-gradient-to-br from-red-500 to-amber-500 hover:bg-blue-700' : 'bg-amber-500 hover:bg-amber-600'
              }`}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save & sync'}
            </button>
          </div>
        </div>
      )}

      {result && (
        <div className="flex items-start gap-2 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl px-3 py-2.5">
          <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
          <div className="text-[11px] text-emerald-700 dark:text-emerald-300">
            <p className="font-semibold">Price updated to £{result.monthlyPrice}/month</p>
            {result.stripePriceId && <p className="opacity-70 font-mono">{result.stripePriceId}</p>}
            {result.warning && <p className="text-amber-600 dark:text-amber-400 mt-1">{result.warning}</p>}
          </div>
        </div>
      )}
      {error && (
        <div className="flex items-start gap-2 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl px-3 py-2.5">
          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <p className="text-[11px] text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}
    </div>
  )
}

// ── Stripe status ──────────────────────────────────────────────────────────────

function StripePanel() {
  const [data,    setData]    = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/revenue?period=30')
      .then(r => r.json())
      .then(d => { if (d.error) throw new Error(d.error); setData(d) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
  if (error)   return (
    <div className="rounded-2xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20 p-5">
      <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4" /> {error}
      </p>
      <p className="text-[11px] text-muted-foreground mt-1">Check your STRIPE_SECRET_KEY environment variable.</p>
    </div>
  )

  return (
    <div className="space-y-5">
      {/* Stripe health banner */}
      <div className="flex items-center gap-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl px-5 py-3.5">
        <div className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
        </div>
        <div>
          <p className="text-[13px] font-semibold text-foreground">Stripe connected</p>
          <p className="text-[11px] text-muted-foreground">Live mode · GBP</p>
        </div>
        <a href="https://dashboard.stripe.com" target="_blank" rel="noopener noreferrer"
          className="ml-auto flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 hover:underline">
          Open Stripe dashboard <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* Revenue stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'MRR',                  value: `£${data.mrr?.toFixed(2) ?? '0.00'}`,    icon: DollarSign, color: 'text-emerald-500' },
          { label: 'Active subscriptions', value: data.activeSubscriptions ?? 0,            icon: Package,    color: 'text-blue-500'    },
          { label: 'Cancelled (30d)',       value: data.cancelledThisPeriod ?? 0,           icon: AlertTriangle, color: 'text-amber-500' },
          { label: 'Revenue (30d)',         value: `£${data.periodRevenue?.toFixed(2) ?? '0.00'}`, icon: Zap, color: 'text-violet-500' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-2xl border border-border bg-card p-4">
            <Icon className={`w-4 h-4 ${color} mb-2`} />
            <p className="text-xl font-black text-foreground">{value}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Recent payments */}
      {data.recentPayments?.length > 0 && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border bg-muted/30 flex items-center justify-between">
            <p className="text-[13px] font-bold text-foreground">Recent payments</p>
            <a href="https://dashboard.stripe.com/payments" target="_blank" rel="noopener noreferrer"
              className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
              View all <ArrowUpRight className="w-3 h-3" />
            </a>
          </div>
          <div className="divide-y divide-border">
            {data.recentPayments.slice(0, 8).map((p: any) => (
              <div key={p.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-[13px] font-medium text-foreground">{p.email ?? 'Unknown'}</p>
                  <p className="text-[10px] font-mono text-muted-foreground">{new Date(p.created * 1000).toLocaleDateString('en-GB')}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                    p.status === 'succeeded' ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300' :
                    'bg-muted text-muted-foreground'
                  }`}>{p.status}</span>
                  <span className="text-[14px] font-black text-foreground">£{p.amount.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main settings page ─────────────────────────────────────────────────────────

export default function AdminSettingsPage() {
  const [flags,     setFlags]     = useState<FlagRow[]>([])
  const [limits,    setLimits]    = useState<LimitRow[]>([])
  const [loading,   setLoading]   = useState(true)
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [savedKey,  setSavedKey]  = useState<string | null>(null)
  const [tab,       setTab]       = useState<Tab>('features')

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

  const flash = (key: string) => { setSavedKey(key); setTimeout(() => setSavedKey(null), 1500) }

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

  async function savePrice(tier: string, monthlyPrice: number) {
    const res = await fetch('/api/admin/pricing', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body:   JSON.stringify({ tier, monthlyPrice }),
    })
    return res.json()
  }

  if (loading) return <div className="flex justify-center py-24"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>

  const getGroup = (key: string): string => {
    if (['mentorship','interview_simulator','career_gps','recruiter_simulator',
         'interview_probability','evidence_vault','cv_builder','shortlist_probability',
         'momentum_score','ab_test','criteria_explorer','cos_navigator'].includes(key)) return 'page'
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

  const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'features', label: 'Feature Flags', icon: Zap         },
    { id: 'limits',   label: 'Tier Limits',   icon: Package     },
    { id: 'pricing',  label: 'Pricing',        icon: DollarSign  },
    { id: 'stripe',   label: 'Stripe & Revenue', icon: CreditCard },
  ]

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-amber-600 dark:text-amber-500" /> Platform Settings
        </h1>
        <p className="text-[12.5px] mt-1 text-muted-foreground">
          Feature gates, tier limits, pricing, and Stripe revenue — all in one place.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted/40 rounded-xl p-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-semibold transition-all flex-1 justify-center ${
              tab === id ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}>
            <Icon className="w-3.5 h-3.5 shrink-0" />{label}
          </button>
        ))}
      </div>

      {/* Feature flags tab */}
      {tab === 'features' && (
        <div className="space-y-5">
          {(['page','score','analysis','dashboard'] as const).map(group => {
            const groupFlags = grouped[group] ?? []
            if (!groupFlags.length) return null
            return (
              <div key={group} className="rounded-2xl bg-card border border-border overflow-hidden">
                <div className="px-5 py-3.5 border-b border-border bg-muted/30">
                  <p className="text-[13px] font-bold text-foreground">{GROUP_LABELS[group]}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {group === 'page' && 'Gate entire dashboard pages and moat features'}
                    {group === 'score' && 'Individual sub-score pills on analysis rows'}
                    {group === 'analysis' && 'Elements within the analysis report views'}
                    {group === 'dashboard' && 'KPI cards and charts on the dashboard'}
                  </p>
                </div>
                <div className="divide-y divide-border">
                  {groupFlags.map(f => (
                    <div key={f.key} className={`px-5 py-4 flex items-center justify-between gap-4 flex-wrap ${!f.enabled ? 'opacity-50' : ''}`}>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-[13px] font-medium text-foreground">{f.label}</p>
                          {savedKey === f.key  && <Check className="w-3.5 h-3.5 text-emerald-500" />}
                          {savingKey === f.key && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
                          {!f.enabled && <span className="text-[9px] font-bold uppercase text-red-500 bg-red-50 dark:bg-red-950/40 px-1.5 py-0.5 rounded">Disabled</span>}
                        </div>
                        {f.description && <p className="text-[11px] text-muted-foreground mt-0.5">{f.description}</p>}
                        <p className="text-[10px] font-mono text-muted-foreground/50 mt-0.5">{f.key}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex rounded-full border border-border overflow-hidden">
                          {TIERS.map(t => (
                            <button key={t} onClick={() => setFlagTier(f.key, t)}
                              className={`px-3 py-1.5 text-[11px] font-bold transition-colors ${f.minTier === t ? TIER_COLOR[t] : 'text-muted-foreground hover:bg-muted'}`}>
                              {TIER_LABEL[t]}+
                            </button>
                          ))}
                        </div>
                        <button onClick={() => toggleEnabled(f.key, !f.enabled)}
                          className={`p-1.5 rounded-lg transition-colors ${f.enabled ? 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30' : 'text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30'}`}>
                          <Power className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Limits tab */}
      {tab === 'limits' && (
        <div className="rounded-2xl bg-card border border-border overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border bg-muted/30">
            <p className="text-[13px] font-bold text-foreground">Tier Usage Limits</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Numeric caps per tier. Enter -1 for unlimited. Changes apply immediately.</p>
          </div>
          <div className="divide-y divide-border">
            {limitKeys.filter(k => !['monthlyPrice','stripePriceId','stripeProductId'].includes(k)).map(key => (
              <div key={key} className="px-5 py-4">
                <p className="text-[13px] font-medium text-foreground mb-3">{LIMIT_LABELS[key] ?? key}</p>
                <div className="grid grid-cols-3 gap-3">
                  {TIERS.map(tier => {
                    const row          = limits.find(l => l.tier === tier && l.key === key)
                    const compositeId  = `${tier}:${key}`
                    return (
                      <div key={tier}>
                        <label className={`block text-[10px] font-black uppercase tracking-wider mb-1.5 ${
                          tier === 'free' ? 'text-muted-foreground' : tier === 'pro' ? 'text-blue-600 dark:text-blue-400' : 'text-amber-600 dark:text-amber-400'
                        }`}>{TIER_LABEL[tier]}</label>
                        <div className="relative">
                          <input type="number" defaultValue={row?.value ?? 0}
                            onBlur={e => setLimit(tier, key, Number(e.target.value))}
                            className="w-full rounded-xl px-3 py-2 text-[13px] font-mono bg-background border border-border text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                          />
                          {savedKey === compositeId && <Check className="w-3.5 h-3.5 text-emerald-500 absolute right-2.5 top-1/2 -translate-y-1/2" />}
                        </div>
                        {row?.value === -1 && <p className="text-[10px] text-emerald-500 mt-1">Unlimited</p>}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pricing tab */}
      {tab === 'pricing' && (
        <div className="space-y-5">
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-2xl px-5 py-4">
            <p className="text-[13px] font-semibold text-foreground mb-1">How pricing works</p>
            <p className="text-[12px] text-muted-foreground leading-relaxed">
              Set the monthly price for Pro and Elite tiers. Clicking "Save & sync" creates a new Stripe Price object for the corresponding Product and logs the price ID. Update your checkout session to use the new price ID after saving.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            {TIERS.map(tier => {
              const priceRow = limits.find(l => l.tier === tier && l.key === 'monthlyPrice')
              const currentPrice = priceRow ? priceRow.value / 100 : tier === 'pro' ? 19 : tier === 'elite' ? 39 : 0
              return (
                <PricingCard key={tier} tier={tier} currentPrice={currentPrice} onSave={savePrice} />
              )
            })}
          </div>

          <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 px-5 py-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300 mb-1">After updating prices</p>
            <p className="text-[12px] text-muted-foreground leading-relaxed">
              Update the <code className="font-mono text-[11px] bg-muted px-1 rounded">STRIPE_PRO_PRICE_ID</code> and{' '}
              <code className="font-mono text-[11px] bg-muted px-1 rounded">STRIPE_ELITE_PRICE_ID</code> environment variables in Vercel with the new price IDs shown after saving.
            </p>
          </div>
        </div>
      )}

      {/* Stripe & Revenue tab */}
      {tab === 'stripe' && <StripePanel />}
    </div>
  )
}