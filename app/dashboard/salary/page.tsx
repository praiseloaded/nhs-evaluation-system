// app/dashboard/salary/page.tsx
// NHS AfC Salary Predictor — 2024/25 pay scales, all nations, full take-home calc
'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { ArrowLeft, Copy, CheckCircle2, TrendingUp, Info } from 'lucide-react'

// ── 2024/25 AfC Pay Scales ────────────────────────────────────────────────────
// England: post 5.5% uplift
// Scotland: post 6.5% uplift (slightly higher)
// Wales: broadly follows England
// NI: broadly follows England
const PAY_SCALES: Record<string, Record<string, [number, number]>> = {
  england: {
    'Band 1':  [22383,  22383],
    'Band 2':  [23615,  25674],
    'Band 3':  [24625,  25674],
    'Band 4':  [26530,  29114],
    'Band 5':  [29970,  36483],
    'Band 6':  [37338,  44962],
    'Band 7':  [46148,  52809],
    'Band 8a': [53755,  60504],
    'Band 8b': [62215,  72293],
    'Band 8c': [74290,  85601],
    'Band 8d': [88168,  101677],
    'Band 9':  [105385, 121271],
  },
  scotland: {
    'Band 1':  [23828,  23828],
    'Band 2':  [25147,  27343],
    'Band 3':  [26226,  27343],
    'Band 4':  [28254,  30996],
    'Band 5':  [31916,  38844],
    'Band 6':  [39765,  47884],
    'Band 7':  [49147,  56241],
    'Band 8a': [57249,  64437],
    'Band 8b': [66259,  76992],
    'Band 8c': [79099,  91165],
    'Band 8d': [93899,  108256],
    'Band 9':  [112185, 129183],
  },
  wales: {
    'Band 1':  [22383,  22383],
    'Band 2':  [23615,  25674],
    'Band 3':  [24625,  25674],
    'Band 4':  [26530,  29114],
    'Band 5':  [29970,  36483],
    'Band 6':  [37338,  44962],
    'Band 7':  [46148,  52809],
    'Band 8a': [53755,  60504],
    'Band 8b': [62215,  72293],
    'Band 8c': [74290,  85601],
    'Band 8d': [88168,  101677],
    'Band 9':  [105385, 121271],
  },
  ni: {
    'Band 1':  [22383,  22383],
    'Band 2':  [23615,  25674],
    'Band 3':  [24625,  25674],
    'Band 4':  [26530,  29114],
    'Band 5':  [29970,  36483],
    'Band 6':  [37338,  44962],
    'Band 7':  [46148,  52809],
    'Band 8a': [53755,  60504],
    'Band 8b': [62215,  72293],
    'Band 8c': [74290,  85601],
    'Band 8d': [88168,  101677],
    'Band 9':  [105385, 121271],
  },
}

// NHS Pension contribution tiers 2024/25
function pensionRate(gross: number): number {
  if (gross <= 13259)  return 0.051
  if (gross <= 26831)  return 0.057
  if (gross <= 44962)  return 0.083
  if (gross <= 53751)  return 0.098
  if (gross <= 72030)  return 0.107
  return 0.125
}

function calcTax(gross: number): number {
  const PA = 12570
  let tax = 0
  if (gross > PA) {
    const basic = Math.min(gross - PA, 50270 - PA)
    tax += basic * 0.20
  }
  if (gross > 50270) {
    const higher = Math.min(gross - 50270, 125140 - 50270)
    tax += higher * 0.40
  }
  if (gross > 125140) {
    tax += (gross - 125140) * 0.45
  }
  return tax
}

function calcNI(gross: number): number {
  const lower = 12570, upper = 50270
  let ni = 0
  if (gross > lower) ni += Math.min(gross - lower, upper - lower) * 0.08
  if (gross > upper) ni += (gross - upper) * 0.02
  return ni
}

function fmt(n: number) {
  return '£' + Math.round(n).toLocaleString('en-GB')
}

const BANDS = ['Band 1','Band 2','Band 3','Band 4','Band 5','Band 6','Band 7','Band 8a','Band 8b','Band 8c','Band 8d','Band 9']
const NATIONS = [
  { id: 'england',  label: '🏴󠁧󠁢󠁥󠁮󠁧󠁿 England'  },
  { id: 'scotland', label: '🏴󠁧󠁢󠁳󠁣󠁴󠁿 Scotland' },
  { id: 'wales',    label: '🏴󠁧󠁢󠁷󠁬󠁳󠁿 Wales'    },
  { id: 'ni',       label: '🇬🇧 N. Ireland' },
]

const ENHANCEMENT_OPTIONS = [
  { id: 'nights',     label: 'Night shifts',           rate: 0.30 },
  { id: 'weekend',    label: 'Weekend working',         rate: 0.15 },
  { id: 'oncall',     label: 'On-call availability',    rate: 0.08 },
  { id: 'unsocial',   label: 'Unsocial hours (general)',rate: 0.22 },
  { id: 'bank',       label: 'Bank / overtime shifts',  rate: 0.125},
]

export default function SalaryPage() {
  const [band,        setBand]        = useState('Band 5')
  const [nation,      setNation]      = useState('england')
  const [point,       setPoint]       = useState<'min'|'mid'|'max'>('min')
  const [pension,     setPension]     = useState(true)
  const [enhancements,setEnhancements]= useState<string[]>([])
  const [copied,      setCopied]      = useState(false)

  const scales   = PAY_SCALES[nation]
  const [lo, hi] = scales[band] ?? [0, 0]
  const mid       = Math.round((lo + hi) / 2)
  const basicGross = point === 'min' ? lo : point === 'max' ? hi : mid

  const enhancementGross = useMemo(() => {
    return enhancements.reduce((sum, id) => {
      const e = ENHANCEMENT_OPTIONS.find(x => x.id === id)
      return sum + (e ? basicGross * e.rate * 0.3 : 0) // approximate: 30% of shifts enhanced
    }, 0)
  }, [enhancements, basicGross])

  const totalGross = basicGross + enhancementGross
  const pensionAmt = pension ? totalGross * pensionRate(totalGross) : 0
  const taxableIncome = totalGross - pensionAmt
  const tax  = calcTax(taxableIncome)
  const ni   = calcNI(totalGross)
  const takeHome = totalGross - pensionAmt - tax - ni

  const monthly  = Math.round(takeHome / 12)
  const daily    = Math.round(takeHome / 260)
  const hourly   = Math.round(takeHome / (37.5 * 52) * 100) / 100

  const shareText = `NHS ${band} (${NATIONS.find(n=>n.id===nation)?.label}) — ${fmt(basicGross)} basic → ${fmt(takeHome)} take-home (2024/25)`

  const toggleEnhancement = (id: string) => {
    setEnhancements(prev => prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id])
  }

  // Next band comparison
  const bandIdx   = BANDS.indexOf(band)
  const nextBand  = BANDS[bandIdx + 1]
  const nextScales = nextBand ? scales[nextBand] : null
  const nextMin    = nextScales?.[0] ?? 0
  const nextTakeHome = nextMin ? (() => {
    const p = nextMin * pensionRate(nextMin)
    const t = calcTax(nextMin - p)
    const n2 = calcNI(nextMin)
    return nextMin - p - t - n2
  })() : 0

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">
      <div>
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-4 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
        </Link>
        <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
          💷 NHS Salary Predictor
        </h1>
        <p className="text-sm text-muted-foreground mt-1">2024/25 AfC pay scales · Full take-home calculation · All nations</p>
      </div>

      <div className="grid md:grid-cols-[1fr_340px] gap-6">

        {/* Left: controls */}
        <div className="space-y-5">

          {/* Nation */}
          <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
            <p className="text-sm font-bold text-foreground">Nation</p>
            <div className="grid grid-cols-2 gap-2">
              {NATIONS.map(n => (
                <button key={n.id} onClick={() => setNation(n.id)}
                  className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${nation === n.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'}`}>
                  {n.label}
                </button>
              ))}
            </div>
          </div>

          {/* Band */}
          <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
            <p className="text-sm font-bold text-foreground">Pay Band</p>
            <div className="grid grid-cols-4 gap-2">
              {BANDS.map(b => (
                <button key={b} onClick={() => setBand(b)}
                  className={`px-2 py-2 rounded-xl text-xs font-bold transition-all ${band === b ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'}`}>
                  {b}
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground bg-muted rounded-xl px-3 py-2">
              <span>Range</span>
              <span className="font-bold text-foreground">{fmt(lo)} – {fmt(hi)}</span>
            </div>
          </div>

          {/* Pay point */}
          <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
            <p className="text-sm font-bold text-foreground">Pay Point</p>
            <div className="grid grid-cols-3 gap-2">
              {([['min','Minimum'], ['mid','Mid-point'], ['max','Maximum']] as const).map(([val, label]) => (
                <button key={val} onClick={() => setPoint(val)}
                  className={`px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${point === val ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'}`}>
                  <div>{label}</div>
                  <div className="font-black mt-0.5">{fmt(val === 'min' ? lo : val === 'max' ? hi : mid)}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Enhancements */}
          <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-foreground">Enhancements</p>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Info className="w-3 h-3" /> Approximate — actual varies by trust
              </div>
            </div>
            <div className="space-y-2">
              {ENHANCEMENT_OPTIONS.map(e => (
                <label key={e.id} className={`flex items-center justify-between px-3 py-2.5 rounded-xl border cursor-pointer transition-all ${enhancements.includes(e.id) ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}`}>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" checked={enhancements.includes(e.id)} onChange={() => toggleEnhancement(e.id)} className="accent-primary" />
                    <span className="text-sm text-foreground">{e.label}</span>
                  </div>
                  <span className="text-xs text-muted-foreground font-semibold">+{Math.round(e.rate * 100)}%</span>
                </label>
              ))}
            </div>
          </div>

          {/* Pension toggle */}
          <label className="flex items-center justify-between rounded-2xl border border-border bg-card px-5 py-4 cursor-pointer">
            <div>
              <p className="text-sm font-bold text-foreground">NHS Pension deduction</p>
              <p className="text-xs text-muted-foreground mt-0.5">Tier: {Math.round(pensionRate(totalGross) * 100)}% contribution rate · {fmt(pensionAmt)}/year</p>
            </div>
            <div className={`w-11 h-6 rounded-full transition-colors relative ${pension ? 'bg-primary' : 'bg-muted'}`}
              onClick={() => setPension(p => !p)}>
              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${pension ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </div>
          </label>
        </div>

        {/* Right: results */}
        <div className="space-y-4">
          {/* Main result card */}
          <div className="rounded-2xl border-2 border-primary bg-primary/5 p-6 space-y-4">
            <div>
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">{band} · {NATIONS.find(n=>n.id===nation)?.label} · {point === 'min' ? 'Minimum' : point === 'max' ? 'Maximum' : 'Mid-point'}</p>
              <div className="mt-1">
                <span className="text-4xl font-black text-foreground">{fmt(takeHome)}</span>
                <span className="text-sm text-muted-foreground ml-1">/year take-home</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Monthly', value: fmt(monthly) },
                { label: 'Daily',   value: fmt(daily)   },
                { label: 'Hourly',  value: `£${hourly}` },
              ].map(item => (
                <div key={item.label} className="rounded-xl bg-card border border-border p-3 text-center">
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="text-sm font-black text-foreground">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Breakdown */}
          <div className="rounded-2xl border border-border bg-card p-5 space-y-2">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Breakdown</p>
            {[
              { label: 'Basic gross salary',    value: fmt(basicGross),     positive: true  },
              ...(enhancementGross > 0 ? [{ label: 'Enhancements (approx)', value: `+${fmt(enhancementGross)}`, positive: true  }] : []),
              ...(pension           ? [{ label: `Pension (${Math.round(pensionRate(totalGross)*100)}%)`, value: `-${fmt(pensionAmt)}`, positive: false }] : []),
              { label: 'Income tax',            value: `-${fmt(tax)}`,      positive: false },
              { label: 'National Insurance',    value: `-${fmt(ni)}`,       positive: false },
            ].map((row, i) => (
              <div key={i} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                <span className="text-sm text-muted-foreground">{row.label}</span>
                <span className={`text-sm font-bold ${row.positive ? 'text-foreground' : 'text-red-500 dark:text-red-400'}`}>{row.value}</span>
              </div>
            ))}
            <div className="flex items-center justify-between pt-2 border-t-2 border-primary/30">
              <span className="text-sm font-bold text-foreground">Take-home pay</span>
              <span className="text-lg font-black text-primary">{fmt(takeHome)}</span>
            </div>
          </div>

          {/* Next band comparison */}
          {nextBand && nextTakeHome > 0 && (
            <div className="rounded-2xl border border-emerald-800/30 bg-emerald-950/20 p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <p className="text-xs font-bold text-emerald-300">Progress to {nextBand}</p>
              </div>
              <p className="text-xs text-emerald-200">
                Minimum pay: <span className="font-bold">{fmt(nextMin)}</span> gross → <span className="font-bold">{fmt(nextTakeHome)}</span> take-home
              </p>
              <p className="text-[11px] text-emerald-600 mt-1">
                That's <span className="text-emerald-400 font-bold">+{fmt(nextTakeHome - takeHome)}/year</span> more in your pocket
              </p>
            </div>
          )}

          {/* Share */}
          <button onClick={() => { navigator.clipboard.writeText(shareText); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border bg-muted text-sm font-semibold text-foreground hover:bg-accent transition-colors">
            {copied ? <><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy salary summary</>}
          </button>

          <p className="text-[10px] text-muted-foreground text-center">
            Based on 2024/25 AfC pay scales · Tax/NI calculated at 2024/25 rates · Pension tiers per NHS Pension Scheme · Enhancements are estimates
          </p>
        </div>
      </div>

      {/* Band comparison table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <p className="text-sm font-bold text-foreground">All Bands — {NATIONS.find(n=>n.id===nation)?.label} Take-Home Comparison</p>
          <p className="text-xs text-muted-foreground mt-0.5">Minimum pay point · With NHS pension · 2024/25</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-5 py-2 text-xs font-bold text-muted-foreground">Band</th>
                <th className="text-right px-5 py-2 text-xs font-bold text-muted-foreground">Min gross</th>
                <th className="text-right px-5 py-2 text-xs font-bold text-muted-foreground">Take-home</th>
                <th className="text-right px-5 py-2 text-xs font-bold text-muted-foreground">Monthly</th>
              </tr>
            </thead>
            <tbody>
              {BANDS.map(b => {
                const [lo2] = scales[b] ?? [0, 0]
                const p2 = lo2 * pensionRate(lo2)
                const t2 = calcTax(lo2 - p2)
                const n2 = calcNI(lo2)
                const th = lo2 - p2 - t2 - n2
                const isSelected = b === band
                return (
                  <tr key={b} onClick={() => setBand(b)}
                    className={`border-b border-border/50 last:border-0 cursor-pointer transition-colors ${isSelected ? 'bg-primary/10' : 'hover:bg-muted/50'}`}>
                    <td className="px-5 py-3">
                      <span className={`font-bold ${isSelected ? 'text-primary' : 'text-foreground'}`}>{b}</span>
                      {isSelected && <span className="ml-2 text-[9px] font-black text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">SELECTED</span>}
                    </td>
                    <td className="px-5 py-3 text-right text-muted-foreground">{fmt(lo2)}</td>
                    <td className={`px-5 py-3 text-right font-bold ${isSelected ? 'text-primary' : 'text-foreground'}`}>{fmt(th)}</td>
                    <td className="px-5 py-3 text-right text-muted-foreground">{fmt(Math.round(th / 12))}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}