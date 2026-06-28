// app/dashboard/cv/print/[id]/client.tsx
'use client'

import { useEffect } from 'react'
import { CvPreviewRouter } from '@/components/cv-preview-templates'
import type { CvData } from '@/components/cv-preview-templates'

function profileToCvData(p: any): CvData {
  const uid = () => Math.random().toString(36).slice(2, 8)
  return {
    id:                       p.id,
    title:                    p.title ?? 'CV',
    template:                 p.template ?? 'classic',
    fullName:                 p.fullName ?? '',
    email:                    p.email ?? '',
    phone:                    p.phone ?? '',
    location:                 p.location ?? '',
    professionalRegistration: p.professionalRegistration ?? '',
    personalStatement:        p.personalStatement ?? '',
    workExperience: (p.workExperience ?? []).map((w: any) => ({ id: uid(), ...w, bullets: w.bullets ?? [] })),
    education:      (p.education      ?? []).map((e: any) => ({ id: uid(), ...e })),
    skills: Array.isArray(p.skills)
      ? p.skills.map((s: any) => ({ id: uid(), category: s.category ?? '', items: Array.isArray(s.items) ? s.items.join(', ') : (s.items ?? '') }))
      : [],
    certifications: (p.certifications ?? []).map((c: any) => ({ id: uid(), ...c })),
    additionalInfo: p.additionalInfo ?? '',
    references:     (p.references     ?? []).map((r: any) => ({ id: uid(), ...r })),
  }
}

export function CvPrintClient({ profile }: { profile: any }) {
  const cv = profileToCvData(profile)

  // Auto-print when page loads in print mode
  useEffect(() => {
    // Only auto-print if opened with ?print=1
    if (window.location.search.includes('print=1')) {
      const t = setTimeout(() => window.print(), 500)
      return () => clearTimeout(t)
    }
  }, [])

  return (
    <>
      <style>{`
        /* Force background colors to print */
        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }

        /* Remove ALL browser header/footer on print */
        @page {
          size: A4 portrait;
          margin: 0mm;
        }

        @media screen {
          body { background: #e2e8f0; padding-top: 64px; }
        }

        @media print {
          /* Hide the toolbar completely */
          .toolbar { display: none !important; }
          /* Remove all body padding */
          body { background: white !important; padding: 0 !important; margin: 0 !important; }
          /* CV fills the page */
          .cv-sheet { 
            width: 100% !important;
            max-width: 100% !important;
            box-shadow: none !important;
            margin: 0 !important;
          }
        }
      `}</style>

      {/* Toolbar - hidden on print */}
      <div className="toolbar fixed top-0 left-0 right-0 z-50 bg-gray-900 text-white px-6 py-3.5 flex items-center justify-between shadow-xl">
        <div>
          <p className="font-bold text-sm">
            {cv.fullName || 'Your CV'} &mdash;{' '}
            <span className="text-blue-400">
              {cv.template.charAt(0).toUpperCase() + cv.template.slice(1)} Template
            </span>
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            In the print dialog → set <strong className="text-white">Margins: None</strong> → Save as PDF
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.history.back()}
            className="text-sm border border-gray-600 text-gray-300 hover:text-white hover:border-gray-400 rounded-lg px-4 py-2 transition-colors">
            ← Back
          </button>
          <button
            onClick={() => window.print()}
            className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold px-5 py-2.5 rounded-lg transition-colors">
            🖨&nbsp; Print / Save as PDF
          </button>
        </div>
      </div>

      {/* The CV — this is what gets printed */}
      <div className="flex justify-center py-8">
        <div className="cv-sheet w-[210mm] shadow-2xl overflow-hidden">
          <CvPreviewRouter cv={cv} />
        </div>
      </div>
    </>
  )
}