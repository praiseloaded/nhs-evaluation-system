// app/admin/users/[id]/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Loader2, ShieldAlert, AlertTriangle, Trash2, UserCog,
  FileText, Briefcase, ScrollText, Eye, Ban, CheckCircle2, ArrowUpRight,
  Download, BarChart3, Database, Award, ListChecks, Mic, Users,
  MapPin, ChevronDown, ChevronUp, StickyNote, Pin, X,
} from 'lucide-react'

interface UserDetail {
  id: string; name: string | null; email: string; tier: string; role: string
  suspended: boolean; suspendedAt: string | null; suspendedReason: string | null
  analysisUsed: number; analysisLimit: number; createdAt: string
  accounts: { provider: string }[]
}
interface AnalysisRow { id: string; jobTitle: string; createdAt: string; sourceUrl: string | null; overallScore: number | null; verdict: string | null; interviewProbability: number | null }
interface ApplicationRow { id: string; jobTitle: string; employer: string | null; status: string | null; outcome: string | null; createdAt: string }
interface CvRow { id: string; title: string; template: string; fullName: string | null; updatedAt: string }
interface Momentum { totalApplications: number; totalSubmitted: number; interviews: number; offers: number; interviewRate: number }
interface InterviewRow { id: string; jobTitle: string; band: string | null; status: string; totalScore: number | null; createdAt: string; completedAt: string | null }
interface EvidenceVaultData {
  evidenceEntries: any[]; certificates: any[]; competencies: any[]
  interviewVaultEntries: any[]; referenceEntries: any[]
  counts: Record<string, number>
}
interface NoteRow { id: string; adminEmail: string; body: string; pinned: boolean; createdAt: string }

function scoreClass(score: number | null) {
  if (score === null) return 'text-muted-foreground'
  return score >= 70 ? 'text-emerald-600 dark:text-emerald-400' : score >= 45 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl p-5 bg-card border border-border ${className}`}>{children}</div>
}

function CollapsibleSection({ title, icon: Icon, count, children, defaultOpen }: { title: string; icon: React.ElementType; count: number; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(!!defaultOpen)
  return (
    <div className="rounded-2xl overflow-hidden bg-card border border-border">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between px-5 py-4 transition-colors hover:bg-accent/40">
        <span className="text-[13px] font-semibold flex items-center gap-2 text-foreground">
          <Icon className="w-4 h-4 text-amber-600 dark:text-amber-500" /> {title} <span className="text-muted-foreground font-normal">({count})</span>
        </span>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      {open && <div className="px-5 pb-5 space-y-2">{children}</div>}
    </div>
  )
}

function NotesPanel({ userId }: { userId: string }) {
  const [notes, setNotes] = useState<NoteRow[]>([])
  const [draft, setDraft] = useState('')
  const [pinDraft, setPinDraft] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    const res = await fetch(`/api/admin/users/${userId}/notes`)
    const d = await res.json()
    setNotes(d.notes ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [userId])

  const submit = async () => {
    if (!draft.trim()) return
    setSaving(true)
    await fetch(`/api/admin/users/${userId}/notes`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: draft, pinned: pinDraft }),
    })
    setDraft(''); setPinDraft(false)
    await load()
    setSaving(false)
  }

  const remove = async (noteId: string) => {
    await fetch(`/api/admin/users/${userId}/notes/${noteId}`, { method: 'DELETE' })
    load()
  }

  return (
    <Card>
      <p className="text-[13px] font-semibold flex items-center gap-2 mb-3 text-foreground">
        <StickyNote className="w-4 h-4 text-amber-600 dark:text-amber-500" /> Internal notes
      </p>

      <div className="flex gap-2 mb-4">
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') submit() }}
          placeholder="Leave a note for other admins…"
          className="flex-1 rounded-lg px-3 py-2 text-[12.5px] bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/30"
        />
        <button onClick={() => setPinDraft(p => !p)} title="Pin this note" className={`px-2.5 rounded-lg border border-border ${pinDraft ? 'bg-amber-500 text-amber-950' : 'bg-background text-muted-foreground'}`}>
          <Pin className="w-3.5 h-3.5" />
        </button>
        <button onClick={submit} disabled={saving || !draft.trim()} className="px-4 rounded-lg text-[12.5px] font-semibold disabled:opacity-50 bg-amber-500 text-amber-950 hover:bg-amber-600 transition-colors">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Add'}
        </button>
      </div>

      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      ) : notes.length === 0 ? (
        <p className="text-[12px] text-muted-foreground">No notes yet.</p>
      ) : (
        <div className="space-y-2">
          {notes.map(n => (
            <div key={n.id} className="flex items-start gap-2 px-3 py-2.5 rounded-lg group bg-muted/40">
              {n.pinned && <Pin className="w-3 h-3 mt-0.5 shrink-0 text-amber-500" />}
              <div className="flex-1">
                <p className="text-[12.5px] text-foreground">{n.body}</p>
                <p className="text-[10.5px] font-mono mt-1 text-muted-foreground">{n.adminEmail} · {new Date(n.createdAt).toLocaleString('en-GB')}</p>
              </div>
              <button onClick={() => remove(n.id)} className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 text-muted-foreground hover:text-foreground">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [user, setUser] = useState<UserDetail | null>(null)
  const [analyses, setAnalyses] = useState<AnalysisRow[]>([])
  const [applications, setApplications] = useState<ApplicationRow[]>([])
  const [cvProfiles, setCvProfiles] = useState<CvRow[]>([])
  const [momentum, setMomentum] = useState<Momentum | null>(null)
  const [auditLog, setAuditLog] = useState<any[]>([])
  const [evidenceVault, setEvidenceVault] = useState<EvidenceVaultData | null>(null)
  const [careerGps, setCareerGps] = useState<any>(null)
  const [interviews, setInterviews] = useState<InterviewRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [suspendReason, setSuspendReason] = useState('')

  const load = async () => {
    const res = await fetch(`/api/admin/users/${id}`)
    const d = await res.json()
    setUser(d.user); setAnalyses(d.analyses ?? []); setApplications(d.applications ?? [])
    setCvProfiles(d.cvProfiles ?? []); setAuditLog(d.auditLog ?? []); setMomentum(d.momentum ?? null)
    setEvidenceVault(d.evidenceVault ?? null); setCareerGps(d.careerGps ?? null); setInterviews(d.interviews ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  const patch = async (body: any) => {
    setSaving(true)
    await fetch(`/api/admin/users/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    await load()
    setSaving(false)
  }

  const deleteUser = async () => {
    await fetch(`/api/admin/users/${id}`, { method: 'DELETE' })
    router.push('/admin/users')
  }

  const impersonate = async () => {
    const res = await fetch('/api/admin/impersonate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: id, reason: 'Admin investigation' }),
    })
    if (res.ok) window.location.href = '/dashboard'
  }

  const downloadCv = async (cvId: string, name: string) => {
    const res = await fetch(`/api/admin/users/${id}/cv/${cvId}/export`)
    if (!res.ok) return
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${name.replace(/[^a-z0-9]/gi, '_')}_CV.docx`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return <div className="flex justify-center py-24"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
  if (!user) return <div className="p-8 text-sm text-red-500">User not found.</div>

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
      <Link href="/admin/users" className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" /> All users
      </Link>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2 text-foreground">
            {user.name ?? 'Unnamed user'}
            {user.role === 'admin' && <ShieldAlert className="w-5 h-5 text-amber-500" />}
          </h1>
          <p className="text-[13px] font-mono mt-1 text-muted-foreground">{user.email}</p>
          <p className="text-[11px] mt-1 text-muted-foreground/70">
            Joined {new Date(user.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            {user.accounts.length > 0 && ` · Signed in via ${user.accounts.map(a => a.provider).join(', ')}`}
          </p>
        </div>
        <button onClick={impersonate} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-medium border border-border text-foreground hover:bg-accent transition-colors">
          <Eye className="w-3.5 h-3.5" /> Impersonate
        </button>
      </div>

      {user.suspended && (
        <Card className="flex items-start gap-2 border-amber-300 dark:border-amber-700">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
          <div>
            <p className="text-[13px] font-semibold text-amber-700 dark:text-amber-400">This account is suspended</p>
            {user.suspendedReason && <p className="text-[12px] mt-0.5 text-muted-foreground">{user.suspendedReason}</p>}
          </div>
        </Card>
      )}

      {/* Controls */}
      <Card>
        <p className="text-[13px] font-semibold flex items-center gap-2 mb-4 text-foreground"><UserCog className="w-4 h-4 text-amber-600 dark:text-amber-500" /> Account controls</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-semibold mb-1.5 text-muted-foreground">Tier</label>
            <select value={user.tier} onChange={e => patch({ tier: e.target.value })} disabled={saving} className="w-full rounded-lg px-3 py-2 text-[13px] bg-background border border-border text-foreground">
              <option value="free">Free</option><option value="pro">Pro</option><option value="elite">Elite</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold mb-1.5 text-muted-foreground">Role</label>
            <select value={user.role} onChange={e => patch({ role: e.target.value })} disabled={saving} className="w-full rounded-lg px-3 py-2 text-[13px] bg-background border border-border text-foreground">
              <option value="user">User</option><option value="admin">Admin</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold mb-1.5 text-muted-foreground">Analysis limit</label>
            <input type="number" defaultValue={user.analysisLimit} onBlur={e => patch({ analysisLimit: Number(e.target.value) })} className="w-full rounded-lg px-3 py-2 text-[13px] bg-background border border-border text-foreground" />
          </div>
          <div className="flex items-end">
            {user.suspended ? (
              <button onClick={() => patch({ suspended: false })} disabled={saving} className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors">
                <CheckCircle2 className="w-3.5 h-3.5" /> Unsuspend
              </button>
            ) : (
              <div className="w-full flex gap-2">
                <input value={suspendReason} onChange={e => setSuspendReason(e.target.value)} placeholder="Reason (optional)" className="flex-1 rounded-lg px-3 py-2 text-[13px] bg-background border border-border text-foreground" />
                <button onClick={() => patch({ suspended: true, suspendedReason: suspendReason })} disabled={saving} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-semibold shrink-0 bg-amber-500 hover:bg-amber-600 text-amber-950 transition-colors">
                  <Ban className="w-3.5 h-3.5" /> Suspend
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="pt-3 mt-3 border-t border-border">
          {confirmDelete ? (
            <div className="flex items-center gap-2">
              <p className="text-[12px] flex-1 text-red-600 dark:text-red-400">Permanently delete this account and all associated data?</p>
              <button onClick={deleteUser} className="px-3 py-1.5 rounded-lg text-[11.5px] font-bold bg-red-600 hover:bg-red-700 text-white transition-colors">Confirm delete</button>
              <button onClick={() => setConfirmDelete(false)} className="px-3 py-1.5 rounded-lg text-[11.5px] font-medium border border-border text-muted-foreground">Cancel</button>
            </div>
          ) : (
            <button onClick={() => setConfirmDelete(true)} className="inline-flex items-center gap-1.5 text-[12px] font-medium text-red-600 dark:text-red-400 hover:underline">
              <Trash2 className="w-3.5 h-3.5" /> Delete account
            </button>
          )}
        </div>
      </Card>

      {/* Internal notes */}
      <NotesPanel userId={id} />

      {/* Activity overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card><p className="text-[11px] font-semibold uppercase tracking-wide mb-1 text-muted-foreground">Analyses</p><p className="text-xl font-bold font-mono text-foreground">{analyses.length}</p></Card>
        <Card><p className="text-[11px] font-semibold uppercase tracking-wide mb-1 text-muted-foreground">Applications</p><p className="text-xl font-bold font-mono text-foreground">{applications.length}</p></Card>
        <Card><p className="text-[11px] font-semibold uppercase tracking-wide mb-1 text-muted-foreground">CV profiles</p><p className="text-xl font-bold font-mono text-foreground">{cvProfiles.length}</p></Card>
        <Card><p className="text-[11px] font-semibold uppercase tracking-wide mb-1 text-muted-foreground">Interview sims</p><p className="text-xl font-bold font-mono text-foreground">{interviews.length}</p></Card>
      </div>

      {/* Analyses */}
      <Card>
        <p className="text-[13px] font-semibold flex items-center gap-2 mb-2 text-foreground"><FileText className="w-4 h-4 text-amber-600 dark:text-amber-500" /> Analyses & Reports</p>
        {analyses.length === 0 ? <p className="text-[12px] text-muted-foreground">No analyses yet.</p> : (
          <div className="divide-y divide-border">
            {analyses.map(a => (
              <Link key={a.id} href={`/admin/users/${id}/analysis/${a.id}`} className="flex items-center justify-between gap-3 py-2.5 -mx-2 px-2 rounded-lg transition-colors group hover:bg-accent/40">
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium truncate text-foreground">{a.jobTitle}</p>
                  <p className="text-[11px] font-mono text-muted-foreground">
                    {new Date(a.createdAt).toLocaleDateString('en-GB')} {a.verdict && `· ${a.verdict}`}
                    {a.interviewProbability !== null && ` · Interview prob. ${a.interviewProbability}%`}
                  </p>
                </div>
                <span className={`text-[13px] font-bold tabular-nums font-mono ${scoreClass(a.overallScore)}`}>{a.overallScore !== null ? `${a.overallScore}%` : '—'}</span>
                <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 text-muted-foreground" />
              </Link>
            ))}
          </div>
        )}
      </Card>

      {/* Interview Simulator sessions */}
      <Card>
        <p className="text-[13px] font-semibold flex items-center gap-2 mb-2 text-foreground"><Mic className="w-4 h-4 text-amber-600 dark:text-amber-500" /> Interview Simulator Sessions</p>
        {interviews.length === 0 ? <p className="text-[12px] text-muted-foreground">No interview sessions yet.</p> : (
          <div className="divide-y divide-border">
            {interviews.map(iv => (
              <Link key={iv.id} href={`/admin/users/${id}/interview/${iv.id}`} className="flex items-center justify-between gap-3 py-2.5 -mx-2 px-2 rounded-lg transition-colors group hover:bg-accent/40">
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium truncate text-foreground">{iv.jobTitle} {iv.band && <span className="text-muted-foreground">· {iv.band}</span>}</p>
                  <p className="text-[11px] font-mono capitalize text-muted-foreground">{iv.status} · {new Date(iv.createdAt).toLocaleDateString('en-GB')}</p>
                </div>
                {iv.totalScore !== null && <span className={`text-[13px] font-bold tabular-nums font-mono ${scoreClass(iv.totalScore)}`}>{iv.totalScore}%</span>}
                <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 text-muted-foreground" />
              </Link>
            ))}
          </div>
        )}
      </Card>

      {/* Applications */}
      <Card>
        <p className="text-[13px] font-semibold flex items-center gap-2 mb-2 text-foreground"><Briefcase className="w-4 h-4 text-amber-600 dark:text-amber-500" /> Applications</p>
        {applications.length === 0 ? <p className="text-[12px] text-muted-foreground">No applications tracked.</p> : (
          <div className="divide-y divide-border">
            {applications.map(a => (
              <div key={a.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium truncate text-foreground">{a.jobTitle}</p>
                  <p className="text-[11px] font-mono truncate text-muted-foreground">{a.employer ?? '—'} · {new Date(a.createdAt).toLocaleDateString('en-GB')}</p>
                </div>
                <span className="text-[11px] font-semibold uppercase shrink-0 text-muted-foreground">{a.outcome ?? a.status ?? 'pending'}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* CV profiles */}
      <Card>
        <p className="text-[13px] font-semibold flex items-center gap-2 mb-2 text-foreground"><FileText className="w-4 h-4 text-amber-600 dark:text-amber-500" /> CV Profiles</p>
        {cvProfiles.length === 0 ? <p className="text-[12px] text-muted-foreground">No CVs created.</p> : (
          <div className="divide-y divide-border">
            {cvProfiles.map(cv => (
              <div key={cv.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium truncate text-foreground">{cv.title}</p>
                  <p className="text-[11px] font-mono capitalize text-muted-foreground">{cv.template} · Updated {new Date(cv.updatedAt).toLocaleDateString('en-GB')}</p>
                </div>
                <button onClick={() => downloadCv(cv.id, cv.fullName ?? cv.title)} className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium border border-border text-foreground hover:bg-accent transition-colors">
                  <Download className="w-3 h-3" /> Download
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* EvidenceVault */}
      <div className="space-y-3">
        <p className="text-[13px] font-semibold flex items-center gap-2 px-1 text-foreground"><Database className="w-4 h-4 text-amber-600 dark:text-amber-500" /> EvidenceVault™</p>

        <CollapsibleSection title="Experience Library (STAR examples)" icon={ListChecks} count={evidenceVault?.evidenceEntries.length ?? 0}>
          {evidenceVault?.evidenceEntries.length === 0 ? <p className="text-[12px] text-muted-foreground">No entries.</p> : evidenceVault?.evidenceEntries.map(e => (
            <div key={e.id} className="border-b last:border-0 pb-2.5 pt-1 border-border">
              <p className="text-[13px] font-medium text-foreground">{e.title} <span className="text-[10.5px] uppercase ml-1 text-muted-foreground">{e.category}</span></p>
              <p className="text-[11.5px] mt-1 text-muted-foreground"><strong>S:</strong> {e.situation}</p>
              <p className="text-[11.5px] text-muted-foreground"><strong>T:</strong> {e.task}</p>
              <p className="text-[11.5px] text-muted-foreground"><strong>A:</strong> {e.action}</p>
              <p className="text-[11.5px] text-muted-foreground"><strong>R:</strong> {e.result}</p>
              {e.skillTags?.length > 0 && <div className="flex flex-wrap gap-1 mt-1.5">{e.skillTags.map((t: string) => <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{t}</span>)}</div>}
            </div>
          ))}
        </CollapsibleSection>

        <CollapsibleSection title="Certificate Vault" icon={Award} count={evidenceVault?.certificates.length ?? 0}>
          {evidenceVault?.certificates.length === 0 ? <p className="text-[12px] text-muted-foreground">No certificates.</p> : evidenceVault?.certificates.map(c => (
            <div key={c.id} className="flex justify-between text-[12.5px] py-1.5 border-b last:border-0 border-border">
              <span className="text-foreground">{c.name} {c.issuer && <span className="text-muted-foreground">· {c.issuer}</span>}</span>
              <span className="font-mono text-muted-foreground">{c.expiryDate ? `Expires ${new Date(c.expiryDate).toLocaleDateString('en-GB')}` : '—'}</span>
            </div>
          ))}
        </CollapsibleSection>

        <CollapsibleSection title="Competency Tracker" icon={CheckCircle2} count={evidenceVault?.competencies.length ?? 0}>
          {evidenceVault?.competencies.length === 0 ? <p className="text-[12px] text-muted-foreground">No competencies tracked.</p> : evidenceVault?.competencies.map(c => (
            <div key={c.id} className="flex justify-between text-[12.5px] py-1.5 border-b last:border-0 border-border">
              <span className="text-foreground">{c.skillName}</span>
              <span className={`text-[10.5px] font-semibold uppercase ${c.status === 'competent' ? 'text-emerald-600 dark:text-emerald-400' : c.status === 'training' ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`}>{c.status.replace('_', ' ')}</span>
            </div>
          ))}
        </CollapsibleSection>

        <CollapsibleSection title="Interview Vault (pre-written answers)" icon={Mic} count={evidenceVault?.interviewVaultEntries.length ?? 0}>
          {evidenceVault?.interviewVaultEntries.length === 0 ? <p className="text-[12px] text-muted-foreground">No saved answers.</p> : evidenceVault?.interviewVaultEntries.map(e => (
            <div key={e.id} className="border-b last:border-0 pb-2.5 pt-1 border-border">
              <p className="text-[13px] font-medium text-foreground">{e.question} <span className="text-[10.5px] uppercase ml-1 text-muted-foreground">{e.category}</span></p>
              <p className="text-[11.5px] mt-1 text-muted-foreground">{e.answer}</p>
            </div>
          ))}
        </CollapsibleSection>

        <CollapsibleSection title="Reference & Employment History" icon={Users} count={evidenceVault?.referenceEntries.length ?? 0}>
          {evidenceVault?.referenceEntries.length === 0 ? <p className="text-[12px] text-muted-foreground">No entries.</p> : evidenceVault?.referenceEntries.map(r => (
            <div key={r.id} className="border-b last:border-0 pb-2.5 pt-1 border-border">
              <p className="text-[13px] font-medium text-foreground">{r.jobTitle} · {r.employer}</p>
              <p className="text-[11px] font-mono text-muted-foreground">
                {r.startDate && new Date(r.startDate).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })} – {r.endDate ? new Date(r.endDate).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : 'Present'}
              </p>
              {r.refereeName && <p className="text-[11.5px] mt-1 text-muted-foreground">Referee: {r.refereeName} {r.refereeRole && `(${r.refereeRole})`} {r.refereeEmail && `· ${r.refereeEmail}`}</p>}
            </div>
          ))}
        </CollapsibleSection>
      </div>

      {/* Career GPS */}
      {careerGps && (
        <Card>
          <p className="text-[13px] font-semibold flex items-center gap-2 mb-2 text-foreground"><MapPin className="w-4 h-4 text-amber-600 dark:text-amber-500" /> Career GPS™ Plan</p>
          <pre className="text-[10.5px] overflow-x-auto whitespace-pre-wrap max-h-64 overflow-y-auto font-mono text-muted-foreground">{JSON.stringify(careerGps, null, 2)}</pre>
        </Card>
      )}

      {/* Momentum snapshot */}
      {momentum && momentum.totalApplications > 0 && (
        <Card>
          <p className="text-[13px] font-semibold flex items-center gap-2 mb-2 text-foreground"><BarChart3 className="w-4 h-4 text-amber-600 dark:text-amber-500" /> Momentum Snapshot</p>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div><p className="text-lg font-bold font-mono text-foreground">{momentum.totalSubmitted}</p><p className="text-[10px] text-muted-foreground">submitted</p></div>
            <div><p className="text-lg font-bold font-mono text-foreground">{momentum.interviews}</p><p className="text-[10px] text-muted-foreground">interviews</p></div>
            <div><p className="text-lg font-bold font-mono text-foreground">{momentum.offers}</p><p className="text-[10px] text-muted-foreground">offers</p></div>
          </div>
        </Card>
      )}

      {/* Audit log */}
      <Card>
        <p className="text-[13px] font-semibold flex items-center gap-2 mb-2 text-foreground"><ScrollText className="w-4 h-4 text-amber-600 dark:text-amber-500" /> Admin actions on this account</p>
        {auditLog.length === 0 ? <p className="text-[12px] text-muted-foreground">No admin actions recorded.</p> : (
          auditLog.map(log => (
            <div key={log.id} className="text-[12px] border-l-2 pl-3 py-1 border-border">
              <p className="text-foreground"><span className="font-semibold">{log.adminEmail}</span> — {log.action.replace(/_/g, ' ')}</p>
              <p className="font-mono text-muted-foreground">{new Date(log.createdAt).toLocaleString('en-GB')}</p>
            </div>
          ))
        )}
      </Card>
    </div>
  )
}