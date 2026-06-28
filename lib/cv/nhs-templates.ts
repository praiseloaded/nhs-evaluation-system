// lib/cv/nhs-templates.ts
// NHS profession-specific CV template taxonomy
// Each template has: role metadata, ATS keywords, section headings, STAR prompts, cover letter tone

export interface NHSTemplate {
  id:          string
  title:       string
  band:        string
  category:    string
  description: string
  atsKeywords: string[]
  sections:    string[]
  starPrompts: string[]
  coverLetterTone: string
  registrationBody?: string
  typicalDuties:     string[]
}

export const NHS_TEMPLATES: NHSTemplate[] = [
  // ── Band 2 ──────────────────────────────────────────────────────────────────
  {
    id:          'healthcare-support-worker-b2',
    title:       'Healthcare Support Worker',
    band:        'Band 2',
    category:    'Clinical Support',
    description: 'Entry-level clinical support in ward or community settings',
    atsKeywords: ['patient care', 'personal hygiene', 'moving and handling', 'nutrition', 'vital signs', 'documentation', 'dignity', 'safeguarding', 'infection control', 'communication'],
    sections:    ['Personal Statement', 'Key Skills', 'Work Experience', 'Education & Training', 'Certifications', 'References'],
    starPrompts: [
      'Describe a time you maintained a patient\'s dignity during personal care.',
      'Give an example of raising a concern about a patient\'s condition.',
      'Describe how you managed a challenging communication with a patient or relative.',
    ],
    coverLetterTone: 'warm, compassionate, person-centred',
    typicalDuties: ['Assisting with personal care', 'Recording vital signs', 'Supporting mealtimes', 'Maintaining a clean environment', 'Assisting with patient mobility'],
  },
  {
    id:          'healthcare-assistant-b2',
    title:       'Healthcare Assistant',
    band:        'Band 2',
    category:    'Clinical Support',
    description: 'Ward-based patient care support across acute and community settings',
    atsKeywords: ['patient care', 'HCA', 'DNAR', 'basic life support', 'clinical observations', 'pressure care', 'catheter care', 'wound care', 'handover', 'MDT'],
    sections:    ['Personal Statement', 'Clinical Skills', 'Work Experience', 'Education', 'Certifications', 'References'],
    starPrompts: [
      'Describe a time you identified a change in a patient\'s condition and escalated appropriately.',
      'Give an example of working effectively as part of an MDT.',
      'Describe how you supported a patient with complex needs.',
    ],
    coverLetterTone: 'compassionate, reliable, team-focused',
    typicalDuties: ['Clinical observations', 'Wound dressing support', 'Patient transfers', 'Documentation', 'Stock management'],
  },

  // ── Band 3 ──────────────────────────────────────────────────────────────────
  {
    id:          'phlebotomist-b3',
    title:       'Phlebotomist',
    band:        'Band 3',
    category:    'Clinical Practice',
    description: 'Blood collection and specimen handling for diagnostic services',
    atsKeywords: ['venepuncture', 'cannulation', 'specimen integrity', 'sample handling', 'TRAK', 'patient identification', 'infection control', 'IPC', 'SOP', 'COSHH', 'sharps safety', 'labelling'],
    sections:    ['Personal Statement', 'Clinical Competencies', 'Work Experience', 'Qualifications', 'CPD & Training', 'References'],
    starPrompts: [
      'Describe a difficult venepuncture and how you managed patient anxiety.',
      'Give an example of identifying and resolving a specimen labelling error.',
      'Describe how you maintained sample integrity in a high-volume environment.',
    ],
    coverLetterTone: 'precise, patient-focused, technically competent',
    registrationBody: 'IBMS (associate)',
    typicalDuties: ['Venepuncture across all patient groups', 'Specimen processing and labelling', 'SOP compliance', 'Maintaining sharps safety', 'TRAK/LIS data entry'],
  },
  {
    id:          'medical-laboratory-assistant-b3',
    title:       'Medical Laboratory Assistant',
    band:        'Band 3',
    category:    'Pathology & Laboratory',
    description: 'Laboratory support in pathology, haematology or biochemistry',
    atsKeywords: ['specimen reception', 'sample processing', 'centrifuge', 'LIMS', 'COSHH', 'SOP', 'quality control', 'IPC', 'haematology', 'biochemistry', 'microbiology', 'turnaround time'],
    sections:    ['Personal Statement', 'Laboratory Skills', 'Work Experience', 'Education', 'Certifications', 'References'],
    starPrompts: [
      'Describe how you managed a high-volume workload while maintaining accuracy.',
      'Give an example of identifying a non-conforming sample and the steps you took.',
      'Describe your experience maintaining COSHH compliance in a laboratory.',
    ],
    coverLetterTone: 'methodical, quality-focused, detail-oriented',
    registrationBody: 'IBMS',
    typicalDuties: ['Sample reception and processing', 'Centrifugation and aliquoting', 'Quality control checks', 'LIMS data entry', 'Maintaining laboratory consumables'],
  },
  {
    id:          'clinical-support-worker-b3',
    title:       'Clinical Support Worker',
    band:        'Band 3',
    category:    'Clinical Support',
    description: 'Enhanced clinical support with expanded competencies in specialist areas',
    atsKeywords: ['clinical skills', 'ECG', 'phlebotomy', 'catheterisation', 'wound management', 'mentoring', 'SOP', 'clinical governance', 'escalation', 'patient safety'],
    sections:    ['Personal Statement', 'Clinical Competencies', 'Work Experience', 'Education & Training', 'CPD', 'References'],
    starPrompts: [
      'Describe a clinical procedure you were trained to perform and how you maintained competency.',
      'Give an example of mentoring a junior colleague.',
      'Describe how you contributed to a service improvement initiative.',
    ],
    coverLetterTone: 'confident, competent, development-focused',
    typicalDuties: ['ECG recording', 'Phlebotomy', 'Catheter care', 'Wound assessment support', 'Supervising Band 2 staff'],
  },

  // ── Band 4 ──────────────────────────────────────────────────────────────────
  {
    id:          'pathology-coordinator-b4',
    title:       'Pathology Coordinator',
    band:        'Band 4',
    category:    'Pathology & Laboratory',
    description: 'Operational coordination of pathology services and laboratory workflow',
    atsKeywords: ['pathology', 'laboratory workflow', 'LIMS', 'turnaround time', 'quality assurance', 'ISO 15189', 'UKAS', 'SOP', 'audit', 'stock management', 'staffing', 'escalation'],
    sections:    ['Personal Statement', 'Operational Skills', 'Work Experience', 'Qualifications', 'Management Experience', 'References'],
    starPrompts: [
      'Describe how you improved laboratory turnaround times.',
      'Give an example of managing a staffing shortfall in a pathology service.',
      'Describe your experience with quality management and audit.',
    ],
    coverLetterTone: 'organised, service-focused, quality-driven',
    registrationBody: 'IBMS',
    typicalDuties: ['Workflow management', 'Staff coordination', 'Quality audits', 'SOP review', 'Liaison with clinical teams', 'LIMS management'],
  },
  {
    id:          'admin-officer-b4',
    title:       'Administrative Officer',
    band:        'Band 4',
    category:    'Administration',
    description: 'Senior administrative support in clinical or corporate NHS settings',
    atsKeywords: ['administration', 'NHS systems', 'patient administration', 'PAS', 'EMIS', 'SystmOne', 'minute taking', 'diary management', 'data entry', 'FOI', 'GDPR', 'confidentiality'],
    sections:    ['Personal Statement', 'Administrative Skills', 'Work Experience', 'Education', 'IT Proficiency', 'References'],
    starPrompts: [
      'Describe how you managed a complex diary or scheduling challenge.',
      'Give an example of improving an administrative process.',
      'Describe your experience handling confidential information under GDPR.',
    ],
    coverLetterTone: 'professional, efficient, detail-oriented',
    typicalDuties: ['Managing correspondence', 'Maintaining records systems', 'Supporting governance meetings', 'Patient administration', 'Finance processing support'],
  },

  // ── Band 5 ──────────────────────────────────────────────────────────────────
  {
    id:          'biomedical-scientist-b5',
    title:       'Biomedical Scientist',
    band:        'Band 5',
    category:    'Pathology & Laboratory',
    description: 'HCPC-registered BMS delivering analytical laboratory services',
    atsKeywords: ['HCPC', 'IBMS', 'haematology', 'biochemistry', 'microbiology', 'blood transfusion', 'analytical', 'quality control', 'ISO 15189', 'UKAS', 'EQA', 'clinical governance', 'audit', 'SOP', 'QMS'],
    sections:    ['Personal Statement', 'Specialist Competencies', 'Work Experience', 'Qualifications', 'CPD & Revalidation', 'Publications/Audit', 'References'],
    starPrompts: [
      'Describe a complex analytical problem you resolved and the impact on patient care.',
      'Give an example of leading a quality improvement project in the laboratory.',
      'Describe your experience with external quality assurance and audit.',
    ],
    coverLetterTone: 'scientific, analytical, professionally confident',
    registrationBody: 'HCPC',
    typicalDuties: ['Analytical testing across disciplines', 'QC monitoring and review', 'EQA participation', 'SOP writing and review', 'Trainee supervision', 'Out-of-hours on-call'],
  },
  {
    id:          'clinical-research-assistant-b5',
    title:       'Clinical Research Assistant',
    band:        'Band 5',
    category:    'Research',
    description: 'Supporting clinical trials and research governance in NHS or academic settings',
    atsKeywords: ['GCP', 'ICH', 'clinical trials', 'MHRA', 'research ethics', 'REC', 'HRA', 'informed consent', 'data collection', 'CTMS', 'adverse events', 'protocol', 'randomisation', 'CTIMP'],
    sections:    ['Personal Statement', 'Research Skills', 'Work Experience', 'Education', 'GCP Certification', 'Publications', 'References'],
    starPrompts: [
      'Describe your experience managing participant recruitment for a clinical trial.',
      'Give an example of identifying and reporting a protocol deviation.',
      'Describe how you maintained data integrity in a research database.',
    ],
    coverLetterTone: 'rigorous, detail-oriented, ethically aware',
    typicalDuties: ['Patient recruitment and consent', 'Data collection and entry', 'Adverse event monitoring', 'Regulatory documentation', 'Liaison with sponsors', 'SOP compliance'],
  },
  {
    id:          'research-coordinator-b5',
    title:       'Research Coordinator',
    band:        'Band 5',
    category:    'Research',
    description: 'Coordinating multiple research studies across a clinical department',
    atsKeywords: ['research governance', 'GCP', 'NIHR', 'portfolio research', 'ethics', 'HRA', 'IRAS', 'regulatory submissions', 'CTMS', 'CRF', 'CDISC', 'monitoring visits', 'trial management'],
    sections:    ['Personal Statement', 'Research Coordination Skills', 'Work Experience', 'Qualifications', 'GCP & Training', 'Publications/Presentations', 'References'],
    starPrompts: [
      'Describe how you managed multiple concurrent research studies.',
      'Give an example of preparing for and responding to a monitoring visit.',
      'Describe your experience with regulatory submissions to HRA or MHRA.',
    ],
    coverLetterTone: 'organised, collaborative, scientifically credible',
    typicalDuties: ['Site initiation and close-out', 'Regulatory submissions', 'Study monitoring coordination', 'CRF completion oversight', 'Pharmacy liaison', 'R&D reporting'],
  },
]

export const TEMPLATE_CATEGORIES = [...new Set(NHS_TEMPLATES.map(t => t.category))]
export const TEMPLATE_BANDS      = [...new Set(NHS_TEMPLATES.map(t => t.band))].sort()

export function getTemplate(id: string): NHSTemplate | undefined {
  return NHS_TEMPLATES.find(t => t.id === id)
}

export function getTemplatesByBand(band: string): NHSTemplate[] {
  return NHS_TEMPLATES.filter(t => t.band === band)
}

export function getTemplatesByCategory(category: string): NHSTemplate[] {
  return NHS_TEMPLATES.filter(t => t.category === category)
}