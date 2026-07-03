// app/api/analysis/[id]/report/route.ts
// Generates a professionally formatted .docx report for a single analysis
import { auth }               from '@/auth'
import { getEffectiveUserId } from '@/lib/effective-user'
import { getDb }              from '@/lib/db-router'

export const runtime = 'nodejs'

const fmt = (d: any) => d
  ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  : 'N/A'

const cap = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : ''

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.id) return new Response('Unauthorized', { status: 401 })
    const userId = (await getEffectiveUserId()) ?? (session.user.id as string)
    const db     = await getDb(userId)
    const { id } = await params

    const record = await db.analysis.findUnique({
      where:  { id },
      select: { id: true, jobTitle: true, jobDescription: true, createdAt: true, result: true, statement: true, userId: true },
    })

    if (!record || record.userId !== userId) return new Response('Not found', { status: 404 })

    const r      = (record.result as any) ?? {}
    const scored = r.scoredBreakdown ?? {}
    const overall = scored.overall ?? r.overallScore ?? 0

    const {
      Document, Packer, Paragraph, TextRun, HeadingLevel,
      AlignmentType, Table, TableRow, TableCell,
      WidthType, ShadingType, BorderStyle, UnderlineType,
    } = await import('docx')

    // ── Helpers ─────────────────────────────────────────────────────────────
    const BLUE   = '1e40af'
    const NAVY   = '0f2d5e'
    const GREEN  = '065f46'
    const RED    = '991b1b'
    const AMBER  = '92400e'
    const GRAY   = '374151'
    const LGRAY  = '9ca3af'
    const WHITE  = 'ffffff'

    const scoreColor = (v: number) => v >= 70 ? GREEN : v >= 50 ? AMBER : RED

    const h1 = (text: string) => new Paragraph({
      children: [new TextRun({ text, bold: true, size: 32, color: NAVY })],
      spacing: { before: 400, after: 160 },
      border:  { bottom: { color: 'dbeafe', style: BorderStyle.SINGLE, size: 6 } },
    })

    const h2 = (text: string) => new Paragraph({
      children: [new TextRun({ text, bold: true, size: 26, color: BLUE })],
      spacing: { before: 280, after: 100 },
    })

    const h3 = (text: string) => new Paragraph({
      children: [new TextRun({ text, bold: true, size: 22, color: GRAY })],
      spacing: { before: 180, after: 60 },
    })

    const body = (text: string, color = GRAY) => new Paragraph({
      children: [new TextRun({ text, size: 22, color })],
      spacing: { after: 80 },
    })

    const kv = (k: string, v: string, vColor = GRAY) => new Paragraph({
      children: [
        new TextRun({ text: `${k}:  `, bold: true, size: 22, color: NAVY }),
        new TextRun({ text: v || 'N/A', size: 22, color: vColor }),
      ],
      spacing: { after: 80 },
    })

    const rule = () => new Paragraph({
      border:  { bottom: { color: 'e5e7eb', style: BorderStyle.SINGLE, size: 4 } },
      spacing: { after: 200 }, children: [],
    })

    const bullet = (text: string, color = GRAY) => new Paragraph({
      children: [new TextRun({ text: `•  ${text}`, size: 22, color })],
      spacing: { after: 60 }, indent: { left: 360 },
    })

    const scorePill = (label: string, val: number) => {
      const c   = scoreColor(val)
      const bar = '█'.repeat(Math.round(val / 10)).padEnd(10, '░')
      return new Paragraph({
        children: [
          new TextRun({ text: `${label.padEnd(24)}`, size: 22, bold: true, color: GRAY }),
          new TextRun({ text: `${bar}  `, size: 22, color: c }),
          new TextRun({ text: `${val}/100`, size: 22, bold: true, color: c }),
        ],
        spacing: { after: 80 },
      })
    }

    const tRow = (cells: { text: string; bold?: boolean; color?: string; bg?: string }[], isHeader = false) =>
      new TableRow({
        tableHeader: isHeader,
        children: cells.map(c => new TableCell({
          shading: c.bg ? { type: ShadingType.CLEAR, color: c.bg } : isHeader ? { type: ShadingType.CLEAR, color: 'eff6ff' } : undefined,
          width:   { size: Math.floor(9360 / cells.length), type: WidthType.DXA },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          children: [new Paragraph({
            children: [new TextRun({ text: c.text, bold: c.bold ?? isHeader, size: 20, color: c.color ?? (isHeader ? NAVY : GRAY) })],
          })],
        })),
      })

    const children: any[] = []
    const add = (...items: any[]) => children.push(...items)

    // ── Cover page ──────────────────────────────────────────────────────────
    add(
      new Paragraph({
        children: [new TextRun({ text: 'OmniJobReady AI™', bold: true, size: 56, color: BLUE })],
        alignment: AlignmentType.CENTER, spacing: { before: 1440, after: 120 },
      }),
      new Paragraph({
        children: [new TextRun({ text: 'Application Analysis Report', size: 32, color: LGRAY })],
        alignment: AlignmentType.CENTER, spacing: { after: 480 },
      }),
      new Paragraph({
        children: [new TextRun({ text: record.jobTitle || 'Untitled Role', bold: true, size: 36, color: NAVY })],
        alignment: AlignmentType.CENTER, spacing: { after: 120 },
      }),
      new Paragraph({
        children: [new TextRun({ text: fmt(record.createdAt), size: 24, color: LGRAY })],
        alignment: AlignmentType.CENTER, spacing: { after: 120 },
      }),
      new Paragraph({
        children: [new TextRun({
          text: `Overall Score: ${overall}/100  —  ${r.verdict ?? 'N/A'}`,
          bold: true, size: 28, color: scoreColor(overall),
        })],
        alignment: AlignmentType.CENTER, spacing: { after: 480 },
      }),
      rule(),
    )

    // ── Executive summary ───────────────────────────────────────────────────
    add(h1('Executive Summary'))
    add(kv('Role', record.jobTitle || 'N/A'))
    add(kv('Analysed', fmt(record.createdAt)))
    add(kv('Overall score', `${overall}/100`, scoreColor(overall)))
    add(kv('Verdict', r.verdict ?? 'N/A', scoreColor(overall)))
    add(kv('Shortlist probability', r.shortlistProbability ? `${r.shortlistProbability}%` : 'N/A'))
    if ((record as any).band)     add(kv('Band applied', (record as any).band))
    if ((record as any).location) add(kv('Location', (record as any).location))
    add(rule())

    // ── Score breakdown ─────────────────────────────────────────────────────
    add(h1('Score Breakdown'))
    add(body('Each dimension is scored 0–100. Green = 70+  Amber = 50–69  Red = below 50.', LGRAY))
    if (scored.criteria   !== undefined) add(scorePill('Criteria Coverage (35%)',  scored.criteria))
    if (scored.values     !== undefined) add(scorePill('NHS Values (20%)',         scored.values))
    if (scored.star       !== undefined) add(scorePill('STAR Completeness (25%)',  scored.star))
    if (scored.language   !== undefined) add(scorePill('Language Mirroring (12%)', scored.language))
    if (scored.specificity!== undefined) add(scorePill('Specificity (8%)',         scored.specificity))
    add(rule())

    // ── Statement analysed ──────────────────────────────────────────────────
    if (record.statement) {
      add(h1('Supporting Statement Analysed'))
      add(new Paragraph({
        children: [new TextRun({ text: record.statement, size: 21, color: '4b5563', italics: true })],
        spacing: { after: 160 },
      }))
      add(kv('Word count', `${record.statement.split(/\s+/).filter(Boolean).length} words`))
      const statScan = r.statementScan ?? {}
      if (statScan.wordCount) add(kv('Word count (AI)', String(statScan.wordCount)))
      if (statScan.avgSentenceLength) add(kv('Avg sentence length', `${statScan.avgSentenceLength} words`))
      add(rule())
    }

    // ── Essential criteria ──────────────────────────────────────────────────
    const criteria = r.essentialCriteria ?? r.criteria ?? []
    if (criteria.length > 0) {
      add(h1('Essential Criteria Assessment'))
      const met = criteria.filter((c: any) => c.met === true || c.status === 'met').length
      add(body(`${met} of ${criteria.length} essential criteria evidenced`, met === criteria.length ? GREEN : met >= criteria.length * 0.7 ? AMBER : RED))
      for (const c of criteria) {
        const isMet = c.met === true || c.status === 'met'
        const isPartial = c.status === 'partial' || c.status === 'partially_met'
        add(new Paragraph({
          children: [
            new TextRun({ text: isMet ? '✓  ' : isPartial ? '◑  ' : '✗  ', bold: true, size: 22, color: isMet ? GREEN : isPartial ? AMBER : RED }),
            new TextRun({ text: c.criterion ?? c.text ?? String(c), size: 22, color: GRAY }),
          ],
          spacing: { after: 80 }, indent: { left: 180 },
        }))
        if (c.evidence) add(new Paragraph({
          children: [new TextRun({ text: `    → ${c.evidence}`, size: 20, color: LGRAY, italics: true })],
          spacing: { after: 80 },
        }))
      }
      add(rule())
    }

    // ── NHS Values ──────────────────────────────────────────────────────────
    const values = r.nhsValues ?? r.values ?? []
    if (values.length > 0) {
      add(h1('NHS Values Alignment'))
      for (const v of values) {
        const vName = typeof v === 'string' ? v : v.value ?? v.name ?? ''
        const vEv   = typeof v === 'object' ? v.evidence ?? '' : ''
        add(new Paragraph({
          children: [new TextRun({ text: `✓  ${vName}`, bold: true, size: 22, color: GREEN })],
          spacing: { after: 40 }, indent: { left: 180 },
        }))
        if (vEv) add(new Paragraph({
          children: [new TextRun({ text: `    ${vEv}`, size: 20, color: LGRAY, italics: true })],
          spacing: { after: 80 },
        }))
      }
      add(rule())
    }

    // ── ATS Keywords ────────────────────────────────────────────────────────
    const atsKeywords  = r.atsKeywords ?? r.keywords ?? []
    const skillsDetected = r.skillsDetected ?? r.skills ?? []
    if (atsKeywords.length > 0 || skillsDetected.length > 0) {
      add(h1('ATS Keyword Analysis'))
      if (atsKeywords.length > 0) {
        add(h2('Keywords Found'))
        add(body(Array.isArray(atsKeywords) ? atsKeywords.join('  ·  ') : String(atsKeywords), BLUE))
      }
      if (skillsDetected.length > 0) {
        add(h2('Skills Detected'))
        add(body(Array.isArray(skillsDetected) ? skillsDetected.join('  ·  ') : String(skillsDetected), GRAY))
      }
      add(rule())
    }

    // ── Shortlist probability ────────────────────────────────────────────────
    const shortlistFactors = r.shortlistFactors ?? []
    if (shortlistFactors.length > 0) {
      add(h1('Shortlist Probability Analysis'))
      if (r.shortlistProbability !== undefined) {
        add(new Paragraph({
          children: [new TextRun({ text: `${r.shortlistProbability}%`, bold: true, size: 56, color: scoreColor(r.shortlistProbability) })],
          alignment: AlignmentType.CENTER, spacing: { after: 80 },
        }))
        add(new Paragraph({
          children: [new TextRun({ text: 'Estimated shortlisting probability', size: 22, color: LGRAY })],
          alignment: AlignmentType.CENTER, spacing: { after: 160 },
        }))
      }
      add(new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [4680, 2340, 2340],
        rows: [
          tRow([{ text: 'Factor' }, { text: 'Score' }, { text: 'Weighting' }], true),
          ...shortlistFactors.map((f: any) => tRow([
            { text: f.label ?? f.factor ?? '' },
            { text: `${f.score ?? f.value ?? 0}/100`, color: scoreColor(f.score ?? f.value ?? 0) },
            { text: f.weight ? `${f.weight}%` : '' },
          ])),
        ],
      }))
      add(new Paragraph({ children: [], spacing: { after: 160 } }))
      add(rule())
    }

    // ── Band match ───────────────────────────────────────────────────────────
    const bands = r.bandMatch?.bands ?? r.bands ?? []
    if (bands.length > 0) {
      add(h1('Band Match DNA™'))
      add(body('Your statement was assessed against every NHS AfC band from 2 to 8a.', LGRAY))
      add(new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [2340, 1560, 1560, 3900],
        rows: [
          tRow([{ text: 'Band' }, { text: 'Match %' }, { text: 'Status' }, { text: 'Verdict' }], true),
          ...bands.map((b: any) => {
            const pct = b.matchPct ?? 0
            return tRow([
              { text: b.label ?? `Band ${b.band}`, bold: true },
              { text: `${pct}%`, color: scoreColor(pct) },
              { text: cap(b.status ?? ''), color: scoreColor(pct) },
              { text: b.verdict ?? '' },
            ])
          }),
        ],
      }))
      add(new Paragraph({ children: [], spacing: { after: 160 } }))
      add(rule())
    }

    // ── Strengths ────────────────────────────────────────────────────────────
    const strengths = r.strengths ?? r.insights?.strengths ?? []
    if (strengths.length > 0) {
      add(h1('Strengths'))
      add(body('What your statement does well.', LGRAY))
      for (const s of strengths) {
        const text = typeof s === 'string' ? s : s.text ?? s.strength ?? JSON.stringify(s)
        add(bullet(text, GREEN))
      }
      add(rule())
    }

    // ── Recommendations ──────────────────────────────────────────────────────
    const recs = r.recommendations ?? r.insights?.recommendations ?? []
    if (recs.length > 0) {
      add(h1('Recommendations'))
      add(body('Specific directives to improve your score before resubmitting.', LGRAY))
      for (const [i, rec] of recs.entries()) {
        const text = typeof rec === 'string' ? rec : rec.text ?? rec.recommendation ?? JSON.stringify(rec)
        add(new Paragraph({
          children: [
            new TextRun({ text: `${i + 1}.  `, bold: true, size: 22, color: BLUE }),
            new TextRun({ text, size: 22, color: GRAY }),
          ],
          spacing: { after: 100 }, indent: { left: 180 },
        }))
      }
      add(rule())
    }

    // ── Weaknesses ───────────────────────────────────────────────────────────
    const weaknesses = r.weaknesses ?? r.insights?.weaknesses ?? []
    if (weaknesses.length > 0) {
      add(h1('Weaknesses & Gaps'))
      add(body('Every gap a shortlisting panel would flag.', LGRAY))
      for (const w of weaknesses) {
        const text = typeof w === 'string' ? w : w.text ?? w.weakness ?? JSON.stringify(w)
        add(bullet(text, RED))
      }
      add(rule())
    }

    // ── Missing criteria ─────────────────────────────────────────────────────
    const missing = r.missingCriteria ?? r.insights?.missingCriteria ?? []
    if (missing.length > 0) {
      add(h1('Missing Criteria'))
      add(body('Criteria from the person spec not evidenced in your statement.', LGRAY))
      for (const m of missing) {
        const text = typeof m === 'string' ? m : m.criterion ?? m.text ?? JSON.stringify(m)
        add(new Paragraph({
          children: [
            new TextRun({ text: '→  ', bold: true, size: 22, color: AMBER }),
            new TextRun({ text, size: 22, color: GRAY }),
          ],
          spacing: { after: 80 }, indent: { left: 180 },
        }))
      }
      add(rule())
    }

    // ── Rejection risk ────────────────────────────────────────────────────────
    const rejRisk = r.rejectionRisk ?? r.insights?.rejectionRisk
    if (rejRisk) {
      add(h1('Rejection Risk Analysis'))
      add(kv('Risk level', cap(rejRisk.level ?? rejRisk.risk ?? 'Unknown'), scoreColor(rejRisk.level === 'low' ? 80 : rejRisk.level === 'medium' ? 55 : 20)))
      if (rejRisk.reasons?.length > 0) {
        add(h3('Risk factors'))
        for (const r_ of rejRisk.reasons) add(bullet(typeof r_ === 'string' ? r_ : r_.text ?? '', RED))
      }
      add(rule())
    }

    // ── Operational realism ───────────────────────────────────────────────────
    const opReal = r.operationalRealism ?? r.insights?.operationalRealism
    if (opReal) {
      add(h1('Operational Realism'))
      if (typeof opReal === 'string') add(body(opReal))
      else {
        if (opReal.score !== undefined) add(kv('Realism score', `${opReal.score}/100`, scoreColor(opReal.score)))
        if (opReal.verdict)             add(body(opReal.verdict))
        if (opReal.issues?.length > 0)  for (const i of opReal.issues) add(bullet(i, AMBER))
      }
      add(rule())
    }

    // ── Evidence gaps ─────────────────────────────────────────────────────────
    const evGaps = r.evidenceGaps ?? []
    if (evGaps.length > 0) {
      add(h1('Evidence Gaps'))
      add(body('Criteria you claim but have no supporting evidence for.', LGRAY))
      for (const g of evGaps) {
        const text = typeof g === 'string' ? g : g.gap ?? g.text ?? JSON.stringify(g)
        add(bullet(text, AMBER))
      }
      add(rule())
    }

    // ── Footer ────────────────────────────────────────────────────────────────
    add(
      new Paragraph({ children: [], spacing: { before: 400 } }),
      new Paragraph({
        children: [new TextRun({ text: `Generated by OmniJobReady AI™  ·  omnijobready.com  ·  ${fmt(new Date())}`, size: 18, color: LGRAY, italics: true })],
        alignment: AlignmentType.CENTER,
      }),
      new Paragraph({
        children: [new TextRun({ text: 'This report is for personal use only. Scores are AI-generated and should be used as guidance.', size: 16, color: LGRAY, italics: true })],
        alignment: AlignmentType.CENTER, spacing: { after: 0 },
      }),
    )

    // ── Build document ────────────────────────────────────────────────────────
    const doc = new Document({
      creator:     'OmniJobReady AI',
      title:       `Analysis Report — ${record.jobTitle}`,
      description: 'NHS Job Application Analysis Report',
      styles: {
        default: {
          document: { run: { font: 'Calibri' } },
        },
      },
      sections: [{
        properties: {
          page: { margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } },
        },
        children,
      }],
    })

    const buffer  = await Packer.toBuffer(doc)
    const slug    = (record.jobTitle ?? 'report').replace(/[^a-zA-Z0-9]/g, '-').slice(0, 40)
    const dateStr = new Date().toISOString().split('T')[0]

    return new Response(buffer, {
      headers: {
        'Content-Type':        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="OmniJobReady-${slug}-${dateStr}.docx"`,
      },
    })
  } catch (err: any) {
    console.error('[analysis/report]', err)
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}