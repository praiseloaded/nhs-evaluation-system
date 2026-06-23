// components/role-template-picker.tsx
'use client'

import { useMemo, useState } from 'react'
import { getRolesByCategory, ROLE_TEMPLATES, type RoleTemplate } from '@/lib/nhs-role-templates'
import { CheckCircle2, ChevronDown, ChevronUp, Stethoscope, Search, X } from 'lucide-react'
import { Button } from './ui/button'

interface Props {
  selected: RoleTemplate | null
  onSelect: (role: RoleTemplate | null) => void
}

const BAND_ORDER = [
  'Band 2','Band 2–3','Band 3','Band 3–4',
  'Band 4','Band 4–5','Band 5','Band 5–6',
  'Band 6','Band 6–7','Band 7','Band 7–8a','Band 8a',
]

const BAND_COLORS: Record<string, { bg: string; text: string }> = {
  'Band 2':   { bg: 'bg-gray-100 dark:bg-gray-800',    text: 'text-gray-600 dark:text-gray-400' },
  'Band 2–3': { bg: 'bg-gray-100 dark:bg-gray-800',    text: 'text-gray-600 dark:text-gray-400' },
  'Band 3':   { bg: 'bg-blue-50 dark:bg-blue-950',     text: 'text-blue-600 dark:text-blue-400' },
  'Band 3–4': { bg: 'bg-blue-50 dark:bg-blue-950',     text: 'text-blue-600 dark:text-blue-400' },
  'Band 4':   { bg: 'bg-indigo-50 dark:bg-indigo-950', text: 'text-indigo-600 dark:text-indigo-400' },
  'Band 4–5': { bg: 'bg-indigo-50 dark:bg-indigo-950', text: 'text-indigo-600 dark:text-indigo-400' },
  'Band 5':   { bg: 'bg-violet-50 dark:bg-violet-950', text: 'text-violet-600 dark:text-violet-400' },
  'Band 5–6': { bg: 'bg-violet-50 dark:bg-violet-950', text: 'text-violet-600 dark:text-violet-400' },
  'Band 6':   { bg: 'bg-purple-50 dark:bg-purple-950', text: 'text-purple-600 dark:text-purple-400' },
  'Band 6–7': { bg: 'bg-purple-50 dark:bg-purple-950', text: 'text-purple-600 dark:text-purple-400' },
  'Band 7':   { bg: 'bg-amber-50 dark:bg-amber-950',   text: 'text-amber-700 dark:text-amber-400' },
  'Band 7–8a':{ bg: 'bg-amber-50 dark:bg-amber-950',   text: 'text-amber-700 dark:text-amber-400' },
  'Band 8a':  { bg: 'bg-rose-50 dark:bg-rose-950',     text: 'text-rose-700 dark:text-rose-400' },
}

const CATEGORY_ICONS: Record<string, string> = {
  'Clinical Support':                '🏥',
  'Clinical':                        '💉',
  'Administrative':                  '📋',
  'Scientific / Laboratory':         '🔬',
  'Registered Nursing':              '👩‍⚕️',
  'Mental Health & Learning Disabilities': '🧠',
  'Allied Health Professions':       '🦽',
  'Dental':                          '🦷',
  'Radiology & Imaging':             '🩻',
  'Pharmacy':                        '💊',
  'Theatre & Surgical':              '🔪',
  'Community & Primary Care':        '🏘️',
  'Emergency & Ambulance':           '🚑',
  'Research & Development':          '🧪',
  'Specialist Nursing':              '⭐',
  'Estates & Facilities':            '🔧',
  'Management':                      '📊',
}

function BandPill({ band }: { band: string }) {
  const c = BAND_COLORS[band] ?? { bg: 'bg-muted', text: 'text-muted-foreground' }
  return (
    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${c.bg} ${c.text}`}>
      {band}
    </span>
  )
}

export function RoleTemplatePicker({ selected, onSelect }: Props) {
  const [open, setOpen]           = useState(false)
  const [search, setSearch]       = useState('')
  const [bandFilter, setBandFilter] = useState<string>('')
  const byCategory                = getRolesByCategory()

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return ROLE_TEMPLATES.filter(r => {
      const matchesSearch = !q
        || r.label.toLowerCase().includes(q)
        || r.category.toLowerCase().includes(q)
        || r.band.toLowerCase().includes(q)
        || r.description.toLowerCase().includes(q)
        || r.typicalCriteria.some(c => c.toLowerCase().includes(q))
      const matchesBand = !bandFilter || r.band === bandFilter
      return matchesSearch && matchesBand
    })
  }, [search, bandFilter])

  // Group filtered results by category
  const filteredByCategory = useMemo(() => {
    const grouped: Record<string, RoleTemplate[]> = {}
    for (const role of filtered) {
      if (!grouped[role.category]) grouped[role.category] = []
      grouped[role.category].push(role)
    }
    return grouped
  }, [filtered])

  // All unique bands for the filter
  const allBands = useMemo(() =>
    BAND_ORDER.filter(b => ROLE_TEMPLATES.some(r => r.band === b)),
    []
  )

  const handleClose = () => { setOpen(false); setSearch(''); setBandFilter('') }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">

      {/* Trigger button */}
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-accent/30 transition-colors">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Stethoscope className="w-4 h-4 text-primary" />
          </div>
          {selected ? (
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold text-foreground truncate">{selected.label}</p>
                <BandPill band={selected.band} />
              </div>
              <p className="text-[11px] text-muted-foreground">Role-specific evidence questions active</p>
            </div>
          ) : (
            <div>
              <p className="text-sm font-semibold text-foreground">
                Select your role <span className="text-muted-foreground font-normal">(optional)</span>
              </p>
              <p className="text-[11px] text-muted-foreground">
                50 NHS roles — get tailored evidence questions in Step 4
              </p>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          {selected && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
          {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="border-t border-border">

          {/* Search + filter bar */}
          <div className="p-3 space-y-2 border-b border-border bg-muted/20">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                autoFocus
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search roles, e.g. nurse, pharmacist, radiographer…"
                className="w-full bg-card border border-border rounded-lg pl-9 pr-8 py-2 text-xs text-foreground placeholder-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              {search && (
                <Button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="w-3 h-3 text-muted-foreground" />
                </Button>
              )}
            </div>
            {/* Band filter pills */}
            <div className="flex flex-wrap gap-1.5">
              <button onClick={() => setBandFilter('')}
                className={`text-[10px] font-semibold px-2.5 py-1 rounded-full transition-colors ${!bandFilter ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'}`}>
                All bands
              </button>
              {allBands.map(band => {
                const c = BAND_COLORS[band] ?? { bg: 'bg-muted', text: 'text-muted-foreground' }
                return (
                  <button key={band} onClick={() => setBandFilter(bandFilter === band ? '' : band)}
                    className={`text-[10px] font-semibold px-2.5 py-1 rounded-full transition-colors ${bandFilter === band ? 'ring-2 ring-primary ' + c.bg + ' ' + c.text : c.bg + ' ' + c.text + ' hover:ring-1 hover:ring-primary/40'}`}>
                    {band}
                  </button>
                )
              })}
            </div>
            <p className="text-[10px] text-muted-foreground">
              {filtered.length} role{filtered.length !== 1 ? 's' : ''} found
            </p>
          </div>

          {/* Results */}
          <div className="max-h-80 overflow-y-auto">
            {/* Clear selection */}
            {selected && (
              <button onClick={() => { onSelect(null); handleClose() }}
                className="w-full px-4 py-2.5 text-left text-xs text-muted-foreground hover:bg-accent/30 transition-colors border-b border-border flex items-center gap-2">
                <X className="w-3 h-3" /> Clear selection — use generic questions
              </button>
            )}

            {filtered.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-muted-foreground">No roles match your search.</p>
                <p className="text-xs text-muted-foreground mt-1">Try a different term or clear the band filter.</p>
              </div>
            ) : (
              Object.entries(filteredByCategory).map(([category, roles]) => (
                <div key={category}>
                  <div className="flex items-center gap-2 px-4 py-2 bg-muted/30 border-b border-border sticky top-0 z-10">
                    <span className="text-sm">{CATEGORY_ICONS[category] ?? '🏥'}</span>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex-1">
                      {category}
                    </p>
                    <span className="text-[10px] text-muted-foreground">{roles.length}</span>
                  </div>
                  {roles.map(role => (
                    <button key={role.id}
                      onClick={() => { onSelect(role); handleClose() }}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-accent/30 transition-colors border-b border-border last:border-0 ${selected?.id === role.id ? 'bg-primary/5' : ''}`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-foreground">{role.label}</p>
                          <BandPill band={role.band} />
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{role.description}</p>
                      </div>
                      {selected?.id === role.id && <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />}
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}