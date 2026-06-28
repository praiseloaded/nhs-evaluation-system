// components/cv-preview-templates.tsx
// 6 distinct NHS CV visual templates
// Each has genuinely different layout, typography, colour scheme and structure

import React from 'react'

interface WorkExperienceItem {
  id: string; jobTitle: string; employer: string; location: string
  startDate: string; endDate: string; current: boolean; bullets: string[]
}
interface EducationItem {
  id: string; qualification: string; institution: string; location: string
  startDate: string; endDate: string; grade: string
}
interface CertificationItem { id: string; name: string; issuer: string; date: string; expiryDate: string }
interface ReferenceItem { id: string; name: string; role: string; organisation: string; relationship: string; email: string; phone: string }
interface SkillGroup { id: string; category: string; items: string }

export interface CvData {
  id: string; title: string; template: string
  fullName: string; email: string; phone: string; location: string
  professionalRegistration: string; personalStatement: string
  workExperience: WorkExperienceItem[]; education: EducationItem[]
  skills: SkillGroup[]; certifications: CertificationItem[]
  additionalInfo: string; references: ReferenceItem[]
}

function dateRange(start: string, end: string, current: boolean) {
  if (!start) return ''
  return `${start} – ${current ? 'Present' : end || ''}`
}

// ─── TEMPLATE 1: NHS Classic ──────────────────────────────────────────────────
// Single column, navy rule under each heading, formal serif feel
// Best for: Band 3–7 clinical roles
export function TemplateClassic({ cv }: { cv: CvData }) {
  return (
    <div style={{ fontFamily: 'Georgia, serif', fontSize: 12, color: '#1a1a1a', background: '#fff', padding: '40px 48px', minHeight: 800 }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 20, borderBottom: '2px solid #1B3A5C', paddingBottom: 14 }}>
        <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: 1, color: '#1B3A5C' }}>{cv.fullName || 'Your Name'}</div>
        {cv.professionalRegistration && <div style={{ fontSize: 11, color: '#1B3A5C', fontWeight: 600, marginTop: 3 }}>{cv.professionalRegistration}</div>}
        <div style={{ fontSize: 10.5, color: '#555', marginTop: 5, fontFamily: 'Arial, sans-serif' }}>
          {[cv.phone, cv.email, cv.location].filter(Boolean).join('   ·   ')}
        </div>
      </div>

      {/* Personal Statement */}
      {cv.personalStatement && (
        <section style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#1B3A5C', borderBottom: '1px solid #1B3A5C', paddingBottom: 2, marginBottom: 6, letterSpacing: 1.5, textTransform: 'uppercase' as const }}>Personal Statement</div>
          <p style={{ fontSize: 11.5, lineHeight: 1.65, margin: 0 }}>{cv.personalStatement}</p>
        </section>
      )}

      {/* Skills */}
      {cv.skills.length > 0 && (
        <section style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#1B3A5C', borderBottom: '1px solid #1B3A5C', paddingBottom: 2, marginBottom: 6, letterSpacing: 1.5, textTransform: 'uppercase' as const }}>Core Skills</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 24px' }}>
            {cv.skills.map(s => s.items.split(',').map(item => item.trim()).filter(Boolean).map((item, i) => (
              <div key={`${s.id}-${i}`} style={{ fontSize: 11, paddingLeft: 10, position: 'relative' as const, lineHeight: 1.8 }}>
                <span style={{ position: 'absolute' as const, left: 0, color: '#1B3A5C' }}>▸</span>{item}
              </div>
            )))}
          </div>
        </section>
      )}

      {/* Work Experience */}
      {cv.workExperience.length > 0 && (
        <section style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#1B3A5C', borderBottom: '1px solid #1B3A5C', paddingBottom: 2, marginBottom: 8, letterSpacing: 1.5, textTransform: 'uppercase' as const }}>Career History</div>
          {cv.workExperience.map(job => (
            <div key={job.id} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontWeight: 700, fontSize: 12 }}>{job.jobTitle || 'Job Title'}</span>
                <span style={{ fontSize: 10.5, color: '#666', fontFamily: 'Arial, sans-serif' }}>{dateRange(job.startDate, job.endDate, job.current)}</span>
              </div>
              <div style={{ fontStyle: 'italic', fontSize: 11, color: '#555', marginBottom: 4 }}>{[job.employer, job.location].filter(Boolean).join(', ')}</div>
              {job.bullets.filter(Boolean).map((b, i) => (
                <div key={i} style={{ fontSize: 11, paddingLeft: 12, position: 'relative' as const, lineHeight: 1.6 }}>
                  <span style={{ position: 'absolute' as const, left: 2 }}>•</span>{b}
                </div>
              ))}
            </div>
          ))}
        </section>
      )}

      {/* Education */}
      {cv.education.length > 0 && (
        <section style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#1B3A5C', borderBottom: '1px solid #1B3A5C', paddingBottom: 2, marginBottom: 8, letterSpacing: 1.5, textTransform: 'uppercase' as const }}>Education & Qualifications</div>
          {cv.education.map(ed => (
            <div key={ed.id} style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 700, fontSize: 11.5 }}>{ed.qualification || 'Qualification'}</span>
                <span style={{ fontSize: 10.5, color: '#666', fontFamily: 'Arial, sans-serif' }}>{dateRange(ed.startDate, ed.endDate, false)}</span>
              </div>
              <div style={{ fontStyle: 'italic', fontSize: 11, color: '#555' }}>{[ed.institution, ed.location, ed.grade].filter(Boolean).join(', ')}</div>
            </div>
          ))}
        </section>
      )}

      {/* Certifications */}
      {cv.certifications.length > 0 && (
        <section style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#1B3A5C', borderBottom: '1px solid #1B3A5C', paddingBottom: 2, marginBottom: 6, letterSpacing: 1.5, textTransform: 'uppercase' as const }}>Certifications & Training</div>
          {cv.certifications.map(c => (
            <div key={c.id} style={{ fontSize: 11, lineHeight: 1.7 }}>
              <span style={{ fontWeight: 600 }}>{c.name}</span>{c.issuer ? ` — ${c.issuer}` : ''}{c.date ? ` (${c.date})` : ''}
            </div>
          ))}
        </section>
      )}

      {/* References */}
      <section>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#1B3A5C', borderBottom: '1px solid #1B3A5C', paddingBottom: 2, marginBottom: 6, letterSpacing: 1.5, textTransform: 'uppercase' as const }}>References</div>
        {cv.references.length > 0 ? cv.references.map(r => (
          <div key={r.id} style={{ marginBottom: 8, fontSize: 11 }}>
            <span style={{ fontWeight: 700 }}>{r.name}</span>
            {r.role && <span style={{ color: '#555' }}> — {[r.role, r.organisation].filter(Boolean).join(', ')}</span>}
          </div>
        )) : <div style={{ fontSize: 11, fontStyle: 'italic', color: '#777' }}>Available on request.</div>}
      </section>
    </div>
  )
}

// ─── TEMPLATE 2: NHS Professional (Two-column sidebar) ────────────────────────
// Left navy sidebar with contact/skills/certs, right main content
// Best for: Registered professionals Band 5+
export function TemplateProfessional({ cv }: { cv: CvData }) {
  const sidebarW = 170
  return (
    <div style={{ fontFamily: 'Arial, sans-serif', fontSize: 11.5, color: '#1a1a1a', background: '#fff', display: 'flex', minHeight: 800 }}>
      {/* Sidebar */}
      <div style={{ width: sidebarW, minWidth: sidebarW, background: '#1B3A5C', color: '#fff', padding: '32px 16px', flexShrink: 0 }}>
        <div style={{ fontSize: 17, fontWeight: 800, lineHeight: 1.2, marginBottom: 4 }}>{cv.fullName || 'Your Name'}</div>
        {cv.professionalRegistration && <div style={{ fontSize: 9, background: '#2E5C8A', borderRadius: 4, padding: '3px 6px', marginBottom: 12, color: '#93c5fd', fontWeight: 700 }}>{cv.professionalRegistration}</div>}

        <div style={{ fontSize: 9.5, marginBottom: 16 }}>
          {cv.phone && <div style={{ marginBottom: 3 }}>📞 {cv.phone}</div>}
          {cv.email && <div style={{ marginBottom: 3, wordBreak: 'break-all' as const }}>✉ {cv.email}</div>}
          {cv.location && <div>📍 {cv.location}</div>}
        </div>

        {cv.skills.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase' as const, color: '#93c5fd', borderBottom: '1px solid #2E5C8A', paddingBottom: 3, marginBottom: 6 }}>Core Skills</div>
            {cv.skills.map(s => s.items.split(',').map(item => item.trim()).filter(Boolean).map((item, i) => (
              <div key={`${s.id}-${i}`} style={{ fontSize: 10, marginBottom: 3, paddingLeft: 8, position: 'relative' as const }}>
                <span style={{ position: 'absolute' as const, left: 0, color: '#93c5fd' }}>›</span>{item}
              </div>
            )))}
          </div>
        )}

        {cv.certifications.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase' as const, color: '#93c5fd', borderBottom: '1px solid #2E5C8A', paddingBottom: 3, marginBottom: 6 }}>Certifications</div>
            {cv.certifications.map(c => (
              <div key={c.id} style={{ fontSize: 10, marginBottom: 4 }}>
                <div style={{ fontWeight: 700 }}>{c.name}</div>
                {c.issuer && <div style={{ color: '#93c5fd', fontSize: 9 }}>{c.issuer}</div>}
                {c.date && <div style={{ color: '#64748b', fontSize: 9 }}>{c.date}</div>}
              </div>
            ))}
          </div>
        )}

        {cv.education.length > 0 && (
          <div>
            <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase' as const, color: '#93c5fd', borderBottom: '1px solid #2E5C8A', paddingBottom: 3, marginBottom: 6 }}>Education</div>
            {cv.education.map(ed => (
              <div key={ed.id} style={{ fontSize: 10, marginBottom: 6 }}>
                <div style={{ fontWeight: 700 }}>{ed.qualification || 'Qualification'}</div>
                <div style={{ color: '#93c5fd', fontSize: 9 }}>{ed.institution}</div>
                {ed.endDate && <div style={{ color: '#64748b', fontSize: 9 }}>{ed.endDate}</div>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Main */}
      <div style={{ flex: 1, padding: '32px 28px' }}>
        {cv.personalStatement && (
          <section style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: '#1B3A5C', letterSpacing: 1.5, textTransform: 'uppercase' as const, marginBottom: 6, borderLeft: '3px solid #1B3A5C', paddingLeft: 8 }}>Professional Profile</div>
            <p style={{ fontSize: 11, lineHeight: 1.7, margin: 0, color: '#374151' }}>{cv.personalStatement}</p>
          </section>
        )}

        {cv.workExperience.length > 0 && (
          <section style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: '#1B3A5C', letterSpacing: 1.5, textTransform: 'uppercase' as const, marginBottom: 8, borderLeft: '3px solid #1B3A5C', paddingLeft: 8 }}>Career Summary</div>
            {cv.workExperience.map(job => (
              <div key={job.id} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 1 }}>
                  <span style={{ fontWeight: 700, fontSize: 11.5 }}>{job.jobTitle || 'Job Title'}</span>
                  <span style={{ fontSize: 10, color: '#6b7280' }}>{dateRange(job.startDate, job.endDate, job.current)}</span>
                </div>
                <div style={{ fontSize: 10.5, color: '#1B3A5C', fontWeight: 600, marginBottom: 4 }}>{[job.employer, job.location].filter(Boolean).join(' · ')}</div>
                {job.bullets.filter(Boolean).map((b, i) => (
                  <div key={i} style={{ fontSize: 10.5, paddingLeft: 10, position: 'relative' as const, lineHeight: 1.6, color: '#374151' }}>
                    <span style={{ position: 'absolute' as const, left: 2, color: '#1B3A5C' }}>•</span>{b}
                  </div>
                ))}
              </div>
            ))}
          </section>
        )}

        <section>
          <div style={{ fontSize: 10, fontWeight: 800, color: '#1B3A5C', letterSpacing: 1.5, textTransform: 'uppercase' as const, marginBottom: 6, borderLeft: '3px solid #1B3A5C', paddingLeft: 8 }}>References</div>
          {cv.references.length > 0 ? cv.references.map(r => (
            <div key={r.id} style={{ fontSize: 10.5, marginBottom: 6 }}>
              <span style={{ fontWeight: 700 }}>{r.name}</span>{r.organisation ? ` — ${r.organisation}` : ''}
            </div>
          )) : <div style={{ fontSize: 10.5, fontStyle: 'italic', color: '#9ca3af' }}>Available on request.</div>}
        </section>
      </div>
    </div>
  )
}

// ─── TEMPLATE 3: NHS Modern ───────────────────────────────────────────────────
// Clean left accent bar, teal headers, minimal sans-serif
// Best for: Admin, research, AHP roles
export function TemplateModern({ cv }: { cv: CvData }) {
  const accent = '#0d9488' // teal-600
  const light  = '#f0fdfa'

  return (
    <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 11.5, color: '#111827', background: '#fff', padding: '36px 44px', minHeight: 800 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, marginBottom: 24, paddingBottom: 16, borderBottom: `2px solid ${accent}` }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 26, fontWeight: 900, color: '#111827', letterSpacing: -0.5 }}>{cv.fullName || 'Your Name'}</div>
          {cv.professionalRegistration && <div style={{ fontSize: 11, color: accent, fontWeight: 700, marginTop: 2 }}>{cv.professionalRegistration}</div>}
        </div>
        <div style={{ fontSize: 10, color: '#6b7280', textAlign: 'right' as const, lineHeight: 1.8 }}>
          {cv.phone && <div>{cv.phone}</div>}
          {cv.email && <div>{cv.email}</div>}
          {cv.location && <div>{cv.location}</div>}
        </div>
      </div>

      {/* Personal Statement */}
      {cv.personalStatement && (
        <section style={{ marginBottom: 18, background: light, borderLeft: `4px solid ${accent}`, padding: '10px 14px', borderRadius: '0 6px 6px 0' }}>
          <p style={{ margin: 0, fontSize: 11, lineHeight: 1.7, color: '#374151' }}>{cv.personalStatement}</p>
        </section>
      )}

      {/* Skills pills */}
      {cv.skills.length > 0 && (
        <section style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: accent, letterSpacing: 2, textTransform: 'uppercase' as const, marginBottom: 8 }}>Core Competencies</div>
          <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6 }}>
            {cv.skills.map(s => s.items.split(',').map(item => item.trim()).filter(Boolean).map((item, i) => (
              <span key={`${s.id}-${i}`} style={{ fontSize: 10, background: light, border: `1px solid ${accent}`, color: accent, borderRadius: 20, padding: '2px 10px', fontWeight: 600 }}>{item}</span>
            )))}
          </div>
        </section>
      )}

      {/* Work Experience */}
      {cv.workExperience.length > 0 && (
        <section style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: accent, letterSpacing: 2, textTransform: 'uppercase' as const, marginBottom: 10 }}>Work Experience</div>
          {cv.workExperience.map(job => (
            <div key={job.id} style={{ marginBottom: 14, paddingLeft: 14, borderLeft: '2px solid #e5e7eb' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                <span style={{ fontWeight: 800, fontSize: 12 }}>{job.jobTitle || 'Job Title'}</span>
                <span style={{ fontSize: 10, color: '#9ca3af', fontStyle: 'italic' }}>{dateRange(job.startDate, job.endDate, job.current)}</span>
              </div>
              <div style={{ fontSize: 10.5, color: accent, fontWeight: 600, marginBottom: 5 }}>{[job.employer, job.location].filter(Boolean).join(', ')}</div>
              {job.bullets.filter(Boolean).map((b, i) => (
                <div key={i} style={{ fontSize: 11, paddingLeft: 10, position: 'relative' as const, lineHeight: 1.65, color: '#4b5563' }}>
                  <span style={{ position: 'absolute' as const, left: 1, color: accent }}>→</span>{b}
                </div>
              ))}
            </div>
          ))}
        </section>
      )}

      {/* Education + Certs side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 16 }}>
        {cv.education.length > 0 && (
          <section>
            <div style={{ fontSize: 10, fontWeight: 800, color: accent, letterSpacing: 2, textTransform: 'uppercase' as const, marginBottom: 8 }}>Education</div>
            {cv.education.map(ed => (
              <div key={ed.id} style={{ marginBottom: 8, fontSize: 11 }}>
                <div style={{ fontWeight: 700 }}>{ed.qualification || 'Qualification'}</div>
                <div style={{ color: '#6b7280', fontSize: 10.5 }}>{ed.institution}</div>
                {(ed.endDate || ed.grade) && <div style={{ color: '#9ca3af', fontSize: 10 }}>{[ed.endDate, ed.grade].filter(Boolean).join(' · ')}</div>}
              </div>
            ))}
          </section>
        )}
        {cv.certifications.length > 0 && (
          <section>
            <div style={{ fontSize: 10, fontWeight: 800, color: accent, letterSpacing: 2, textTransform: 'uppercase' as const, marginBottom: 8 }}>Certifications</div>
            {cv.certifications.map(c => (
              <div key={c.id} style={{ marginBottom: 6, fontSize: 11 }}>
                <div style={{ fontWeight: 700 }}>{c.name}</div>
                <div style={{ color: '#6b7280', fontSize: 10 }}>{[c.issuer, c.date].filter(Boolean).join(' · ')}</div>
              </div>
            ))}
          </section>
        )}
      </div>

      <section>
        <div style={{ fontSize: 10, fontWeight: 800, color: accent, letterSpacing: 2, textTransform: 'uppercase' as const, marginBottom: 6 }}>References</div>
        {cv.references.length > 0 ? cv.references.map(r => (
          <div key={r.id} style={{ fontSize: 11, marginBottom: 4 }}>
            <span style={{ fontWeight: 700 }}>{r.name}</span>{r.organisation ? <span style={{ color: '#6b7280' }}> · {r.organisation}</span> : ''}
          </div>
        )) : <div style={{ fontSize: 11, fontStyle: 'italic', color: '#9ca3af' }}>Available on request.</div>}
      </section>
    </div>
  )
}

// ─── TEMPLATE 4: NHS Executive ────────────────────────────────────────────────
// Dark header block, two-column body, charcoal/gold accent
// Best for: Band 6–8 management and leadership roles
export function TemplateExecutive({ cv }: { cv: CvData }) {
  const gold = '#b45309'
  return (
    <div style={{ fontFamily: 'Arial, sans-serif', fontSize: 11.5, color: '#1f2937', background: '#fff', minHeight: 800 }}>
      {/* Dark header */}
      <div style={{ background: '#111827', color: '#fff', padding: '28px 36px 24px' }}>
        <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: -0.5, marginBottom: 4 }}>{cv.fullName || 'Your Name'}</div>
        {cv.professionalRegistration && (
          <div style={{ display: 'inline-block', background: gold, color: '#fff', fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 3, marginBottom: 10, letterSpacing: 1 }}>
            {cv.professionalRegistration}
          </div>
        )}
        <div style={{ display: 'flex', gap: 20, fontSize: 10, color: '#9ca3af', flexWrap: 'wrap' as const }}>
          {cv.phone && <span>📞 {cv.phone}</span>}
          {cv.email && <span>✉ {cv.email}</span>}
          {cv.location && <span>📍 {cv.location}</span>}
        </div>
      </div>
      {/* Gold rule */}
      <div style={{ height: 4, background: `linear-gradient(90deg, ${gold}, #fbbf24)` }} />

      <div style={{ padding: '24px 36px' }}>
        {cv.personalStatement && (
          <section style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: gold, letterSpacing: 2, textTransform: 'uppercase' as const, marginBottom: 6 }}>Executive Profile</div>
            <p style={{ margin: 0, fontSize: 11, lineHeight: 1.75, color: '#374151', borderLeft: `3px solid ${gold}`, paddingLeft: 12 }}>{cv.personalStatement}</p>
          </section>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 28 }}>
          {/* Left: Experience */}
          <div>
            {cv.workExperience.length > 0 && (
              <section style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: gold, letterSpacing: 2, textTransform: 'uppercase' as const, borderBottom: `2px solid ${gold}`, paddingBottom: 4, marginBottom: 10 }}>Career History</div>
                {cv.workExperience.map(job => (
                  <div key={job.id} style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 1 }}>
                      <span style={{ fontWeight: 800, fontSize: 12 }}>{job.jobTitle || 'Job Title'}</span>
                      <span style={{ fontSize: 10, color: '#9ca3af' }}>{dateRange(job.startDate, job.endDate, job.current)}</span>
                    </div>
                    <div style={{ fontSize: 10.5, color: '#111827', fontWeight: 700, marginBottom: 5 }}>{job.employer}{job.location ? ` · ${job.location}` : ''}</div>
                    {job.bullets.filter(Boolean).map((b, i) => (
                      <div key={i} style={{ fontSize: 11, paddingLeft: 12, position: 'relative' as const, lineHeight: 1.6, color: '#4b5563' }}>
                        <span style={{ position: 'absolute' as const, left: 2, color: gold }}>▪</span>{b}
                      </div>
                    ))}
                  </div>
                ))}
              </section>
            )}
          </div>

          {/* Right: Skills, Education, Certs */}
          <div>
            {cv.skills.length > 0 && (
              <section style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: gold, letterSpacing: 2, textTransform: 'uppercase' as const, borderBottom: `2px solid ${gold}`, paddingBottom: 4, marginBottom: 8 }}>Key Skills</div>
                {cv.skills.map(s => s.items.split(',').map(item => item.trim()).filter(Boolean).map((item, i) => (
                  <div key={`${s.id}-${i}`} style={{ fontSize: 10.5, paddingLeft: 8, position: 'relative' as const, lineHeight: 1.8, color: '#374151' }}>
                    <span style={{ position: 'absolute' as const, left: 0, color: gold }}>▸</span>{item}
                  </div>
                )))}
              </section>
            )}
            {cv.education.length > 0 && (
              <section style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: gold, letterSpacing: 2, textTransform: 'uppercase' as const, borderBottom: `2px solid ${gold}`, paddingBottom: 4, marginBottom: 8 }}>Education</div>
                {cv.education.map(ed => (
                  <div key={ed.id} style={{ marginBottom: 8, fontSize: 10.5 }}>
                    <div style={{ fontWeight: 700 }}>{ed.qualification || 'Qualification'}</div>
                    <div style={{ color: '#6b7280', fontSize: 10 }}>{ed.institution}</div>
                    {(ed.endDate || ed.grade) && <div style={{ color: '#9ca3af', fontSize: 10 }}>{[ed.endDate, ed.grade].filter(Boolean).join(' · ')}</div>}
                  </div>
                ))}
              </section>
            )}
            {cv.certifications.length > 0 && (
              <section style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: gold, letterSpacing: 2, textTransform: 'uppercase' as const, borderBottom: `2px solid ${gold}`, paddingBottom: 4, marginBottom: 8 }}>Certifications</div>
                {cv.certifications.map(c => (
                  <div key={c.id} style={{ marginBottom: 5, fontSize: 10.5 }}>
                    <div style={{ fontWeight: 700 }}>{c.name}</div>
                    {c.issuer && <div style={{ color: '#6b7280', fontSize: 10 }}>{c.issuer}</div>}
                  </div>
                ))}
              </section>
            )}
            <section>
              <div style={{ fontSize: 10, fontWeight: 800, color: gold, letterSpacing: 2, textTransform: 'uppercase' as const, borderBottom: `2px solid ${gold}`, paddingBottom: 4, marginBottom: 6 }}>References</div>
              {cv.references.length > 0 ? cv.references.map(r => (
                <div key={r.id} style={{ fontSize: 10.5, marginBottom: 4 }}>
                  <span style={{ fontWeight: 700 }}>{r.name}</span>
                </div>
              )) : <div style={{ fontSize: 10.5, fontStyle: 'italic', color: '#9ca3af' }}>On request.</div>}
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── TEMPLATE 5: NHS Graduate ─────────────────────────────────────────────────
// Achievement-first, compact, purple accent, bold name treatment
// Best for: New to NHS, Band 2–3, career changers
export function TemplateGraduate({ cv }: { cv: CvData }) {
  const purple = '#6d28d9'
  const lpurple = '#ede9fe'
  return (
    <div style={{ fontFamily: 'Arial, sans-serif', fontSize: 11.5, color: '#1a1a1a', background: '#fff', padding: '32px 40px', minHeight: 800 }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 28, fontWeight: 900, color: purple, letterSpacing: -1 }}>{cv.fullName || 'Your Name'}</div>
        <div style={{ height: 3, background: `linear-gradient(90deg, ${purple}, transparent)`, marginTop: 4, marginBottom: 8, width: '60%' }} />
        <div style={{ display: 'flex', gap: 16, fontSize: 10, color: '#6b7280', flexWrap: 'wrap' as const }}>
          {cv.phone && <span>{cv.phone}</span>}
          {cv.email && <span>{cv.email}</span>}
          {cv.location && <span>{cv.location}</span>}
          {cv.professionalRegistration && <span style={{ color: purple, fontWeight: 700 }}>{cv.professionalRegistration}</span>}
        </div>
      </div>

      {/* Personal Statement */}
      {cv.personalStatement && (
        <section style={{ marginBottom: 18, background: lpurple, padding: '12px 16px', borderRadius: 8 }}>
          <div style={{ fontSize: 9, fontWeight: 800, color: purple, letterSpacing: 2, textTransform: 'uppercase' as const, marginBottom: 5 }}>About Me</div>
          <p style={{ margin: 0, fontSize: 11, lineHeight: 1.7, color: '#374151' }}>{cv.personalStatement}</p>
        </section>
      )}

      {/* Skills — horizontal pills */}
      {cv.skills.length > 0 && (
        <section style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 9, fontWeight: 800, color: purple, letterSpacing: 2, textTransform: 'uppercase' as const, marginBottom: 8 }}>Key Skills</div>
          <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 5 }}>
            {cv.skills.map(s => s.items.split(',').map(item => item.trim()).filter(Boolean).map((item, i) => (
              <span key={`${s.id}-${i}`} style={{ fontSize: 10, background: '#f3f4f6', color: '#374151', borderRadius: 4, padding: '3px 9px', fontWeight: 600 }}>{item}</span>
            )))}
          </div>
        </section>
      )}

      {/* Experience */}
      {cv.workExperience.length > 0 && (
        <section style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 9, fontWeight: 800, color: purple, letterSpacing: 2, textTransform: 'uppercase' as const, marginBottom: 10 }}>Experience</div>
          {cv.workExperience.map(job => (
            <div key={job.id} style={{ marginBottom: 12, display: 'grid', gridTemplateColumns: '130px 1fr', gap: 12 }}>
              <div style={{ fontSize: 10, color: '#9ca3af', paddingTop: 2, fontStyle: 'italic' }}>{dateRange(job.startDate, job.endDate, job.current)}</div>
              <div>
                <span style={{ fontWeight: 800, fontSize: 12 }}>{job.jobTitle || 'Job Title'}</span>
                <span style={{ color: purple, fontSize: 10.5, marginLeft: 6 }}>{[job.employer, job.location].filter(Boolean).join(', ')}</span>
                {job.bullets.filter(Boolean).map((b, i) => (
                  <div key={i} style={{ fontSize: 11, paddingLeft: 10, position: 'relative' as const, lineHeight: 1.65, color: '#4b5563', marginTop: 3 }}>
                    <span style={{ position: 'absolute' as const, left: 1, color: purple }}>•</span>{b}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Education + Certs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {cv.education.length > 0 && (
          <section>
            <div style={{ fontSize: 9, fontWeight: 800, color: purple, letterSpacing: 2, textTransform: 'uppercase' as const, marginBottom: 8 }}>Education</div>
            {cv.education.map(ed => (
              <div key={ed.id} style={{ marginBottom: 8 }}>
                <div style={{ fontWeight: 700, fontSize: 11 }}>{ed.qualification || 'Qualification'}</div>
                <div style={{ fontSize: 10, color: '#6b7280' }}>{ed.institution}{ed.grade ? ` · ${ed.grade}` : ''}</div>
                {ed.endDate && <div style={{ fontSize: 10, color: '#9ca3af' }}>{ed.endDate}</div>}
              </div>
            ))}
          </section>
        )}
        {cv.certifications.length > 0 && (
          <section>
            <div style={{ fontSize: 9, fontWeight: 800, color: purple, letterSpacing: 2, textTransform: 'uppercase' as const, marginBottom: 8 }}>Certifications</div>
            {cv.certifications.map(c => (
              <div key={c.id} style={{ marginBottom: 6 }}>
                <div style={{ fontWeight: 700, fontSize: 11 }}>{c.name}</div>
                {c.issuer && <div style={{ fontSize: 10, color: '#6b7280' }}>{c.issuer}</div>}
              </div>
            ))}
          </section>
        )}
      </div>

      <section style={{ marginTop: 16 }}>
        <div style={{ fontSize: 9, fontWeight: 800, color: purple, letterSpacing: 2, textTransform: 'uppercase' as const, marginBottom: 6 }}>References</div>
        {cv.references.length > 0 ? cv.references.map(r => (
          <div key={r.id} style={{ fontSize: 11, marginBottom: 3 }}>
            <span style={{ fontWeight: 700 }}>{r.name}</span>{r.organisation ? <span style={{ color: '#6b7280' }}> — {r.organisation}</span> : ''}
          </div>
        )) : <div style={{ fontSize: 11, fontStyle: 'italic', color: '#9ca3af' }}>Available on request.</div>}
      </section>
    </div>
  )
}

// ─── TEMPLATE 6: NHS Research & Science ──────────────────────────────────────
// Clean academic feel, green accent, publications/research ready
// Best for: BMS, Research Coordinators, Clinical Scientists
export function TemplateResearch({ cv }: { cv: CvData }) {
  const green = '#15803d'
  const lgreen = '#f0fdf4'
  return (
    <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 11.5, color: '#111827', background: '#fff', minHeight: 800 }}>
      {/* Header band */}
      <div style={{ background: lgreen, borderBottom: `3px solid ${green}`, padding: '24px 40px 18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#111827' }}>{cv.fullName || 'Your Name'}</div>
            {cv.professionalRegistration && <div style={{ fontSize: 10.5, color: green, fontWeight: 700, marginTop: 3 }}>{cv.professionalRegistration} Registered</div>}
          </div>
          <div style={{ fontSize: 10, color: '#6b7280', textAlign: 'right' as const, lineHeight: 1.9 }}>
            {cv.phone && <div>{cv.phone}</div>}
            {cv.email && <div>{cv.email}</div>}
            {cv.location && <div>{cv.location}</div>}
          </div>
        </div>
      </div>

      <div style={{ padding: '24px 40px' }}>
        {cv.personalStatement && (
          <section style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: green, letterSpacing: 2, textTransform: 'uppercase' as const, marginBottom: 6 }}>Professional Summary</div>
            <p style={{ margin: 0, fontSize: 11, lineHeight: 1.75, color: '#374151' }}>{cv.personalStatement}</p>
          </section>
        )}

        {/* Skills in categories */}
        {cv.skills.length > 0 && (
          <section style={{ marginBottom: 18, background: lgreen, padding: '10px 14px', borderRadius: 6 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: green, letterSpacing: 2, textTransform: 'uppercase' as const, marginBottom: 8 }}>Technical Competencies</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 24px' }}>
              {cv.skills.map(s => s.items.split(',').map(item => item.trim()).filter(Boolean).map((item, i) => (
                <div key={`${s.id}-${i}`} style={{ fontSize: 10.5, paddingLeft: 10, position: 'relative' as const, lineHeight: 1.85 }}>
                  <span style={{ position: 'absolute' as const, left: 0, color: green }}>✓</span>{item}
                </div>
              )))}
            </div>
          </section>
        )}

        {/* Work Experience */}
        {cv.workExperience.length > 0 && (
          <section style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: green, letterSpacing: 2, textTransform: 'uppercase' as const, borderBottom: `1px solid #d1fae5`, paddingBottom: 4, marginBottom: 10 }}>Professional Experience</div>
            {cv.workExperience.map(job => (
              <div key={job.id} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontWeight: 800, fontSize: 12 }}>{job.jobTitle || 'Job Title'}</span>
                  <span style={{ fontSize: 10, color: '#9ca3af' }}>{dateRange(job.startDate, job.endDate, job.current)}</span>
                </div>
                <div style={{ fontSize: 10.5, color: green, fontWeight: 600, marginBottom: 5 }}>{[job.employer, job.location].filter(Boolean).join(' | ')}</div>
                {job.bullets.filter(Boolean).map((b, i) => (
                  <div key={i} style={{ fontSize: 11, paddingLeft: 12, position: 'relative' as const, lineHeight: 1.65, color: '#4b5563' }}>
                    <span style={{ position: 'absolute' as const, left: 2, color: green }}>–</span>{b}
                  </div>
                ))}
              </div>
            ))}
          </section>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28, marginBottom: 16 }}>
          {cv.education.length > 0 && (
            <section>
              <div style={{ fontSize: 10, fontWeight: 800, color: green, letterSpacing: 2, textTransform: 'uppercase' as const, borderBottom: '1px solid #d1fae5', paddingBottom: 4, marginBottom: 8 }}>Education</div>
              {cv.education.map(ed => (
                <div key={ed.id} style={{ marginBottom: 8, fontSize: 11 }}>
                  <div style={{ fontWeight: 700 }}>{ed.qualification || 'Qualification'}</div>
                  <div style={{ color: '#6b7280', fontSize: 10.5 }}>{ed.institution}</div>
                  {(ed.endDate || ed.grade) && <div style={{ color: '#9ca3af', fontSize: 10 }}>{[ed.endDate, ed.grade].filter(Boolean).join(' · ')}</div>}
                </div>
              ))}
            </section>
          )}
          {cv.certifications.length > 0 && (
            <section>
              <div style={{ fontSize: 10, fontWeight: 800, color: green, letterSpacing: 2, textTransform: 'uppercase' as const, borderBottom: '1px solid #d1fae5', paddingBottom: 4, marginBottom: 8 }}>Certifications & CPD</div>
              {cv.certifications.map(c => (
                <div key={c.id} style={{ marginBottom: 6, fontSize: 11 }}>
                  <div style={{ fontWeight: 700 }}>{c.name}</div>
                  <div style={{ color: '#6b7280', fontSize: 10 }}>{[c.issuer, c.date].filter(Boolean).join(' · ')}</div>
                </div>
              ))}
            </section>
          )}
        </div>

        <section>
          <div style={{ fontSize: 10, fontWeight: 800, color: green, letterSpacing: 2, textTransform: 'uppercase' as const, borderBottom: '1px solid #d1fae5', paddingBottom: 4, marginBottom: 6 }}>References</div>
          {cv.references.length > 0 ? cv.references.map(r => (
            <div key={r.id} style={{ fontSize: 11, marginBottom: 4 }}>
              <span style={{ fontWeight: 700 }}>{r.name}</span>{r.organisation ? <span style={{ color: '#6b7280' }}> — {r.organisation}</span> : ''}
            </div>
          )) : <div style={{ fontSize: 11, fontStyle: 'italic', color: '#9ca3af' }}>Available on request.</div>}
        </section>
      </div>
    </div>
  )
}

// ─── Template registry ────────────────────────────────────────────────────────
export const CV_TEMPLATES = [
  { id: 'classic',      label: 'NHS Classic',      desc: 'Single column · Navy serif headings',          color: '#1B3A5C', best: 'Band 3–7 clinical',   category: 'Clinical'    },
  { id: 'professional', label: 'NHS Professional', desc: 'Navy sidebar · Two-column layout',             color: '#1B3A5C', best: 'Band 5+ registered',  category: 'Clinical'    },
  { id: 'modern',       label: 'NHS Modern',       desc: 'Teal accents · Pill skills · Clean layout',   color: '#0d9488', best: 'Admin, AHP',          category: 'Modern'      },
  { id: 'executive',    label: 'NHS Executive',    desc: 'Dark header · Gold accents · Leadership',      color: '#b45309', best: 'Band 6–8 management', category: 'Executive'   },
  { id: 'graduate',     label: 'NHS Graduate',     desc: 'Timeline layout · Purple · Compact',           color: '#6d28d9', best: 'New to NHS, Band 2–3',category: 'Modern'      },
  { id: 'research',     label: 'NHS Research',     desc: 'Green accents · Academic · Science roles',    color: '#15803d', best: 'BMS, Research',       category: 'Scientific'  },
  { id: 'ats',          label: 'NHS ATS Pure',     desc: 'Zero decoration · ATS optimised · Black only', color: '#18181b', best: 'All roles (ATS focus)',category: 'ATS'         },
  { id: 'lateral',      label: 'NHS Lateral',      desc: 'Bold indigo sidebar · Strong visual identity', color: '#1e1b4b', best: 'Senior clinical',     category: 'Creative'    },
  { id: 'timeless',     label: 'NHS Timeless',     desc: 'Cream background · Charcoal serif · Elegant',  color: '#78716c', best: 'Experienced Band 5+', category: 'Classic'     },
  { id: 'bold',         label: 'NHS Bold',         desc: 'Red header · Strong hierarchy · High impact',  color: '#b91c1c', best: 'Band 4–6 standing out',category: 'Creative'    },
  { id: 'compact',      label: 'NHS Compact',      desc: 'Dense layout · Small type · Fits more content', color: '#1d4ed8', best: '10+ years experience', category: 'Classic'    },
  { id: 'minimal',      label: 'NHS Minimal',      desc: 'Ultra-whitespace · Hairline rules · Typography', color: '#18181b', best: 'Clinical governance', category: 'Modern'     },
]

export const TEMPLATE_CATEGORIES = ['All', 'Clinical', 'Modern', 'Executive', 'Scientific', 'Creative', 'Classic', 'ATS']

export function CvPreviewRouter({ cv }: { cv: CvData }) {
  switch (cv.template) {
    case 'professional': return <TemplateProfessional cv={cv} />
    case 'modern':       return <TemplateModern       cv={cv} />
    case 'executive':    return <TemplateExecutive    cv={cv} />
    case 'graduate':     return <TemplateGraduate     cv={cv} />
    case 'research':     return <TemplateResearch     cv={cv} />
    case 'ats':          return <TemplateATSPure      cv={cv} />
    case 'lateral':      return <TemplateLateral      cv={cv} />
    case 'timeless':     return <TemplateTimeless     cv={cv} />
    case 'bold':         return <TemplateBold         cv={cv} />
    case 'compact':      return <TemplateCompact      cv={cv} />
    case 'minimal':      return <TemplateMinimal      cv={cv} />
    default:             return <TemplateClassic      cv={cv} />
  }
}

// ─── TEMPLATE 7: NHS ATS Pure ────────────────────────────────────────────────
// Zero decoration — black text, no colour, no borders except horizontal rules
// Designed to score 100% on ATS parsers. No tables, no columns, no graphics.
export function TemplateATSPure({ cv }: { cv: CvData }) {
  return (
    <div style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: 11, color: '#000', background: '#fff', padding: '36px 48px', minHeight: 800 }}>
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 20, fontWeight: 700 }}>{cv.fullName || 'Your Name'}</div>
        <div style={{ fontSize: 10.5, marginTop: 4 }}>
          {[cv.phone, cv.email, cv.location, cv.professionalRegistration].filter(Boolean).join(' | ')}
        </div>
      </div>
      <hr style={{ border: 'none', borderTop: '1px solid #000', marginBottom: 12 }} />

      {cv.personalStatement && (
        <section style={{ marginBottom: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 11.5, textTransform: 'uppercase' as const, marginBottom: 4 }}>PROFESSIONAL SUMMARY</div>
          <hr style={{ border: 'none', borderTop: '1px solid #000', marginBottom: 6 }} />
          <p style={{ margin: 0, lineHeight: 1.65 }}>{cv.personalStatement}</p>
        </section>
      )}

      {cv.skills.length > 0 && (
        <section style={{ marginBottom: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 11.5, textTransform: 'uppercase' as const, marginBottom: 4 }}>CORE SKILLS</div>
          <hr style={{ border: 'none', borderTop: '1px solid #000', marginBottom: 6 }} />
          <div>{cv.skills.map(s => s.items).join(' | ')}</div>
        </section>
      )}

      {cv.workExperience.length > 0 && (
        <section style={{ marginBottom: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 11.5, textTransform: 'uppercase' as const, marginBottom: 4 }}>WORK EXPERIENCE</div>
          <hr style={{ border: 'none', borderTop: '1px solid #000', marginBottom: 6 }} />
          {cv.workExperience.map(job => (
            <div key={job.id} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 700 }}>{job.jobTitle || 'Job Title'} — {job.employer}</span>
                <span>{dateRange(job.startDate, job.endDate, job.current)}</span>
              </div>
              {job.location && <div>{job.location}</div>}
              {job.bullets.filter(Boolean).map((b, i) => <div key={i} style={{ paddingLeft: 12 }}>• {b}</div>)}
            </div>
          ))}
        </section>
      )}

      {cv.education.length > 0 && (
        <section style={{ marginBottom: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 11.5, textTransform: 'uppercase' as const, marginBottom: 4 }}>EDUCATION</div>
          <hr style={{ border: 'none', borderTop: '1px solid #000', marginBottom: 6 }} />
          {cv.education.map(ed => (
            <div key={ed.id} style={{ marginBottom: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 700 }}>{ed.qualification} — {ed.institution}</span>
                <span>{ed.endDate}</span>
              </div>
              {ed.grade && <div>Grade: {ed.grade}</div>}
            </div>
          ))}
        </section>
      )}

      {cv.certifications.length > 0 && (
        <section style={{ marginBottom: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 11.5, textTransform: 'uppercase' as const, marginBottom: 4 }}>CERTIFICATIONS</div>
          <hr style={{ border: 'none', borderTop: '1px solid #000', marginBottom: 6 }} />
          {cv.certifications.map(c => <div key={c.id}>{c.name}{c.issuer ? ` — ${c.issuer}` : ''}{c.date ? ` (${c.date})` : ''}</div>)}
        </section>
      )}

      <section>
        <div style={{ fontWeight: 700, fontSize: 11.5, textTransform: 'uppercase' as const, marginBottom: 4 }}>REFERENCES</div>
        <hr style={{ border: 'none', borderTop: '1px solid #000', marginBottom: 6 }} />
        {cv.references.length > 0 ? cv.references.map(r => <div key={r.id}>{r.name}{r.organisation ? ` — ${r.organisation}` : ''}</div>) : <div>Available on request.</div>}
      </section>
    </div>
  )
}

// ─── TEMPLATE 8: NHS Lateral ─────────────────────────────────────────────────
// Bold 38% left colour block, white right content, name displayed vertically
// Best for: senior clinical/management roles wanting strong visual identity
export function TemplateLateral({ cv }: { cv: CvData }) {
  const ink = '#1e1b4b'
  return (
    <div style={{ fontFamily: 'Arial, sans-serif', fontSize: 11, color: '#1f2937', background: '#fff', display: 'flex', minHeight: 800 }}>
      {/* Bold left block */}
      <div style={{ width: 160, background: ink, color: '#fff', padding: '32px 14px', flexShrink: 0, display: 'flex', flexDirection: 'column' as const, gap: 20 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 900, lineHeight: 1.1, wordBreak: 'break-word' as const }}>{cv.fullName || 'Your Name'}</div>
          {cv.professionalRegistration && <div style={{ fontSize: 8.5, color: '#a5b4fc', marginTop: 6, fontWeight: 600, background: 'rgba(165,180,252,0.15)', padding: '3px 6px', borderRadius: 3 }}>{cv.professionalRegistration}</div>}
        </div>
        <div style={{ fontSize: 9.5, color: '#c7d2fe', lineHeight: 2 }}>
          {cv.phone && <div>📞 {cv.phone}</div>}
          {cv.email && <div style={{ wordBreak: 'break-all' as const }}>✉ {cv.email}</div>}
          {cv.location && <div>📍 {cv.location}</div>}
        </div>
        {cv.skills.length > 0 && (
          <div>
            <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase' as const, color: '#a5b4fc', marginBottom: 8, borderBottom: '1px solid rgba(165,180,252,0.3)', paddingBottom: 4 }}>Skills</div>
            {cv.skills.map(s => s.items.split(',').map(i => i.trim()).filter(Boolean).map((item, idx) => (
              <div key={idx} style={{ fontSize: 9.5, color: '#e0e7ff', marginBottom: 4 }}>· {item}</div>
            )))}
          </div>
        )}
        {cv.education.length > 0 && (
          <div>
            <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase' as const, color: '#a5b4fc', marginBottom: 8, borderBottom: '1px solid rgba(165,180,252,0.3)', paddingBottom: 4 }}>Education</div>
            {cv.education.map(ed => (
              <div key={ed.id} style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 9.5, fontWeight: 700, color: '#fff' }}>{ed.qualification}</div>
                <div style={{ fontSize: 8.5, color: '#a5b4fc' }}>{ed.institution}</div>
                {ed.endDate && <div style={{ fontSize: 8, color: '#6366f1' }}>{ed.endDate}</div>}
              </div>
            ))}
          </div>
        )}
        {cv.certifications.length > 0 && (
          <div>
            <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase' as const, color: '#a5b4fc', marginBottom: 8, borderBottom: '1px solid rgba(165,180,252,0.3)', paddingBottom: 4 }}>Certs</div>
            {cv.certifications.map(c => <div key={c.id} style={{ fontSize: 9.5, color: '#e0e7ff', marginBottom: 4 }}>{c.name}</div>)}
          </div>
        )}
      </div>
      {/* Right content */}
      <div style={{ flex: 1, padding: '32px 24px' }}>
        {cv.personalStatement && (
          <section style={{ marginBottom: 18, paddingBottom: 14, borderBottom: '2px solid #e0e7ff' }}>
            <div style={{ fontSize: 9, fontWeight: 800, color: ink, letterSpacing: 2, textTransform: 'uppercase' as const, marginBottom: 6 }}>Professional Profile</div>
            <p style={{ margin: 0, fontSize: 11, lineHeight: 1.75, color: '#374151' }}>{cv.personalStatement}</p>
          </section>
        )}
        {cv.workExperience.length > 0 && (
          <section style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 9, fontWeight: 800, color: ink, letterSpacing: 2, textTransform: 'uppercase' as const, marginBottom: 10, paddingBottom: 4, borderBottom: '2px solid #e0e7ff' }}>Career History</div>
            {cv.workExperience.map(job => (
              <div key={job.id} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 800, fontSize: 12 }}>{job.jobTitle}</span>
                  <span style={{ fontSize: 9.5, color: '#9ca3af' }}>{dateRange(job.startDate, job.endDate, job.current)}</span>
                </div>
                <div style={{ fontSize: 10.5, color: ink, fontWeight: 600, marginBottom: 4 }}>{[job.employer, job.location].filter(Boolean).join(' · ')}</div>
                {job.bullets.filter(Boolean).map((b, i) => <div key={i} style={{ fontSize: 10.5, paddingLeft: 10, position: 'relative' as const, lineHeight: 1.6 }}><span style={{ position: 'absolute' as const, left: 1, color: ink }}>•</span>{b}</div>)}
              </div>
            ))}
          </section>
        )}
        <section>
          <div style={{ fontSize: 9, fontWeight: 800, color: ink, letterSpacing: 2, textTransform: 'uppercase' as const, marginBottom: 6, paddingBottom: 4, borderBottom: '2px solid #e0e7ff' }}>References</div>
          {cv.references.length > 0 ? cv.references.map(r => <div key={r.id} style={{ fontSize: 10.5, marginBottom: 4 }}><span style={{ fontWeight: 700 }}>{r.name}</span>{r.organisation ? ` — ${r.organisation}` : ''}</div>) : <div style={{ fontSize: 10.5, fontStyle: 'italic', color: '#9ca3af' }}>Available on request.</div>}
        </section>
      </div>
    </div>
  )
}

// ─── TEMPLATE 9: NHS Timeless ─────────────────────────────────────────────────
// Cream #faf9f7 background, charcoal serif type, fine hairline borders
// Best for: experienced professionals who want understated authority
export function TemplateTimeless({ cv }: { cv: CvData }) {
  const bg = '#faf9f7'; const ink = '#1c1917'; const rule = '#d6d3d1'; const accent = '#78716c'
  return (
    <div style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontSize: 12, color: ink, background: bg, padding: '40px 52px', minHeight: 800 }}>
      <div style={{ textAlign: 'center', marginBottom: 22 }}>
        <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: 2, color: ink }}>{(cv.fullName || 'Your Name').toUpperCase()}</div>
        {cv.professionalRegistration && <div style={{ fontSize: 10, letterSpacing: 3, color: accent, marginTop: 3, textTransform: 'uppercase' as const }}>{cv.professionalRegistration}</div>}
        <div style={{ height: 1, background: ink, margin: '10px auto', width: 80 }} />
        <div style={{ fontSize: 10, color: accent, letterSpacing: 1 }}>{[cv.phone, cv.email, cv.location].filter(Boolean).join('   ·   ')}</div>
      </div>

      {cv.personalStatement && (
        <section style={{ marginBottom: 18, textAlign: 'center', borderTop: `1px solid ${rule}`, borderBottom: `1px solid ${rule}`, padding: '12px 0' }}>
          <p style={{ margin: 0, fontSize: 11.5, lineHeight: 1.8, fontStyle: 'italic', color: '#44403c' }}>{cv.personalStatement}</p>
        </section>
      )}

      {cv.skills.length > 0 && (
        <section style={{ marginBottom: 18, textAlign: 'center' }}>
          <div style={{ fontSize: 9, letterSpacing: 3, color: accent, textTransform: 'uppercase' as const, marginBottom: 8 }}>Core Skills</div>
          <div style={{ fontSize: 11, color: '#57534e' }}>{cv.skills.map(s => s.items).join(' · ')}</div>
        </section>
      )}

      {cv.workExperience.length > 0 && (
        <section style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 9, letterSpacing: 3, color: accent, textTransform: 'uppercase' as const, marginBottom: 8, textAlign: 'center' }}>Career History</div>
          <div style={{ height: 1, background: rule, marginBottom: 12 }} />
          {cv.workExperience.map(job => (
            <div key={job.id} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontWeight: 700, fontSize: 12.5 }}>{job.jobTitle}</span>
                <span style={{ fontSize: 10, color: accent, fontStyle: 'italic' }}>{dateRange(job.startDate, job.endDate, job.current)}</span>
              </div>
              <div style={{ fontSize: 11, fontStyle: 'italic', color: '#78716c', marginBottom: 5 }}>{[job.employer, job.location].filter(Boolean).join(', ')}</div>
              {job.bullets.filter(Boolean).map((b, i) => <div key={i} style={{ fontSize: 11.5, paddingLeft: 14, position: 'relative' as const, lineHeight: 1.65 }}><span style={{ position: 'absolute' as const, left: 4 }}>—</span>{b}</div>)}
            </div>
          ))}
        </section>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28, marginBottom: 18 }}>
        {cv.education.length > 0 && (
          <section>
            <div style={{ fontSize: 9, letterSpacing: 3, color: accent, textTransform: 'uppercase' as const, marginBottom: 6 }}>Education</div>
            <div style={{ height: 1, background: rule, marginBottom: 8 }} />
            {cv.education.map(ed => (
              <div key={ed.id} style={{ marginBottom: 8 }}>
                <div style={{ fontWeight: 700, fontSize: 11.5 }}>{ed.qualification}</div>
                <div style={{ fontStyle: 'italic', fontSize: 11, color: '#78716c' }}>{ed.institution}</div>
                {(ed.endDate || ed.grade) && <div style={{ fontSize: 10, color: accent }}>{[ed.endDate, ed.grade].filter(Boolean).join(' · ')}</div>}
              </div>
            ))}
          </section>
        )}
        {cv.certifications.length > 0 && (
          <section>
            <div style={{ fontSize: 9, letterSpacing: 3, color: accent, textTransform: 'uppercase' as const, marginBottom: 6 }}>Certifications</div>
            <div style={{ height: 1, background: rule, marginBottom: 8 }} />
            {cv.certifications.map(c => <div key={c.id} style={{ marginBottom: 6 }}><div style={{ fontWeight: 700, fontSize: 11.5 }}>{c.name}</div><div style={{ fontStyle: 'italic', fontSize: 11, color: '#78716c' }}>{c.issuer}</div></div>)}
          </section>
        )}
      </div>

      <section>
        <div style={{ fontSize: 9, letterSpacing: 3, color: accent, textTransform: 'uppercase' as const, marginBottom: 6, textAlign: 'center' }}>References</div>
        <div style={{ height: 1, background: rule, marginBottom: 8 }} />
        {cv.references.length > 0 ? cv.references.map(r => <div key={r.id} style={{ fontSize: 11.5, marginBottom: 4 }}><span style={{ fontWeight: 700 }}>{r.name}</span>{r.organisation ? <span style={{ fontStyle: 'italic', color: '#78716c' }}> — {r.organisation}</span> : ''}</div>) : <div style={{ textAlign: 'center', fontStyle: 'italic', color: accent, fontSize: 11.5 }}>Available on request.</div>}
      </section>
    </div>
  )
}

// ─── TEMPLATE 10: NHS Bold ────────────────────────────────────────────────────
// Red NHS-brand header block, strong typographic hierarchy, high impact
// Best for: roles where standing out in a large pile matters (Band 4-6)
export function TemplateBold({ cv }: { cv: CvData }) {
  const red = '#b91c1c'
  return (
    <div style={{ fontFamily: 'Arial, sans-serif', fontSize: 11.5, color: '#111', background: '#fff', minHeight: 800 }}>
      <div style={{ background: red, padding: '28px 40px 20px', position: 'relative' as const, overflow: 'hidden' }}>
        <div style={{ position: 'absolute' as const, top: -20, right: -20, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
        <div style={{ fontSize: 26, fontWeight: 900, color: '#fff', letterSpacing: -0.5 }}>{cv.fullName || 'Your Name'}</div>
        {cv.professionalRegistration && <div style={{ fontSize: 10, color: '#fca5a5', fontWeight: 700, marginTop: 2 }}>{cv.professionalRegistration}</div>}
        <div style={{ display: 'flex', gap: 20, marginTop: 10, fontSize: 10, color: '#fecaca', flexWrap: 'wrap' as const }}>
          {cv.phone && <span>{cv.phone}</span>}
          {cv.email && <span>{cv.email}</span>}
          {cv.location && <span>{cv.location}</span>}
        </div>
      </div>
      <div style={{ height: 4, background: '#7f1d1d' }} />

      <div style={{ padding: '24px 40px' }}>
        {cv.personalStatement && (
          <section style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: red, letterSpacing: 2, textTransform: 'uppercase' as const, marginBottom: 6 }}>Profile</div>
            <p style={{ margin: 0, fontSize: 11.5, lineHeight: 1.7, color: '#374151' }}>{cv.personalStatement}</p>
          </section>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 28 }}>
          <div>
            {cv.workExperience.length > 0 && (
              <section style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: red, letterSpacing: 2, textTransform: 'uppercase' as const, borderBottom: `3px solid ${red}`, paddingBottom: 4, marginBottom: 10 }}>Experience</div>
                {cv.workExperience.map(job => (
                  <div key={job.id} style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 800, fontSize: 12.5 }}>{job.jobTitle}</span>
                      <span style={{ fontSize: 10, color: '#9ca3af' }}>{dateRange(job.startDate, job.endDate, job.current)}</span>
                    </div>
                    <div style={{ fontSize: 11, color: red, fontWeight: 700, marginBottom: 5 }}>{[job.employer, job.location].filter(Boolean).join(' · ')}</div>
                    {job.bullets.filter(Boolean).map((b, i) => <div key={i} style={{ fontSize: 11, paddingLeft: 10, position: 'relative' as const, lineHeight: 1.6 }}><span style={{ position: 'absolute' as const, left: 1, color: red }}>▸</span>{b}</div>)}
                  </div>
                ))}
              </section>
            )}
          </div>
          <div>
            {cv.skills.length > 0 && (
              <section style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: red, letterSpacing: 2, textTransform: 'uppercase' as const, borderBottom: `3px solid ${red}`, paddingBottom: 4, marginBottom: 8 }}>Skills</div>
                {cv.skills.map(s => s.items.split(',').map(i => i.trim()).filter(Boolean).map((item, idx) => (
                  <div key={idx} style={{ fontSize: 10.5, paddingLeft: 8, position: 'relative' as const, lineHeight: 1.9 }}><span style={{ position: 'absolute' as const, left: 0, color: red }}>▸</span>{item}</div>
                )))}
              </section>
            )}
            {cv.education.length > 0 && (
              <section style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: red, letterSpacing: 2, textTransform: 'uppercase' as const, borderBottom: `3px solid ${red}`, paddingBottom: 4, marginBottom: 8 }}>Education</div>
                {cv.education.map(ed => <div key={ed.id} style={{ marginBottom: 8 }}><div style={{ fontWeight: 700, fontSize: 11 }}>{ed.qualification}</div><div style={{ color: '#6b7280', fontSize: 10 }}>{ed.institution}{ed.grade ? ` · ${ed.grade}` : ''}</div></div>)}
              </section>
            )}
            {cv.certifications.length > 0 && (
              <section>
                <div style={{ fontSize: 10, fontWeight: 800, color: red, letterSpacing: 2, textTransform: 'uppercase' as const, borderBottom: `3px solid ${red}`, paddingBottom: 4, marginBottom: 8 }}>Certs</div>
                {cv.certifications.map(c => <div key={c.id} style={{ marginBottom: 5 }}><div style={{ fontWeight: 700, fontSize: 10.5 }}>{c.name}</div>{c.issuer && <div style={{ color: '#6b7280', fontSize: 10 }}>{c.issuer}</div>}</div>)}
              </section>
            )}
          </div>
        </div>

        <section style={{ marginTop: 8 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: red, letterSpacing: 2, textTransform: 'uppercase' as const, borderBottom: `3px solid ${red}`, paddingBottom: 4, marginBottom: 6 }}>References</div>
          {cv.references.length > 0 ? cv.references.map(r => <div key={r.id} style={{ fontSize: 11 }}><span style={{ fontWeight: 700 }}>{r.name}</span>{r.organisation ? ` — ${r.organisation}` : ''}</div>) : <div style={{ fontSize: 11, fontStyle: 'italic', color: '#9ca3af' }}>Available on request.</div>}
        </section>
      </div>
    </div>
  )
}

// ─── TEMPLATE 11: NHS Compact ─────────────────────────────────────────────────
// Tight leading, smaller type, fits maximum content on one page
// Best for: experienced professionals with 10+ years needing to fit everything
export function TemplateCompact({ cv }: { cv: CvData }) {
  const blue = '#1d4ed8'
  return (
    <div style={{ fontFamily: 'Arial, sans-serif', fontSize: 10.5, color: '#111', background: '#fff', padding: '24px 36px', minHeight: 800 }}>
      <div style={{ borderBottom: `2px solid ${blue}`, paddingBottom: 8, marginBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#111', letterSpacing: -0.5 }}>{cv.fullName || 'Your Name'}</div>
            {cv.professionalRegistration && <div style={{ fontSize: 9.5, color: blue, fontWeight: 700 }}>{cv.professionalRegistration}</div>}
          </div>
          <div style={{ fontSize: 9.5, color: '#6b7280', textAlign: 'right' as const, lineHeight: 1.7 }}>
            {cv.phone && <div>{cv.phone}</div>}
            {cv.email && <div>{cv.email}</div>}
            {cv.location && <div>{cv.location}</div>}
          </div>
        </div>
      </div>

      {cv.personalStatement && (
        <section style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 8.5, fontWeight: 800, color: blue, letterSpacing: 1.5, textTransform: 'uppercase' as const, marginBottom: 3 }}>Profile</div>
          <p style={{ margin: 0, lineHeight: 1.55 }}>{cv.personalStatement}</p>
        </section>
      )}

      {cv.skills.length > 0 && (
        <section style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 8.5, fontWeight: 800, color: blue, letterSpacing: 1.5, textTransform: 'uppercase' as const, marginBottom: 3 }}>Skills</div>
          <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 4 }}>
            {cv.skills.map(s => s.items.split(',').map(i => i.trim()).filter(Boolean).map((item, idx) => (
              <span key={idx} style={{ fontSize: 9.5, background: '#eff6ff', color: blue, border: `1px solid #bfdbfe`, borderRadius: 3, padding: '1px 7px' }}>{item}</span>
            )))}
          </div>
        </section>
      )}

      {cv.workExperience.length > 0 && (
        <section style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 8.5, fontWeight: 800, color: blue, letterSpacing: 1.5, textTransform: 'uppercase' as const, marginBottom: 5, borderBottom: `1px solid #bfdbfe`, paddingBottom: 2 }}>Experience</div>
          {cv.workExperience.map(job => (
            <div key={job.id} style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 700, fontSize: 11 }}>{job.jobTitle} · <span style={{ color: blue }}>{job.employer}</span></span>
                <span style={{ fontSize: 9.5, color: '#9ca3af' }}>{dateRange(job.startDate, job.endDate, job.current)}</span>
              </div>
              {job.location && <div style={{ fontSize: 9.5, color: '#9ca3af' }}>{job.location}</div>}
              {job.bullets.filter(Boolean).map((b, i) => <div key={i} style={{ fontSize: 10, paddingLeft: 8, position: 'relative' as const, lineHeight: 1.5 }}><span style={{ position: 'absolute' as const, left: 1 }}>•</span>{b}</div>)}
            </div>
          ))}
        </section>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 10 }}>
        {cv.education.length > 0 && (
          <section>
            <div style={{ fontSize: 8.5, fontWeight: 800, color: blue, letterSpacing: 1.5, textTransform: 'uppercase' as const, marginBottom: 4, borderBottom: `1px solid #bfdbfe`, paddingBottom: 2 }}>Education</div>
            {cv.education.map(ed => <div key={ed.id} style={{ marginBottom: 5 }}><div style={{ fontWeight: 700, fontSize: 10 }}>{ed.qualification}</div><div style={{ fontSize: 9.5, color: '#6b7280' }}>{ed.institution}{ed.grade ? ` · ${ed.grade}` : ''}</div></div>)}
          </section>
        )}
        {cv.certifications.length > 0 && (
          <section>
            <div style={{ fontSize: 8.5, fontWeight: 800, color: blue, letterSpacing: 1.5, textTransform: 'uppercase' as const, marginBottom: 4, borderBottom: `1px solid #bfdbfe`, paddingBottom: 2 }}>Certs</div>
            {cv.certifications.map(c => <div key={c.id} style={{ fontSize: 10, marginBottom: 3 }}><div style={{ fontWeight: 700 }}>{c.name}</div>{c.issuer && <div style={{ fontSize: 9.5, color: '#6b7280' }}>{c.issuer}</div>}</div>)}
          </section>
        )}
        <section>
          <div style={{ fontSize: 8.5, fontWeight: 800, color: blue, letterSpacing: 1.5, textTransform: 'uppercase' as const, marginBottom: 4, borderBottom: `1px solid #bfdbfe`, paddingBottom: 2 }}>References</div>
          {cv.references.length > 0 ? cv.references.map(r => <div key={r.id} style={{ fontSize: 10, marginBottom: 3 }}><span style={{ fontWeight: 700 }}>{r.name}</span></div>) : <div style={{ fontSize: 10, fontStyle: 'italic', color: '#9ca3af' }}>On request.</div>}
        </section>
      </div>
    </div>
  )
}

// ─── TEMPLATE 12: NHS Minimal ─────────────────────────────────────────────────
// Ultra-whitespace, hairline rules only, name as centrepiece, typography-led
// Best for: roles valuing clarity and restraint (clinical governance, QI)
export function TemplateMinimal({ cv }: { cv: CvData }) {
  return (
    <div style={{ fontFamily: '"Helvetica Neue", Arial, sans-serif', fontSize: 11.5, color: '#18181b', background: '#fff', padding: '48px 56px', minHeight: 800 }}>
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 32, fontWeight: 900, letterSpacing: -1.5, color: '#09090b', lineHeight: 1 }}>{cv.fullName || 'Your Name'}</div>
        {cv.professionalRegistration && <div style={{ fontSize: 10.5, color: '#71717a', marginTop: 4, fontWeight: 500 }}>{cv.professionalRegistration}</div>}
        <div style={{ marginTop: 8, fontSize: 10, color: '#a1a1aa', letterSpacing: 0.5 }}>
          {[cv.phone, cv.email, cv.location].filter(Boolean).join('   /   ')}
        </div>
      </div>

      {cv.personalStatement && (
        <section style={{ marginBottom: 28 }}>
          <div style={{ height: 1, background: '#e4e4e7', marginBottom: 12 }} />
          <p style={{ margin: 0, fontSize: 12, lineHeight: 1.85, color: '#3f3f46', maxWidth: '92%' }}>{cv.personalStatement}</p>
        </section>
      )}

      {cv.skills.length > 0 && (
        <section style={{ marginBottom: 28 }}>
          <div style={{ height: 1, background: '#e4e4e7', marginBottom: 12 }} />
          <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' as const }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: '#a1a1aa', letterSpacing: 3, textTransform: 'uppercase' as const, width: 90, paddingTop: 2, flexShrink: 0 }}>Skills</div>
            <div style={{ flex: 1, fontSize: 11.5, color: '#3f3f46', lineHeight: 1.9 }}>
              {cv.skills.map(s => s.items).join('  ·  ')}
            </div>
          </div>
        </section>
      )}

      {cv.workExperience.length > 0 && (
        <section style={{ marginBottom: 28 }}>
          <div style={{ height: 1, background: '#e4e4e7', marginBottom: 12 }} />
          <div style={{ display: 'flex', gap: 32 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: '#a1a1aa', letterSpacing: 3, textTransform: 'uppercase' as const, width: 90, paddingTop: 2, flexShrink: 0 }}>Experience</div>
            <div style={{ flex: 1 }}>
              {cv.workExperience.map(job => (
                <div key={job.id} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontWeight: 800, fontSize: 12 }}>{job.jobTitle}</span>
                    <span style={{ fontSize: 10, color: '#a1a1aa' }}>{dateRange(job.startDate, job.endDate, job.current)}</span>
                  </div>
                  <div style={{ fontSize: 10.5, color: '#71717a', marginBottom: 5 }}>{[job.employer, job.location].filter(Boolean).join(', ')}</div>
                  {job.bullets.filter(Boolean).map((b, i) => <div key={i} style={{ fontSize: 11, paddingLeft: 12, position: 'relative' as const, lineHeight: 1.65, color: '#52525b' }}><span style={{ position: 'absolute' as const, left: 2, color: '#d4d4d8' }}>—</span>{b}</div>)}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {cv.education.length > 0 && (
        <section style={{ marginBottom: 28 }}>
          <div style={{ height: 1, background: '#e4e4e7', marginBottom: 12 }} />
          <div style={{ display: 'flex', gap: 32 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: '#a1a1aa', letterSpacing: 3, textTransform: 'uppercase' as const, width: 90, paddingTop: 2, flexShrink: 0 }}>Education</div>
            <div style={{ flex: 1 }}>
              {cv.education.map(ed => <div key={ed.id} style={{ marginBottom: 8 }}><div style={{ fontWeight: 700, fontSize: 11.5 }}>{ed.qualification}</div><div style={{ fontSize: 10.5, color: '#71717a' }}>{[ed.institution, ed.endDate, ed.grade].filter(Boolean).join('  ·  ')}</div></div>)}
            </div>
          </div>
        </section>
      )}

      <section>
        <div style={{ height: 1, background: '#e4e4e7', marginBottom: 12 }} />
        <div style={{ display: 'flex', gap: 32 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: '#a1a1aa', letterSpacing: 3, textTransform: 'uppercase' as const, width: 90, paddingTop: 2, flexShrink: 0 }}>References</div>
          <div style={{ flex: 1, fontSize: 11.5, color: cv.references.length > 0 ? '#3f3f46' : '#a1a1aa', fontStyle: cv.references.length > 0 ? 'normal' : 'italic' }}>
            {cv.references.length > 0 ? cv.references.map(r => <div key={r.id} style={{ marginBottom: 4 }}><span style={{ fontWeight: 700 }}>{r.name}</span>{r.organisation ? <span style={{ color: '#71717a' }}> — {r.organisation}</span> : ''}</div>) : 'Available on request.'}
          </div>
        </div>
      </section>
    </div>
  )
}