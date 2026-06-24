// app/api/admin/users/[id]/cv/[cvId]/export/route.ts
//
// Mirrors app/api/cv/[id]/export/route.ts exactly, but gated by admin auth
// rather than session ownership — lets the admin download the same .docx
// the user would get, for support/dispute investigation.
//
// NOTE: keep this in sync with the user-facing export route if you change
// the CV document layout — duplicated here rather than imported so this
// file has zero dependency on user-session state.

import { prisma } from "@/lib/prisma"
import { withAdminAuth } from "@/lib/admin-auth"
export const runtime = 'nodejs'

import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  LevelFormat, BorderStyle, TabStopType, TabStopPosition,
} from "docx"

interface WorkExperienceItem {
  jobTitle: string; employer: string; location?: string
  startDate: string; endDate?: string; current?: boolean
  bullets: string[]
}
interface EducationItem {
  qualification: string; institution: string; location?: string
  startDate?: string; endDate?: string; grade?: string
}
interface CertificationItem { name: string; issuer?: string; date?: string; expiryDate?: string }
interface ReferenceItem { name: string; role?: string; organisation?: string; relationship?: string; email?: string; phone?: string }
interface SkillGroup { category: string; items: string[] }

function formatDateRange(start?: string, end?: string, current?: boolean): string {
  if (!start) return ''
  const e = current ? 'Present' : (end || '')
  return e ? `${start} – ${e}` : start
}

function sectionHeading(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 120 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "2E5C8A", space: 2 } },
    children: [new TextRun({ text, bold: true })],
  })
}

function bulletParagraph(text: string): Paragraph {
  return new Paragraph({
    numbering: { reference: "cv-bullets", level: 0 },
    spacing: { after: 60 },
    children: [new TextRun({ text, size: 21 })],
  })
}

export const GET = withAdminAuth(async (req: Request, admin, ctx: any) => {
  const { id, cvId } = await ctx.params

  const profile = await prisma.cvProfile.findUnique({ where: { id: cvId } })
  if (!profile || profile.userId !== id) {
    return Response.json({ error: "Not found" }, { status: 404 })
  }

  const workExperience = (profile.workExperience as unknown as WorkExperienceItem[]) ?? []
  const education = (profile.education as unknown as EducationItem[]) ?? []
  const certifications = (profile.certifications as unknown as CertificationItem[]) ?? []
  const references = (profile.references as unknown as ReferenceItem[]) ?? []
  const skillsRaw = profile.skills as unknown as SkillGroup[] | string[] | null
  const skillGroups: SkillGroup[] = Array.isArray(skillsRaw)
    ? (skillsRaw.length > 0 && typeof skillsRaw[0] === 'string'
        ? [{ category: 'Skills', items: skillsRaw as string[] }]
        : skillsRaw as SkillGroup[])
    : []

  const children: Paragraph[] = []

  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 60 },
    children: [new TextRun({ text: profile.fullName || 'Your Name', bold: true, size: 36, font: "Arial" })],
  }))
  const contactParts = [profile.email, profile.phone, profile.location].filter(Boolean)
  if (profile.professionalRegistration) contactParts.push(profile.professionalRegistration)
  if (contactParts.length > 0) {
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [new TextRun({ text: contactParts.join('   |   '), size: 20, color: "555555", font: "Arial" })],
    }))
  }

  if (profile.personalStatement) {
    children.push(sectionHeading("Personal Statement"))
    children.push(new Paragraph({ spacing: { after: 160 }, children: [new TextRun({ text: profile.personalStatement, size: 21, font: "Arial" })] }))
  }

  if (workExperience.length > 0) {
    children.push(sectionHeading("Work Experience"))
    for (const job of workExperience) {
      children.push(new Paragraph({
        spacing: { before: 120, after: 20 },
        tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
        children: [
          new TextRun({ text: job.jobTitle, bold: true, size: 22, font: "Arial" }),
          new TextRun({ text: `\t${formatDateRange(job.startDate, job.endDate, job.current)}`, size: 20, color: "555555", font: "Arial" }),
        ],
      }))
      children.push(new Paragraph({
        spacing: { after: 80 },
        children: [new TextRun({ text: [job.employer, job.location].filter(Boolean).join(', '), italics: true, size: 21, font: "Arial" })],
      }))
      for (const bullet of job.bullets ?? []) children.push(bulletParagraph(bullet))
    }
  }

  if (education.length > 0) {
    children.push(sectionHeading("Education & Qualifications"))
    for (const ed of education) {
      children.push(new Paragraph({
        spacing: { before: 100, after: 20 },
        tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
        children: [
          new TextRun({ text: ed.qualification, bold: true, size: 21, font: "Arial" }),
          new TextRun({ text: `\t${formatDateRange(ed.startDate, ed.endDate)}`, size: 20, color: "555555", font: "Arial" }),
        ],
      }))
      const line2 = [ed.institution, ed.location, ed.grade].filter(Boolean).join(', ')
      if (line2) children.push(new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: line2, italics: true, size: 20, font: "Arial" })] }))
    }
  }

  if (skillGroups.length > 0) {
    children.push(sectionHeading("Skills & Competencies"))
    for (const group of skillGroups) {
      children.push(new Paragraph({
        spacing: { before: 80, after: 40 },
        children: [
          new TextRun({ text: `${group.category}: `, bold: true, size: 21, font: "Arial" }),
          new TextRun({ text: group.items.join(', '), size: 21, font: "Arial" }),
        ],
      }))
    }
  }

  if (certifications.length > 0) {
    children.push(sectionHeading("Certifications & Training"))
    for (const cert of certifications) {
      const parts = [cert.issuer, cert.date && `(${cert.date}${cert.expiryDate ? ` – expires ${cert.expiryDate}` : ''})`].filter(Boolean)
      children.push(bulletParagraph(`${cert.name}${parts.length ? ' — ' + parts.join(' ') : ''}`))
    }
  }

  if (profile.additionalInfo) {
    children.push(sectionHeading("Additional Information"))
    children.push(new Paragraph({ spacing: { after: 160 }, children: [new TextRun({ text: profile.additionalInfo, size: 21, font: "Arial" })] }))
  }

  children.push(sectionHeading("References"))
  if (references.length > 0) {
    for (const ref of references) {
      const line = [ref.role, ref.organisation].filter(Boolean).join(', ')
      children.push(new Paragraph({ spacing: { before: 80, after: 20 }, children: [new TextRun({ text: ref.name, bold: true, size: 21, font: "Arial" })] }))
      if (line) children.push(new Paragraph({ spacing: { after: 20 }, children: [new TextRun({ text: line, size: 20, font: "Arial" })] }))
      const contactLine = [ref.relationship, ref.email, ref.phone].filter(Boolean).join('   |   ')
      if (contactLine) children.push(new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: contactLine, size: 19, color: "555555", font: "Arial" })] }))
    }
  } else {
    children.push(new Paragraph({ children: [new TextRun({ text: "Available on request.", size: 21, italics: true, font: "Arial" })] }))
  }

  const doc = new Document({
    styles: {
      default: { document: { run: { font: "Arial", size: 21 } } },
      paragraphStyles: [
        { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: 24, bold: true, font: "Arial", color: "1B3A5C" },
          paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 1 } },
      ],
    },
    numbering: {
      config: [{
        reference: "cv-bullets",
        levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 420, hanging: 240 } } } }],
      }],
    },
    sections: [{
      properties: {
        page: { size: { width: 11906, height: 16838 }, margin: { top: 1000, right: 1100, bottom: 1000, left: 1100 } },
      },
      children,
    }],
  })

  const buffer = await Packer.toBuffer(doc)
  const fileName = `${(profile.fullName || 'CV').replace(/[^a-z0-9]/gi, '_')}_CV.docx`

  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${fileName}"`,
    },
  })
})