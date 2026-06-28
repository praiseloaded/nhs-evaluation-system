// app/api/cv/[id]/export/route.ts
// Template-aware docx export using tables for layout and shading for colours

import { auth }  from '@/auth'
import { getDb } from '@/lib/db-router'
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, LevelFormat, BorderStyle, WidthType, ShadingType,
  TabStopType, TabStopPosition, HeadingLevel,
} from 'docx'

export const runtime = 'nodejs'

// ── Types ─────────────────────────────────────────────────────────────────────
interface Job  { jobTitle:string; employer:string; location?:string; startDate:string; endDate?:string; current?:boolean; bullets:string[] }
interface Edu  { qualification:string; institution:string; location?:string; startDate?:string; endDate?:string; grade?:string }
interface Cert { name:string; issuer?:string; date?:string; expiryDate?:string }
interface Ref  { name:string; role?:string; organisation?:string; relationship?:string; email?:string; phone?:string }
interface Skill{ category:string; items:string[]|string }

function dr(s?:string,e?:string,c?:boolean){ if(!s)return ''; return `${s} – ${c?'Present':e||''}` }
function si(s:Skill){ return Array.isArray(s.items)?s.items.join(', '):(s.items??'') }
function noBorder(){ return { style:BorderStyle.NONE, size:0, color:'FFFFFF' } }
const NO_BORDERS = { top:noBorder(), bottom:noBorder(), left:noBorder(), right:noBorder(), insideH:noBorder(), insideV:noBorder() }

function bul(text:string): Paragraph {
  return new Paragraph({
    numbering:{ reference:'cv-bullets', level:0 },
    spacing:  { after:60 },
    children: [new TextRun({ text, size:20 })],
  })
}

// ── Page geometry ─────────────────────────────────────────────────────────────
// A4 in DXA (1440 DXA = 1 inch). Small margin so the CV fills the page
// while staying clear of Word's edge-clipping / printer-safe area.
const PAGE_MARGIN   = 200                            // DXA — edge-to-edge fill
const PAGE_WIDTH    = 11906                          // A4 width in DXA
const PAGE_HEIGHT   = 16838                          // A4 height in DXA
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN * 2  // 10906 DXA usable width

// ── Palette ───────────────────────────────────────────────────────────────────
const P: Record<string,{h:string;a:string;m:string;bg:string;font:string}> = {
  classic:      {h:'1B3A5C',a:'2E5C8A',m:'555555',bg:'FFFFFF',font:'Arial'},
  professional: {h:'1B3A5C',a:'2E5C8A',m:'64748B',bg:'FFFFFF',font:'Arial'},
  modern:       {h:'0D9488',a:'0D9488',m:'6B7280',bg:'FFFFFF',font:'Arial'},
  executive:    {h:'B45309',a:'B45309',m:'9CA3AF',bg:'FFFFFF',font:'Arial'},
  graduate:     {h:'6D28D9',a:'6D28D9',m:'9CA3AF',bg:'FFFFFF',font:'Arial'},
  research:     {h:'15803D',a:'15803D',m:'6B7280',bg:'FFFFFF',font:'Arial'},
  ats:          {h:'000000',a:'000000',m:'555555',bg:'FFFFFF',font:'Arial'},
  lateral:      {h:'1E1B4B',a:'4F46E5',m:'9CA3AF',bg:'FFFFFF',font:'Arial'},
  timeless:     {h:'1C1917',a:'78716C',m:'78716C',bg:'FAF9F7',font:'Georgia'},
  bold:         {h:'B91C1C',a:'B91C1C',m:'9CA3AF',bg:'FFFFFF',font:'Arial'},
  compact:      {h:'1D4ED8',a:'1D4ED8',m:'9CA3AF',bg:'FFFFFF',font:'Arial'},
  minimal:      {h:'09090B',a:'71717A',m:'A1A1AA',bg:'FFFFFF',font:'Helvetica'},
  // NHS Extended
  'nhs-ocean':    {h:'0369A1',a:'0369A1',m:'64748B',bg:'FFFFFF',font:'Arial'},
  'nhs-slate':    {h:'22D3EE',a:'22D3EE',m:'94A3B8',bg:'FFFFFF',font:'Arial'},
  'nhs-royal':    {h:'1D4ED8',a:'1D4ED8',m:'6B7280',bg:'FFFFFF',font:'Arial'},
  'nhs-emerald':  {h:'065F46',a:'059669',m:'6B7280',bg:'FFFFFF',font:'Arial'},
  // Adobe Extended
  'adobe-coral':  {h:'E8522A',a:'E8522A',m:'9CA3AF',bg:'FFFFFF',font:'Arial'},
  'adobe-split':  {h:'0F766E',a:'0F766E',m:'6B7280',bg:'FFFFFF',font:'Arial'},
  'adobe-duo':    {h:'4338CA',a:'4338CA',m:'6B7280',bg:'FFFFFF',font:'Arial'},
  'adobe-arc':    {h:'7C3AED',a:'7C3AED',m:'9CA3AF',bg:'FFFFFF',font:'Arial'},
  'adobe-ember':  {h:'C2410C',a:'C2410C',m:'9CA3AF',bg:'FFFFFF',font:'Arial'},
  'adobe-azure':  {h:'0284C7',a:'0284C7',m:'6B7280',bg:'FFFFFF',font:'Arial'},
  'adobe-prism':  {h:'6D28D9',a:'0891B2',m:'9CA3AF',bg:'FFFFFF',font:'Arial'},
  'adobe-night':  {h:'A78BFA',a:'A78BFA',m:'C4B5FD',bg:'FFFFFF',font:'Arial'},
  'adobe-blush':  {h:'BE185D',a:'BE185D',m:'9CA3AF',bg:'FFFFFF',font:'Arial'},
  // International & Modern
  international:  {h:'2563EB',a:'2563EB',m:'6B7280',bg:'FFFFFF',font:'Arial'},
  scandinavia:    {h:'1A1A1A',a:'555555',m:'888888',bg:'F9F9F8',font:'Arial'},
  swiss:          {h:'DC2626',a:'DC2626',m:'555555',bg:'FFFFFF',font:'Arial'},
  // Corporate & City
  corporate:      {h:'0F172A',a:'CA8A04',m:'94A3B8',bg:'FFFFFF',font:'Arial'},
  city:           {h:'0EA5E9',a:'0EA5E9',m:'93C5FD',bg:'FFFFFF',font:'Arial'},
  metro:          {h:'F59E0B',a:'F59E0B',m:'9CA3AF',bg:'FFFFFF',font:'Arial'},
  gradient:       {h:'7C3AED',a:'2563EB',m:'9CA3AF',bg:'FFFFFF',font:'Arial'},
  // Creative
  magazine:       {h:'111827',a:'FBBF24',m:'9CA3AF',bg:'FFFFFF',font:'Arial'},
  canvas:         {h:'1E1B4B',a:'0891B2',m:'6B7280',bg:'FFFFFF',font:'Arial'},
  spectrum:       {h:'7C3AED',a:'0891B2',m:'9CA3AF',bg:'FFFFFF',font:'Arial'},
}

// ── Shared content builder ────────────────────────────────────────────────────
function sec(title:string, p:{h:string;font:string}, template:string): Paragraph {
  const isAts = template==='ats'
  return new Paragraph({
    spacing:{ before:280, after:120 },
    border:{ bottom:{ style:BorderStyle.SINGLE, size:isAts?8:6, color:p.h, space:2 } },
    children:[new TextRun({ text: isAts?title.toUpperCase():title, bold:true, size:22, font:p.font, color:p.h })],
  })
}

function jobBlock(job:Job, p:{h:string;a:string;m:string;font:string}): Paragraph[] {
  const out: Paragraph[] = []
  out.push(new Paragraph({
    spacing:{ before:120, after:20 },
    tabStops:[{ type:TabStopType.RIGHT, position:TabStopPosition.MAX }],
    children:[
      new TextRun({ text:job.jobTitle, bold:true, size:22, font:p.font }),
      new TextRun({ text:`\t${dr(job.startDate,job.endDate,job.current)}`, size:19, color:p.m, font:p.font }),
    ],
  }))
  out.push(new Paragraph({
    spacing:{ after:80 },
    children:[new TextRun({ text:[job.employer,job.location].filter(Boolean).join(', '), italics:true, size:20, color:p.a, font:p.font })],
  }))
  for(const b of job.bullets??[]){ if(b.trim()) out.push(bul(b)) }
  return out
}

function contentBlocks(profile:any, template:string, jobs:Job[], edus:Edu[], certs:Cert[], refs:Ref[], skills:Skill[]): Paragraph[] {
  const p = P[template]??P.classic
  const out: Paragraph[] = []

  if(profile.personalStatement){
    out.push(sec('Personal Statement',p,template))
    out.push(new Paragraph({ spacing:{after:160}, children:[new TextRun({ text:profile.personalStatement, size:21, font:p.font })] }))
  }
  if(skills.length){
    out.push(sec('Core Skills & Competencies',p,template))
    for(const s of skills){
      out.push(new Paragraph({ spacing:{before:60,after:40}, children:[
        new TextRun({ text:`${s.category}: `, bold:true, size:21, font:p.font, color:p.h }),
        new TextRun({ text:si(s), size:21, font:p.font }),
      ]}))
    }
  }
  if(jobs.length){
    out.push(sec('Work Experience',p,template))
    for(const j of jobs) out.push(...jobBlock(j,p))
  }
  if(edus.length){
    out.push(sec('Education & Qualifications',p,template))
    for(const e of edus){
      out.push(new Paragraph({
        spacing:{before:100,after:20},
        tabStops:[{ type:TabStopType.RIGHT, position:TabStopPosition.MAX }],
        children:[
          new TextRun({ text:e.qualification, bold:true, size:21, font:p.font }),
          new TextRun({ text:`\t${dr(e.startDate,e.endDate)}`, size:19, color:p.m, font:p.font }),
        ],
      }))
      const l=[e.institution,e.location,e.grade].filter(Boolean).join(', ')
      if(l) out.push(new Paragraph({ spacing:{after:100}, children:[new TextRun({ text:l, italics:true, size:20, font:p.font })] }))
    }
  }
  if(certs.length){
    out.push(sec('Certifications & Training',p,template))
    for(const c of certs){
      const parts=[c.issuer,c.date&&`(${c.date}${c.expiryDate?` – expires ${c.expiryDate}`:''})`].filter(Boolean)
      out.push(bul(`${c.name}${parts.length?' — '+parts.join(' '):''}`) )
    }
  }
  if(profile.additionalInfo){
    out.push(sec('Additional Information',p,template))
    out.push(new Paragraph({ spacing:{after:160}, children:[new TextRun({ text:profile.additionalInfo, size:21, font:p.font })] }))
  }
  out.push(sec('References',p,template))
  if(refs.length){
    for(const r of refs){
      out.push(new Paragraph({ spacing:{before:80,after:20}, children:[new TextRun({ text:r.name, bold:true, size:21, font:p.font })] }))
      const l=[r.role,r.organisation].filter(Boolean).join(', ')
      if(l) out.push(new Paragraph({ spacing:{after:20}, children:[new TextRun({ text:l, size:20, font:p.font })] }))
      const cl=[r.relationship,r.email,r.phone].filter(Boolean).join('   |   ')
      if(cl) out.push(new Paragraph({ spacing:{after:100}, children:[new TextRun({ text:cl, size:19, color:p.m, font:p.font })] }))
    }
  } else {
    out.push(new Paragraph({ children:[new TextRun({ text:'Available on request.', size:21, italics:true, font:p.font })] }))
  }
  return out
}

// ── Template builders ─────────────────────────────────────────────────────────

// CLASSIC / MODERN / GRADUATE / RESEARCH / TIMELESS / ATS / COMPACT / MINIMAL
// Single-column with coloured heading underlines
function buildSingleCol(profile:any, template:string, jobs:Job[], edus:Edu[], certs:Cert[], refs:Ref[], skills:Skill[]): Paragraph[] {
  const p = P[template]??P.classic
  const contact = [profile.email,profile.phone,profile.location,profile.professionalRegistration].filter(Boolean)
  const header: Paragraph[] = [
    new Paragraph({ alignment:AlignmentType.CENTER, spacing:{after:60}, children:[new TextRun({ text:profile.fullName||'Your Name', bold:true, size:template==='minimal'?52:44, font:p.font, color:p.h })] }),
    new Paragraph({ alignment:AlignmentType.CENTER, spacing:{after:200}, children:[new TextRun({ text:contact.join('   |   '), size:19, color:p.m, font:p.font })] }),
  ]
  return [...header, ...contentBlocks(profile,template,jobs,edus,certs,refs,skills)]
}

// PROFESSIONAL — Navy sidebar via two-cell table spanning full page height
function buildProfessional(profile:any, jobs:Job[], edus:Edu[], certs:Cert[], refs:Ref[], skills:Skill[]): any[] {
  const p = P.professional
  const SIDEBAR = 2400  // DXA ~1.67 inches
  const MAIN    = 6626  // DXA remaining (9026 - 2400)

  const sidebarCells: Paragraph[] = [
    new Paragraph({ spacing:{after:80}, children:[new TextRun({ text:profile.fullName||'Your Name', bold:true, size:28, color:'FFFFFF', font:p.font })] }),
  ]
  if(profile.professionalRegistration){
    sidebarCells.push(new Paragraph({ spacing:{after:120}, children:[new TextRun({ text:profile.professionalRegistration, size:17, color:'93C5FD', font:p.font, bold:true })] }))
  }
  const contactItems = [
    profile.phone&&`Tel: ${profile.phone}`,
    profile.email&&`Email: ${profile.email}`,
    profile.location&&`Location: ${profile.location}`,
  ].filter(Boolean) as string[]
  for(const c of contactItems){
    sidebarCells.push(new Paragraph({ spacing:{after:40}, children:[new TextRun({ text:c, size:17, color:'C7D2FE', font:p.font })] }))
  }
  if(skills.length){
    sidebarCells.push(new Paragraph({ spacing:{before:160,after:60}, border:{bottom:{style:BorderStyle.SINGLE,size:4,color:'2E5C8A',space:2}}, children:[new TextRun({ text:'SKILLS', bold:true, size:16, color:'93C5FD', font:p.font })] }))
    for(const s of skills){
      sidebarCells.push(new Paragraph({ spacing:{after:20}, children:[new TextRun({ text:`· ${si(s)}`, size:16, color:'E0E7FF', font:p.font })] }))
    }
  }
  if(edus.length){
    sidebarCells.push(new Paragraph({ spacing:{before:160,after:60}, border:{bottom:{style:BorderStyle.SINGLE,size:4,color:'2E5C8A',space:2}}, children:[new TextRun({ text:'EDUCATION', bold:true, size:16, color:'93C5FD', font:p.font })] }))
    for(const e of edus){
      sidebarCells.push(new Paragraph({ spacing:{after:20}, children:[new TextRun({ text:e.qualification, bold:true, size:17, color:'FFFFFF', font:p.font })] }))
      sidebarCells.push(new Paragraph({ spacing:{after:40}, children:[new TextRun({ text:e.institution+(e.endDate?` · ${e.endDate}`:''), size:15, color:'93C5FD', font:p.font })] }))
    }
  }
  if(certs.length){
    sidebarCells.push(new Paragraph({ spacing:{before:160,after:60}, border:{bottom:{style:BorderStyle.SINGLE,size:4,color:'2E5C8A',space:2}}, children:[new TextRun({ text:'CERTIFICATIONS', bold:true, size:16, color:'93C5FD', font:p.font })] }))
    for(const c of certs){
      sidebarCells.push(new Paragraph({ spacing:{after:20}, children:[new TextRun({ text:c.name, bold:true, size:17, color:'FFFFFF', font:p.font })] }))
      if(c.issuer) sidebarCells.push(new Paragraph({ spacing:{after:40}, children:[new TextRun({ text:c.issuer, size:15, color:'93C5FD', font:p.font })] }))
    }
  }

  const mainCells: Paragraph[] = []
  if(profile.personalStatement){
    mainCells.push(new Paragraph({ spacing:{before:80,after:80}, border:{left:{style:BorderStyle.SINGLE,size:12,color:p.h,space:4}}, indent:{left:160}, children:[new TextRun({ text:profile.personalStatement, size:21, font:p.font })] }))
  }
  mainCells.push(...contentBlocks({...profile,personalStatement:undefined},'professional',jobs,[],[],[],[] ))
  if(jobs.length){
    mainCells.push(new Paragraph({ spacing:{before:160,after:60}, border:{bottom:{style:BorderStyle.SINGLE,size:6,color:p.h,space:2}}, children:[new TextRun({ text:'Work Experience', bold:true, size:22, color:p.h, font:p.font })] }))
    for(const j of jobs) mainCells.push(...jobBlock(j,p))
  }
  mainCells.push(new Paragraph({ spacing:{before:160,after:60}, border:{bottom:{style:BorderStyle.SINGLE,size:6,color:p.h,space:2}}, children:[new TextRun({ text:'References', bold:true, size:22, color:p.h, font:p.font })] }))
  if(refs.length){
    for(const r of refs){
      mainCells.push(new Paragraph({ spacing:{before:60,after:20}, children:[new TextRun({ text:r.name, bold:true, size:21, font:p.font })] }))
      const l=[r.role,r.organisation].filter(Boolean).join(', ')
      if(l) mainCells.push(new Paragraph({ spacing:{after:100}, children:[new TextRun({ text:l, size:20, font:p.font })] }))
    }
  } else {
    mainCells.push(new Paragraph({ children:[new TextRun({ text:'Available on request.', size:21, italics:true, font:p.font })] }))
  }

  return [new Table({
    width:{ size:9026, type:WidthType.DXA },
    columnWidths:[SIDEBAR, MAIN],
    rows:[new TableRow({ children:[
      new TableCell({
        width:{ size:SIDEBAR, type:WidthType.DXA },
        borders:NO_BORDERS,
        shading:{ fill:'1B3A5C', type:ShadingType.CLEAR },
        margins:{ top:320, bottom:320, left:240, right:240 },
        children:sidebarCells,
      }),
      new TableCell({
        width:{ size:MAIN, type:WidthType.DXA },
        borders:NO_BORDERS,
        margins:{ top:320, bottom:320, left:360, right:240 },
        children:mainCells,
      }),
    ]})]
  })]
}

// EXECUTIVE — Dark header via shaded table row + gold accents
function buildExecutive(profile:any, jobs:Job[], edus:Edu[], certs:Cert[], refs:Ref[], skills:Skill[]): any[] {
  const p = P.executive
  const contact = [profile.phone,profile.email,profile.location].filter(Boolean)

  const headerRow = new Table({
    width:{ size:9026, type:WidthType.DXA },
    columnWidths:[9026],
    rows:[new TableRow({ children:[
      new TableCell({
        width:{ size:9026, type:WidthType.DXA },
        borders:NO_BORDERS,
        shading:{ fill:'111827', type:ShadingType.CLEAR },
        margins:{ top:360, bottom:300, left:400, right:400 },
        children:[
          new Paragraph({ children:[new TextRun({ text:profile.fullName||'Your Name', bold:true, size:48, color:'FFFFFF', font:p.font })] }),
          ...(profile.professionalRegistration?[new Paragraph({ spacing:{after:80}, children:[new TextRun({ text:profile.professionalRegistration, size:18, color:'FCA5A5', bold:true, font:p.font })] })]:[]),
          new Paragraph({ children:[new TextRun({ text:contact.join('   ·   '), size:18, color:'9CA3AF', font:p.font })] }),
        ],
      })
    ]})]
  })

  const goldBar = new Table({
    width:{ size:9026, type:WidthType.DXA },
    columnWidths:[9026],
    rows:[new TableRow({ children:[
      new TableCell({ width:{ size:9026, type:WidthType.DXA }, borders:NO_BORDERS, shading:{ fill:'B45309', type:ShadingType.CLEAR }, margins:{ top:30, bottom:30, left:0, right:0 }, children:[new Paragraph({children:[]})] })
    ]})]
  })

  const content = contentBlocks(profile,'executive',jobs,edus,certs,refs,skills)
  return [headerRow, goldBar, ...content]
}

// BOLD — Red header table
function buildBold(profile:any, jobs:Job[], edus:Edu[], certs:Cert[], refs:Ref[], skills:Skill[]): any[] {
  const p = P.bold
  const contact = [profile.phone,profile.email,profile.location].filter(Boolean)

  const headerRow = new Table({
    width:{ size:9026, type:WidthType.DXA },
    columnWidths:[9026],
    rows:[new TableRow({ children:[
      new TableCell({
        width:{ size:9026, type:WidthType.DXA },
        borders:NO_BORDERS,
        shading:{ fill:'B91C1C', type:ShadingType.CLEAR },
        margins:{ top:360, bottom:280, left:400, right:400 },
        children:[
          new Paragraph({ children:[new TextRun({ text:profile.fullName||'Your Name', bold:true, size:48, color:'FFFFFF', font:p.font })] }),
          ...(profile.professionalRegistration?[new Paragraph({ spacing:{after:60}, children:[new TextRun({ text:profile.professionalRegistration, size:18, color:'FECACA', bold:true, font:p.font })] })]:[]),
          new Paragraph({ children:[new TextRun({ text:contact.join('   ·   '), size:18, color:'FECACA', font:p.font })] }),
        ],
      })
    ]})]
  })

  const darkBar = new Table({
    width:{ size:9026, type:WidthType.DXA },
    columnWidths:[9026],
    rows:[new TableRow({ children:[
      new TableCell({ width:{ size:9026, type:WidthType.DXA }, borders:NO_BORDERS, shading:{ fill:'7F1D1D', type:ShadingType.CLEAR }, margins:{ top:25, bottom:25, left:0, right:0 }, children:[new Paragraph({children:[]})] })
    ]})]
  })

  const content = contentBlocks(profile,'bold',jobs,edus,certs,refs,skills)
  return [headerRow, darkBar, ...content]
}

// LATERAL — Indigo sidebar
function buildLateral(profile:any, jobs:Job[], edus:Edu[], certs:Cert[], refs:Ref[], skills:Skill[]): any[] {
  const p = P.lateral
  const SIDE = 2200; const MAIN = 6826

  const sidebar: Paragraph[] = [
    new Paragraph({ spacing:{after:80}, children:[new TextRun({ text:profile.fullName||'Your Name', bold:true, size:30, color:'FFFFFF', font:p.font })] }),
    ...(profile.professionalRegistration?[new Paragraph({ spacing:{after:120}, children:[new TextRun({ text:profile.professionalRegistration, size:16, color:'A5B4FC', bold:true, font:p.font })] })]:[]),
  ]
  const contactItems=[profile.phone&&`📞 ${profile.phone}`,profile.email&&`✉ ${profile.email}`,profile.location&&`📍 ${profile.location}`].filter(Boolean) as string[]
  for(const c of contactItems) sidebar.push(new Paragraph({ spacing:{after:40}, children:[new TextRun({ text:c, size:17, color:'C7D2FE', font:p.font })] }))
  if(skills.length){
    sidebar.push(new Paragraph({ spacing:{before:180,after:60}, border:{bottom:{style:BorderStyle.SINGLE,size:4,color:'312E81',space:2}}, children:[new TextRun({ text:'SKILLS', bold:true, size:15, color:'A5B4FC', font:p.font })] }))
    for(const s of skills) sidebar.push(new Paragraph({ spacing:{after:30}, children:[new TextRun({ text:`· ${si(s)}`, size:16, color:'E0E7FF', font:p.font })] }))
  }
  if(edus.length){
    sidebar.push(new Paragraph({ spacing:{before:180,after:60}, border:{bottom:{style:BorderStyle.SINGLE,size:4,color:'312E81',space:2}}, children:[new TextRun({ text:'EDUCATION', bold:true, size:15, color:'A5B4FC', font:p.font })] }))
    for(const e of edus){
      sidebar.push(new Paragraph({ spacing:{after:20}, children:[new TextRun({ text:e.qualification, bold:true, size:17, color:'FFFFFF', font:p.font })] }))
      sidebar.push(new Paragraph({ spacing:{after:40}, children:[new TextRun({ text:[e.institution,e.endDate].filter(Boolean).join(' · '), size:15, color:'A5B4FC', font:p.font })] }))
    }
  }

  const main: Paragraph[] = contentBlocks(profile,'lateral',jobs,edus,certs,refs,skills)

  return [new Table({
    width:{ size:9026, type:WidthType.DXA },
    columnWidths:[SIDE,MAIN],
    rows:[new TableRow({ children:[
      new TableCell({ width:{ size:SIDE, type:WidthType.DXA }, borders:NO_BORDERS, shading:{ fill:'1E1B4B', type:ShadingType.CLEAR }, margins:{ top:360, bottom:360, left:280, right:220 }, children:sidebar }),
      new TableCell({ width:{ size:MAIN, type:WidthType.DXA }, borders:NO_BORDERS, margins:{ top:360, bottom:360, left:380, right:280 }, children:main }),
    ]})]
  })]
}


// ── Generic coloured header builder ──────────────────────────────────────────
// Used by: nhs-ocean, nhs-emerald, adobe-coral, adobe-ember, corporate,
//          metro, gradient, magazine, canvas, nhs-royal (centred variant)
function buildColorHeader(
  profile:any, template:string,
  headerBg:string, nameFg:string, subFg:string, contactFg:string,
  accentBarBg:string|null,
  jobs:Job[], edus:Edu[], certs:Cert[], refs:Ref[], skills:Skill[]
): any[] {
  const p = P[template]??P.classic
  const contact = [profile.phone,profile.email,profile.location].filter(Boolean)

  const headerRow = new Table({
    width:{ size:CONTENT_WIDTH, type:WidthType.DXA },
    columnWidths:[CONTENT_WIDTH],
    rows:[new TableRow({ children:[
      new TableCell({
        width:{ size:CONTENT_WIDTH, type:WidthType.DXA },
        borders:NO_BORDERS,
        shading:{ fill:headerBg, type:ShadingType.CLEAR },
        margins:{ top:320, bottom:240, left:360, right:360 },
        children:[
          new Paragraph({ children:[new TextRun({ text:profile.fullName||'Your Name', bold:true, size:48, color:nameFg, font:p.font })] }),
          ...(profile.professionalRegistration?[new Paragraph({ spacing:{after:60}, children:[new TextRun({ text:profile.professionalRegistration, size:18, color:subFg, bold:true, font:p.font })] })]:[]),
          new Paragraph({ children:[new TextRun({ text:contact.join('   ·   '), size:18, color:contactFg, font:p.font })] }),
        ],
      })
    ]})]
  })

  const result: any[] = [headerRow]

  if(accentBarBg) {
    result.push(new Table({
      width:{ size:CONTENT_WIDTH, type:WidthType.DXA },
      columnWidths:[CONTENT_WIDTH],
      rows:[new TableRow({ children:[
        new TableCell({ width:{ size:CONTENT_WIDTH, type:WidthType.DXA }, borders:NO_BORDERS, shading:{ fill:accentBarBg, type:ShadingType.CLEAR }, margins:{ top:28, bottom:28, left:0, right:0 }, children:[new Paragraph({children:[]})] })
      ]})]
    }))
  }

  result.push(...contentBlocks(profile, template, jobs, edus, certs, refs, skills))
  return result
}

// ── Generic dark sidebar builder ──────────────────────────────────────────────
// Used by: nhs-slate, adobe-night, city
function buildDarkSidebar(
  profile:any, template:string,
  sidebarBg:string, nameColor:string, accentColor:string, textColor:string,
  sidebarWidth:number,
  jobs:Job[], edus:Edu[], certs:Cert[], refs:Ref[], skills:Skill[]
): any[] {
  const p = P[template]??P.classic
  const MAIN = CONTENT_WIDTH - sidebarWidth

  const sidebar: Paragraph[] = [
    new Paragraph({ spacing:{after:80}, children:[new TextRun({ text:profile.fullName||'Your Name', bold:true, size:26, color:nameColor, font:p.font })] }),
  ]
  if(profile.professionalRegistration){
    sidebar.push(new Paragraph({ spacing:{after:100}, children:[new TextRun({ text:profile.professionalRegistration, size:16, color:accentColor, bold:true, font:p.font })] }))
  }
  for(const c of [profile.phone,profile.email,profile.location].filter(Boolean) as string[]){
    sidebar.push(new Paragraph({ spacing:{after:40}, children:[new TextRun({ text:c, size:17, color:textColor, font:p.font })] }))
  }
  if(skills.length){
    sidebar.push(new Paragraph({ spacing:{before:160,after:60}, children:[new TextRun({ text:'SKILLS', bold:true, size:15, color:accentColor, font:p.font })] }))
    for(const s of skills){
      for(const item of si(s).split(',').map((x:string)=>x.trim()).filter(Boolean)){
        sidebar.push(new Paragraph({ spacing:{after:25}, children:[new TextRun({ text:`· ${item}`, size:16, color:textColor, font:p.font })] }))
      }
    }
  }
  if(edus.length){
    sidebar.push(new Paragraph({ spacing:{before:160,after:60}, children:[new TextRun({ text:'EDUCATION', bold:true, size:15, color:accentColor, font:p.font })] }))
    for(const e of edus){
      sidebar.push(new Paragraph({ spacing:{after:20}, children:[new TextRun({ text:e.qualification, bold:true, size:17, color:nameColor, font:p.font })] }))
      sidebar.push(new Paragraph({ spacing:{after:40}, children:[new TextRun({ text:e.institution, size:15, color:textColor, font:p.font })] }))
    }
  }
  if(certs.length){
    sidebar.push(new Paragraph({ spacing:{before:160,after:60}, children:[new TextRun({ text:'CERTS', bold:true, size:15, color:accentColor, font:p.font })] }))
    for(const c of certs){
      sidebar.push(new Paragraph({ spacing:{after:20}, children:[new TextRun({ text:c.name, bold:true, size:16, color:nameColor, font:p.font })] }))
    }
  }

  const main = contentBlocks(profile, template, jobs, edus, certs, refs, skills)

  return [new Table({
    width:{ size:CONTENT_WIDTH, type:WidthType.DXA },
    columnWidths:[sidebarWidth, MAIN],
    rows:[new TableRow({ children:[
      new TableCell({ width:{ size:sidebarWidth, type:WidthType.DXA }, borders:NO_BORDERS, shading:{ fill:sidebarBg, type:ShadingType.CLEAR }, margins:{ top:320, bottom:320, left:240, right:200 }, children:sidebar }),
      new TableCell({ width:{ size:MAIN, type:WidthType.DXA }, borders:NO_BORDERS, margins:{ top:320, bottom:320, left:360, right:240 }, children:main }),
    ]})]
  })]
}

// ── Metro — split dark header (two-column header table) ───────────────────────
function buildMetro(profile:any, jobs:Job[], edus:Edu[], certs:Cert[], refs:Ref[], skills:Skill[]): any[] {
  const p = P.metro
  const LEFT = Math.floor(CONTENT_WIDTH * 0.55)
  const RIGHT = CONTENT_WIDTH - LEFT

  const headerTable = new Table({
    width:{ size:CONTENT_WIDTH, type:WidthType.DXA },
    columnWidths:[LEFT, RIGHT],
    rows:[new TableRow({ children:[
      new TableCell({
        width:{ size:LEFT, type:WidthType.DXA }, borders:NO_BORDERS,
        shading:{ fill:'1F2937', type:ShadingType.CLEAR },
        margins:{ top:280, bottom:280, left:360, right:240 },
        children:[
          new Paragraph({ children:[new TextRun({ text:profile.fullName||'Your Name', bold:true, size:44, color:'FFFFFF', font:p.font })] }),
          ...(profile.professionalRegistration?[new Paragraph({ children:[new TextRun({ text:profile.professionalRegistration, size:17, color:'F59E0B', bold:true, font:p.font })] })]:[]),
        ],
      }),
      new TableCell({
        width:{ size:RIGHT, type:WidthType.DXA }, borders:NO_BORDERS,
        shading:{ fill:'1F2937', type:ShadingType.CLEAR },
        margins:{ top:280, bottom:280, left:240, right:360 },
        children:[
          ...[profile.phone,profile.email,profile.location].filter(Boolean).map((c:string)=>
            new Paragraph({ spacing:{after:40}, children:[new TextRun({ text:c, size:17, color:'9CA3AF', font:p.font })] })
          ),
        ],
      }),
    ]})]
  })

  const accentBar = new Table({
    width:{ size:CONTENT_WIDTH, type:WidthType.DXA },
    columnWidths:[CONTENT_WIDTH],
    rows:[new TableRow({ children:[
      new TableCell({ width:{ size:CONTENT_WIDTH, type:WidthType.DXA }, borders:NO_BORDERS, shading:{ fill:'F59E0B', type:ShadingType.CLEAR }, margins:{ top:28, bottom:28, left:0, right:0 }, children:[new Paragraph({children:[]})] })
    ]})]
  })

  return [headerTable, accentBar, ...contentBlocks(profile, 'metro', jobs, edus, certs, refs, skills)]
}


// ── Main route ────────────────────────────────────────────────────────────────
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id }  = await params
    const session = await auth()
    if (!session?.user?.id) return Response.json({ error:'Unauthorized' }, { status:401 })

    const db      = await getDb(session.user.id)
    const profile = await db.cvProfile.findUnique({ where:{ id } })
    if (!profile || profile.userId !== session.user.id) return Response.json({ error:'Not found' }, { status:404 })

    const template = (profile.template as string) ?? 'classic'
    const p        = P[template] ?? P.classic

    const jobs:  Job[]  = (profile.workExperience as any) ?? []
    const edus:  Edu[]  = (profile.education      as any) ?? []
    const certs: Cert[] = (profile.certifications  as any) ?? []
    const refs:  Ref[]  = (profile.references      as any) ?? []
    const rawS          = profile.skills as any
    const skills: Skill[] = Array.isArray(rawS)
      ? rawS.map((s:any) => typeof s==='string'?{category:'Skills',items:[s]}:s)
      : []

    // Pick layout builder
    let children: any[]
    switch(template) {
      // ── Sidebar layouts ──
      case 'professional':
        children = buildProfessional(profile, jobs, edus, certs, refs, skills); break
      case 'lateral':
        children = buildLateral(profile, jobs, edus, certs, refs, skills); break
      case 'nhs-slate':
        children = buildDarkSidebar(profile, template, '1E293B', 'FFFFFF', '22D3EE', '94A3B8', 2700, jobs, edus, certs, refs, skills); break
      case 'adobe-night':
        children = buildDarkSidebar(profile, template, '1E1B4B', 'FFFFFF', 'A78BFA', 'C4B5FD', 2600, jobs, edus, certs, refs, skills); break
      case 'city':
        children = buildDarkSidebar(profile, template, '0C1A2E', 'FFFFFF', '0EA5E9', '93C5FD', 2500, jobs, edus, certs, refs, skills); break
      // ── Coloured header layouts ──
      case 'executive':
        children = buildExecutive(profile, jobs, edus, certs, refs, skills); break
      case 'bold':
        children = buildBold(profile, jobs, edus, certs, refs, skills); break
      case 'nhs-ocean':
        children = buildColorHeader(profile, template, '0C4A6E', 'FFFFFF', 'BAE6FD', 'BAE6FD', '0369A1', jobs, edus, certs, refs, skills); break
      case 'nhs-emerald':
        children = buildColorHeader(profile, template, '065F46', 'FFFFFF', '6EE7B7', 'A7F3D0', null, jobs, edus, certs, refs, skills); break
      case 'adobe-coral':
        children = buildColorHeader(profile, template, 'E8522A', 'FFFFFF', 'FFFFFF', 'FECACA', null, jobs, edus, certs, refs, skills); break
      case 'adobe-ember':
        children = buildColorHeader(profile, template, 'EA580C', 'FFFFFF', 'FED7AA', 'FED7AA', 'FDBA74', jobs, edus, certs, refs, skills); break
      case 'corporate':
        children = buildColorHeader(profile, template, '0F172A', 'FFFFFF', 'CA8A04', '94A3B8', 'CA8A04', jobs, edus, certs, refs, skills); break
      case 'gradient':
        children = buildColorHeader(profile, template, '7C3AED', 'FFFFFF', 'FFFFFF', 'C4B5FD', null, jobs, edus, certs, refs, skills); break
      case 'magazine':
        children = buildColorHeader(profile, template, '111827', 'FFFFFF', 'FBBF24', '9CA3AF', null, jobs, edus, certs, refs, skills); break
      case 'canvas':
        children = buildColorHeader(profile, template, '1E1B4B', 'FFFFFF', 'A78BFA', 'C4B5FD', null, jobs, edus, certs, refs, skills); break
      // ── Metro split header ──
      case 'metro':
        children = buildMetro(profile, jobs, edus, certs, refs, skills); break
      // ── All others — single column with accent headings ──
      default:
        children = buildSingleCol(profile, template, jobs, edus, certs, refs, skills)
    }

    const doc = new Document({
      styles: {
        default: { document:{ run:{ font:p.font, size:21 } } },
        paragraphStyles:[{
          id:'Heading2', name:'Heading 2', basedOn:'Normal', next:'Normal', quickFormat:true,
          run:{ size:22, bold:true, font:p.font, color:p.h },
          paragraph:{ spacing:{ before:240, after:120 }, outlineLevel:1 },
        }],
      },
      numbering:{ config:[{ reference:'cv-bullets', levels:[{
        level:0, format:LevelFormat.BULLET, text:'•', alignment:AlignmentType.LEFT,
        style:{ paragraph:{ indent:{ left:420, hanging:240 } } },
      }]}]},
      sections:[{
        properties:{ page:{ size:{ width:11906, height:16838 }, margin:{ top:900, right:1000, bottom:900, left:1000 } } },
        children,
      }],
    })

    const buffer   = await Packer.toBuffer(doc)
    const tLabel   = template.charAt(0).toUpperCase() + template.slice(1)
    const fileName = `${(profile.fullName||'CV').replace(/[^a-z0-9]/gi,'_')}_${tLabel}_CV.docx`

    return new Response(buffer, {
      headers:{
        'Content-Type':        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    })
  } catch(err:any) {
    console.error('CV_EXPORT_ERROR:', err)
    return Response.json({ error:err?.message??'Export failed' }, { status:500 })
  }
}