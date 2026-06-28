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
  profilePhoto?: string
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
    <div style={{ fontFamily: 'Georgia, serif', fontSize: 12, color: '#1a1a1a', background: '#fff', margin: 0, padding: 0 }}>
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
    <div style={{ fontFamily: 'Arial, sans-serif', fontSize: 11.5, color: '#1a1a1a', background: '#fff', display: 'flex', minHeight: '297mm', margin: 0, padding: 0 }}>
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
    <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 11.5, color: '#111827', background: '#fff', margin: 0, padding: 0 }}>
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
    <div style={{ fontFamily: 'Arial, sans-serif', fontSize: 11.5, color: '#1f2937', background: '#fff', margin: 0, padding: 0 }}>
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
    <div style={{ fontFamily: 'Arial, sans-serif', fontSize: 11.5, color: '#1a1a1a', background: '#fff', margin: 0, padding: 0 }}>
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
    <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 11.5, color: '#111827', background: '#fff', margin: 0, padding: 0 }}>
      {/* Header band */}
      <div style={{ background: lgreen, borderBottom: `3px solid ${green}`, padding: '28px 40px 18px' }}>
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

      <div style={{ padding: '32px 40px' }}>
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


// ─── T7: NHS ATS Pure ────────────────────────────────────────────────────────
export function TemplateATSPure({ cv }: { cv: CvData }) {
  return (
    <div style={{ fontFamily:'Arial,sans-serif',fontSize:11,color:'#000',background:'#fff',padding:'36px 48px',minHeight:800 }}>
      <div style={{ textAlign:'center',marginBottom:16 }}>
        <div style={{ fontSize:20,fontWeight:700 }}>{cv.fullName||'Your Name'}</div>
        <div style={{ fontSize:10.5,marginTop:4 }}>{[cv.phone,cv.email,cv.location,cv.professionalRegistration].filter(Boolean).join(' | ')}</div>
      </div>
      <hr style={{ border:'none',borderTop:'1px solid #000',marginBottom:12 }} />
      {cv.personalStatement&&<section style={{ marginBottom:14 }}><div style={{ fontWeight:700,textTransform:'uppercase' as const,marginBottom:4 }}>PROFESSIONAL SUMMARY</div><hr style={{ border:'none',borderTop:'1px solid #000',marginBottom:6 }} /><p style={{ margin:0,lineHeight:1.65 }}>{cv.personalStatement}</p></section>}
      {cv.skills.length>0&&<section style={{ marginBottom:14 }}><div style={{ fontWeight:700,textTransform:'uppercase' as const,marginBottom:4 }}>CORE SKILLS</div><hr style={{ border:'none',borderTop:'1px solid #000',marginBottom:6 }} /><div>{cv.skills.map(s=>s.items).join(' | ')}</div></section>}
      {cv.workExperience.length>0&&<section style={{ marginBottom:14 }}><div style={{ fontWeight:700,textTransform:'uppercase' as const,marginBottom:4 }}>WORK EXPERIENCE</div><hr style={{ border:'none',borderTop:'1px solid #000',marginBottom:6 }} />{cv.workExperience.map(job=>(<div key={job.id} style={{ marginBottom:12 }}><div style={{ display:'flex',justifyContent:'space-between' }}><span style={{ fontWeight:700 }}>{job.jobTitle} — {job.employer}</span><span>{dateRange(job.startDate,job.endDate,job.current)}</span></div>{job.bullets.filter(Boolean).map((b,i)=><div key={i} style={{ paddingLeft:12 }}>• {b}</div>)}</div>))}</section>}
      {cv.education.length>0&&<section style={{ marginBottom:14 }}><div style={{ fontWeight:700,textTransform:'uppercase' as const,marginBottom:4 }}>EDUCATION</div><hr style={{ border:'none',borderTop:'1px solid #000',marginBottom:6 }} />{cv.education.map(ed=>(<div key={ed.id} style={{ marginBottom:6 }}><div style={{ display:'flex',justifyContent:'space-between' }}><span style={{ fontWeight:700 }}>{ed.qualification} — {ed.institution}</span><span>{ed.endDate}</span></div>{ed.grade&&<div>Grade: {ed.grade}</div>}</div>))}</section>}
      {cv.certifications.length>0&&<section style={{ marginBottom:14 }}><div style={{ fontWeight:700,textTransform:'uppercase' as const,marginBottom:4 }}>CERTIFICATIONS</div><hr style={{ border:'none',borderTop:'1px solid #000',marginBottom:6 }} />{cv.certifications.map(c=><div key={c.id}>{c.name}{c.issuer?` — ${c.issuer}`:''}{c.date?` (${c.date})`:''}</div>)}</section>}
      <section><div style={{ fontWeight:700,textTransform:'uppercase' as const,marginBottom:4 }}>REFERENCES</div><hr style={{ border:'none',borderTop:'1px solid #000',marginBottom:6 }} />{cv.references.length>0?cv.references.map(r=><div key={r.id}>{r.name}{r.organisation?` — ${r.organisation}`:''}</div>):<div>Available on request.</div>}</section>
    </div>
  )
}

// ─── T8: NHS Lateral ─────────────────────────────────────────────────────────
export function TemplateLateral({ cv }: { cv: CvData }) {
  const ink='#1e1b4b'
  return (
    <div style={{ fontFamily:'Arial,sans-serif',fontSize:11,color:'#1f2937',background:'#fff',display:'flex',minHeight:800 }}>
      <div style={{ width:160,minWidth:160,background:ink,color:'#fff',padding:'32px 14px',flexShrink:0,display:'flex',flexDirection:'column' as const,gap:16 }}>
        <div><div style={{ fontSize:18,fontWeight:900,lineHeight:1.1,wordBreak:'break-word' as const }}>{cv.fullName||'Your Name'}</div>{cv.professionalRegistration&&<div style={{ fontSize:8.5,color:'#a5b4fc',marginTop:6,fontWeight:600 }}>{cv.professionalRegistration}</div>}</div>
        <div style={{ fontSize:9.5,color:'#c7d2fe',lineHeight:2 }}>{cv.phone&&<div>{cv.phone}</div>}{cv.email&&<div style={{ wordBreak:'break-all' as const }}>{cv.email}</div>}{cv.location&&<div>{cv.location}</div>}</div>
        {cv.skills.length>0&&<div><div style={{ fontSize:8,fontWeight:800,letterSpacing:2,textTransform:'uppercase' as const,color:'#a5b4fc',marginBottom:6 }}>Skills</div>{cv.skills.map(s=>s.items.split(',').map(i=>i.trim()).filter(Boolean).map((item,idx)=>(<div key={idx} style={{ fontSize:9.5,color:'#e0e7ff',marginBottom:3 }}>· {item}</div>)))}</div>}
        {cv.education.length>0&&<div><div style={{ fontSize:8,fontWeight:800,letterSpacing:2,textTransform:'uppercase' as const,color:'#a5b4fc',marginBottom:6 }}>Education</div>{cv.education.map(ed=>(<div key={ed.id} style={{ marginBottom:6 }}><div style={{ fontSize:9.5,fontWeight:700 }}>{ed.qualification}</div><div style={{ fontSize:8.5,color:'#a5b4fc' }}>{ed.institution}</div></div>))}</div>}
      </div>
      <div style={{ flex:1,padding:'32px 24px' }}>
        {cv.personalStatement&&<section style={{ marginBottom:18,paddingBottom:14,borderBottom:'2px solid #e0e7ff' }}><div style={{ fontSize:9,fontWeight:800,color:ink,letterSpacing:2,textTransform:'uppercase' as const,marginBottom:6 }}>Profile</div><p style={{ margin:0,fontSize:11,lineHeight:1.75,color:'#374151' }}>{cv.personalStatement}</p></section>}
        {cv.workExperience.length>0&&<section style={{ marginBottom:18 }}><div style={{ fontSize:9,fontWeight:800,color:ink,letterSpacing:2,textTransform:'uppercase' as const,marginBottom:10,paddingBottom:4,borderBottom:'2px solid #e0e7ff' }}>Experience</div>{cv.workExperience.map(job=>(<div key={job.id} style={{ marginBottom:12 }}><div style={{ display:'flex',justifyContent:'space-between' }}><span style={{ fontWeight:800,fontSize:12 }}>{job.jobTitle}</span><span style={{ fontSize:9.5,color:'#9ca3af' }}>{dateRange(job.startDate,job.endDate,job.current)}</span></div><div style={{ fontSize:10.5,color:ink,fontWeight:600,marginBottom:4 }}>{[job.employer,job.location].filter(Boolean).join(' · ')}</div>{job.bullets.filter(Boolean).map((b,i)=><div key={i} style={{ fontSize:10.5,paddingLeft:10,position:'relative' as const,lineHeight:1.6 }}><span style={{ position:'absolute' as const,left:1 }}>•</span>{b}</div>)}</div>))}</section>}
        <section><div style={{ fontSize:9,fontWeight:800,color:ink,letterSpacing:2,textTransform:'uppercase' as const,marginBottom:6,paddingBottom:4,borderBottom:'2px solid #e0e7ff' }}>References</div>{cv.references.length>0?cv.references.map(r=>(<div key={r.id} style={{ fontSize:10.5,marginBottom:4 }}><span style={{ fontWeight:700 }}>{r.name}</span>{r.organisation?` — ${r.organisation}`:''}</div>)):<div style={{ fontSize:10.5,fontStyle:'italic',color:'#9ca3af' }}>Available on request.</div>}</section>
      </div>
    </div>
  )
}

// ─── T9: NHS Timeless ────────────────────────────────────────────────────────
export function TemplateTimeless({ cv }: { cv: CvData }) {
  const bg='#faf9f7',ink='#1c1917',accent='#78716c',rule='#d6d3d1'
  return (
    <div style={{ fontFamily:'Georgia,serif',fontSize:12,color:ink,background:bg,padding:'40px 52px',minHeight:800 }}>
      <div style={{ textAlign:'center',marginBottom:22 }}>
        <div style={{ fontSize:24,fontWeight:700,letterSpacing:2 }}>{(cv.fullName||'Your Name').toUpperCase()}</div>
        {cv.professionalRegistration&&<div style={{ fontSize:10,letterSpacing:3,color:accent,marginTop:3,textTransform:'uppercase' as const }}>{cv.professionalRegistration}</div>}
        <div style={{ height:1,background:ink,margin:'10px auto',width:80 }} />
        <div style={{ fontSize:10,color:accent,letterSpacing:1 }}>{[cv.phone,cv.email,cv.location].filter(Boolean).join('   ·   ')}</div>
      </div>
      {cv.personalStatement&&<section style={{ marginBottom:18,textAlign:'center',borderTop:`1px solid ${rule}`,borderBottom:`1px solid ${rule}`,padding:'12px 0' }}><p style={{ margin:0,fontSize:11.5,lineHeight:1.8,fontStyle:'italic',color:'#44403c' }}>{cv.personalStatement}</p></section>}
      {cv.skills.length>0&&<section style={{ marginBottom:18,textAlign:'center' }}><div style={{ fontSize:9,letterSpacing:3,color:accent,textTransform:'uppercase' as const,marginBottom:8 }}>Core Skills</div><div style={{ fontSize:11,color:'#57534e' }}>{cv.skills.map(s=>s.items).join(' · ')}</div></section>}
      {cv.workExperience.length>0&&<section style={{ marginBottom:18 }}><div style={{ fontSize:9,letterSpacing:3,color:accent,textTransform:'uppercase' as const,marginBottom:8,textAlign:'center' }}>Career History</div><div style={{ height:1,background:rule,marginBottom:12 }} />{cv.workExperience.map(job=>(<div key={job.id} style={{ marginBottom:14 }}><div style={{ display:'flex',justifyContent:'space-between',alignItems:'baseline' }}><span style={{ fontWeight:700,fontSize:12.5 }}>{job.jobTitle}</span><span style={{ fontSize:10,color:accent,fontStyle:'italic' }}>{dateRange(job.startDate,job.endDate,job.current)}</span></div><div style={{ fontSize:11,fontStyle:'italic',color:'#78716c',marginBottom:5 }}>{[job.employer,job.location].filter(Boolean).join(', ')}</div>{job.bullets.filter(Boolean).map((b,i)=><div key={i} style={{ fontSize:11.5,paddingLeft:14,position:'relative' as const,lineHeight:1.65 }}><span style={{ position:'absolute' as const,left:4 }}>—</span>{b}</div>)}</div>))}</section>}
      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:28,marginBottom:18 }}>
        {cv.education.length>0&&<section><div style={{ fontSize:9,letterSpacing:3,color:accent,textTransform:'uppercase' as const,marginBottom:6 }}>Education</div><div style={{ height:1,background:rule,marginBottom:8 }} />{cv.education.map(ed=>(<div key={ed.id} style={{ marginBottom:8 }}><div style={{ fontWeight:700,fontSize:11.5 }}>{ed.qualification}</div><div style={{ fontStyle:'italic',fontSize:11,color:'#78716c' }}>{ed.institution}{ed.grade?` · ${ed.grade}`:''}</div></div>))}</section>}
        {cv.certifications.length>0&&<section><div style={{ fontSize:9,letterSpacing:3,color:accent,textTransform:'uppercase' as const,marginBottom:6 }}>Certifications</div><div style={{ height:1,background:rule,marginBottom:8 }} />{cv.certifications.map(c=><div key={c.id} style={{ marginBottom:6 }}><div style={{ fontWeight:700,fontSize:11.5 }}>{c.name}</div>{c.issuer&&<div style={{ fontStyle:'italic',fontSize:11,color:'#78716c' }}>{c.issuer}</div>}</div>)}</section>}
      </div>
      <section><div style={{ fontSize:9,letterSpacing:3,color:accent,textTransform:'uppercase' as const,marginBottom:6,textAlign:'center' }}>References</div><div style={{ height:1,background:rule,marginBottom:8 }} />{cv.references.length>0?cv.references.map(r=><div key={r.id} style={{ fontSize:11.5,marginBottom:4 }}><span style={{ fontWeight:700 }}>{r.name}</span>{r.organisation?<span style={{ fontStyle:'italic',color:'#78716c' }}> — {r.organisation}</span>:''}</div>):<div style={{ textAlign:'center',fontStyle:'italic',color:accent,fontSize:11.5 }}>Available on request.</div>}</section>
    </div>
  )
}

// ─── T10: NHS Bold ───────────────────────────────────────────────────────────
export function TemplateBold({ cv }: { cv: CvData }) {
  const red='#b91c1c'
  return (
    <div style={{ fontFamily:'Arial,sans-serif',fontSize:11.5,color:'#111',background:'#fff',minHeight:800 }}>
      <div style={{ background:red,padding:'28px 40px 20px',overflow:'hidden',position:'relative' as const }}>
        <div style={{ position:'absolute' as const,top:-20,right:-20,width:140,height:140,borderRadius:'50%',background:'rgba(255,255,255,0.06)' }} />
        <div style={{ fontSize:26,fontWeight:900,color:'#fff',letterSpacing:-0.5 }}>{cv.fullName||'Your Name'}</div>
        {cv.professionalRegistration&&<div style={{ fontSize:10,color:'#fca5a5',fontWeight:700,marginTop:2 }}>{cv.professionalRegistration}</div>}
        <div style={{ display:'flex',gap:20,marginTop:10,fontSize:10,color:'#fecaca',flexWrap:'wrap' as const }}>{cv.phone&&<span>{cv.phone}</span>}{cv.email&&<span>{cv.email}</span>}{cv.location&&<span>{cv.location}</span>}</div>
      </div>
      <div style={{ height:4,background:'#7f1d1d' }} />
      <div style={{ padding:'24px 40px' }}>
        {cv.personalStatement&&<section style={{ marginBottom:18 }}><div style={{ fontSize:10,fontWeight:800,color:red,letterSpacing:2,textTransform:'uppercase' as const,marginBottom:6 }}>Profile</div><p style={{ margin:0,fontSize:11.5,lineHeight:1.7,color:'#374151' }}>{cv.personalStatement}</p></section>}
        <div style={{ display:'grid',gridTemplateColumns:'3fr 2fr',gap:28 }}>
          <div>
            {cv.workExperience.length>0&&<section style={{ marginBottom:18 }}><div style={{ fontSize:10,fontWeight:800,color:red,letterSpacing:2,textTransform:'uppercase' as const,borderBottom:`3px solid ${red}`,paddingBottom:4,marginBottom:10 }}>Experience</div>{cv.workExperience.map(job=>(<div key={job.id} style={{ marginBottom:14 }}><div style={{ display:'flex',justifyContent:'space-between' }}><span style={{ fontWeight:800,fontSize:12.5 }}>{job.jobTitle}</span><span style={{ fontSize:10,color:'#9ca3af' }}>{dateRange(job.startDate,job.endDate,job.current)}</span></div><div style={{ fontSize:11,color:red,fontWeight:700,marginBottom:5 }}>{[job.employer,job.location].filter(Boolean).join(' · ')}</div>{job.bullets.filter(Boolean).map((b,i)=><div key={i} style={{ fontSize:11,paddingLeft:10,position:'relative' as const,lineHeight:1.6 }}><span style={{ position:'absolute' as const,left:1,color:red }}>▸</span>{b}</div>)}</div>))}</section>}
          </div>
          <div>
            {cv.skills.length>0&&<section style={{ marginBottom:16 }}><div style={{ fontSize:10,fontWeight:800,color:red,letterSpacing:2,textTransform:'uppercase' as const,borderBottom:`3px solid ${red}`,paddingBottom:4,marginBottom:8 }}>Skills</div>{cv.skills.map(s=>s.items.split(',').map(i=>i.trim()).filter(Boolean).map((item,idx)=>(<div key={idx} style={{ fontSize:10.5,paddingLeft:8,position:'relative' as const,lineHeight:1.9 }}><span style={{ position:'absolute' as const,left:0,color:red }}>▸</span>{item}</div>)))}</section>}
            {cv.education.length>0&&<section style={{ marginBottom:16 }}><div style={{ fontSize:10,fontWeight:800,color:red,letterSpacing:2,textTransform:'uppercase' as const,borderBottom:`3px solid ${red}`,paddingBottom:4,marginBottom:8 }}>Education</div>{cv.education.map(ed=><div key={ed.id} style={{ marginBottom:8 }}><div style={{ fontWeight:700,fontSize:11 }}>{ed.qualification}</div><div style={{ color:'#6b7280',fontSize:10 }}>{ed.institution}{ed.grade?` · ${ed.grade}`:''}</div></div>)}</section>}
          </div>
        </div>
        <section style={{ marginTop:8 }}><div style={{ fontSize:10,fontWeight:800,color:red,letterSpacing:2,textTransform:'uppercase' as const,borderBottom:`3px solid ${red}`,paddingBottom:4,marginBottom:6 }}>References</div>{cv.references.length>0?cv.references.map(r=><div key={r.id} style={{ fontSize:11 }}><span style={{ fontWeight:700 }}>{r.name}</span>{r.organisation?` — ${r.organisation}`:''}</div>):<div style={{ fontSize:11,fontStyle:'italic',color:'#9ca3af' }}>Available on request.</div>}</section>
      </div>
    </div>
  )
}

// ─── T11: NHS Compact ────────────────────────────────────────────────────────
export function TemplateCompact({ cv }: { cv: CvData }) {
  const blue='#1d4ed8'
  return (
    <div style={{ fontFamily:'Arial,sans-serif',fontSize:10.5,color:'#111',background:'#fff',padding:'24px 36px',minHeight:800 }}>
      <div style={{ borderBottom:`2px solid ${blue}`,paddingBottom:8,marginBottom:10 }}>
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start' }}>
          <div><div style={{ fontSize:20,fontWeight:900,color:'#111',letterSpacing:-0.5 }}>{cv.fullName||'Your Name'}</div>{cv.professionalRegistration&&<div style={{ fontSize:9.5,color:blue,fontWeight:700 }}>{cv.professionalRegistration}</div>}</div>
          <div style={{ fontSize:9.5,color:'#6b7280',textAlign:'right' as const,lineHeight:1.7 }}>{cv.phone&&<div>{cv.phone}</div>}{cv.email&&<div>{cv.email}</div>}{cv.location&&<div>{cv.location}</div>}</div>
        </div>
      </div>
      {cv.personalStatement&&<section style={{ marginBottom:10 }}><div style={{ fontSize:8.5,fontWeight:800,color:blue,letterSpacing:1.5,textTransform:'uppercase' as const,marginBottom:3 }}>Profile</div><p style={{ margin:0,lineHeight:1.55 }}>{cv.personalStatement}</p></section>}
      {cv.skills.length>0&&<section style={{ marginBottom:10 }}><div style={{ fontSize:8.5,fontWeight:800,color:blue,letterSpacing:1.5,textTransform:'uppercase' as const,marginBottom:3 }}>Skills</div><div style={{ display:'flex',flexWrap:'wrap' as const,gap:4 }}>{cv.skills.map(s=>s.items.split(',').map(i=>i.trim()).filter(Boolean).map((item,idx)=>(<span key={idx} style={{ fontSize:9.5,background:'#eff6ff',color:blue,border:'1px solid #bfdbfe',borderRadius:3,padding:'1px 7px' }}>{item}</span>)))}</div></section>}
      {cv.workExperience.length>0&&<section style={{ marginBottom:10 }}><div style={{ fontSize:8.5,fontWeight:800,color:blue,letterSpacing:1.5,textTransform:'uppercase' as const,marginBottom:5,borderBottom:'1px solid #bfdbfe',paddingBottom:2 }}>Experience</div>{cv.workExperience.map(job=>(<div key={job.id} style={{ marginBottom:8 }}><div style={{ display:'flex',justifyContent:'space-between' }}><span style={{ fontWeight:700,fontSize:11 }}>{job.jobTitle} · <span style={{ color:blue }}>{job.employer}</span></span><span style={{ fontSize:9.5,color:'#9ca3af' }}>{dateRange(job.startDate,job.endDate,job.current)}</span></div>{job.bullets.filter(Boolean).map((b,i)=><div key={i} style={{ fontSize:10,paddingLeft:8,position:'relative' as const,lineHeight:1.5 }}><span style={{ position:'absolute' as const,left:1 }}>•</span>{b}</div>)}</div>))}</section>}
      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:16,marginBottom:10 }}>
        {cv.education.length>0&&<section><div style={{ fontSize:8.5,fontWeight:800,color:blue,letterSpacing:1.5,textTransform:'uppercase' as const,marginBottom:4,borderBottom:'1px solid #bfdbfe',paddingBottom:2 }}>Education</div>{cv.education.map(ed=><div key={ed.id} style={{ marginBottom:5 }}><div style={{ fontWeight:700,fontSize:10 }}>{ed.qualification}</div><div style={{ fontSize:9.5,color:'#6b7280' }}>{ed.institution}{ed.grade?` · ${ed.grade}`:''}</div></div>)}</section>}
        {cv.certifications.length>0&&<section><div style={{ fontSize:8.5,fontWeight:800,color:blue,letterSpacing:1.5,textTransform:'uppercase' as const,marginBottom:4,borderBottom:'1px solid #bfdbfe',paddingBottom:2 }}>Certs</div>{cv.certifications.map(c=><div key={c.id} style={{ fontSize:10,marginBottom:3 }}><div style={{ fontWeight:700 }}>{c.name}</div></div>)}</section>}
        <section><div style={{ fontSize:8.5,fontWeight:800,color:blue,letterSpacing:1.5,textTransform:'uppercase' as const,marginBottom:4,borderBottom:'1px solid #bfdbfe',paddingBottom:2 }}>References</div>{cv.references.length>0?cv.references.map(r=><div key={r.id} style={{ fontSize:10,marginBottom:3 }}><span style={{ fontWeight:700 }}>{r.name}</span></div>):<div style={{ fontSize:10,fontStyle:'italic',color:'#9ca3af' }}>On request.</div>}</section>
      </div>
    </div>
  )
}

// ─── T12: NHS Minimal ────────────────────────────────────────────────────────
export function TemplateMinimal({ cv }: { cv: CvData }) {
  return (
    <div style={{ fontFamily:'"Helvetica Neue",Arial,sans-serif',fontSize:11.5,color:'#18181b',background:'#fff',padding:'48px 56px',minHeight:800 }}>
      <div style={{ marginBottom:32 }}>
        <div style={{ fontSize:32,fontWeight:900,letterSpacing:-1.5,color:'#09090b',lineHeight:1 }}>{cv.fullName||'Your Name'}</div>
        {cv.professionalRegistration&&<div style={{ fontSize:10.5,color:'#71717a',marginTop:4,fontWeight:500 }}>{cv.professionalRegistration}</div>}
        <div style={{ marginTop:8,fontSize:10,color:'#a1a1aa',letterSpacing:0.5 }}>{[cv.phone,cv.email,cv.location].filter(Boolean).join('   /   ')}</div>
      </div>
      {cv.personalStatement&&<section style={{ marginBottom:28 }}><div style={{ height:1,background:'#e4e4e7',marginBottom:12 }} /><p style={{ margin:0,fontSize:12,lineHeight:1.85,color:'#3f3f46',maxWidth:'92%' }}>{cv.personalStatement}</p></section>}
      {cv.skills.length>0&&<section style={{ marginBottom:28 }}><div style={{ height:1,background:'#e4e4e7',marginBottom:12 }} /><div style={{ display:'flex',gap:32,flexWrap:'wrap' as const }}><div style={{ fontSize:9,fontWeight:700,color:'#a1a1aa',letterSpacing:3,textTransform:'uppercase' as const,width:90,paddingTop:2,flexShrink:0 }}>Skills</div><div style={{ flex:1,fontSize:11.5,color:'#3f3f46',lineHeight:1.9 }}>{cv.skills.map(s=>s.items).join('  ·  ')}</div></div></section>}
      {cv.workExperience.length>0&&<section style={{ marginBottom:28 }}><div style={{ height:1,background:'#e4e4e7',marginBottom:12 }} /><div style={{ display:'flex',gap:32 }}><div style={{ fontSize:9,fontWeight:700,color:'#a1a1aa',letterSpacing:3,textTransform:'uppercase' as const,width:90,paddingTop:2,flexShrink:0 }}>Experience</div><div style={{ flex:1 }}>{cv.workExperience.map(job=>(<div key={job.id} style={{ marginBottom:14 }}><div style={{ display:'flex',justifyContent:'space-between',alignItems:'baseline' }}><span style={{ fontWeight:800,fontSize:12 }}>{job.jobTitle}</span><span style={{ fontSize:10,color:'#a1a1aa' }}>{dateRange(job.startDate,job.endDate,job.current)}</span></div><div style={{ fontSize:10.5,color:'#71717a',marginBottom:5 }}>{[job.employer,job.location].filter(Boolean).join(', ')}</div>{job.bullets.filter(Boolean).map((b,i)=><div key={i} style={{ fontSize:11,paddingLeft:12,position:'relative' as const,lineHeight:1.65,color:'#52525b' }}><span style={{ position:'absolute' as const,left:2,color:'#d4d4d8' }}>—</span>{b}</div>)}</div>))}</div></div></section>}
      {cv.education.length>0&&<section style={{ marginBottom:28 }}><div style={{ height:1,background:'#e4e4e7',marginBottom:12 }} /><div style={{ display:'flex',gap:32 }}><div style={{ fontSize:9,fontWeight:700,color:'#a1a1aa',letterSpacing:3,textTransform:'uppercase' as const,width:90,paddingTop:2,flexShrink:0 }}>Education</div><div style={{ flex:1 }}>{cv.education.map(ed=><div key={ed.id} style={{ marginBottom:8 }}><div style={{ fontWeight:700,fontSize:11.5 }}>{ed.qualification}</div><div style={{ fontSize:10.5,color:'#71717a' }}>{[ed.institution,ed.endDate,ed.grade].filter(Boolean).join('  ·  ')}</div></div>)}</div></div></section>}
      <section><div style={{ height:1,background:'#e4e4e7',marginBottom:12 }} /><div style={{ display:'flex',gap:32 }}><div style={{ fontSize:9,fontWeight:700,color:'#a1a1aa',letterSpacing:3,textTransform:'uppercase' as const,width:90,paddingTop:2,flexShrink:0 }}>References</div><div style={{ flex:1,fontSize:11.5,color:cv.references.length>0?'#3f3f46':'#a1a1aa',fontStyle:cv.references.length>0?'normal':'italic' }}>{cv.references.length>0?cv.references.map(r=><div key={r.id} style={{ marginBottom:4 }}><span style={{ fontWeight:700 }}>{r.name}</span>{r.organisation?<span style={{ color:'#71717a' }}> — {r.organisation}</span>:''}</div>):'Available on request.'}</div></div></section>
    </div>
  )
}

// ─── T13: Adobe Coral ────────────────────────────────────────────────────────
export function TemplateAdobeCoral({ cv }: { cv: CvData }) {
  const coral='#e8522a',light='#fff5f2'
  return (
    <div style={{ fontFamily:'Arial,sans-serif',fontSize:11.5,color:'#1f2937',background:'#fff',minHeight:800 }}>
      <div style={{ background:coral,padding:'32px 44px 24px',position:'relative' as const,overflow:'hidden' }}>
        <div style={{ position:'absolute' as const,bottom:-30,right:-30,width:160,height:160,borderRadius:'50%',background:'rgba(255,255,255,0.08)' }} />
        <div style={{ fontSize:30,fontWeight:900,color:'#fff',letterSpacing:-1,lineHeight:1 }}>{cv.fullName||'Your Name'}</div>
        {cv.professionalRegistration&&<div style={{ fontSize:11,color:'rgba(255,255,255,0.8)',marginTop:5,fontWeight:600 }}>{cv.professionalRegistration}</div>}
        <div style={{ display:'flex',gap:20,marginTop:12,fontSize:10,color:'rgba(255,255,255,0.85)',flexWrap:'wrap' as const }}>{cv.phone&&<span>📞 {cv.phone}</span>}{cv.email&&<span>✉ {cv.email}</span>}{cv.location&&<span>📍 {cv.location}</span>}</div>
      </div>
      <div style={{ padding:'28px 44px' }}>
        {cv.personalStatement&&<section style={{ marginBottom:20,paddingBottom:16,borderBottom:`2px solid ${light}` }}><div style={{ fontSize:9,fontWeight:800,color:coral,letterSpacing:3,textTransform:'uppercase' as const,marginBottom:6 }}>Profile</div><p style={{ margin:0,fontSize:11.5,lineHeight:1.75,color:'#374151' }}>{cv.personalStatement}</p></section>}
        {cv.skills.length>0&&<section style={{ marginBottom:20 }}><div style={{ fontSize:9,fontWeight:800,color:coral,letterSpacing:3,textTransform:'uppercase' as const,marginBottom:8 }}>Skills</div><div style={{ display:'flex',flexWrap:'wrap' as const,gap:6 }}>{cv.skills.map(s=>s.items.split(',').map(i=>i.trim()).filter(Boolean).map((item,idx)=>(<span key={idx} style={{ fontSize:10,background:light,color:coral,border:`1px solid ${coral}`,borderRadius:20,padding:'3px 12px',fontWeight:600 }}>{item}</span>)))}</div></section>}
        {cv.workExperience.length>0&&<section style={{ marginBottom:20 }}><div style={{ fontSize:9,fontWeight:800,color:coral,letterSpacing:3,textTransform:'uppercase' as const,marginBottom:10 }}>Experience</div>{cv.workExperience.map(job=>(<div key={job.id} style={{ marginBottom:14,paddingLeft:14,borderLeft:`3px solid ${coral}` }}><div style={{ display:'flex',justifyContent:'space-between' }}><span style={{ fontWeight:800,fontSize:12 }}>{job.jobTitle}</span><span style={{ fontSize:10,color:'#9ca3af' }}>{dateRange(job.startDate,job.endDate,job.current)}</span></div><div style={{ fontSize:10.5,color:coral,fontWeight:600,marginBottom:5 }}>{[job.employer,job.location].filter(Boolean).join(' · ')}</div>{job.bullets.filter(Boolean).map((b,i)=><div key={i} style={{ fontSize:11,paddingLeft:10,position:'relative' as const,lineHeight:1.65 }}><span style={{ position:'absolute' as const,left:1,color:coral }}>›</span>{b}</div>)}</div>))}</section>}
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:24 }}>
          {cv.education.length>0&&<section><div style={{ fontSize:9,fontWeight:800,color:coral,letterSpacing:3,textTransform:'uppercase' as const,marginBottom:8 }}>Education</div>{cv.education.map(ed=><div key={ed.id} style={{ marginBottom:8 }}><div style={{ fontWeight:700,fontSize:11 }}>{ed.qualification}</div><div style={{ fontSize:10,color:'#6b7280' }}>{[ed.institution,ed.grade].filter(Boolean).join(' · ')}</div></div>)}</section>}
          <section><div style={{ fontSize:9,fontWeight:800,color:coral,letterSpacing:3,textTransform:'uppercase' as const,marginBottom:6 }}>References</div>{cv.references.length>0?cv.references.map(r=><div key={r.id} style={{ fontSize:11,marginBottom:3 }}><span style={{ fontWeight:700 }}>{r.name}</span></div>):<div style={{ fontSize:11,fontStyle:'italic',color:'#9ca3af' }}>Available on request.</div>}</section>
        </div>
      </div>
    </div>
  )
}

// ─── T14: Adobe Split ────────────────────────────────────────────────────────
export function TemplateAdobeSplit({ cv }: { cv: CvData }) {
  const teal='#0f766e'
  return (
    <div style={{ fontFamily:'Arial,sans-serif',fontSize:11.5,color:'#111827',background:'#fff',minHeight:800 }}>
      <div style={{ display:'flex',borderBottom:`3px solid ${teal}` }}>
        <div style={{ flex:1,padding:'28px 32px',background:'#fff' }}>
          <div style={{ fontSize:28,fontWeight:900,color:'#111827',letterSpacing:-1,lineHeight:1.1 }}>{cv.fullName||'Your Name'}</div>
          {cv.professionalRegistration&&<div style={{ fontSize:10.5,color:teal,fontWeight:700,marginTop:4 }}>{cv.professionalRegistration}</div>}
        </div>
        <div style={{ width:220,background:teal,padding:'28px 20px',display:'flex',flexDirection:'column' as const,justifyContent:'center',gap:6 }}>
          {cv.phone&&<div style={{ fontSize:10,color:'#fff' }}>📞 {cv.phone}</div>}
          {cv.email&&<div style={{ fontSize:10,color:'#fff',wordBreak:'break-all' as const }}>✉ {cv.email}</div>}
          {cv.location&&<div style={{ fontSize:10,color:'#fff' }}>📍 {cv.location}</div>}
        </div>
      </div>
      <div style={{ padding:'24px 32px' }}>
        {cv.personalStatement&&<section style={{ marginBottom:18 }}><div style={{ fontSize:9,fontWeight:800,color:teal,letterSpacing:3,textTransform:'uppercase' as const,marginBottom:6 }}>Profile</div><p style={{ margin:0,fontSize:11.5,lineHeight:1.75,color:'#374151',background:'#f0fdfa',padding:'10px 14px',borderRadius:6,borderLeft:`3px solid ${teal}` }}>{cv.personalStatement}</p></section>}
        {cv.skills.length>0&&<section style={{ marginBottom:18 }}><div style={{ fontSize:9,fontWeight:800,color:teal,letterSpacing:3,textTransform:'uppercase' as const,marginBottom:8 }}>Skills</div><div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:4 }}>{cv.skills.map(s=>s.items.split(',').map(i=>i.trim()).filter(Boolean).map((item,idx)=>(<div key={idx} style={{ fontSize:10.5,padding:'4px 8px',background:'#f0fdfa',borderRadius:4,color:'#134e4a',fontWeight:500 }}>✓ {item}</div>)))}</div></section>}
        {cv.workExperience.length>0&&<section style={{ marginBottom:18 }}><div style={{ fontSize:9,fontWeight:800,color:teal,letterSpacing:3,textTransform:'uppercase' as const,marginBottom:10 }}>Experience</div>{cv.workExperience.map(job=>(<div key={job.id} style={{ marginBottom:14 }}><div style={{ display:'flex',justifyContent:'space-between',background:'#f0fdfa',padding:'6px 10px',borderRadius:4,marginBottom:6 }}><span style={{ fontWeight:800,fontSize:12 }}>{job.jobTitle}</span><span style={{ fontSize:10,color:'#6b7280' }}>{dateRange(job.startDate,job.endDate,job.current)}</span></div><div style={{ fontSize:10.5,color:teal,fontWeight:600,marginBottom:5,paddingLeft:4 }}>{[job.employer,job.location].filter(Boolean).join(' · ')}</div>{job.bullets.filter(Boolean).map((b,i)=><div key={i} style={{ fontSize:11,paddingLeft:12,position:'relative' as const,lineHeight:1.65 }}><span style={{ position:'absolute' as const,left:2,color:teal }}>•</span>{b}</div>)}</div>))}</section>}
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:24 }}>
          {cv.education.length>0&&<section><div style={{ fontSize:9,fontWeight:800,color:teal,letterSpacing:3,textTransform:'uppercase' as const,marginBottom:8 }}>Education</div>{cv.education.map(ed=><div key={ed.id} style={{ marginBottom:8,fontSize:11 }}><div style={{ fontWeight:700 }}>{ed.qualification}</div><div style={{ fontSize:10,color:'#6b7280' }}>{[ed.institution,ed.grade].filter(Boolean).join(' · ')}</div></div>)}</section>}
          <section><div style={{ fontSize:9,fontWeight:800,color:teal,letterSpacing:3,textTransform:'uppercase' as const,marginBottom:6 }}>References</div>{cv.references.length>0?cv.references.map(r=><div key={r.id} style={{ fontSize:11,marginBottom:4 }}><span style={{ fontWeight:700 }}>{r.name}</span></div>):<div style={{ fontSize:11,fontStyle:'italic',color:'#9ca3af' }}>Available on request.</div>}</section>
        </div>
      </div>
    </div>
  )
}

// ─── T15: Adobe Duo ──────────────────────────────────────────────────────────
export function TemplateAdobeDuo({ cv }: { cv: CvData }) {
  const indigo='#4338ca',bg1='#eef2ff'
  return (
    <div style={{ fontFamily:'Arial,sans-serif',fontSize:11.5,color:'#111827',background:'#fff',minHeight:800 }}>
      <div style={{ padding:'36px 44px 24px',background:bg1 }}>
        <div style={{ fontSize:30,fontWeight:900,color:'#111827',letterSpacing:-1 }}>{cv.fullName||'Your Name'}</div>
        <div style={{ height:4,width:60,background:indigo,borderRadius:2,margin:'8px 0 10px' }} />
        {cv.professionalRegistration&&<div style={{ fontSize:10.5,color:indigo,fontWeight:700,marginBottom:6 }}>{cv.professionalRegistration}</div>}
        <div style={{ display:'flex',gap:20,fontSize:10,color:'#6b7280',flexWrap:'wrap' as const }}>{cv.phone&&<span>{cv.phone}</span>}{cv.email&&<span>{cv.email}</span>}{cv.location&&<span>{cv.location}</span>}</div>
      </div>
      {cv.personalStatement&&<section style={{ padding:'20px 44px',background:'#fff' }}><div style={{ fontSize:9,fontWeight:800,color:indigo,letterSpacing:3,textTransform:'uppercase' as const,marginBottom:6 }}>About</div><p style={{ margin:0,fontSize:11.5,lineHeight:1.75,color:'#374151' }}>{cv.personalStatement}</p></section>}
      {cv.skills.length>0&&<section style={{ padding:'20px 44px',background:bg1 }}><div style={{ fontSize:9,fontWeight:800,color:indigo,letterSpacing:3,textTransform:'uppercase' as const,marginBottom:8 }}>Skills</div><div style={{ display:'flex',flexWrap:'wrap' as const,gap:6 }}>{cv.skills.map(s=>s.items.split(',').map(i=>i.trim()).filter(Boolean).map((item,idx)=>(<span key={idx} style={{ fontSize:10,background:'#fff',border:'1px solid #c7d2fe',color:indigo,borderRadius:4,padding:'3px 10px',fontWeight:600 }}>{item}</span>)))}</div></section>}
      {cv.workExperience.length>0&&<section style={{ padding:'20px 44px',background:'#fff' }}><div style={{ fontSize:9,fontWeight:800,color:indigo,letterSpacing:3,textTransform:'uppercase' as const,marginBottom:10 }}>Experience</div>{cv.workExperience.map(job=>(<div key={job.id} style={{ marginBottom:14 }}><div style={{ display:'flex',justifyContent:'space-between' }}><span style={{ fontWeight:800,fontSize:12 }}>{job.jobTitle}</span><span style={{ fontSize:10,color:'#9ca3af' }}>{dateRange(job.startDate,job.endDate,job.current)}</span></div><div style={{ fontSize:10.5,color:indigo,fontWeight:600,marginBottom:5 }}>{[job.employer,job.location].filter(Boolean).join(' · ')}</div>{job.bullets.filter(Boolean).map((b,i)=><div key={i} style={{ fontSize:11,paddingLeft:12,position:'relative' as const,lineHeight:1.65 }}><span style={{ position:'absolute' as const,left:2,color:indigo }}>▸</span>{b}</div>)}</div>))}</section>}
      <section style={{ padding:'20px 44px',background:bg1 }}>
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:24 }}>
          {cv.education.length>0&&<div><div style={{ fontSize:9,fontWeight:800,color:indigo,letterSpacing:3,textTransform:'uppercase' as const,marginBottom:8 }}>Education</div>{cv.education.map(ed=><div key={ed.id} style={{ marginBottom:8 }}><div style={{ fontWeight:700,fontSize:11 }}>{ed.qualification}</div><div style={{ fontSize:10,color:'#6b7280' }}>{[ed.institution,ed.grade].filter(Boolean).join(' · ')}</div></div>)}</div>}
          <div><div style={{ fontSize:9,fontWeight:800,color:indigo,letterSpacing:3,textTransform:'uppercase' as const,marginBottom:6 }}>References</div>{cv.references.length>0?cv.references.map(r=><div key={r.id} style={{ fontSize:11,marginBottom:3 }}><span style={{ fontWeight:700 }}>{r.name}</span></div>):<div style={{ fontSize:11,fontStyle:'italic',color:'#9ca3af' }}>Available on request.</div>}</div>
        </div>
      </section>
    </div>
  )
}

// ─── T16: Adobe Arc ──────────────────────────────────────────────────────────
export function TemplateAdobeArc({ cv }: { cv: CvData }) {
  const violet='#7c3aed',amber='#d97706'
  return (
    <div style={{ fontFamily:'Arial,sans-serif',fontSize:11.5,color:'#111827',background:'#fff',minHeight:800 }}>
      <div style={{ position:'relative' as const,overflow:'hidden',paddingBottom:24 }}>
        <div style={{ background:violet,padding:'30px 40px 50px',clipPath:'polygon(0 0, 100% 0, 100% 70%, 0 100%)',marginBottom:-24 }}>
          <div style={{ fontSize:28,fontWeight:900,color:'#fff',letterSpacing:-0.5,lineHeight:1.1 }}>{cv.fullName||'Your Name'}</div>
          {cv.professionalRegistration&&<div style={{ fontSize:10,color:'#ddd6fe',fontWeight:700,marginTop:4 }}>{cv.professionalRegistration}</div>}
        </div>
        <div style={{ padding:'0 40px',display:'flex',gap:20,fontSize:10,color:'#6b7280',flexWrap:'wrap' as const,marginTop:8 }}>{cv.phone&&<span>📞 {cv.phone}</span>}{cv.email&&<span>✉ {cv.email}</span>}{cv.location&&<span>📍 {cv.location}</span>}</div>
      </div>
      <div style={{ padding:'16px 40px' }}>
        {cv.personalStatement&&<section style={{ marginBottom:18 }}><div style={{ fontSize:9,fontWeight:800,color:violet,letterSpacing:3,textTransform:'uppercase' as const,marginBottom:6 }}>Profile</div><p style={{ margin:0,fontSize:11.5,lineHeight:1.75,color:'#374151' }}>{cv.personalStatement}</p></section>}
        {cv.skills.length>0&&<section style={{ marginBottom:18 }}><div style={{ fontSize:9,fontWeight:800,color:violet,letterSpacing:3,textTransform:'uppercase' as const,marginBottom:8 }}>Skills</div><div style={{ display:'flex',flexWrap:'wrap' as const,gap:5 }}>{cv.skills.map(s=>s.items.split(',').map(i=>i.trim()).filter(Boolean).map((item,idx)=>(<span key={idx} style={{ fontSize:10,background:'#f5f3ff',border:'1px solid #ddd6fe',color:violet,borderRadius:20,padding:'3px 12px',fontWeight:600 }}>{item}</span>)))}</div></section>}
        {cv.workExperience.length>0&&<section style={{ marginBottom:18 }}><div style={{ fontSize:9,fontWeight:800,color:violet,letterSpacing:3,textTransform:'uppercase' as const,marginBottom:10 }}>Experience</div>{cv.workExperience.map(job=>(<div key={job.id} style={{ marginBottom:14,paddingLeft:16,borderLeft:`3px solid ${violet}` }}><div style={{ display:'flex',justifyContent:'space-between' }}><span style={{ fontWeight:800,fontSize:12 }}>{job.jobTitle}</span><span style={{ fontSize:10,color:'#9ca3af' }}>{dateRange(job.startDate,job.endDate,job.current)}</span></div><div style={{ fontSize:10.5,color:amber,fontWeight:600,marginBottom:5 }}>{[job.employer,job.location].filter(Boolean).join(' · ')}</div>{job.bullets.filter(Boolean).map((b,i)=><div key={i} style={{ fontSize:11,paddingLeft:10,position:'relative' as const,lineHeight:1.65 }}><span style={{ position:'absolute' as const,left:1,color:violet }}>•</span>{b}</div>)}</div>))}</section>}
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:24 }}>
          {cv.education.length>0&&<section><div style={{ fontSize:9,fontWeight:800,color:violet,letterSpacing:3,textTransform:'uppercase' as const,marginBottom:8 }}>Education</div>{cv.education.map(ed=><div key={ed.id} style={{ marginBottom:8 }}><div style={{ fontWeight:700,fontSize:11 }}>{ed.qualification}</div><div style={{ fontSize:10,color:'#6b7280' }}>{[ed.institution,ed.grade].filter(Boolean).join(' · ')}</div></div>)}</section>}
          <section><div style={{ fontSize:9,fontWeight:800,color:violet,letterSpacing:3,textTransform:'uppercase' as const,marginBottom:6 }}>References</div>{cv.references.length>0?cv.references.map(r=><div key={r.id} style={{ fontSize:11,marginBottom:3 }}><span style={{ fontWeight:700 }}>{r.name}</span></div>):<div style={{ fontSize:11,fontStyle:'italic',color:'#9ca3af' }}>Available on request.</div>}</section>
        </div>
      </div>
    </div>
  )
}


// ─── T17-T35: Remaining templates ────────────────────────────────────────────

export function TemplateNHSOcean({ cv }: { cv: CvData }) {
  const a='#0369a1',l='#e0f2fe'
  return (
    <div style={{ fontFamily:'Arial,sans-serif',fontSize:11.5,color:'#111',background:'#fff',minHeight:800 }}>
      <div style={{ background:'linear-gradient(135deg,#0c4a6e,#0369a1)',padding:'30px 40px 22px' }}>
        <div style={{ fontSize:26,fontWeight:900,color:'#fff',letterSpacing:-0.5 }}>{cv.fullName||'Your Name'}</div>
        {cv.professionalRegistration&&<div style={{ fontSize:10,color:'#bae6fd',fontWeight:700,marginTop:3 }}>{cv.professionalRegistration}</div>}
        <div style={{ display:'flex',gap:20,marginTop:10,fontSize:10,color:'#bae6fd',flexWrap:'wrap' as const }}>{cv.phone&&<span>📞 {cv.phone}</span>}{cv.email&&<span>✉ {cv.email}</span>}{cv.location&&<span>📍 {cv.location}</span>}</div>
      </div>
      <div style={{ height:4,background:'linear-gradient(90deg,#0369a1,#38bdf8)' }} />
      <div style={{ padding:'22px 40px' }}>
        {cv.personalStatement&&<section style={{ marginBottom:16 }}><div style={{ fontSize:9,fontWeight:800,color:a,letterSpacing:2,textTransform:'uppercase' as const,marginBottom:5 }}>Profile</div><p style={{ margin:0,lineHeight:1.75,fontSize:11.5,color:'#374151' }}>{cv.personalStatement}</p></section>}
        {cv.skills.length>0&&<section style={{ marginBottom:16 }}><div style={{ fontSize:9,fontWeight:800,color:a,letterSpacing:2,textTransform:'uppercase' as const,marginBottom:6 }}>Skills</div><div style={{ display:'flex',flexWrap:'wrap' as const,gap:5 }}>{cv.skills.map(s=>s.items.split(',').map(i=>i.trim()).filter(Boolean).map((item,idx)=>(<span key={idx} style={{ fontSize:10,background:l,color:a,border:'1px solid #7dd3fc',borderRadius:4,padding:'2px 10px',fontWeight:600 }}>{item}</span>)))}</div></section>}
        {cv.workExperience.length>0&&<section style={{ marginBottom:16 }}><div style={{ fontSize:9,fontWeight:800,color:a,letterSpacing:2,textTransform:'uppercase' as const,borderBottom:'2px solid #e0f2fe',paddingBottom:4,marginBottom:10 }}>Experience</div>{cv.workExperience.map(job=>(<div key={job.id} style={{ marginBottom:12 }}><div style={{ display:'flex',justifyContent:'space-between' }}><span style={{ fontWeight:800,fontSize:12 }}>{job.jobTitle}</span><span style={{ fontSize:10,color:'#9ca3af' }}>{dateRange(job.startDate,job.endDate,job.current)}</span></div><div style={{ fontSize:10.5,color:a,fontWeight:600,marginBottom:4 }}>{[job.employer,job.location].filter(Boolean).join(' · ')}</div>{job.bullets.filter(Boolean).map((b,i)=>(<div key={i} style={{ fontSize:11,paddingLeft:10,position:'relative' as const,lineHeight:1.6 }}><span style={{ position:'absolute' as const,left:1,color:a }}>•</span>{b}</div>))}</div>))}</section>}
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:20 }}>
          {cv.education.length>0&&<section><div style={{ fontSize:9,fontWeight:800,color:a,letterSpacing:2,textTransform:'uppercase' as const,marginBottom:6 }}>Education</div>{cv.education.map(ed=>(<div key={ed.id} style={{ marginBottom:6 }}><div style={{ fontWeight:700,fontSize:11 }}>{ed.qualification}</div><div style={{ fontSize:10,color:'#6b7280' }}>{[ed.institution,ed.grade].filter(Boolean).join(' · ')}</div></div>))}</section>}
          <section><div style={{ fontSize:9,fontWeight:800,color:a,letterSpacing:2,textTransform:'uppercase' as const,marginBottom:6 }}>References</div>{cv.references.length>0?cv.references.map(r=>(<div key={r.id} style={{ fontSize:11,marginBottom:3 }}><span style={{ fontWeight:700 }}>{r.name}</span></div>)):<div style={{ fontSize:11,fontStyle:'italic',color:'#9ca3af' }}>On request.</div>}</section>
        </div>
      </div>
    </div>
  )
}

export function TemplateNHSSlate({ cv }: { cv: CvData }) {
  const acc='#22d3ee',side='#1e293b'
  return (
    <div style={{ fontFamily:'Arial,sans-serif',fontSize:11.5,color:'#111',background:'#fff',display:'flex',minHeight:800 }}>
      <div style={{ width:160,minWidth:160,background:side,padding:'28px 14px',flexShrink:0,color:'#fff' }}>
        <div style={{ fontSize:17,fontWeight:900,lineHeight:1.2,marginBottom:8,wordBreak:'break-word' as const }}>{cv.fullName||'Your Name'}</div>
        {cv.profilePhoto&&<img src={cv.profilePhoto} style={{ width:80,height:80,borderRadius:'50%',objectFit:'cover' as const,border:`3px solid ${acc}`,marginBottom:10 }} alt="" />}
        {cv.professionalRegistration&&<div style={{ fontSize:9,color:acc,fontWeight:700,marginBottom:12 }}>{cv.professionalRegistration}</div>}
        {[cv.phone,cv.email,cv.location].filter(Boolean).map((c,i)=>(<div key={i} style={{ fontSize:9.5,color:'#94a3b8',marginBottom:4 }}>{c}</div>))}
        {cv.skills.length>0&&<><div style={{ fontSize:8,fontWeight:800,color:acc,letterSpacing:2,textTransform:'uppercase' as const,marginTop:14,marginBottom:6 }}>Skills</div>{cv.skills.map(s=>s.items.split(',').map(i=>i.trim()).filter(Boolean).map((item,idx)=>(<div key={idx} style={{ fontSize:9.5,color:'#cbd5e1',marginBottom:3 }}>· {item}</div>)))}</>}
        {cv.education.length>0&&<><div style={{ fontSize:8,fontWeight:800,color:acc,letterSpacing:2,textTransform:'uppercase' as const,marginTop:14,marginBottom:6 }}>Education</div>{cv.education.map(ed=>(<div key={ed.id} style={{ marginBottom:6 }}><div style={{ fontSize:10,fontWeight:700 }}>{ed.qualification}</div><div style={{ fontSize:9,color:'#94a3b8' }}>{ed.institution}</div></div>))}</>}
      </div>
      <div style={{ flex:1,padding:'28px 24px' }}>
        {cv.personalStatement&&<section style={{ marginBottom:16 }}><div style={{ fontSize:9,fontWeight:800,color:acc,letterSpacing:2,textTransform:'uppercase' as const,marginBottom:6 }}>Profile</div><p style={{ margin:0,lineHeight:1.75,fontSize:11.5 }}>{cv.personalStatement}</p></section>}
        {cv.workExperience.length>0&&<section style={{ marginBottom:16 }}><div style={{ fontSize:9,fontWeight:800,color:acc,letterSpacing:2,textTransform:'uppercase' as const,borderBottom:'2px solid #e2e8f0',paddingBottom:4,marginBottom:10 }}>Experience</div>{cv.workExperience.map(job=>(<div key={job.id} style={{ marginBottom:12 }}><div style={{ display:'flex',justifyContent:'space-between' }}><span style={{ fontWeight:800,fontSize:12 }}>{job.jobTitle}</span><span style={{ fontSize:10,color:'#9ca3af' }}>{dateRange(job.startDate,job.endDate,job.current)}</span></div><div style={{ fontSize:10.5,color:acc,fontWeight:600,marginBottom:4 }}>{[job.employer,job.location].filter(Boolean).join(' · ')}</div>{job.bullets.filter(Boolean).map((b,i)=>(<div key={i} style={{ fontSize:11,paddingLeft:10,position:'relative' as const,lineHeight:1.6 }}><span style={{ position:'absolute' as const,left:1,color:acc }}>›</span>{b}</div>))}</div>))}</section>}
        <section><div style={{ fontSize:9,fontWeight:800,color:acc,letterSpacing:2,textTransform:'uppercase' as const,marginBottom:6 }}>References</div>{cv.references.length>0?cv.references.map(r=>(<div key={r.id} style={{ fontSize:11 }}><span style={{ fontWeight:700 }}>{r.name}</span>{r.organisation?` — ${r.organisation}`:''}</div>)):<div style={{ fontSize:11,fontStyle:'italic',color:'#9ca3af' }}>Available on request.</div>}</section>
      </div>
    </div>
  )
}

export function TemplateNHSRoyal({ cv }: { cv: CvData }) {
  const royal='#1d4ed8',light='#eff6ff'
  return (
    <div style={{ fontFamily:'Arial,sans-serif',fontSize:11.5,color:'#111',background:'#fff',padding:'36px 48px',minHeight:800 }}>
      <div style={{ textAlign:'center',borderBottom:`3px solid ${royal}`,paddingBottom:16,marginBottom:20 }}>
        {cv.profilePhoto&&<img src={cv.profilePhoto} style={{ width:72,height:72,borderRadius:'50%',objectFit:'cover' as const,border:`3px solid ${royal}`,margin:'0 auto 10px',display:'block' }} alt="" />}
        <div style={{ fontSize:26,fontWeight:900,color:royal,letterSpacing:1 }}>{cv.fullName||'Your Name'}</div>
        {cv.professionalRegistration&&<div style={{ fontSize:10,color:royal,fontWeight:700,marginTop:3 }}>{cv.professionalRegistration}</div>}
        <div style={{ fontSize:10,color:'#6b7280',marginTop:6 }}>{[cv.phone,cv.email,cv.location].filter(Boolean).join('   ·   ')}</div>
      </div>
      {cv.personalStatement&&<section style={{ marginBottom:16 }}><div style={{ fontSize:9,fontWeight:800,color:royal,letterSpacing:2,textTransform:'uppercase' as const,marginBottom:5 }}>Personal Statement</div><p style={{ margin:0,lineHeight:1.75,fontSize:11.5 }}>{cv.personalStatement}</p></section>}
      {cv.skills.length>0&&<section style={{ marginBottom:16,background:light,padding:'10px 14px',borderRadius:6 }}><div style={{ fontSize:9,fontWeight:800,color:royal,letterSpacing:2,textTransform:'uppercase' as const,marginBottom:6 }}>Core Skills</div><div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'2px 24px' }}>{cv.skills.map(s=>s.items.split(',').map(i=>i.trim()).filter(Boolean).map((item,idx)=>(<div key={idx} style={{ fontSize:11,paddingLeft:10,position:'relative' as const,lineHeight:1.8 }}><span style={{ position:'absolute' as const,left:0,color:royal }}>▸</span>{item}</div>)))}</div></section>}
      {cv.workExperience.length>0&&<section style={{ marginBottom:16 }}><div style={{ fontSize:9,fontWeight:800,color:royal,letterSpacing:2,textTransform:'uppercase' as const,borderBottom:`2px solid ${royal}`,paddingBottom:3,marginBottom:10 }}>Work Experience</div>{cv.workExperience.map(job=>(<div key={job.id} style={{ marginBottom:12 }}><div style={{ display:'flex',justifyContent:'space-between' }}><span style={{ fontWeight:800,fontSize:12 }}>{job.jobTitle}</span><span style={{ fontSize:10,color:'#9ca3af' }}>{dateRange(job.startDate,job.endDate,job.current)}</span></div><div style={{ fontSize:10.5,color:royal,fontWeight:600,fontStyle:'italic',marginBottom:4 }}>{[job.employer,job.location].filter(Boolean).join(', ')}</div>{job.bullets.filter(Boolean).map((b,i)=>(<div key={i} style={{ fontSize:11,paddingLeft:10,position:'relative' as const,lineHeight:1.6 }}><span style={{ position:'absolute' as const,left:1 }}>•</span>{b}</div>))}</div>))}</section>}
      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:24,marginBottom:14 }}>
        {cv.education.length>0&&<section><div style={{ fontSize:9,fontWeight:800,color:royal,letterSpacing:2,textTransform:'uppercase' as const,marginBottom:6 }}>Education</div>{cv.education.map(ed=>(<div key={ed.id} style={{ marginBottom:6 }}><div style={{ fontWeight:700,fontSize:11 }}>{ed.qualification}</div><div style={{ fontSize:10,color:'#6b7280' }}>{[ed.institution,ed.grade].filter(Boolean).join(' · ')}</div></div>))}</section>}
        {cv.certifications.length>0&&<section><div style={{ fontSize:9,fontWeight:800,color:royal,letterSpacing:2,textTransform:'uppercase' as const,marginBottom:6 }}>Certifications</div>{cv.certifications.map(c=>(<div key={c.id} style={{ marginBottom:5 }}><div style={{ fontWeight:700,fontSize:11 }}>{c.name}</div></div>))}</section>}
      </div>
      <section><div style={{ fontSize:9,fontWeight:800,color:royal,letterSpacing:2,textTransform:'uppercase' as const,marginBottom:5 }}>References</div>{cv.references.length>0?cv.references.map(r=>(<div key={r.id} style={{ fontSize:11,marginBottom:3 }}><span style={{ fontWeight:700 }}>{r.name}</span>{r.organisation?<span style={{ color:'#6b7280' }}> — {r.organisation}</span>:''}</div>)):<div style={{ fontSize:11,fontStyle:'italic',color:'#9ca3af' }}>Available on request.</div>}</section>
    </div>
  )
}

export function TemplateNHSEmerald({ cv }: { cv: CvData }) {
  const em='#065f46',light='#ecfdf5',acc='#059669'
  return (
    <div style={{ fontFamily:'Arial,sans-serif',fontSize:11.5,color:'#111',background:'#fff',minHeight:800 }}>
      <div style={{ background:em,padding:'28px 40px',display:'flex',alignItems:'center',gap:20 }}>
        {cv.profilePhoto&&<img src={cv.profilePhoto} style={{ width:72,height:72,borderRadius:8,objectFit:'cover' as const,border:'3px solid #6ee7b7',flexShrink:0 }} alt="" />}
        <div style={{ flex:1 }}>
          <div style={{ fontSize:24,fontWeight:900,color:'#fff',letterSpacing:-0.5 }}>{cv.fullName||'Your Name'}</div>
          {cv.professionalRegistration&&<div style={{ fontSize:10,color:'#6ee7b7',fontWeight:700,marginTop:2 }}>{cv.professionalRegistration}</div>}
          <div style={{ display:'flex',gap:16,marginTop:8,fontSize:10,color:'#a7f3d0',flexWrap:'wrap' as const }}>{cv.phone&&<span>📞 {cv.phone}</span>}{cv.email&&<span>✉ {cv.email}</span>}{cv.location&&<span>📍 {cv.location}</span>}</div>
        </div>
      </div>
      <div style={{ padding:'24px 40px' }}>
        {cv.personalStatement&&<section style={{ marginBottom:16,borderLeft:`4px solid ${acc}`,padding:'10px 12px',background:light,borderRadius:'0 6px 6px 0' }}><p style={{ margin:0,lineHeight:1.75,fontSize:11.5 }}>{cv.personalStatement}</p></section>}
        {cv.skills.length>0&&<section style={{ marginBottom:16 }}><div style={{ fontSize:9,fontWeight:800,color:em,letterSpacing:2,textTransform:'uppercase' as const,marginBottom:8 }}>Skills</div><div style={{ display:'flex',flexWrap:'wrap' as const,gap:5 }}>{cv.skills.map(s=>s.items.split(',').map(i=>i.trim()).filter(Boolean).map((item,idx)=>(<span key={idx} style={{ fontSize:10,background:light,border:'1px solid #6ee7b7',color:em,borderRadius:20,padding:'2px 10px',fontWeight:600 }}>{item}</span>)))}</div></section>}
        {cv.workExperience.length>0&&<section style={{ marginBottom:16 }}><div style={{ fontSize:9,fontWeight:800,color:em,letterSpacing:2,textTransform:'uppercase' as const,borderBottom:`2px solid ${light}`,paddingBottom:4,marginBottom:10 }}>Experience</div>{cv.workExperience.map(job=>(<div key={job.id} style={{ marginBottom:12,paddingLeft:12,borderLeft:`2px solid ${light}` }}><div style={{ display:'flex',justifyContent:'space-between' }}><span style={{ fontWeight:800,fontSize:12 }}>{job.jobTitle}</span><span style={{ fontSize:10,color:'#9ca3af' }}>{dateRange(job.startDate,job.endDate,job.current)}</span></div><div style={{ fontSize:10.5,color:acc,fontWeight:600,marginBottom:4 }}>{[job.employer,job.location].filter(Boolean).join(' · ')}</div>{job.bullets.filter(Boolean).map((b,i)=>(<div key={i} style={{ fontSize:11,paddingLeft:10,position:'relative' as const,lineHeight:1.6 }}><span style={{ position:'absolute' as const,left:1,color:acc }}>✓</span>{b}</div>))}</div>))}</section>}
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:20 }}>
          {cv.education.length>0&&<section><div style={{ fontSize:9,fontWeight:800,color:em,letterSpacing:2,textTransform:'uppercase' as const,marginBottom:6 }}>Education</div>{cv.education.map(ed=>(<div key={ed.id} style={{ marginBottom:6 }}><div style={{ fontWeight:700,fontSize:11 }}>{ed.qualification}</div><div style={{ fontSize:10,color:'#6b7280' }}>{[ed.institution,ed.grade].filter(Boolean).join(' · ')}</div></div>))}</section>}
          <section><div style={{ fontSize:9,fontWeight:800,color:em,letterSpacing:2,textTransform:'uppercase' as const,marginBottom:6 }}>References</div>{cv.references.length>0?cv.references.map(r=>(<div key={r.id} style={{ fontSize:11 }}><span style={{ fontWeight:700 }}>{r.name}</span></div>)):<div style={{ fontSize:11,fontStyle:'italic',color:'#9ca3af' }}>On request.</div>}</section>
        </div>
      </div>
    </div>
  )
}

export function TemplateAdobeEmber({ cv }: { cv: CvData }) {
  const ember='#c2410c',light='#fff7ed'
  return (
    <div style={{ fontFamily:'Arial,sans-serif',fontSize:11.5,color:'#111',background:'#fff',minHeight:800 }}>
      <div style={{ background:'linear-gradient(135deg,#ea580c,#c2410c)',padding:'28px 40px 20px' }}>
        <div style={{ fontSize:26,fontWeight:900,color:'#fff',letterSpacing:-0.5 }}>{cv.fullName||'Your Name'}</div>
        {cv.professionalRegistration&&<div style={{ fontSize:10,color:'#fed7aa',fontWeight:700,marginTop:3 }}>{cv.professionalRegistration}</div>}
        <div style={{ display:'flex',gap:20,marginTop:10,fontSize:10,color:'#fed7aa',flexWrap:'wrap' as const }}>{cv.phone&&<span>{cv.phone}</span>}{cv.email&&<span>{cv.email}</span>}{cv.location&&<span>{cv.location}</span>}</div>
      </div>
      <div style={{ height:3,background:'#fdba74' }} />
      <div style={{ padding:'22px 40px' }}>
        {cv.personalStatement&&<section style={{ marginBottom:16,background:light,borderLeft:`4px solid ${ember}`,padding:'10px 14px',borderRadius:'0 6px 6px 0' }}><p style={{ margin:0,lineHeight:1.75,fontSize:11.5 }}>{cv.personalStatement}</p></section>}
        {cv.skills.length>0&&<section style={{ marginBottom:16 }}><div style={{ fontSize:9,fontWeight:800,color:ember,letterSpacing:2,textTransform:'uppercase' as const,marginBottom:6 }}>Skills</div><div style={{ display:'flex',flexWrap:'wrap' as const,gap:5 }}>{cv.skills.map(s=>s.items.split(',').map(i=>i.trim()).filter(Boolean).map((item,idx)=>(<span key={idx} style={{ fontSize:10,background:light,color:ember,border:'1px solid #fdba74',borderRadius:20,padding:'2px 10px',fontWeight:600 }}>{item}</span>)))}</div></section>}
        {cv.workExperience.length>0&&<section style={{ marginBottom:16 }}><div style={{ fontSize:9,fontWeight:800,color:ember,letterSpacing:2,textTransform:'uppercase' as const,borderBottom:`2px solid ${light}`,paddingBottom:4,marginBottom:10 }}>Experience</div>{cv.workExperience.map(job=>(<div key={job.id} style={{ marginBottom:12,paddingLeft:12,borderLeft:`3px solid ${ember}` }}><div style={{ display:'flex',justifyContent:'space-between' }}><span style={{ fontWeight:800,fontSize:12 }}>{job.jobTitle}</span><span style={{ fontSize:10,color:'#9ca3af' }}>{dateRange(job.startDate,job.endDate,job.current)}</span></div><div style={{ fontSize:10.5,color:ember,fontWeight:600,marginBottom:4 }}>{[job.employer,job.location].filter(Boolean).join(' · ')}</div>{job.bullets.filter(Boolean).map((b,i)=>(<div key={i} style={{ fontSize:11,paddingLeft:10,position:'relative' as const,lineHeight:1.6 }}><span style={{ position:'absolute' as const,left:1,color:ember }}>›</span>{b}</div>))}</div>))}</section>}
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:20 }}>
          {cv.education.length>0&&<section><div style={{ fontSize:9,fontWeight:800,color:ember,letterSpacing:2,textTransform:'uppercase' as const,marginBottom:6 }}>Education</div>{cv.education.map(ed=>(<div key={ed.id} style={{ marginBottom:6 }}><div style={{ fontWeight:700,fontSize:11 }}>{ed.qualification}</div><div style={{ fontSize:10,color:'#6b7280' }}>{[ed.institution,ed.grade].filter(Boolean).join(' · ')}</div></div>))}</section>}
          <section><div style={{ fontSize:9,fontWeight:800,color:ember,letterSpacing:2,textTransform:'uppercase' as const,marginBottom:6 }}>References</div>{cv.references.length>0?cv.references.map(r=>(<div key={r.id} style={{ fontSize:11 }}><span style={{ fontWeight:700 }}>{r.name}</span></div>)):<div style={{ fontSize:11,fontStyle:'italic',color:'#9ca3af' }}>On request.</div>}</section>
        </div>
      </div>
    </div>
  )
}

export function TemplateAdobeAzure({ cv }: { cv: CvData }) {
  const az='#0284c7',light='#f0f9ff'
  return (
    <div style={{ fontFamily:'"Helvetica Neue",Arial,sans-serif',fontSize:11.5,color:'#111',background:'#fff',padding:'36px 48px',minHeight:800 }}>
      <div style={{ display:'flex',alignItems:'flex-start',gap:20,marginBottom:20,paddingBottom:16,borderBottom:`3px solid ${az}` }}>
        {cv.profilePhoto&&<img src={cv.profilePhoto} style={{ width:70,height:70,borderRadius:'50%',objectFit:'cover' as const,border:`2px solid ${az}`,flexShrink:0 }} alt="" />}
        <div style={{ flex:1 }}>
          <div style={{ fontSize:28,fontWeight:900,color:'#111',letterSpacing:-1 }}>{cv.fullName||'Your Name'}</div>
          {cv.professionalRegistration&&<div style={{ fontSize:10.5,color:az,fontWeight:700,marginTop:2 }}>{cv.professionalRegistration}</div>}
        </div>
        <div style={{ fontSize:10,color:'#6b7280',textAlign:'right' as const,lineHeight:1.9 }}>{cv.phone&&<div>{cv.phone}</div>}{cv.email&&<div>{cv.email}</div>}{cv.location&&<div>{cv.location}</div>}</div>
      </div>
      {cv.personalStatement&&<section style={{ marginBottom:16,background:light,borderLeft:`4px solid ${az}`,padding:'10px 14px',borderRadius:'0 6px 6px 0' }}><p style={{ margin:0,lineHeight:1.75,fontSize:11.5 }}>{cv.personalStatement}</p></section>}
      {cv.skills.length>0&&<section style={{ marginBottom:16 }}><div style={{ fontSize:9,fontWeight:800,color:az,letterSpacing:2,textTransform:'uppercase' as const,marginBottom:6 }}>Skills</div><div style={{ display:'flex',flexWrap:'wrap' as const,gap:5 }}>{cv.skills.map(s=>s.items.split(',').map(i=>i.trim()).filter(Boolean).map((item,idx)=>(<span key={idx} style={{ fontSize:10,background:light,color:az,border:'1px solid #7dd3fc',borderRadius:4,padding:'2px 10px',fontWeight:600 }}>{item}</span>)))}</div></section>}
      {cv.workExperience.length>0&&<section style={{ marginBottom:16 }}><div style={{ fontSize:9,fontWeight:800,color:az,letterSpacing:2,textTransform:'uppercase' as const,marginBottom:10,borderBottom:`1px solid ${light}`,paddingBottom:4 }}>Experience</div>{cv.workExperience.map(job=>(<div key={job.id} style={{ marginBottom:14 }}><div style={{ display:'flex',justifyContent:'space-between' }}><span style={{ fontWeight:800,fontSize:12 }}>{job.jobTitle}</span><span style={{ fontSize:10,color:'#9ca3af' }}>{dateRange(job.startDate,job.endDate,job.current)}</span></div><div style={{ fontSize:10.5,color:az,fontWeight:600,marginBottom:4 }}>{[job.employer,job.location].filter(Boolean).join(' · ')}</div>{job.bullets.filter(Boolean).map((b,i)=>(<div key={i} style={{ fontSize:11,paddingLeft:10,position:'relative' as const,lineHeight:1.6 }}><span style={{ position:'absolute' as const,left:1,color:az }}>→</span>{b}</div>))}</div>))}</section>}
      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:20 }}>
        {cv.education.length>0&&<section><div style={{ fontSize:9,fontWeight:800,color:az,letterSpacing:2,textTransform:'uppercase' as const,marginBottom:6 }}>Education</div>{cv.education.map(ed=>(<div key={ed.id} style={{ marginBottom:6 }}><div style={{ fontWeight:700,fontSize:11 }}>{ed.qualification}</div><div style={{ fontSize:10,color:'#6b7280' }}>{[ed.institution,ed.grade].filter(Boolean).join(' · ')}</div></div>))}</section>}
        <section><div style={{ fontSize:9,fontWeight:800,color:az,letterSpacing:2,textTransform:'uppercase' as const,marginBottom:6 }}>References</div>{cv.references.length>0?cv.references.map(r=>(<div key={r.id} style={{ fontSize:11 }}><span style={{ fontWeight:700 }}>{r.name}</span></div>)):<div style={{ fontSize:11,fontStyle:'italic',color:'#9ca3af' }}>On request.</div>}</section>
      </div>
    </div>
  )
}

export function TemplateAdobePrism({ cv }: { cv: CvData }) {
  const cols=['#6d28d9','#0891b2','#059669','#d97706']
  return (
    <div style={{ fontFamily:'Arial,sans-serif',fontSize:11.5,color:'#111',background:'#fff',padding:'32px 44px',minHeight:800 }}>
      <div style={{ marginBottom:20 }}>
        <div style={{ fontSize:28,fontWeight:900,color:'#111',letterSpacing:-0.5 }}>{cv.fullName||'Your Name'}</div>
        <div style={{ display:'flex',gap:4,margin:'8px 0' }}>{cols.map((c,i)=>(<div key={i} style={{ height:4,flex:1,background:c,borderRadius:2 }} />))}</div>
        <div style={{ display:'flex',gap:16,fontSize:10,color:'#6b7280',flexWrap:'wrap' as const }}>{cv.phone&&<span>{cv.phone}</span>}{cv.email&&<span>{cv.email}</span>}{cv.location&&<span>{cv.location}</span>}{cv.professionalRegistration&&<span style={{ color:cols[0],fontWeight:700 }}>{cv.professionalRegistration}</span>}</div>
      </div>
      {cv.personalStatement&&<section style={{ marginBottom:16,borderLeft:`4px solid ${cols[0]}`,paddingLeft:12 }}><p style={{ margin:0,lineHeight:1.75,fontSize:11.5,color:'#374151' }}>{cv.personalStatement}</p></section>}
      {cv.skills.length>0&&<section style={{ marginBottom:16 }}><div style={{ fontSize:9,fontWeight:800,color:cols[1],letterSpacing:2,textTransform:'uppercase' as const,marginBottom:6 }}>Skills</div><div style={{ display:'flex',flexWrap:'wrap' as const,gap:5 }}>{cv.skills.map((s,si)=>s.items.split(',').map(i=>i.trim()).filter(Boolean).map((item,idx)=>(<span key={idx} style={{ fontSize:10,background:'#f8fafc',border:`1px solid ${cols[si%4]}`,color:cols[si%4],borderRadius:4,padding:'2px 10px',fontWeight:600 }}>{item}</span>)))}</div></section>}
      {cv.workExperience.length>0&&<section style={{ marginBottom:16 }}><div style={{ fontSize:9,fontWeight:800,color:cols[2],letterSpacing:2,textTransform:'uppercase' as const,borderBottom:'2px solid #e2e8f0',paddingBottom:4,marginBottom:10 }}>Experience</div>{cv.workExperience.map((job,ji)=>(<div key={job.id} style={{ marginBottom:14,paddingLeft:12,borderLeft:`3px solid ${cols[ji%4]}` }}><div style={{ display:'flex',justifyContent:'space-between' }}><span style={{ fontWeight:800,fontSize:12 }}>{job.jobTitle}</span><span style={{ fontSize:10,color:'#9ca3af' }}>{dateRange(job.startDate,job.endDate,job.current)}</span></div><div style={{ fontSize:10.5,color:cols[ji%4],fontWeight:600,marginBottom:4 }}>{[job.employer,job.location].filter(Boolean).join(' · ')}</div>{job.bullets.filter(Boolean).map((b,i)=>(<div key={i} style={{ fontSize:11,paddingLeft:10,position:'relative' as const,lineHeight:1.6 }}><span style={{ position:'absolute' as const,left:1 }}>•</span>{b}</div>))}</div>))}</section>}
      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:20 }}>
        {cv.education.length>0&&<section><div style={{ fontSize:9,fontWeight:800,color:cols[3],letterSpacing:2,textTransform:'uppercase' as const,marginBottom:6 }}>Education</div>{cv.education.map(ed=>(<div key={ed.id} style={{ marginBottom:6 }}><div style={{ fontWeight:700,fontSize:11 }}>{ed.qualification}</div><div style={{ fontSize:10,color:'#6b7280' }}>{[ed.institution,ed.grade].filter(Boolean).join(' · ')}</div></div>))}</section>}
        <section><div style={{ fontSize:9,fontWeight:800,color:cols[0],letterSpacing:2,textTransform:'uppercase' as const,marginBottom:6 }}>References</div>{cv.references.length>0?cv.references.map(r=>(<div key={r.id} style={{ fontSize:11 }}><span style={{ fontWeight:700 }}>{r.name}</span></div>)):<div style={{ fontSize:11,fontStyle:'italic',color:'#9ca3af' }}>On request.</div>}</section>
      </div>
    </div>
  )
}

export function TemplateAdobeNight({ cv }: { cv: CvData }) {
  const acc='#a78bfa',bg='#1e1b4b'
  return (
    <div style={{ fontFamily:'Arial,sans-serif',fontSize:11.5,color:'#111',background:'#fff',display:'flex',minHeight:800 }}>
      <div style={{ width:156,minWidth:156,background:bg,padding:'28px 14px',flexShrink:0,color:'#fff' }}>
        <div style={{ fontSize:16,fontWeight:900,lineHeight:1.2,marginBottom:6,wordBreak:'break-word' as const }}>{cv.fullName||'Your Name'}</div>
        {cv.profilePhoto&&<img src={cv.profilePhoto} style={{ width:76,height:76,borderRadius:'50%',objectFit:'cover' as const,border:`3px solid ${acc}`,marginBottom:10 }} alt="" />}
        {cv.professionalRegistration&&<div style={{ fontSize:9,color:acc,fontWeight:700,marginBottom:10 }}>{cv.professionalRegistration}</div>}
        {[cv.phone,cv.email,cv.location].filter(Boolean).map((c,i)=>(<div key={i} style={{ fontSize:9,color:'#c4b5fd',marginBottom:4 }}>{c}</div>))}
        {cv.skills.length>0&&<><div style={{ fontSize:8,fontWeight:800,color:acc,letterSpacing:2,textTransform:'uppercase' as const,marginTop:14,marginBottom:6 }}>Skills</div>{cv.skills.map(s=>s.items.split(',').map(i=>i.trim()).filter(Boolean).map((item,idx)=>(<div key={idx} style={{ fontSize:9.5,color:'#ddd6fe',marginBottom:3 }}>· {item}</div>)))}</>}
        {cv.education.length>0&&<><div style={{ fontSize:8,fontWeight:800,color:acc,letterSpacing:2,textTransform:'uppercase' as const,marginTop:14,marginBottom:6 }}>Education</div>{cv.education.map(ed=>(<div key={ed.id} style={{ marginBottom:6 }}><div style={{ fontSize:10,fontWeight:700 }}>{ed.qualification}</div><div style={{ fontSize:9,color:'#c4b5fd' }}>{ed.institution}</div></div>))}</>}
      </div>
      <div style={{ flex:1,padding:'28px 24px' }}>
        {cv.personalStatement&&<section style={{ marginBottom:16 }}><div style={{ fontSize:9,fontWeight:800,color:acc,letterSpacing:2,textTransform:'uppercase' as const,marginBottom:6 }}>Profile</div><p style={{ margin:0,lineHeight:1.75,fontSize:11.5 }}>{cv.personalStatement}</p></section>}
        {cv.workExperience.length>0&&<section style={{ marginBottom:16 }}><div style={{ fontSize:9,fontWeight:800,color:acc,letterSpacing:2,textTransform:'uppercase' as const,borderBottom:'2px solid #e2e8f0',paddingBottom:4,marginBottom:10 }}>Experience</div>{cv.workExperience.map(job=>(<div key={job.id} style={{ marginBottom:14 }}><div style={{ display:'flex',justifyContent:'space-between' }}><span style={{ fontWeight:800,fontSize:12 }}>{job.jobTitle}</span><span style={{ fontSize:10,color:'#9ca3af' }}>{dateRange(job.startDate,job.endDate,job.current)}</span></div><div style={{ fontSize:10.5,color:'#7c3aed',fontWeight:600,marginBottom:4 }}>{[job.employer,job.location].filter(Boolean).join(' · ')}</div>{job.bullets.filter(Boolean).map((b,i)=>(<div key={i} style={{ fontSize:11,paddingLeft:10,position:'relative' as const,lineHeight:1.6 }}><span style={{ position:'absolute' as const,left:1,color:acc }}>•</span>{b}</div>))}</div>))}</section>}
        <section><div style={{ fontSize:9,fontWeight:800,color:acc,letterSpacing:2,textTransform:'uppercase' as const,marginBottom:6 }}>References</div>{cv.references.length>0?cv.references.map(r=>(<div key={r.id} style={{ fontSize:11 }}><span style={{ fontWeight:700 }}>{r.name}</span>{r.organisation?` — ${r.organisation}`:''}</div>)):<div style={{ fontSize:11,fontStyle:'italic',color:'#9ca3af' }}>On request.</div>}</section>
      </div>
    </div>
  )
}

export function TemplateAdobeBlush({ cv }: { cv: CvData }) {
  const rose='#be185d',light='#fff1f2',mid='#fda4af'
  return (
    <div style={{ fontFamily:'"Helvetica Neue",Arial,sans-serif',fontSize:11.5,color:'#111',background:'#fff',padding:'36px 48px',minHeight:800 }}>
      <div style={{ display:'flex',alignItems:'flex-start',gap:20,marginBottom:20 }}>
        {cv.profilePhoto&&<img src={cv.profilePhoto} style={{ width:80,height:80,borderRadius:'50%',objectFit:'cover' as const,border:`3px solid ${mid}`,flexShrink:0 }} alt="" />}
        <div style={{ flex:1,borderBottom:`2px solid ${mid}`,paddingBottom:14 }}>
          <div style={{ fontSize:28,fontWeight:900,color:'#111',letterSpacing:-1 }}>{cv.fullName||'Your Name'}</div>
          {cv.professionalRegistration&&<div style={{ fontSize:10.5,color:rose,fontWeight:700,marginTop:2 }}>{cv.professionalRegistration}</div>}
          <div style={{ display:'flex',gap:16,marginTop:6,fontSize:10,color:'#9ca3af',flexWrap:'wrap' as const }}>{cv.phone&&<span>{cv.phone}</span>}{cv.email&&<span>{cv.email}</span>}{cv.location&&<span>{cv.location}</span>}</div>
        </div>
      </div>
      {cv.personalStatement&&<section style={{ marginBottom:16,background:light,padding:'12px 16px',borderRadius:8 }}><p style={{ margin:0,lineHeight:1.75,fontSize:11.5 }}>{cv.personalStatement}</p></section>}
      {cv.skills.length>0&&<section style={{ marginBottom:16 }}><div style={{ fontSize:9,fontWeight:800,color:rose,letterSpacing:2,textTransform:'uppercase' as const,marginBottom:6 }}>Skills</div><div style={{ display:'flex',flexWrap:'wrap' as const,gap:5 }}>{cv.skills.map(s=>s.items.split(',').map(i=>i.trim()).filter(Boolean).map((item,idx)=>(<span key={idx} style={{ fontSize:10,background:light,color:rose,border:`1px solid ${mid}`,borderRadius:20,padding:'2px 10px',fontWeight:600 }}>{item}</span>)))}</div></section>}
      {cv.workExperience.length>0&&<section style={{ marginBottom:16 }}><div style={{ fontSize:9,fontWeight:800,color:rose,letterSpacing:2,textTransform:'uppercase' as const,borderBottom:`2px solid ${light}`,paddingBottom:4,marginBottom:10 }}>Experience</div>{cv.workExperience.map(job=>(<div key={job.id} style={{ marginBottom:14 }}><div style={{ display:'flex',justifyContent:'space-between' }}><span style={{ fontWeight:800,fontSize:12 }}>{job.jobTitle}</span><span style={{ fontSize:10,color:'#9ca3af' }}>{dateRange(job.startDate,job.endDate,job.current)}</span></div><div style={{ fontSize:10.5,color:rose,fontWeight:600,marginBottom:4 }}>{[job.employer,job.location].filter(Boolean).join(' · ')}</div>{job.bullets.filter(Boolean).map((b,i)=>(<div key={i} style={{ fontSize:11,paddingLeft:10,position:'relative' as const,lineHeight:1.6 }}><span style={{ position:'absolute' as const,left:1,color:rose }}>•</span>{b}</div>))}</div>))}</section>}
      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:20 }}>
        {cv.education.length>0&&<section><div style={{ fontSize:9,fontWeight:800,color:rose,letterSpacing:2,textTransform:'uppercase' as const,marginBottom:6 }}>Education</div>{cv.education.map(ed=>(<div key={ed.id} style={{ marginBottom:6 }}><div style={{ fontWeight:700,fontSize:11 }}>{ed.qualification}</div><div style={{ fontSize:10,color:'#6b7280' }}>{[ed.institution,ed.grade].filter(Boolean).join(' · ')}</div></div>))}</section>}
        <section><div style={{ fontSize:9,fontWeight:800,color:rose,letterSpacing:2,textTransform:'uppercase' as const,marginBottom:6 }}>References</div>{cv.references.length>0?cv.references.map(r=>(<div key={r.id} style={{ fontSize:11 }}><span style={{ fontWeight:700 }}>{r.name}</span></div>)):<div style={{ fontSize:11,fontStyle:'italic',color:'#9ca3af' }}>On request.</div>}</section>
      </div>
    </div>
  )
}

export function TemplateInternational({ cv }: { cv: CvData }) {
  const blue='#2563eb'
  return (
    <div style={{ fontFamily:'Arial,sans-serif',fontSize:11.5,color:'#374151',background:'#fff',padding:'32px 44px',minHeight:800 }}>
      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',borderBottom:`2px solid ${blue}`,paddingBottom:14,marginBottom:18 }}>
        <div><div style={{ fontSize:26,fontWeight:900,color:'#111',letterSpacing:-0.5 }}>{cv.fullName||'Your Name'}</div>{cv.professionalRegistration&&<div style={{ fontSize:10.5,color:blue,fontWeight:700,marginTop:3 }}>{cv.professionalRegistration}</div>}</div>
        {cv.profilePhoto&&<img src={cv.profilePhoto} style={{ width:80,height:80,borderRadius:6,objectFit:'cover' as const,border:'1px solid #e2e8f0',flexShrink:0 }} alt="" />}
      </div>
      <div style={{ display:'flex',gap:'4px 20px',flexWrap:'wrap' as const,fontSize:10,color:'#6b7280',marginBottom:14 }}>{cv.phone&&<span>📞 {cv.phone}</span>}{cv.email&&<span>✉ {cv.email}</span>}{cv.location&&<span>📍 {cv.location}</span>}</div>
      {cv.personalStatement&&<section style={{ marginBottom:16 }}><div style={{ fontSize:9,fontWeight:800,color:blue,letterSpacing:2,textTransform:'uppercase' as const,marginBottom:5 }}>Professional Summary</div><p style={{ margin:0,lineHeight:1.75,fontSize:11.5 }}>{cv.personalStatement}</p></section>}
      {cv.skills.length>0&&<section style={{ marginBottom:16 }}><div style={{ fontSize:9,fontWeight:800,color:blue,letterSpacing:2,textTransform:'uppercase' as const,marginBottom:6 }}>Key Skills</div><div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'2px 30px' }}>{cv.skills.map(s=>s.items.split(',').map(i=>i.trim()).filter(Boolean).map((item,idx)=>(<div key={idx} style={{ fontSize:11,paddingLeft:10,position:'relative' as const,lineHeight:1.8 }}><span style={{ position:'absolute' as const,left:1,color:blue }}>▸</span>{item}</div>)))}</div></section>}
      {cv.workExperience.length>0&&<section style={{ marginBottom:16 }}><div style={{ fontSize:9,fontWeight:800,color:blue,letterSpacing:2,textTransform:'uppercase' as const,borderBottom:'1px solid #e2e8f0',paddingBottom:4,marginBottom:10 }}>Professional Experience</div>{cv.workExperience.map(job=>(<div key={job.id} style={{ marginBottom:14 }}><div style={{ display:'flex',justifyContent:'space-between' }}><span style={{ fontWeight:800,fontSize:12 }}>{job.jobTitle}</span><span style={{ fontSize:10,color:'#9ca3af' }}>{dateRange(job.startDate,job.endDate,job.current)}</span></div><div style={{ fontSize:10.5,color:blue,fontWeight:600,fontStyle:'italic',marginBottom:5 }}>{[job.employer,job.location].filter(Boolean).join(', ')}</div>{job.bullets.filter(Boolean).map((b,i)=>(<div key={i} style={{ fontSize:11,paddingLeft:10,position:'relative' as const,lineHeight:1.6 }}><span style={{ position:'absolute' as const,left:1 }}>•</span>{b}</div>))}</div>))}</section>}
      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:20 }}>
        {cv.education.length>0&&<section><div style={{ fontSize:9,fontWeight:800,color:blue,letterSpacing:2,textTransform:'uppercase' as const,marginBottom:6 }}>Education</div>{cv.education.map(ed=>(<div key={ed.id} style={{ marginBottom:6 }}><div style={{ fontWeight:700,fontSize:11 }}>{ed.qualification}</div><div style={{ fontSize:10,color:'#6b7280' }}>{[ed.institution,ed.grade].filter(Boolean).join(' · ')}</div></div>))}</section>}
        <section><div style={{ fontSize:9,fontWeight:800,color:blue,letterSpacing:2,textTransform:'uppercase' as const,marginBottom:6 }}>References</div>{cv.references.length>0?cv.references.map(r=>(<div key={r.id} style={{ fontSize:11 }}><span style={{ fontWeight:700 }}>{r.name}</span>{r.organisation?<span style={{ color:'#6b7280' }}> — {r.organisation}</span>:''}</div>)):<div style={{ fontSize:11,fontStyle:'italic',color:'#9ca3af' }}>Available on request.</div>}</section>
      </div>
    </div>
  )
}

export function TemplateScandinavia({ cv }: { cv: CvData }) {
  return (
    <div style={{ fontFamily:'"Helvetica Neue",Arial,sans-serif',fontSize:11.5,color:'#1a1a1a',background:'#f9f9f8',padding:'48px 56px',minHeight:800 }}>
      {cv.profilePhoto&&<img src={cv.profilePhoto} style={{ width:72,height:72,borderRadius:'50%',objectFit:'cover' as const,border:'2px solid #e5e5e5',marginBottom:16,display:'block' }} alt="" />}
      <div style={{ fontSize:32,fontWeight:900,color:'#111',letterSpacing:-1.5,marginBottom:4 }}>{cv.fullName||'Your Name'}</div>
      {cv.professionalRegistration&&<div style={{ fontSize:10.5,color:'#555',marginBottom:6 }}>{cv.professionalRegistration}</div>}
      <div style={{ fontSize:10,color:'#888',marginBottom:28 }}>{[cv.phone,cv.email,cv.location].filter(Boolean).join('  ·  ')}</div>
      {cv.personalStatement&&<section style={{ marginBottom:24,display:'flex',gap:40 }}><div style={{ fontSize:9,fontWeight:700,color:'#aaa',letterSpacing:3,textTransform:'uppercase' as const,width:80,paddingTop:3,flexShrink:0 }}>Summary</div><div style={{ flex:1,borderTop:'1px solid #e5e5e5',paddingTop:12 }}><p style={{ margin:0,lineHeight:1.9,fontSize:12,color:'#444' }}>{cv.personalStatement}</p></div></section>}
      {cv.skills.length>0&&<section style={{ marginBottom:24,display:'flex',gap:40 }}><div style={{ fontSize:9,fontWeight:700,color:'#aaa',letterSpacing:3,textTransform:'uppercase' as const,width:80,paddingTop:3,flexShrink:0 }}>Skills</div><div style={{ flex:1,borderTop:'1px solid #e5e5e5',paddingTop:12,color:'#444',fontSize:11.5,lineHeight:2 }}>{cv.skills.map(s=>s.items).join('  ·  ')}</div></section>}
      {cv.workExperience.length>0&&<section style={{ marginBottom:24,display:'flex',gap:40 }}><div style={{ fontSize:9,fontWeight:700,color:'#aaa',letterSpacing:3,textTransform:'uppercase' as const,width:80,paddingTop:3,flexShrink:0 }}>Experience</div><div style={{ flex:1,borderTop:'1px solid #e5e5e5',paddingTop:12 }}>{cv.workExperience.map(job=>(<div key={job.id} style={{ marginBottom:16 }}><div style={{ display:'flex',justifyContent:'space-between' }}><span style={{ fontWeight:800,fontSize:12 }}>{job.jobTitle}</span><span style={{ fontSize:10,color:'#aaa' }}>{dateRange(job.startDate,job.endDate,job.current)}</span></div><div style={{ fontSize:11,color:'#777',marginBottom:5 }}>{[job.employer,job.location].filter(Boolean).join(', ')}</div>{job.bullets.filter(Boolean).map((b,i)=>(<div key={i} style={{ fontSize:11.5,paddingLeft:14,position:'relative' as const,lineHeight:1.7,color:'#444' }}><span style={{ position:'absolute' as const,left:2,color:'#ccc' }}>—</span>{b}</div>))}</div>))}</div></section>}
      {cv.education.length>0&&<section style={{ marginBottom:24,display:'flex',gap:40 }}><div style={{ fontSize:9,fontWeight:700,color:'#aaa',letterSpacing:3,textTransform:'uppercase' as const,width:80,paddingTop:3,flexShrink:0 }}>Education</div><div style={{ flex:1,borderTop:'1px solid #e5e5e5',paddingTop:12 }}>{cv.education.map(ed=>(<div key={ed.id} style={{ marginBottom:8 }}><div style={{ fontWeight:700,fontSize:12 }}>{ed.qualification}</div><div style={{ fontSize:11,color:'#777' }}>{[ed.institution,ed.grade].filter(Boolean).join(' · ')}</div></div>))}</div></section>}
      <section style={{ display:'flex',gap:40 }}><div style={{ fontSize:9,fontWeight:700,color:'#aaa',letterSpacing:3,textTransform:'uppercase' as const,width:80,paddingTop:3,flexShrink:0 }}>References</div><div style={{ flex:1,borderTop:'1px solid #e5e5e5',paddingTop:12,fontSize:11.5,color:cv.references.length?'#444':'#aaa',fontStyle:cv.references.length?'normal':'italic' }}>{cv.references.length>0?cv.references.map(r=>(<div key={r.id} style={{ marginBottom:4 }}><span style={{ fontWeight:700 }}>{r.name}</span>{r.organisation?<span style={{ color:'#777' }}> — {r.organisation}</span>:''}</div>)):'Available on request.'}</div></section>
    </div>
  )
}

export function TemplateSwiss({ cv }: { cv: CvData }) {
  const red='#dc2626'
  return (
    <div style={{ fontFamily:'Arial,sans-serif',fontSize:11,color:'#111',background:'#fff',padding:'32px 40px',minHeight:800 }}>
      <div style={{ display:'grid',gridTemplateColumns:'1fr 180px',gap:20,borderBottom:`3px solid ${red}`,paddingBottom:14,marginBottom:18 }}>
        <div><div style={{ fontSize:30,fontWeight:900,color:'#111',letterSpacing:-1,lineHeight:1 }}>{cv.fullName||'Your Name'}</div>{cv.professionalRegistration&&<div style={{ fontSize:10,color:red,fontWeight:700,marginTop:4 }}>{cv.professionalRegistration}</div>}</div>
        <div style={{ fontSize:9.5,color:'#555',lineHeight:1.9,textAlign:'right' as const }}>{cv.phone&&<div>{cv.phone}</div>}{cv.email&&<div style={{ wordBreak:'break-all' as const }}>{cv.email}</div>}{cv.location&&<div>{cv.location}</div>}</div>
      </div>
      {cv.personalStatement&&<section style={{ marginBottom:16,display:'grid',gridTemplateColumns:'90px 1fr',gap:20 }}><div style={{ fontSize:8.5,fontWeight:800,color:red,letterSpacing:2,textTransform:'uppercase' as const,paddingTop:2 }}>Profile</div><p style={{ margin:0,lineHeight:1.75 }}>{cv.personalStatement}</p></section>}
      {cv.skills.length>0&&<section style={{ marginBottom:16,display:'grid',gridTemplateColumns:'90px 1fr',gap:20 }}><div style={{ fontSize:8.5,fontWeight:800,color:red,letterSpacing:2,textTransform:'uppercase' as const,paddingTop:2 }}>Skills</div><div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'2px 20px' }}>{cv.skills.map(s=>s.items.split(',').map(i=>i.trim()).filter(Boolean).map((item,idx)=>(<div key={idx} style={{ fontSize:10.5,paddingLeft:8,position:'relative' as const,lineHeight:1.8 }}><span style={{ position:'absolute' as const,left:0,color:red }}>▸</span>{item}</div>)))}</div></section>}
      {cv.workExperience.length>0&&<section style={{ marginBottom:16,display:'grid',gridTemplateColumns:'90px 1fr',gap:20,borderTop:'1px solid #e5e7eb',paddingTop:10 }}><div style={{ fontSize:8.5,fontWeight:800,color:red,letterSpacing:2,textTransform:'uppercase' as const }}>Experience</div><div>{cv.workExperience.map(job=>(<div key={job.id} style={{ marginBottom:12 }}><div style={{ display:'flex',justifyContent:'space-between' }}><span style={{ fontWeight:800,fontSize:12 }}>{job.jobTitle}</span><span style={{ fontSize:10,color:'#9ca3af' }}>{dateRange(job.startDate,job.endDate,job.current)}</span></div><div style={{ fontSize:10.5,color:red,fontWeight:700,marginBottom:4 }}>{[job.employer,job.location].filter(Boolean).join(' · ')}</div>{job.bullets.filter(Boolean).map((b,i)=>(<div key={i} style={{ fontSize:10.5,paddingLeft:10,position:'relative' as const,lineHeight:1.6 }}><span style={{ position:'absolute' as const,left:1 }}>•</span>{b}</div>))}</div>))}</div></section>}
      <div style={{ display:'grid',gridTemplateColumns:'90px 1fr',gap:20,borderTop:'1px solid #e5e7eb',paddingTop:10 }}><div style={{ fontSize:8.5,fontWeight:800,color:red,letterSpacing:2,textTransform:'uppercase' as const }}>Education</div><div>{cv.education.map(ed=>(<div key={ed.id} style={{ marginBottom:6 }}><span style={{ fontWeight:700 }}>{ed.qualification}</span><span style={{ color:'#6b7280' }}> — {[ed.institution,ed.grade].filter(Boolean).join(', ')}</span></div>))}</div></div>
      <div style={{ display:'grid',gridTemplateColumns:'90px 1fr',gap:20,borderTop:'1px solid #e5e7eb',paddingTop:10,marginTop:10 }}><div style={{ fontSize:8.5,fontWeight:800,color:red,letterSpacing:2,textTransform:'uppercase' as const }}>References</div><div style={{ fontSize:11,fontStyle:cv.references.length?'normal':'italic',color:cv.references.length?'#111':'#9ca3af' }}>{cv.references.length>0?cv.references.map(r=>(<div key={r.id} style={{ marginBottom:3 }}><span style={{ fontWeight:700 }}>{r.name}</span>{r.organisation?<span style={{ color:'#6b7280' }}> — {r.organisation}</span>:''}</div>)):'Available on request.'}</div></div>
    </div>
  )
}

export function TemplateCorporate({ cv }: { cv: CvData }) {
  const navy='#0f172a',gold='#ca8a04'
  return (
    <div style={{ fontFamily:'Arial,sans-serif',fontSize:11.5,color:'#111',background:'#fff',minHeight:800 }}>
      <div style={{ background:navy,padding:'30px 44px 22px',display:'flex',alignItems:'center',gap:20 }}>
        {cv.profilePhoto&&<img src={cv.profilePhoto} style={{ width:72,height:72,borderRadius:6,objectFit:'cover' as const,border:`2px solid ${gold}`,flexShrink:0 }} alt="" />}
        <div style={{ flex:1 }}>
          <div style={{ fontSize:24,fontWeight:900,color:'#fff',letterSpacing:1 }}>{cv.fullName||'Your Name'}</div>
          {cv.professionalRegistration&&<div style={{ fontSize:10,color:gold,fontWeight:700,marginTop:2 }}>{cv.professionalRegistration}</div>}
          <div style={{ display:'flex',gap:20,marginTop:8,fontSize:10,color:'#94a3b8',flexWrap:'wrap' as const }}>{cv.phone&&<span>{cv.phone}</span>}{cv.email&&<span>{cv.email}</span>}{cv.location&&<span>{cv.location}</span>}</div>
        </div>
      </div>
      <div style={{ height:3,background:`linear-gradient(90deg,${gold},#fbbf24)` }} />
      <div style={{ padding:'24px 44px' }}>
        {cv.personalStatement&&<section style={{ marginBottom:16 }}><div style={{ fontSize:9,fontWeight:800,color:navy,letterSpacing:2,textTransform:'uppercase' as const,marginBottom:5 }}>Executive Summary</div><p style={{ margin:0,lineHeight:1.75,fontSize:11.5 }}>{cv.personalStatement}</p></section>}
        {cv.skills.length>0&&<section style={{ marginBottom:16 }}><div style={{ fontSize:9,fontWeight:800,color:navy,letterSpacing:2,textTransform:'uppercase' as const,borderBottom:`2px solid ${gold}`,paddingBottom:3,marginBottom:8 }}>Core Competencies</div><div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'2px 30px' }}>{cv.skills.map(s=>s.items.split(',').map(i=>i.trim()).filter(Boolean).map((item,idx)=>(<div key={idx} style={{ fontSize:11,paddingLeft:10,position:'relative' as const,lineHeight:1.9 }}><span style={{ position:'absolute' as const,left:0,color:gold }}>▸</span>{item}</div>)))}</div></section>}
        {cv.workExperience.length>0&&<section style={{ marginBottom:16 }}><div style={{ fontSize:9,fontWeight:800,color:navy,letterSpacing:2,textTransform:'uppercase' as const,borderBottom:`2px solid ${gold}`,paddingBottom:3,marginBottom:10 }}>Professional Experience</div>{cv.workExperience.map(job=>(<div key={job.id} style={{ marginBottom:14 }}><div style={{ display:'flex',justifyContent:'space-between' }}><span style={{ fontWeight:800,fontSize:12 }}>{job.jobTitle}</span><span style={{ fontSize:10,color:'#9ca3af' }}>{dateRange(job.startDate,job.endDate,job.current)}</span></div><div style={{ fontSize:10.5,color:navy,fontWeight:700,marginBottom:4 }}>{[job.employer,job.location].filter(Boolean).join(' · ')}</div>{job.bullets.filter(Boolean).map((b,i)=>(<div key={i} style={{ fontSize:11,paddingLeft:10,position:'relative' as const,lineHeight:1.6 }}><span style={{ position:'absolute' as const,left:1,color:gold }}>▪</span>{b}</div>))}</div>))}</section>}
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:24 }}>
          {cv.education.length>0&&<section><div style={{ fontSize:9,fontWeight:800,color:navy,letterSpacing:2,textTransform:'uppercase' as const,borderBottom:`2px solid ${gold}`,paddingBottom:3,marginBottom:8 }}>Education</div>{cv.education.map(ed=>(<div key={ed.id} style={{ marginBottom:6 }}><div style={{ fontWeight:700,fontSize:11 }}>{ed.qualification}</div><div style={{ fontSize:10,color:'#6b7280' }}>{[ed.institution,ed.grade].filter(Boolean).join(' · ')}</div></div>))}</section>}
          <section><div style={{ fontSize:9,fontWeight:800,color:navy,letterSpacing:2,textTransform:'uppercase' as const,borderBottom:`2px solid ${gold}`,paddingBottom:3,marginBottom:8 }}>References</div>{cv.references.length>0?cv.references.map(r=>(<div key={r.id} style={{ fontSize:11 }}><span style={{ fontWeight:700 }}>{r.name}</span></div>)):<div style={{ fontSize:11,fontStyle:'italic',color:'#9ca3af' }}>On request.</div>}</section>
        </div>
      </div>
    </div>
  )
}

export function TemplateCity({ cv }: { cv: CvData }) {
  const city='#0ea5e9',dark='#0c1a2e'
  return (
    <div style={{ fontFamily:'Arial,sans-serif',fontSize:11.5,color:'#111',background:'#fff',display:'flex',minHeight:800 }}>
      <div style={{ width:150,minWidth:150,background:dark,padding:'28px 14px',flexShrink:0,color:'#fff' }}>
        <div style={{ fontSize:15,fontWeight:900,lineHeight:1.2,marginBottom:6,wordBreak:'break-word' as const }}>{cv.fullName||'Your Name'}</div>
        {cv.profilePhoto&&<img src={cv.profilePhoto} style={{ width:72,height:72,borderRadius:'50%',objectFit:'cover' as const,border:`3px solid ${city}`,marginBottom:10 }} alt="" />}
        {cv.professionalRegistration&&<div style={{ fontSize:8.5,color:city,fontWeight:700,marginBottom:10 }}>{cv.professionalRegistration}</div>}
        {[cv.phone,cv.email,cv.location].filter(Boolean).map((c,i)=>(<div key={i} style={{ fontSize:9,color:'#93c5fd',marginBottom:4 }}>{c}</div>))}
        {cv.skills.length>0&&<><div style={{ fontSize:7.5,fontWeight:800,color:city,letterSpacing:2,textTransform:'uppercase' as const,marginTop:14,marginBottom:5 }}>Skills</div>{cv.skills.map(s=>s.items.split(',').map(i=>i.trim()).filter(Boolean).map((item,idx)=>(<div key={idx} style={{ fontSize:9,color:'#bfdbfe',marginBottom:2 }}>· {item}</div>)))}</>}
        {cv.education.length>0&&<><div style={{ fontSize:7.5,fontWeight:800,color:city,letterSpacing:2,textTransform:'uppercase' as const,marginTop:12,marginBottom:5 }}>Education</div>{cv.education.map(ed=>(<div key={ed.id} style={{ marginBottom:5 }}><div style={{ fontSize:9.5,fontWeight:700 }}>{ed.qualification}</div><div style={{ fontSize:8.5,color:'#93c5fd' }}>{ed.institution}</div></div>))}</>}
      </div>
      <div style={{ flex:1,padding:'28px 24px' }}>
        {cv.personalStatement&&<section style={{ marginBottom:16 }}><div style={{ fontSize:9,fontWeight:800,color:city,letterSpacing:2,textTransform:'uppercase' as const,marginBottom:6 }}>About</div><p style={{ margin:0,lineHeight:1.75,fontSize:11.5 }}>{cv.personalStatement}</p></section>}
        {cv.workExperience.length>0&&<section style={{ marginBottom:16 }}><div style={{ fontSize:9,fontWeight:800,color:city,letterSpacing:2,textTransform:'uppercase' as const,borderBottom:'2px solid #e2e8f0',paddingBottom:4,marginBottom:10 }}>Experience</div>{cv.workExperience.map(job=>(<div key={job.id} style={{ marginBottom:14 }}><div style={{ display:'flex',justifyContent:'space-between' }}><span style={{ fontWeight:800,fontSize:12 }}>{job.jobTitle}</span><span style={{ fontSize:10,color:'#9ca3af' }}>{dateRange(job.startDate,job.endDate,job.current)}</span></div><div style={{ fontSize:10.5,color:city,fontWeight:600,marginBottom:4 }}>{[job.employer,job.location].filter(Boolean).join(' · ')}</div>{job.bullets.filter(Boolean).map((b,i)=>(<div key={i} style={{ fontSize:11,paddingLeft:10,position:'relative' as const,lineHeight:1.6 }}><span style={{ position:'absolute' as const,left:1,color:city }}>•</span>{b}</div>))}</div>))}</section>}
        <section><div style={{ fontSize:9,fontWeight:800,color:city,letterSpacing:2,textTransform:'uppercase' as const,marginBottom:6 }}>References</div>{cv.references.length>0?cv.references.map(r=>(<div key={r.id} style={{ fontSize:11 }}><span style={{ fontWeight:700 }}>{r.name}</span>{r.organisation?` — ${r.organisation}`:''}</div>)):<div style={{ fontSize:11,fontStyle:'italic',color:'#9ca3af' }}>On request.</div>}</section>
      </div>
    </div>
  )
}

export function TemplateMetro({ cv }: { cv: CvData }) {
  const acc='#f59e0b'
  return (
    <div style={{ fontFamily:'Arial,sans-serif',fontSize:11.5,color:'#374151',background:'#fff',minHeight:800 }}>
      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',background:'#1f2937' }}>
        <div style={{ padding:'28px 32px',borderRight:'1px solid #374151' }}>
          <div style={{ fontSize:22,fontWeight:900,color:'#fff',letterSpacing:-0.5,lineHeight:1.1 }}>{cv.fullName||'Your Name'}</div>
          {cv.professionalRegistration&&<div style={{ fontSize:9.5,color:acc,fontWeight:700,marginTop:4 }}>{cv.professionalRegistration}</div>}
        </div>
        <div style={{ padding:'28px 24px',display:'flex',flexDirection:'column' as const,justifyContent:'center',gap:4 }}>
          {cv.profilePhoto&&<img src={cv.profilePhoto} style={{ width:56,height:56,borderRadius:'50%',objectFit:'cover' as const,border:`2px solid ${acc}`,marginBottom:6 }} alt="" />}
          {cv.phone&&<div style={{ fontSize:10,color:'#9ca3af' }}>{cv.phone}</div>}
          {cv.email&&<div style={{ fontSize:10,color:'#9ca3af' }}>{cv.email}</div>}
          {cv.location&&<div style={{ fontSize:10,color:'#9ca3af' }}>{cv.location}</div>}
        </div>
      </div>
      <div style={{ height:4,background:acc }} />
      <div style={{ padding:'22px 32px' }}>
        {cv.personalStatement&&<section style={{ marginBottom:16 }}><div style={{ fontSize:9,fontWeight:800,color:'#1f2937',letterSpacing:2,textTransform:'uppercase' as const,marginBottom:5 }}>Profile</div><p style={{ margin:0,lineHeight:1.75 }}>{cv.personalStatement}</p></section>}
        {cv.skills.length>0&&<section style={{ marginBottom:16 }}><div style={{ fontSize:9,fontWeight:800,color:'#1f2937',letterSpacing:2,textTransform:'uppercase' as const,marginBottom:6 }}>Skills</div><div style={{ display:'flex',flexWrap:'wrap' as const,gap:5 }}>{cv.skills.map(s=>s.items.split(',').map(i=>i.trim()).filter(Boolean).map((item,idx)=>(<span key={idx} style={{ fontSize:10,background:'#f3f4f6',border:'1px solid #e5e7eb',borderLeft:`3px solid ${acc}`,color:'#111',padding:'2px 10px',fontWeight:600 }}>{item}</span>)))}</div></section>}
        {cv.workExperience.length>0&&<section style={{ marginBottom:16 }}><div style={{ fontSize:9,fontWeight:800,color:'#1f2937',letterSpacing:2,textTransform:'uppercase' as const,borderBottom:'2px solid #e5e7eb',paddingBottom:4,marginBottom:10 }}>Experience</div>{cv.workExperience.map(job=>(<div key={job.id} style={{ marginBottom:12 }}><div style={{ display:'flex',justifyContent:'space-between' }}><span style={{ fontWeight:800,fontSize:12 }}>{job.jobTitle}</span><span style={{ fontSize:10,color:'#9ca3af' }}>{dateRange(job.startDate,job.endDate,job.current)}</span></div><div style={{ fontSize:10.5,color:acc,fontWeight:700,marginBottom:4 }}>{[job.employer,job.location].filter(Boolean).join(' · ')}</div>{job.bullets.filter(Boolean).map((b,i)=>(<div key={i} style={{ fontSize:11,paddingLeft:10,position:'relative' as const,lineHeight:1.6 }}><span style={{ position:'absolute' as const,left:1 }}>•</span>{b}</div>))}</div>))}</section>}
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:20 }}>
          {cv.education.length>0&&<section><div style={{ fontSize:9,fontWeight:800,color:'#1f2937',letterSpacing:2,textTransform:'uppercase' as const,marginBottom:6 }}>Education</div>{cv.education.map(ed=>(<div key={ed.id} style={{ marginBottom:6 }}><div style={{ fontWeight:700,fontSize:11 }}>{ed.qualification}</div><div style={{ fontSize:10,color:'#6b7280' }}>{[ed.institution,ed.grade].filter(Boolean).join(' · ')}</div></div>))}</section>}
          <section><div style={{ fontSize:9,fontWeight:800,color:'#1f2937',letterSpacing:2,textTransform:'uppercase' as const,marginBottom:6 }}>References</div>{cv.references.length>0?cv.references.map(r=>(<div key={r.id} style={{ fontSize:11 }}><span style={{ fontWeight:700 }}>{r.name}</span></div>)):<div style={{ fontSize:11,fontStyle:'italic',color:'#9ca3af' }}>On request.</div>}</section>
        </div>
      </div>
    </div>
  )
}

export function TemplateGradient({ cv }: { cv: CvData }) {
  const a='#7c3aed',b='#2563eb'
  return (
    <div style={{ fontFamily:'Arial,sans-serif',fontSize:11.5,color:'#111',background:'#fff',minHeight:800 }}>
      <div style={{ background:`linear-gradient(135deg,${a},${b})`,padding:'32px 44px 26px',position:'relative' as const }}>
        <div style={{ position:'absolute' as const,top:0,right:0,width:200,height:'100%',background:'rgba(255,255,255,0.05)',clipPath:'polygon(30% 0,100% 0,100% 100%,0% 100%)' }} />
        {cv.profilePhoto&&<img src={cv.profilePhoto} style={{ width:72,height:72,borderRadius:'50%',objectFit:'cover' as const,border:'3px solid rgba(255,255,255,0.5)',marginBottom:10,display:'block' }} alt="" />}
        <div style={{ fontSize:26,fontWeight:900,color:'#fff',letterSpacing:-0.5 }}>{cv.fullName||'Your Name'}</div>
        {cv.professionalRegistration&&<div style={{ fontSize:10,color:'rgba(255,255,255,0.8)',fontWeight:700,marginTop:3 }}>{cv.professionalRegistration}</div>}
        <div style={{ display:'flex',gap:20,marginTop:10,fontSize:10,color:'rgba(255,255,255,0.75)',flexWrap:'wrap' as const }}>{cv.phone&&<span>{cv.phone}</span>}{cv.email&&<span>{cv.email}</span>}{cv.location&&<span>{cv.location}</span>}</div>
      </div>
      <div style={{ padding:'24px 44px' }}>
        {cv.personalStatement&&<section style={{ marginBottom:16 }}><div style={{ fontSize:9,fontWeight:800,color:a,letterSpacing:2,textTransform:'uppercase' as const,marginBottom:5 }}>Profile</div><p style={{ margin:0,lineHeight:1.75 }}>{cv.personalStatement}</p></section>}
        {cv.skills.length>0&&<section style={{ marginBottom:16 }}><div style={{ fontSize:9,fontWeight:800,color:a,letterSpacing:2,textTransform:'uppercase' as const,marginBottom:6 }}>Skills</div><div style={{ display:'flex',flexWrap:'wrap' as const,gap:5 }}>{cv.skills.map(s=>s.items.split(',').map(i=>i.trim()).filter(Boolean).map((item,idx)=>(<span key={idx} style={{ fontSize:10,background:'#f5f3ff',color:a,border:'1px solid #ddd6fe',borderRadius:20,padding:'2px 10px',fontWeight:600 }}>{item}</span>)))}</div></section>}
        {cv.workExperience.length>0&&<section style={{ marginBottom:16 }}><div style={{ fontSize:9,fontWeight:800,color:a,letterSpacing:2,textTransform:'uppercase' as const,borderBottom:'2px solid #e5e7eb',paddingBottom:4,marginBottom:10 }}>Experience</div>{cv.workExperience.map(job=>(<div key={job.id} style={{ marginBottom:14 }}><div style={{ display:'flex',justifyContent:'space-between' }}><span style={{ fontWeight:800,fontSize:12 }}>{job.jobTitle}</span><span style={{ fontSize:10,color:'#9ca3af' }}>{dateRange(job.startDate,job.endDate,job.current)}</span></div><div style={{ fontSize:10.5,color:b,fontWeight:600,marginBottom:4 }}>{[job.employer,job.location].filter(Boolean).join(' · ')}</div>{job.bullets.filter(Boolean).map((bi,i)=>(<div key={i} style={{ fontSize:11,paddingLeft:10,position:'relative' as const,lineHeight:1.6 }}><span style={{ position:'absolute' as const,left:1,color:a }}>•</span>{bi}</div>))}</div>))}</section>}
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:20 }}>
          {cv.education.length>0&&<section><div style={{ fontSize:9,fontWeight:800,color:a,letterSpacing:2,textTransform:'uppercase' as const,marginBottom:6 }}>Education</div>{cv.education.map(ed=>(<div key={ed.id} style={{ marginBottom:6 }}><div style={{ fontWeight:700,fontSize:11 }}>{ed.qualification}</div><div style={{ fontSize:10,color:'#6b7280' }}>{[ed.institution,ed.grade].filter(Boolean).join(' · ')}</div></div>))}</section>}
          <section><div style={{ fontSize:9,fontWeight:800,color:a,letterSpacing:2,textTransform:'uppercase' as const,marginBottom:6 }}>References</div>{cv.references.length>0?cv.references.map(r=>(<div key={r.id} style={{ fontSize:11 }}><span style={{ fontWeight:700 }}>{r.name}</span></div>)):<div style={{ fontSize:11,fontStyle:'italic',color:'#9ca3af' }}>On request.</div>}</section>
        </div>
      </div>
    </div>
  )
}

export function TemplateMagazine({ cv }: { cv: CvData }) {
  const blk='#111827'
  return (
    <div style={{ fontFamily:'"Helvetica Neue",Arial,sans-serif',fontSize:11.5,color:blk,background:'#fff',minHeight:800 }}>
      <div style={{ background:blk,padding:'32px 44px' }}>
        <div style={{ display:'flex',alignItems:'flex-end',justifyContent:'space-between',gap:20 }}>
          <div>
            <div style={{ fontSize:36,fontWeight:900,color:'#fff',letterSpacing:-2,lineHeight:1,textTransform:'uppercase' as const }}>{cv.fullName||'YOUR NAME'}</div>
            {cv.professionalRegistration&&<div style={{ fontSize:10,color:'#fbbf24',fontWeight:700,marginTop:6,letterSpacing:2 }}>{cv.professionalRegistration}</div>}
          </div>
          {cv.profilePhoto&&<img src={cv.profilePhoto} style={{ width:88,height:88,borderRadius:4,objectFit:'cover' as const,border:'3px solid #fbbf24',flexShrink:0 }} alt="" />}
        </div>
        <div style={{ display:'flex',gap:24,marginTop:14,paddingTop:12,borderTop:'1px solid #374151',fontSize:10,color:'#9ca3af' }}>{cv.phone&&<span>{cv.phone}</span>}{cv.email&&<span>{cv.email}</span>}{cv.location&&<span>{cv.location}</span>}</div>
      </div>
      <div style={{ padding:'24px 44px' }}>
        {cv.personalStatement&&<section style={{ marginBottom:18,paddingBottom:18,borderBottom:'2px solid #f3f4f6' }}><p style={{ margin:0,fontSize:13,lineHeight:1.8,color:'#374151',fontStyle:'italic' }}>{cv.personalStatement}</p></section>}
        {cv.skills.length>0&&<section style={{ marginBottom:18,paddingBottom:18,borderBottom:'2px solid #f3f4f6' }}><div style={{ fontSize:9,fontWeight:800,color:blk,letterSpacing:3,textTransform:'uppercase' as const,marginBottom:8 }}>Skills</div><div style={{ display:'flex',flexWrap:'wrap' as const,gap:6 }}>{cv.skills.map(s=>s.items.split(',').map(i=>i.trim()).filter(Boolean).map((item,idx)=>(<span key={idx} style={{ fontSize:10.5,background:blk,color:'#fff',borderRadius:3,padding:'3px 12px',fontWeight:600 }}>{item}</span>)))}</div></section>}
        {cv.workExperience.length>0&&<section style={{ marginBottom:18 }}><div style={{ fontSize:9,fontWeight:800,color:blk,letterSpacing:3,textTransform:'uppercase' as const,marginBottom:10 }}>Experience</div>{cv.workExperience.map(job=>(<div key={job.id} style={{ marginBottom:16,display:'grid',gridTemplateColumns:'110px 1fr',gap:16 }}><div style={{ fontSize:10,color:'#9ca3af',fontStyle:'italic',paddingTop:2 }}>{dateRange(job.startDate,job.endDate,job.current)}</div><div><div style={{ fontWeight:800,fontSize:12.5 }}>{job.jobTitle}</div><div style={{ fontSize:10.5,color:'#6b7280',marginBottom:5 }}>{[job.employer,job.location].filter(Boolean).join(', ')}</div>{job.bullets.filter(Boolean).map((b,i)=>(<div key={i} style={{ fontSize:11,paddingLeft:10,position:'relative' as const,lineHeight:1.65 }}><span style={{ position:'absolute' as const,left:1 }}>–</span>{b}</div>))}</div></div>))}</section>}
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:20 }}>
          {cv.education.length>0&&<section><div style={{ fontSize:9,fontWeight:800,color:blk,letterSpacing:3,textTransform:'uppercase' as const,marginBottom:6 }}>Education</div>{cv.education.map(ed=>(<div key={ed.id} style={{ marginBottom:6 }}><div style={{ fontWeight:700 }}>{ed.qualification}</div><div style={{ fontSize:10,color:'#6b7280' }}>{[ed.institution,ed.grade].filter(Boolean).join(' · ')}</div></div>))}</section>}
          <section><div style={{ fontSize:9,fontWeight:800,color:blk,letterSpacing:3,textTransform:'uppercase' as const,marginBottom:6 }}>References</div>{cv.references.length>0?cv.references.map(r=>(<div key={r.id} style={{ fontSize:11 }}><span style={{ fontWeight:700 }}>{r.name}</span></div>)):<div style={{ fontSize:11,fontStyle:'italic',color:'#9ca3af' }}>On request.</div>}</section>
        </div>
      </div>
    </div>
  )
}

export function TemplateCanvas({ cv }: { cv: CvData }) {
  return (
    <div style={{ fontFamily:'Arial,sans-serif',fontSize:11.5,color:'#111',background:'#f8fafc',minHeight:800,padding:0 }}>
      <div style={{ background:'#1e1b4b',padding:'28px 40px',display:'flex',gap:20,alignItems:'center' }}>
        {cv.profilePhoto&&<img src={cv.profilePhoto} style={{ width:80,height:80,borderRadius:8,objectFit:'cover' as const,border:'3px solid #a78bfa',flexShrink:0 }} alt="" />}
        <div style={{ flex:1 }}>
          <div style={{ fontSize:24,fontWeight:900,color:'#fff',letterSpacing:-0.5 }}>{cv.fullName||'Your Name'}</div>
          {cv.professionalRegistration&&<div style={{ fontSize:10,color:'#a78bfa',fontWeight:700,marginTop:2 }}>{cv.professionalRegistration}</div>}
          <div style={{ display:'flex',gap:16,marginTop:6,fontSize:10,color:'#c4b5fd',flexWrap:'wrap' as const }}>{cv.phone&&<span>{cv.phone}</span>}{cv.email&&<span>{cv.email}</span>}{cv.location&&<span>{cv.location}</span>}</div>
        </div>
      </div>
      <div style={{ padding:'24px 40px',background:'#fff' }}>
        {cv.personalStatement&&<section style={{ marginBottom:16,borderLeft:'4px solid #7c3aed',paddingLeft:12 }}><div style={{ fontSize:9,fontWeight:800,color:'#7c3aed',letterSpacing:2,textTransform:'uppercase' as const,marginBottom:5 }}>Profile</div><p style={{ margin:0,lineHeight:1.75 }}>{cv.personalStatement}</p></section>}
        {cv.skills.length>0&&<section style={{ marginBottom:16 }}><div style={{ fontSize:9,fontWeight:800,color:'#059669',letterSpacing:2,textTransform:'uppercase' as const,marginBottom:6 }}>Skills</div><div style={{ display:'flex',flexWrap:'wrap' as const,gap:5 }}>{cv.skills.map(s=>s.items.split(',').map(i=>i.trim()).filter(Boolean).map((item,idx)=>(<span key={idx} style={{ fontSize:10,background:'#f0fdf4',color:'#065f46',border:'1px solid #6ee7b7',borderRadius:20,padding:'2px 10px',fontWeight:600 }}>{item}</span>)))}</div></section>}
        {cv.workExperience.length>0&&<section style={{ marginBottom:16 }}><div style={{ fontSize:9,fontWeight:800,color:'#0891b2',letterSpacing:2,textTransform:'uppercase' as const,borderBottom:'2px solid #e0f2fe',paddingBottom:4,marginBottom:10 }}>Experience</div>{cv.workExperience.map(job=>(<div key={job.id} style={{ marginBottom:14,paddingLeft:12,borderLeft:'3px solid #0891b2' }}><div style={{ display:'flex',justifyContent:'space-between' }}><span style={{ fontWeight:800,fontSize:12 }}>{job.jobTitle}</span><span style={{ fontSize:10,color:'#9ca3af' }}>{dateRange(job.startDate,job.endDate,job.current)}</span></div><div style={{ fontSize:10.5,color:'#0891b2',fontWeight:600,marginBottom:4 }}>{[job.employer,job.location].filter(Boolean).join(' · ')}</div>{job.bullets.filter(Boolean).map((b,i)=>(<div key={i} style={{ fontSize:11,paddingLeft:10,position:'relative' as const,lineHeight:1.6 }}><span style={{ position:'absolute' as const,left:1 }}>•</span>{b}</div>))}</div>))}</section>}
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:20 }}>
          {cv.education.length>0&&<section><div style={{ fontSize:9,fontWeight:800,color:'#d97706',letterSpacing:2,textTransform:'uppercase' as const,marginBottom:6 }}>Education</div>{cv.education.map(ed=>(<div key={ed.id} style={{ marginBottom:6 }}><div style={{ fontWeight:700 }}>{ed.qualification}</div><div style={{ fontSize:10,color:'#6b7280' }}>{[ed.institution,ed.grade].filter(Boolean).join(' · ')}</div></div>))}</section>}
          <section><div style={{ fontSize:9,fontWeight:800,color:'#dc2626',letterSpacing:2,textTransform:'uppercase' as const,marginBottom:6 }}>References</div>{cv.references.length>0?cv.references.map(r=>(<div key={r.id} style={{ fontSize:11 }}><span style={{ fontWeight:700 }}>{r.name}</span></div>)):<div style={{ fontSize:11,fontStyle:'italic',color:'#9ca3af' }}>On request.</div>}</section>
        </div>
      </div>
    </div>
  )
}

export function TemplateSpectrum({ cv }: { cv: CvData }) {
  const spectColors=['#7c3aed','#0891b2','#059669','#d97706','#dc2626']
  return (
    <div style={{ fontFamily:'Arial,sans-serif',fontSize:11.5,color:'#111',background:'#fff',padding:'32px 44px',minHeight:800 }}>
      <div style={{ marginBottom:20 }}>
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:20 }}>
          <div>
            <div style={{ fontSize:28,fontWeight:900,color:'#111',letterSpacing:-0.5 }}>{cv.fullName||'Your Name'}</div>
            {cv.professionalRegistration&&<div style={{ fontSize:10.5,color:spectColors[0],fontWeight:700,marginTop:2 }}>{cv.professionalRegistration}</div>}
            <div style={{ display:'flex',gap:16,marginTop:6,fontSize:10,color:'#6b7280',flexWrap:'wrap' as const }}>{cv.phone&&<span>{cv.phone}</span>}{cv.email&&<span>{cv.email}</span>}{cv.location&&<span>{cv.location}</span>}</div>
          </div>
          {cv.profilePhoto&&<img src={cv.profilePhoto} style={{ width:76,height:76,borderRadius:'50%',objectFit:'cover' as const,border:`3px solid ${spectColors[0]}`,flexShrink:0 }} alt="" />}
        </div>
        <div style={{ display:'flex',gap:3,marginTop:12 }}>{spectColors.map((c,i)=>(<div key={i} style={{ height:5,flex:1,background:c,borderRadius:3 }} />))}</div>
      </div>
      {cv.personalStatement&&<section style={{ marginBottom:16,borderLeft:`4px solid ${spectColors[0]}`,paddingLeft:12 }}><p style={{ margin:0,lineHeight:1.75 }}>{cv.personalStatement}</p></section>}
      {cv.skills.length>0&&<section style={{ marginBottom:16 }}><div style={{ fontSize:9,fontWeight:800,color:spectColors[1],letterSpacing:2,textTransform:'uppercase' as const,marginBottom:6 }}>Skills</div><div style={{ display:'flex',flexWrap:'wrap' as const,gap:5 }}>{cv.skills.map((s,si)=>s.items.split(',').map(i=>i.trim()).filter(Boolean).map((item,idx)=>(<span key={idx} style={{ fontSize:10,background:'#f8fafc',color:spectColors[si%5],border:`1.5px solid ${spectColors[si%5]}`,borderRadius:20,padding:'2px 10px',fontWeight:600 }}>{item}</span>)))}</div></section>}
      {cv.workExperience.length>0&&<section style={{ marginBottom:16 }}><div style={{ fontSize:9,fontWeight:800,color:spectColors[2],letterSpacing:2,textTransform:'uppercase' as const,borderBottom:`2px solid #f3f4f6`,paddingBottom:4,marginBottom:10 }}>Experience</div>{cv.workExperience.map((job,ji)=>(<div key={job.id} style={{ marginBottom:14,paddingLeft:12,borderLeft:`3px solid ${spectColors[ji%5]}` }}><div style={{ display:'flex',justifyContent:'space-between' }}><span style={{ fontWeight:800,fontSize:12 }}>{job.jobTitle}</span><span style={{ fontSize:10,color:'#9ca3af' }}>{dateRange(job.startDate,job.endDate,job.current)}</span></div><div style={{ fontSize:10.5,color:spectColors[ji%5],fontWeight:600,marginBottom:4 }}>{[job.employer,job.location].filter(Boolean).join(' · ')}</div>{job.bullets.filter(Boolean).map((b,i)=>(<div key={i} style={{ fontSize:11,paddingLeft:10,position:'relative' as const,lineHeight:1.6 }}><span style={{ position:'absolute' as const,left:1 }}>•</span>{b}</div>))}</div>))}</section>}
      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:20 }}>
        {cv.education.length>0&&<section><div style={{ fontSize:9,fontWeight:800,color:spectColors[3],letterSpacing:2,textTransform:'uppercase' as const,marginBottom:6 }}>Education</div>{cv.education.map(ed=>(<div key={ed.id} style={{ marginBottom:6 }}><div style={{ fontWeight:700 }}>{ed.qualification}</div><div style={{ fontSize:10,color:'#6b7280' }}>{[ed.institution,ed.grade].filter(Boolean).join(' · ')}</div></div>))}</section>}
        <section><div style={{ fontSize:9,fontWeight:800,color:spectColors[4],letterSpacing:2,textTransform:'uppercase' as const,marginBottom:6 }}>References</div>{cv.references.length>0?cv.references.map(r=>(<div key={r.id} style={{ fontSize:11 }}><span style={{ fontWeight:700 }}>{r.name}</span></div>)):<div style={{ fontSize:11,fontStyle:'italic',color:'#9ca3af' }}>On request.</div>}</section>
      </div>
    </div>
  )
}

// ─── Template registry — 35 templates ───────────────────────────────────────
export const CV_TEMPLATES = [
  // NHS Clinical
  { id:'classic',       label:'NHS Classic',       desc:'Single column · Navy serif',           color:'#1B3A5C', best:'Band 3–7 clinical',    category:'Clinical',       hasPhoto:false },
  { id:'professional',  label:'NHS Professional',  desc:'Navy sidebar · Two-column',            color:'#1B3A5C', best:'Band 5+ registered',   category:'Clinical',       hasPhoto:false },
  { id:'modern',        label:'NHS Modern',        desc:'Teal accents · Pill skills',           color:'#0d9488', best:'Admin, AHP',           category:'Modern',         hasPhoto:false },
  { id:'executive',     label:'NHS Executive',     desc:'Dark header · Gold accents',           color:'#b45309', best:'Band 6–8 management',  category:'Executive',      hasPhoto:false },
  { id:'graduate',      label:'NHS Graduate',      desc:'Timeline · Purple · Compact',          color:'#6d28d9', best:'New to NHS, Band 2–3', category:'Modern',         hasPhoto:false },
  { id:'research',      label:'NHS Research',      desc:'Green accents · Academic',             color:'#15803d', best:'BMS, Research',        category:'Scientific',     hasPhoto:false },
  { id:'ats',           label:'NHS ATS Pure',      desc:'Zero decoration · ATS optimised',      color:'#18181b', best:'All roles (ATS)',       category:'ATS',            hasPhoto:false },
  { id:'lateral',       label:'NHS Lateral',       desc:'Indigo sidebar · Strong identity',     color:'#1e1b4b', best:'Senior clinical',       category:'Creative',       hasPhoto:false },
  { id:'timeless',      label:'NHS Timeless',      desc:'Cream bg · Charcoal serif',            color:'#78716c', best:'Experienced Band 5+',  category:'Classic',        hasPhoto:false },
  { id:'bold',          label:'NHS Bold',          desc:'Red header · High impact',             color:'#b91c1c', best:'Band 4–6',             category:'Creative',       hasPhoto:false },
  { id:'compact',       label:'NHS Compact',       desc:'Dense layout · Fits more content',     color:'#1d4ed8', best:'10+ years experience', category:'Classic',        hasPhoto:false },
  { id:'minimal',       label:'NHS Minimal',       desc:'Ultra-whitespace · Hairline rules',    color:'#18181b', best:'Clinical governance',  category:'Modern',         hasPhoto:false },
  // Adobe Series
  { id:'adobe-coral',   label:'Adobe Coral',       desc:'Coral header · Pill skills',           color:'#e8522a', best:'Creative & Admin',     category:'Adobe',          hasPhoto:false },
  { id:'adobe-split',   label:'Adobe Split',       desc:'Split header · Teal contact box',      color:'#0f766e', best:'Any NHS band',          category:'Adobe',          hasPhoto:false },
  { id:'adobe-duo',     label:'Adobe Duo',         desc:'Alternating sections · Indigo',        color:'#4338ca', best:'Band 3–6',             category:'Adobe',          hasPhoto:false },
  { id:'adobe-arc',     label:'Adobe Arc',         desc:'Angled violet header · Bold',          color:'#7c3aed', best:'Stand-out',            category:'Adobe',          hasPhoto:false },
  // NHS Extended
  { id:'nhs-ocean',     label:'NHS Ocean',         desc:'Gradient blue header · Pill skills',   color:'#0369a1', best:'Clinical Band 4–6',    category:'Clinical',       hasPhoto:false },
  { id:'nhs-slate',     label:'NHS Slate',         desc:'Dark slate sidebar · Cyan accents',    color:'#1e293b', best:'Senior clinical',       category:'Clinical',       hasPhoto:true  },
  { id:'nhs-royal',     label:'NHS Royal',         desc:'Navy centred · Classic NHS look',      color:'#1d4ed8', best:'Any NHS band',          category:'Clinical',       hasPhoto:true  },
  { id:'nhs-emerald',   label:'NHS Emerald',       desc:'Emerald header · Warm accent',         color:'#065f46', best:'Allied health',        category:'Clinical',       hasPhoto:true  },
  // Adobe Extended
  { id:'adobe-ember',   label:'Adobe Ember',       desc:'Warm orange gradient · Sidebar',       color:'#c2410c', best:'Dynamic roles',        category:'Adobe',          hasPhoto:false },
  { id:'adobe-azure',   label:'Adobe Azure',       desc:'Sky blue · Photo friendly · Clean',    color:'#0284c7', best:'Any band',              category:'Adobe',          hasPhoto:true  },
  { id:'adobe-prism',   label:'Adobe Prism',       desc:'Multi-colour accents · Creative',      color:'#6d28d9', best:'Creative roles',       category:'Adobe',          hasPhoto:false },
  { id:'adobe-night',   label:'Adobe Night',       desc:'Dark purple sidebar · High contrast',  color:'#1e1b4b', best:'Senior roles',         category:'Adobe',          hasPhoto:true  },
  { id:'adobe-blush',   label:'Adobe Blush',       desc:'Rose tones · Photo circle · Elegant',  color:'#be185d', best:'AHP, community roles', category:'Adobe',          hasPhoto:true  },
  // International & Modern
  { id:'international', label:'International',     desc:'Global format · Photo top-right',      color:'#2563eb', best:'International workers', category:'Modern',         hasPhoto:true  },
  { id:'scandinavia',   label:'Scandinavia',       desc:'Nordic minimal · Lots of whitespace',  color:'#737373', best:'Any role, clean look',  category:'Modern',         hasPhoto:true  },
  { id:'swiss',         label:'Swiss Grid',        desc:'Grid-based · Red rule · Structured',   color:'#dc2626', best:'Technical & research',  category:'Classic',        hasPhoto:false },
  // Corporate & City
  { id:'corporate',     label:'Corporate',         desc:'Dark navy · Gold accents · Executive', color:'#0f172a', best:'Management, Band 6–8', category:'Executive',      hasPhoto:true  },
  { id:'city',          label:'City',              desc:'Dark sidebar · Sky blue · Urban',      color:'#0c1a2e', best:'Senior clinical',       category:'Creative',       hasPhoto:true  },
  { id:'metro',         label:'Metro',             desc:'Dark header grid · Amber accent',      color:'#1f2937', best:'Band 4–7',             category:'Creative',       hasPhoto:true  },
  { id:'gradient',      label:'Gradient',          desc:'Purple-blue gradient · Photo ready',   color:'#7c3aed', best:'Any band',              category:'Modern',         hasPhoto:true  },
  // Creative
  { id:'magazine',      label:'Magazine',          desc:'Editorial bold · Dark header · Photo', color:'#111827', best:'Communications roles', category:'Creative',       hasPhoto:true  },
  { id:'canvas',        label:'Canvas',            desc:'Multi-colour sections · Creative',     color:'#1e1b4b', best:'Creative & research',  category:'Creative',       hasPhoto:true  },
  { id:'spectrum',      label:'Spectrum',          desc:'Rainbow accents · Photo circle',       color:'#7c3aed', best:'Any role',             category:'Creative',       hasPhoto:true  },
]

export const TEMPLATE_CATEGORIES = ['All', 'Clinical', 'Modern', 'Executive', 'Scientific', 'Creative', 'Classic', 'ATS', 'Adobe', '📷 Photo']

export function CvPreviewRouter({ cv }: { cv: CvData }) {
  switch (cv.template) {
    case 'professional':  return <TemplateProfessional  cv={cv} />
    case 'modern':        return <TemplateModern        cv={cv} />
    case 'executive':     return <TemplateExecutive     cv={cv} />
    case 'graduate':      return <TemplateGraduate      cv={cv} />
    case 'research':      return <TemplateResearch      cv={cv} />
    case 'ats':           return <TemplateATSPure       cv={cv} />
    case 'lateral':       return <TemplateLateral       cv={cv} />
    case 'timeless':      return <TemplateTimeless      cv={cv} />
    case 'bold':          return <TemplateBold          cv={cv} />
    case 'compact':       return <TemplateCompact       cv={cv} />
    case 'minimal':       return <TemplateMinimal       cv={cv} />
    case 'adobe-coral':   return <TemplateAdobeCoral   cv={cv} />
    case 'adobe-split':   return <TemplateAdobeSplit   cv={cv} />
    case 'adobe-duo':     return <TemplateAdobeDuo     cv={cv} />
    case 'adobe-arc':     return <TemplateAdobeArc     cv={cv} />
    case 'nhs-ocean':     return <TemplateNHSOcean     cv={cv} />
    case 'nhs-slate':     return <TemplateNHSSlate     cv={cv} />
    case 'nhs-royal':     return <TemplateNHSRoyal     cv={cv} />
    case 'nhs-emerald':   return <TemplateNHSEmerald   cv={cv} />
    case 'adobe-ember':   return <TemplateAdobeEmber   cv={cv} />
    case 'adobe-azure':   return <TemplateAdobeAzure   cv={cv} />
    case 'adobe-prism':   return <TemplateAdobePrism   cv={cv} />
    case 'adobe-night':   return <TemplateAdobeNight   cv={cv} />
    case 'adobe-blush':   return <TemplateAdobeBlush   cv={cv} />
    case 'international': return <TemplateInternational cv={cv} />
    case 'scandinavia':   return <TemplateScandinavia  cv={cv} />
    case 'swiss':         return <TemplateSwiss        cv={cv} />
    case 'corporate':     return <TemplateCorporate    cv={cv} />
    case 'city':          return <TemplateCity         cv={cv} />
    case 'metro':         return <TemplateMetro        cv={cv} />
    case 'gradient':      return <TemplateGradient     cv={cv} />
    case 'magazine':      return <TemplateMagazine     cv={cv} />
    case 'canvas':        return <TemplateCanvas       cv={cv} />
    case 'spectrum':      return <TemplateSpectrum     cv={cv} />
    default:              return <TemplateClassic      cv={cv} />
  }
}