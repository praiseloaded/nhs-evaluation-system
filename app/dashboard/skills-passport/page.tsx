// app/dashboard/skills-passport/page.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2, CheckCircle2, Circle, X } from 'lucide-react'
import { Button } from '@/components/ui/button';

interface Skill {
  id: string; label: string; emoji: string
  status: 'not_started'|'developing'|'competent'|'expert'
  evidence: string; lastUpdated: string | null
}

const STATUS_META: Record<string, { label: string; color: string; ring: string; pct: number }> = {
  not_started: { label: 'Not Started', color: 'text-gray-400',    ring: '#d1d5db', pct: 0   },
  developing:  { label: 'Developing',  color: 'text-amber-500',   ring: '#f59e0b', pct: 40  },
  competent:   { label: 'Competent',   color: 'text-blue-500',    ring: '#3b82f6', pct: 75  },
  expert:      { label: 'Expert',      color: 'text-emerald-500', ring: '#10b981', pct: 100 },
}
const STATUS_ORDER = ['not_started','developing','competent','expert'] as const

function RadialProgress({ pct, color, size = 84 }: { pct: number; color: string; size?: number }) {
  const r = (size - 10) / 2
  const c = 2 * Math.PI * r
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size/2} cy={size/2} r={r} stroke="#e5e7eb" strokeWidth={7} fill="none" />
      <circle cx={size/2} cy={size/2} r={r} stroke={color} strokeWidth={7} fill="none"
        strokeDasharray={c} strokeDashoffset={c - (pct/100)*c} strokeLinecap="round"
        className="transition-all duration-700" />
    </svg>
  )
}

export default function SkillsPassportPage() {
  const [skills,   setSkills]   = useState<Skill[]>([])
  const [loading,  setLoading]  = useState(true)
  const [editing,  setEditing]  = useState<string | null>(null)
  const [evidence, setEvidence] = useState('')
  const [saving,   setSaving]   = useState(false)

  useEffect(() => {
    fetch('/api/skills-passport').then(r => r.json()).then(d => setSkills(d.skills ?? [])).finally(() => setLoading(false))
  }, [])

  const overallPct = skills.length
    ? Math.round(skills.reduce((sum, s) => sum + STATUS_META[s.status].pct, 0) / skills.length)
    : 0

  const completeCount = skills.filter(s => s.status === 'expert' || s.status === 'competent').length

  const cycleStatus = async (skill: Skill) => {
    const idx = STATUS_ORDER.indexOf(skill.status)
    const next = STATUS_ORDER[(idx + 1) % STATUS_ORDER.length]
    setSkills(prev => prev.map(s => s.id === skill.id ? { ...s, status: next } : s))
    await fetch('/api/skills-passport', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skillId: skill.id, status: next }),
    })
  }

  const saveEvidence = async (skill: Skill) => {
    setSaving(true)
    try {
      const res = await fetch('/api/skills-passport', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skillId: skill.id, status: skill.status, evidence }),
      })
      const data = await res.json()
      setSkills(data.skills ?? [])
      setEditing(null)
    } finally { setSaving(false) }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div>
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-3 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
        </Link>
        <h1 className="text-2xl font-black text-foreground flex items-center gap-2">🎯 NHS Skills Passport™</h1>
        <p className="text-sm text-muted-foreground mt-1">Track your clinical competencies. Click any skill to cycle its status.</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : (
        <>
          {/* Overall summary */}
          <div className="rounded-2xl border border-border bg-card p-6 flex items-center gap-6">
            <div className="relative shrink-0">
              <RadialProgress pct={overallPct} color="#3b82f6" size={100} />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl font-black text-foreground">{overallPct}%</span>
              </div>
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Overall Competency</p>
              <p className="text-xs text-muted-foreground mt-1">{completeCount} of {skills.length} skills at competent level or above</p>
              <div className="flex gap-3 mt-2">
                {Object.entries(STATUS_META).map(([key, meta]) => (
                  <span key={key} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <span className="w-2 h-2 rounded-full" style={{ background: meta.ring }} />
                    {meta.label}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Skills grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {skills.map(skill => {
              const meta = STATUS_META[skill.status]
              return (
                <div key={skill.id} className="rounded-2xl border border-border bg-card p-5 flex flex-col items-center text-center space-y-3">
                  <div className="relative">
                    <RadialProgress pct={meta.pct} color={meta.ring} />
                    <div className="absolute inset-0 flex items-center justify-center text-2xl">{skill.emoji}</div>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">{skill.label}</p>
                    <button onClick={() => cycleStatus(skill)}
                      className={`text-xs font-bold mt-1 ${meta.color} hover:underline`}>
                      {meta.label}
                    </button>
                  </div>
                  {skill.evidence ? (
                    <p className="text-[10px] text-muted-foreground line-clamp-2">{skill.evidence}</p>
                  ) : (
                    <p className="text-[10px] text-muted-foreground/50 italic">No evidence noted</p>
                  )}
                  <button onClick={() => { setEditing(skill.id); setEvidence(skill.evidence) }}
                    className="text-[10px] text-primary hover:underline">
                    {skill.evidence ? 'Edit evidence' : '+ Add evidence'}
                  </button>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Evidence modal */}
      {editing && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="bg-background rounded-2xl border border-border max-w-md w-full p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-foreground">Add evidence</p>
              <Button onClick={() => setEditing(null)}><X className="w-4 h-4 text-muted-foreground" /></Button>
            </div>
            <textarea
              value={evidence}
              onChange={e => setEvidence(e.target.value)}
              aria-label="Evidence for this skill"
              placeholder="e.g. Completed 50+ venepunctures unsupervised on Ward 4, achieved 98% first-attempt success rate"
              rows={4}
              placeholder="e.g. Completed 50+ venepunctures unsupervised on Ward 4, achieved 98% first-attempt success rate"
              className="w-full bg-muted/30 border border-border rounded-xl px-3 py-2 text-sm text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <button onClick={() => saveEvidence(skills.find(s => s.id === editing)!)} disabled={saving}
              className="w-full py-2 rounded-xl bg-primary text-primary-foreground text-sm font-bold disabled:opacity-50">
              {saving ? 'Saving…' : 'Save evidence'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}