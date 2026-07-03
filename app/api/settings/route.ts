// app/api/settings/route.ts
import { auth }  from '@/auth'
import { getDb } from '@/lib/db-router'

export const runtime = 'nodejs'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id as string
  const db     = await getDb(userId)
  const user   = await db.user.findUnique({
    where: { id: userId }, select: { id: true, name: true, email: true, image: true, tier: true },
  })
  if (!user) return Response.json({ error: 'User not found' }, { status: 404 })
  return Response.json({ success: true, user })
}

export async function PATCH(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id as string
  const body   = await req.json()
  const db     = await getDb(userId)
  const allowed: Record<string, any> = {}
  if (typeof body.name === 'string' && body.name.trim().length >= 2)
    allowed.name = body.name.trim().slice(0, 100)
  if (!Object.keys(allowed).length) return Response.json({ error: 'Nothing to update' }, { status: 400 })
  const updated = await db.user.update({ where: { id: userId }, data: allowed, select: { id: true, name: true, email: true } })
  return Response.json({ success: true, user: updated })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id as string
  const db     = await getDb(userId)
  const { action } = await req.json().catch(() => ({}))
  if (action !== 'export') return Response.json({ error: 'Unknown action' }, { status: 400 })

  // ── Pull EVERYTHING the user has ever done ─────────────────────────────────
  const [
    user, analyses, applications, cvProfiles,
    evidenceEntries, skillsPassport, cpdRecord,
    jobReadyPackages,
  ] = await Promise.all([
    db.user.findUnique({ where: { id: userId },
      select: { name: true, email: true, tier: true, createdAt: true } }).catch(() => null),

    db.analysis.findMany({ where: { userId }, orderBy: { createdAt: 'desc' },
      select: { id: true, jobTitle: true, createdAt: true, result: true, statement: true } }).catch(() => []),

    db.application.findMany({
      where: { userId, notes: { notIn: ['job_ready', 'skills_passport', 'cpd_tracker'] } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, jobTitle: true, employer: true, status: true, createdAt: true, notes: true } }).catch(() => []),

    db.cvProfile.findMany({ where: { userId }, orderBy: { updatedAt: 'desc' },
      select: { title: true, fullName: true, email: true, phone: true, location: true,
        personalStatement: true, skills: true, workHistory: true, education: true,
        professionalRegistration: true, updatedAt: true } }).catch(() => []),

    db.evidenceEntry.findMany({ where: { userId }, orderBy: { updatedAt: 'desc' },
      select: { title: true, competency: true, situation: true, task: true, action: true, result: true, updatedAt: true } }).catch(() => []),

    db.application.findFirst({ where: { userId, notes: 'skills_passport' },
      select: { parsedSpec: true } }).catch(() => null),

    db.application.findFirst({ where: { userId, notes: 'cpd_tracker' },
      select: { parsedSpec: true } }).catch(() => null),

    db.application.findMany({ where: { userId, notes: 'job_ready' }, orderBy: { createdAt: 'desc' },
      select: { id: true, jobTitle: true, employer: true, createdAt: true, parsedSpec: true } }).catch(() => []),
  ])

  // ── Build docx ────────────────────────────────────────────────────────────
  const {
    Document, Packer, Paragraph, TextRun, HeadingLevel,
    AlignmentType, Table, TableRow, TableCell,
    WidthType, ShadingType, BorderStyle, PageBreak,
  } = await import('docx')

  const fmt = (d: any) => d ? new Date(d).toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' }) : 'N/A'
  const cap = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : ''

  // ── Helpers ──────────────────────────────────────────────────────────────
  const h1 = (text: string) => new Paragraph({ text, heading: HeadingLevel.HEADING_1, spacing: { before: 480, after: 160 } })
  const h2 = (text: string) => new Paragraph({ text, heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 100 } })
  const h3 = (text: string) => new Paragraph({ text, heading: HeadingLevel.HEADING_3, spacing: { before: 160, after: 80 } })
  const p  = (text: string) => new Paragraph({ children: [new TextRun({ text, size: 22 })], spacing: { after: 80 } })
  const kv = (k: string, v: string) => new Paragraph({
    children: [new TextRun({ text: `${k}: `, bold: true, size: 22 }), new TextRun({ text: v || 'N/A', size: 22 })],
    spacing: { after: 80 },
  })
  const br = () => new Paragraph({ children: [new PageBreak()] })
  const rule = () => new Paragraph({
    border: { bottom: { color: 'E5E7EB', style: BorderStyle.SINGLE, size: 4 } },
    spacing: { after: 200 }, children: [],
  })
  const bullet = (text: string) => new Paragraph({
    children: [new TextRun({ text: `• ${text}`, size: 22 })],
    spacing: { after: 60 }, indent: { left: 360 },
  })
  const scoreBar = (label: string, val: number) => new Paragraph({
    children: [
      new TextRun({ text: `${label}: `, bold: true, size: 22 }),
      new TextRun({ text: `${val}/100  `, size: 22 }),
      new TextRun({ text: val >= 70 ? '▓'.repeat(Math.round(val/10)) + ' ✓' : val >= 50 ? '▒'.repeat(Math.round(val/10)) : '░'.repeat(Math.round(val/10)), size: 22, color: val >= 70 ? '059669' : val >= 50 ? 'D97706' : 'DC2626' }),
    ],
    spacing: { after: 60 },
  })

  const tRow = (cells: string[], isHeader = false) => new TableRow({
    tableHeader: isHeader,
    children: cells.map((c, i) => new TableCell({
      shading: isHeader ? { type: ShadingType.CLEAR, color: 'EFF6FF' } : undefined,
      width: { size: Math.floor(9360 / cells.length), type: WidthType.DXA },
      children: [new Paragraph({ children: [new TextRun({ text: c, bold: isHeader, size: 20 })] })],
    })),
  })

  const children: any[] = []
  const add = (...items: any[]) => children.push(...items)

  // ── Cover ─────────────────────────────────────────────────────────────────
  add(
    new Paragraph({ children: [new TextRun({ text: 'OmniJobReady AI™', bold: true, size: 64, color: '2563EB' })], alignment: AlignmentType.CENTER, spacing: { before: 2880, after: 200 } }),
    new Paragraph({ children: [new TextRun({ text: 'Complete Career Portfolio Export', size: 40, color: '6B7280' })], alignment: AlignmentType.CENTER, spacing: { after: 120 } }),
    new Paragraph({ children: [new TextRun({ text: `${user?.name ?? ''} · ${user?.email ?? ''}`, size: 28, color: '9CA3AF' })], alignment: AlignmentType.CENTER, spacing: { after: 80 } }),
    new Paragraph({ children: [new TextRun({ text: `Exported ${fmt(new Date())}`, size: 24, color: 'CBD5E1' })], alignment: AlignmentType.CENTER, spacing: { after: 80 } }),
    new Paragraph({ children: [new TextRun({ text: `Plan: ${cap(user?.tier ?? 'free')} · Member since ${fmt((user as any)?.createdAt)}`, size: 24, color: 'CBD5E1' })], alignment: AlignmentType.CENTER }),
    br(),
  )

  // ── Summary stats ─────────────────────────────────────────────────────────
  add(
    h1('Summary'),
    kv('Total analyses run', String(analyses.length)),
    kv('Applications tracked', String((applications as any[]).length)),
    kv('CV profiles', String((cvProfiles as any[]).length)),
    kv('Evidence vault entries', String((evidenceEntries as any[]).length)),
    kv('Job Ready™ packages', String((jobReadyPackages as any[]).length)),
    kv('CPD activities logged', String(((cpdRecord?.parsedSpec as any)?.entries ?? []).length)),
    rule(),
  )

  // ── Analyses — full detail ────────────────────────────────────────────────
  add(h1(`Application Analyses (${analyses.length})`))

  if ((analyses as any[]).length === 0) {
    add(p('No analyses found.'))
  } else {
    for (const [i, a] of (analyses as any[]).entries()) {
      const r = (a.result as any) ?? {}
      const scored = r.scoredBreakdown ?? {}
      const overall = scored.overall ?? r.overallScore ?? 0

      add(h2(`${i + 1}. ${a.jobTitle || 'Untitled Role'}`))
      add(kv('Date analysed', fmt(a.createdAt)))
      add(kv('Overall score', `${overall}/100 — ${r.verdict ?? 'N/A'}`))
      add(kv('Shortlist probability', r.shortlistProbability ? `${r.shortlistProbability}%` : 'N/A'))

      // Scores breakdown
      if (scored.overall !== undefined) {
        add(h3('Score Breakdown'))
        if (scored.criteria  !== undefined) add(scoreBar('Criteria Coverage',   scored.criteria))
        if (scored.values    !== undefined) add(scoreBar('NHS Values',          scored.values))
        if (scored.star      !== undefined) add(scoreBar('STAR Completeness',   scored.star))
        if (scored.language  !== undefined) add(scoreBar('Language Mirroring',  scored.language))
        if (scored.specificity!== undefined) add(scoreBar('Specificity',        scored.specificity))
      }

      // Statement
      if (a.statement) {
        add(h3('Supporting Statement Analysed'))
        add(new Paragraph({ children: [new TextRun({ text: a.statement.slice(0, 1500), size: 20, color: '374151', italics: true })], spacing: { after: 120 } }))
      }

      // Essential criteria
      const criteria = r.essentialCriteria ?? r.criteria ?? []
      if (criteria.length > 0) {
        add(h3('Essential Criteria'))
        for (const c of criteria) {
          const met = c.met === true || c.status === 'met'
          add(new Paragraph({
            children: [
              new TextRun({ text: met ? '✓ ' : '✗ ', color: met ? '059669' : 'DC2626', bold: true, size: 22 }),
              new TextRun({ text: c.criterion ?? c.text ?? String(c), size: 22 }),
            ],
            spacing: { after: 60 },
          }))
        }
      }

      // Keywords
      const keywords = r.atsKeywords ?? r.keywords ?? []
      if (keywords.length > 0) {
        add(h3('ATS Keywords Detected'))
        add(p(Array.isArray(keywords) ? keywords.join(', ') : String(keywords)))
      }

      // Strengths
      const strengths = r.strengths ?? r.insights?.strengths ?? []
      if (strengths.length > 0) {
        add(h3('Strengths'))
        for (const s of strengths) add(bullet(typeof s === 'string' ? s : s.text ?? JSON.stringify(s)))
      }

      // Recommendations
      const recs = r.recommendations ?? r.insights?.recommendations ?? []
      if (recs.length > 0) {
        add(h3('Recommendations'))
        for (const rec of recs) add(bullet(typeof rec === 'string' ? rec : rec.text ?? JSON.stringify(rec)))
      }

      // Weaknesses
      const weaknesses = r.weaknesses ?? r.insights?.weaknesses ?? []
      if (weaknesses.length > 0) {
        add(h3('Weaknesses'))
        for (const w of weaknesses) add(bullet(typeof w === 'string' ? w : w.text ?? JSON.stringify(w)))
      }

      // Band match
      const bands = r.bandMatch?.bands ?? r.bands ?? []
      if (bands.length > 0) {
        add(h3('Band Match DNA™'))
        add(new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [2340, 2340, 2340, 2340],
          rows: [
            tRow(['Band', 'Match %', 'Status', 'Verdict'], true),
            ...bands.map((b: any) => tRow([
              b.label ?? `Band ${b.band}`,
              `${b.matchPct ?? 0}%`,
              b.status ?? '',
              b.verdict ?? '',
            ])),
          ],
        }))
        add(new Paragraph({ children: [], spacing: { after: 160 } }))
      }

      add(rule())
    }
  }

  // ── Job Ready packages ────────────────────────────────────────────────────
  add(br(), h1(`Job Ready™ Packages (${(jobReadyPackages as any[]).length})`))

  if ((jobReadyPackages as any[]).length === 0) {
    add(p('No Job Ready™ packages saved.'))
  } else {
    for (const [i, pkg] of (jobReadyPackages as any[]).entries()) {
      const data = (pkg.parsedSpec as any)?.jobReadyPackage ?? pkg.parsedSpec ?? {}
      add(h2(`${i + 1}. ${pkg.jobTitle || data.jobTitle || 'Untitled'}`))
      add(kv('Employer', pkg.employer || data.employer || 'N/A'))
      add(kv('Created',  fmt(pkg.createdAt)))

      if (data.cvContent?.personalStatement) {
        add(h3('Personal Statement'))
        add(p(data.cvContent.personalStatement))
      }
      if (data.coverLetter?.body) {
        add(h3('Cover Letter'))
        add(p(data.coverLetter.body))
      }
      if (data.supportingStatement?.criteria?.length > 0) {
        add(h3('STAR Supporting Statement'))
        for (const c of data.supportingStatement.criteria) {
          add(new Paragraph({ children: [new TextRun({ text: c.criterion ?? '', bold: true, size: 22 })], spacing: { after: 40 } }))
          add(p(c.starEvidence ?? ''))
        }
      }
      if (data.interviewPrep?.questions?.length > 0) {
        add(h3('Interview Questions'))
        for (const [qi, q] of data.interviewPrep.questions.entries()) {
          add(new Paragraph({ children: [new TextRun({ text: `Q${qi+1}: ${q.question}`, bold: true, size: 22 })], spacing: { after: 40 } }))
          if (q.keyPoints?.length > 0) for (const kp of q.keyPoints) add(bullet(kp))
        }
      }
      if (data.actionPlan?.length > 0) {
        add(h3('7-Day Action Plan'))
        for (const step of data.actionPlan) add(bullet(`Day ${step.day}: ${step.task}`))
      }
      add(rule())
    }
  }

  // ── Evidence Vault ────────────────────────────────────────────────────────
  add(br(), h1(`EvidenceVault™ (${(evidenceEntries as any[]).length} entries)`))

  if ((evidenceEntries as any[]).length === 0) {
    add(p('No evidence entries found.'))
  } else {
    for (const [i, e] of (evidenceEntries as any[]).entries()) {
      add(h2(`${i + 1}. ${e.title || 'Untitled'}`))
      add(kv('Competency',    e.competency || 'N/A'))
      add(kv('Last updated',  fmt(e.updatedAt)))
      if (e.situation) { add(h3('Situation')); add(p(e.situation)) }
      if (e.task)      { add(h3('Task'));      add(p(e.task)) }
      if (e.action)    { add(h3('Action'));    add(p(e.action)) }
      if (e.result)    { add(h3('Result'));    add(p(e.result)) }
      add(rule())
    }
  }

  // ── CV Profiles ───────────────────────────────────────────────────────────
  add(br(), h1(`CV Profiles (${(cvProfiles as any[]).length})`))

  if ((cvProfiles as any[]).length === 0) {
    add(p('No CV profiles found.'))
  } else {
    for (const [i, cv] of (cvProfiles as any[]).entries()) {
      add(h2(`${i + 1}. ${cv.fullName || cv.title || 'Untitled'}`))
      add(kv('Email',              cv.email    || 'N/A'))
      add(kv('Phone',              cv.phone    || 'N/A'))
      add(kv('Location',           cv.location || 'N/A'))
      add(kv('Registration',       cv.professionalRegistration || 'N/A'))
      add(kv('Last updated',       fmt(cv.updatedAt)))
      if (cv.personalStatement) { add(h3('Personal Statement')); add(p(cv.personalStatement)) }

      const skills = Array.isArray(cv.skills) ? cv.skills : []
      if (skills.length > 0) {
        add(h3('Skills'))
        for (const s of skills) {
          if (s.category) add(new Paragraph({ children: [new TextRun({ text: s.category + ':', bold: true, size: 22 })], spacing: { after: 40 } }))
          const items = Array.isArray(s.items) ? s.items : (typeof s.items === 'string' ? [s.items] : [])
          for (const item of items) add(bullet(item))
        }
      }

      const work = Array.isArray(cv.workHistory) ? cv.workHistory : []
      if (work.length > 0) {
        add(h3('Work History'))
        for (const w of work) {
          add(new Paragraph({
            children: [new TextRun({ text: `${w.title ?? ''} — ${w.employer ?? ''}`, bold: true, size: 22 }),
                       new TextRun({ text: `  (${w.startDate ?? ''} – ${w.endDate ?? 'Present'})`, size: 20, color: '6B7280' })],
            spacing: { after: 40 },
          }))
          if (w.description) add(p(w.description))
        }
      }

      const edu = Array.isArray(cv.education) ? cv.education : []
      if (edu.length > 0) {
        add(h3('Education & Qualifications'))
        for (const e of edu) {
          add(new Paragraph({
            children: [new TextRun({ text: `${e.qualification ?? ''} — ${e.institution ?? ''}`, bold: true, size: 22 }),
                       new TextRun({ text: `  (${e.year ?? ''})`, size: 20, color: '6B7280' })],
            spacing: { after: 60 },
          }))
        }
      }
      add(rule())
    }
  }

  // ── Skills Passport ───────────────────────────────────────────────────────
  const skillsData = (skillsPassport?.parsedSpec as any)?.skills ?? {}
  const skillKeys  = Object.keys(skillsData)
  add(br(), h1('NHS Skills Passport™'))
  if (skillKeys.length === 0) {
    add(p('No skills logged yet.'))
  } else {
    add(new Table({
      width: { size: 9360, type: WidthType.DXA },
      columnWidths: [3120, 2340, 3900],
      rows: [
        tRow(['Skill', 'Status', 'Evidence'], true),
        ...skillKeys.map(k => tRow([
          k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          cap(skillsData[k]?.status ?? 'not started'),
          skillsData[k]?.evidence ?? '—',
        ])),
      ],
    }))
    add(new Paragraph({ children: [], spacing: { after: 160 } }))
  }
  add(rule())

  // ── CPD Log ───────────────────────────────────────────────────────────────
  const cpdEntries = ((cpdRecord?.parsedSpec as any)?.entries ?? []) as any[]
  const cpdSettings = (cpdRecord?.parsedSpec as any)?.settings ?? {}
  const totalHours  = cpdEntries.reduce((s: number, e: any) => s + (Number(e.hours) || 0), 0)
  add(br(), h1('CPD Tracker'))
  add(kv('Registration body',   cap(cpdSettings.body ?? 'N/A')))
  add(kv('Total hours logged',  `${totalHours.toFixed(1)} hours`))
  add(kv('Total activities',    String(cpdEntries.length)))
  if (cpdEntries.length > 0) {
    add(new Table({
      width: { size: 9360, type: WidthType.DXA },
      columnWidths: [1560, 3120, 1560, 3120],
      rows: [
        tRow(['Date', 'Activity', 'Hours', 'Type'], true),
        ...cpdEntries.map((e: any) => tRow([fmt(e.date), e.title ?? '', String(e.hours ?? 0), cap(e.type ?? '')])),
      ],
    }))
    add(new Paragraph({ children: [], spacing: { after: 160 } }))
    // Reflections
    const withReflections = cpdEntries.filter((e: any) => e.reflection)
    if (withReflections.length > 0) {
      add(h2('CPD Reflections'))
      for (const e of withReflections) {
        add(new Paragraph({ children: [new TextRun({ text: `${e.title} (${fmt(e.date)})`, bold: true, size: 22 })], spacing: { after: 40 } }))
        add(p(e.reflection))
      }
    }
  }
  add(rule())

  // ── Application Tracker ───────────────────────────────────────────────────
  add(br(), h1(`Application Tracker (${(applications as any[]).length})`))
  if ((applications as any[]).length === 0) {
    add(p('No applications tracked.'))
  } else {
    add(new Table({
      width: { size: 9360, type: WidthType.DXA },
      columnWidths: [3120, 2340, 1560, 2340],
      rows: [
        tRow(['Job Title', 'Employer', 'Status', 'Date'], true),
        ...(applications as any[]).map(a => tRow([a.jobTitle ?? 'N/A', a.employer ?? 'N/A', cap(a.status ?? ''), fmt(a.createdAt)])),
      ],
    }))
    add(new Paragraph({ children: [], spacing: { after: 160 } }))
  }
  add(rule())

  // ── Footer ────────────────────────────────────────────────────────────────
  add(new Paragraph({
    children: [new TextRun({ text: `Exported from OmniJobReady AI™ on ${fmt(new Date())} · omnijobready.com`, size: 18, color: '9CA3AF', italics: true })],
    alignment: AlignmentType.CENTER, spacing: { before: 600 },
  }))

  const doc = new Document({
    creator: 'OmniJobReady AI',
    title:   `Career Export — ${user?.name ?? ''}`,
    description: 'Complete career portfolio export from OmniJobReady AI',
    sections: [{
      properties: { page: { margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } },
      children,
    }],
  })

  const buffer  = await Packer.toBuffer(doc)
  const dateStr = new Date().toISOString().split('T')[0]

  return new Response(buffer, {
    headers: {
      'Content-Type':        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="omnijobready-portfolio-${dateStr}.docx"`,
    },
  })
}