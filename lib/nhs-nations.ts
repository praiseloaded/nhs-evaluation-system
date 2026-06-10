// lib/nhs-nations.ts
//
// UK NHS nation detection and employer values registry.
// Used by generate-statement, generate-q2, and the launcher UI.
//
// Nations and their form formats:
//   Scotland         → 3-question Jobtrain (Q1 500w, Q2 500w, Q3 open)
//   England          → single supporting statement (word limit set per advert)
//   Wales            → single supporting statement (~1,500w)
//   Northern Ireland → single supporting statement (~1,200w)

export type NHSNation = 'scotland' | 'england' | 'wales' | 'northern_ireland' | 'unknown'

export type StatementFormat = 'three_question' | 'single_statement'

export interface NationConfig {
  nation: NHSNation
  label: string                    // "NHS Scotland"
  format: StatementFormat
  defaultWordLimit: number         // for single_statement nations
  q1Label?: string                 // Scotland only
  q2Label?: string
  q3Label?: string
  valuesFramework: string          // name of the values framework used
  coreValues: string[]             // the named values
}

export interface EmployerInfo {
  nation: NHSNation
  fullName: string
  shortName: string
  region?: string                  // e.g. "London", "North West"
  priorities: string[]             // strategic priorities for Q2 / statement values section
  additionalContext?: string       // any extra recruiter-relevant context
}

// ─────────────────────────────────────────────────────────────────────────────
// NATION CONFIGS
// ─────────────────────────────────────────────────────────────────────────────

export const NATION_CONFIGS: Record<NHSNation, NationConfig> = {
  scotland: {
    nation: 'scotland',
    label: 'NHS Scotland',
    format: 'three_question',
    defaultWordLimit: 500,
    q1Label: 'Why are you suitable for this role?',
    q2Label: 'Why do you want to work for the NHS?',
    q3Label: 'Any other relevant information?',
    valuesFramework: 'NHS Scotland Values',
    coreValues: [
      'Care and Compassion',
      'Dignity and Respect',
      'Openness, Honesty and Responsibility',
      'Quality and Teamwork',
      'Fairness',
    ],
  },
  england: {
    nation: 'england',
    label: 'NHS England',
    format: 'single_statement',
    defaultWordLimit: 1500,
    valuesFramework: 'NHS Constitution (England)',
    coreValues: [
      'Working together for patients',
      'Respect and dignity',
      'Commitment to quality of care',
      'Compassion',
      'Improving lives',
      'Everyone counts',
    ],
  },
  wales: {
    nation: 'wales',
    label: 'NHS Wales',
    format: 'single_statement',
    defaultWordLimit: 1500,
    valuesFramework: 'NHS Wales Values',
    coreValues: [
      'Working Together',
      'With Respect',
      'Always Improving',
      'Striving to Excel',
      'Caring for Each Other',
      'Keeping People Safe',
    ],
  },
  northern_ireland: {
    nation: 'northern_ireland',
    label: 'Health and Social Care Northern Ireland',
    format: 'single_statement',
    defaultWordLimit: 1200,
    valuesFramework: 'HSC Values Framework',
    coreValues: [
      'Working Together',
      'Excellence and Innovation',
      'Openness and Honesty',
      'Respect and Dignity',
      'Best Use of Resources',
    ],
  },
  unknown: {
    nation: 'unknown',
    label: 'NHS',
    format: 'single_statement',
    defaultWordLimit: 1500,
    valuesFramework: 'NHS Core Values',
    coreValues: [
      'Compassion',
      'Respect and dignity',
      'Working together',
      'Commitment to quality',
    ],
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// EMPLOYER REGISTRY
// ─────────────────────────────────────────────────────────────────────────────

const EMPLOYER_REGISTRY: EmployerInfo[] = [

  // ── NHS SCOTLAND ──────────────────────────────────────────────────────────

  {
    nation: 'scotland', fullName: 'NHS Lothian', shortName: 'NHS Lothian', region: 'Lothian',
    priorities: [
      'Our People, Our Priority — staff health, wellbeing and development',
      'Realistic Medicine — shared decision-making and reducing unwarranted variation',
      'Person-centred care built around individual patient needs',
      'Integration with Edinburgh and the Lothians Health and Social Care Partnerships',
      'Continuous quality improvement through the Lothian Quality Improvement Academy',
    ],
  },
  {
    nation: 'scotland', fullName: 'NHS Greater Glasgow and Clyde', shortName: 'NHS GGC', region: 'West of Scotland',
    priorities: [
      'ROAD values — Respect, Openness, Appreciation, Determination',
      "Reducing health inequalities across Scotland's most deprived communities",
      'Person-centred care and co-production with communities',
      "Sustainability and net zero as Scotland's largest health board",
      'Digital health innovation and remote monitoring programmes',
    ],
  },
  {
    nation: 'scotland', fullName: 'NHS Lanarkshire', shortName: 'NHS Lanarkshire', region: 'Lanarkshire',
    priorities: [
      'Keeping People Well — shifting focus to prevention and community care',
      'Safe, Effective and Person-Centred care as core quality dimensions',
      'Integration with North and South Lanarkshire Health and Social Care Partnerships',
      'Realistic Medicine principles embedded across all services',
      'Staff governance through the Partnership framework',
    ],
  },
  {
    nation: 'scotland', fullName: 'NHS Grampian', shortName: 'NHS Grampian', region: 'North East Scotland',
    priorities: [
      'The Grampian Quality Strategy — person-centred, safe and effective care',
      'Rural and remote care innovation across Aberdeenshire and Moray',
      'University health board partnership with University of Aberdeen',
      'Scottish Patient Safety Programme implementation',
      'Oil and energy sector occupational health expertise',
    ],
  },
  {
    nation: 'scotland', fullName: 'NHS Tayside', shortName: 'NHS Tayside', region: 'Tayside',
    priorities: [
      'Person-centred, safe and effective care aligned to Scottish Government priorities',
      'Academic health science partnership with University of Dundee',
      'Mental health transformation programme',
      'Rural service delivery across Angus and Perth and Kinross',
      'Digital transformation and electronic patient records rollout',
    ],
  },
  {
    nation: 'scotland', fullName: 'NHS Highland', shortName: 'NHS Highland', region: 'Highland',
    priorities: [
      "Scotland's largest geographic health board — rural and remote care as a specialty",
      'Community empowerment and asset-based approaches to health',
      'Integration with Highland Council — a pioneer integration authority',
      'Realistic Medicine and anticipatory care planning',
      'Staff attraction and retention in remote highland and island communities',
    ],
  },
  {
    nation: 'scotland', fullName: 'NHS Fife', shortName: 'NHS Fife', region: 'Fife',
    priorities: [
      'Person-centred care and the Fife Health and Social Care Partnership',
      'Prevention, early intervention and community resilience',
      'Digital health and the National Digital Platform adoption',
      'Quality improvement using the FOCUS methodology',
      'Staff wellbeing and flexible working as retention tools',
    ],
  },
  {
    nation: 'scotland', fullName: 'NHS Ayrshire and Arran', shortName: 'NHS Ayrshire and Arran', region: 'Ayrshire',
    priorities: [
      'Caring, safe and respectful — the Ayrshire and Arran Quality Framework',
      'Redesigning care closer to home with three HSCPs',
      'Mental health services transformation',
      'Prevention of health inequalities across coastal and rural communities',
      'Once for Scotland workforce policies and staff governance',
    ],
  },
  {
    nation: 'scotland', fullName: 'NHS Forth Valley', shortName: 'NHS Forth Valley', region: 'Forth Valley',
    priorities: [
      'Delivering the Forth Valley NHS Plan with integration at its core',
      'Forth Valley Royal Hospital as a purpose-built modern acute facility',
      'Reducing health inequalities in Clackmannanshire — one of Scotland\'s most deprived areas',
      'Person-centred care and the Chief Executive\'s Care Commitment',
      'Green NHS agenda and sustainability targets',
    ],
  },
  {
    nation: 'scotland', fullName: 'NHS Borders', shortName: 'NHS Borders', region: 'Scottish Borders',
    priorities: [
      'Rural health innovation for Scotland\'s most rural mainland Board',
      'Close integration with Scottish Borders Council social care',
      'Anticipatory care and keeping people well at home',
      'Realistic Medicine and shared decision-making',
      'Staff attraction to a high quality of life rural setting',
    ],
  },
  {
    nation: 'scotland', fullName: 'NHS Dumfries and Galloway', shortName: 'NHS D&G', region: 'Dumfries and Galloway',
    priorities: [
      'DGRI — Dumfries and Galloway Royal Infirmary as a modern purpose-built facility',
      'Rural healthcare across Scotland\'s largest rural council area',
      'Integration authority partnership with Dumfries and Galloway Council',
      'Prevention and self-management support',
      'Staff wellbeing in a close-knit rural community',
    ],
  },
  {
    nation: 'scotland', fullName: 'NHS Western Isles', shortName: 'NHS Western Isles', region: 'Western Isles',
    priorities: [
      'Island healthcare delivery across the Outer Hebrides',
      'Gaelic language services and cultural sensitivity',
      'Remote and rural care as a specialist competency',
      'Anticipatory care and telemedicine innovation',
      'Community-based approaches to health and wellbeing',
    ],
  },
  {
    nation: 'scotland', fullName: 'NHS Orkney', shortName: 'NHS Orkney', region: 'Orkney',
    priorities: [
      'Island healthcare for one of Scotland\'s smallest Boards',
      'Balfour Hospital as the main acute facility',
      'Remote consultation and digital health adoption',
      'Community-integrated care across Orkney\'s islands',
      'Staff recruitment and retention in an island setting',
    ],
  },
  {
    nation: 'scotland', fullName: 'NHS Shetland', shortName: 'NHS Shetland', region: 'Shetland',
    priorities: [
      'Healthcare delivery across Shetland\'s island communities',
      'Gilbert Bain Hospital as the main acute facility',
      'Remote and rural medicine as a core competency',
      'Air ambulance and inter-island transfer coordination',
      'Community resilience and self-care support',
    ],
  },
  {
    nation: 'scotland', fullName: 'NHS 24', shortName: 'NHS 24', region: 'National',
    priorities: [
      'Scotland\'s national telehealth service — 111 as the urgent care entry point',
      'Digital-first services and the NHS inform platform',
      'Reducing avoidable A&E attendances through effective triage',
      'Person-centred remote clinical assessment',
      'Staff development in telehealth and remote consultation competencies',
    ],
  },
  {
    nation: 'scotland', fullName: 'Scottish Ambulance Service', shortName: 'SAS', region: 'National',
    priorities: [
      'Responding to Life-Threatening Calls — the national response standard',
      'See and Treat and Hear and Treat models reducing unnecessary conveyances',
      'Paramedic Pathfinder and community-based clinical decision-making',
      'Air ambulance and remote area medical support',
      'Scotland-wide emergency and urgent care coverage',
    ],
  },
  {
    nation: 'scotland', fullName: 'Public Health Scotland', shortName: 'PHS', region: 'National',
    priorities: [
      'Prevention at population level — Scotland\'s lead public health agency',
      'Reducing health inequalities as the defining challenge',
      'Data, intelligence and evidence to drive improvement',
      'PLACE framework — People, Learning, Action, Community, Evidence',
      'Partnership with Scottish Government on national health improvement targets',
    ],
  },
  {
    nation: 'scotland', fullName: 'NHS Education for Scotland', shortName: 'NES', region: 'National',
    priorities: [
      'Developing Scotland\'s healthcare workforce through education and training',
      'Digital learning and the Turas platform',
      'Supporting newly qualified professionals through preceptorship programmes',
      'Advanced practice development and career frameworks',
      'Workforce planning and pipeline development across all NHS Scotland Boards',
    ],
  },

  // ── NHS ENGLAND — LONDON ──────────────────────────────────────────────────

  {
    nation: 'england', fullName: "Guy's and St Thomas' NHS Foundation Trust", shortName: 'GSTT', region: 'London',
    priorities: [
      'Our BEST values — Brave, Exceptional, Supportive, Together',
      'World-leading academic medicine through King\'s Health Partners',
      'Outstanding patient experience as a consistent CQC Outstanding-rated Trust',
      'Research and innovation integrated into everyday clinical care',
      'Diverse and inclusive workforce reflecting south London communities',
    ],
  },
  {
    nation: 'england', fullName: 'University College London Hospitals NHS Foundation Trust', shortName: 'UCLH', region: 'London',
    priorities: [
      'Our ICARE values — Integrity, Collaboration, Accountability, Respect, Excellence',
      'Academic partnership with UCL as a leading university hospital',
      'Innovation in clinical research and complex specialist care',
      'Patient safety as the foundation of everything we do',
      'Sustainable healthcare and net zero NHS commitment',
    ],
  },
  {
    nation: 'england', fullName: 'Imperial College Healthcare NHS Trust', shortName: 'Imperial', region: 'London',
    priorities: [
      'Our HEART values — Honesty, Equality, Access, Respect, Teamwork',
      'Academic medicine in partnership with Imperial College London',
      'Innovation and research embedded in clinical practice',
      'Specialist services across five west London hospitals',
      'Reducing inequalities for diverse west London communities',
    ],
  },
  {
    nation: 'england', fullName: "King's College Hospital NHS Foundation Trust", shortName: "King's", region: 'London',
    priorities: [
      'Our BRAVERY values — Bold, Respectful, Accountable, Visionary, Empowering, Resilient, Yearning to improve',
      'Academic medicine through King\'s Health Partners',
      'Major trauma centre and specialist liver services',
      'Serving diverse south London and Kent communities',
      'Outstanding education and training for clinical staff',
    ],
  },
  {
    nation: 'england', fullName: 'Barts Health NHS Trust', shortName: 'Barts Health', region: 'London',
    priorities: [
      'Our HEART values — Humanity, Excellence, Accountability, Respect, Teamwork',
      'Largest NHS Trust in England serving east London',
      'World-class cardiac services at St Bartholomew\'s Hospital',
      'Research and innovation through Queen Mary University of London',
      'Reducing health inequalities in some of London\'s most deprived boroughs',
    ],
  },
  {
    nation: 'england', fullName: 'Barking, Havering and Redbridge University Hospitals NHS Trust', shortName: 'BHRUT', region: 'London',
    priorities: [
      'Our PRIDE values — Passion, Respect, Integrity, Diversity, Excellence',
      'Serving east London and Essex communities across two major sites',
      'Improving patient safety and quality as an ongoing priority',
      'Workforce development and investment in our people',
      'Reducing inequalities in health outcomes for our communities',
    ],
  },
  {
    nation: 'england', fullName: 'Royal Free London NHS Foundation Trust', shortName: 'Royal Free', region: 'London',
    priorities: [
      'Outstanding specialist care including liver and renal services',
      'Academic partnership with UCL Medical School',
      'Innovation through the Royal Free Charity and research programmes',
      'Patient experience and safety as core priorities',
      'Diverse workforce serving north London communities',
    ],
  },
  {
    nation: 'england', fullName: 'North Middlesex University Hospital NHS Trust', shortName: 'North Middlesex', region: 'London',
    priorities: [
      'Serving one of London\'s most diverse boroughs — Enfield and Haringey',
      'Improving quality and patient safety as a core focus',
      'Workforce development and support for staff progression',
      'Community engagement and reducing health inequalities',
      'Digital transformation and electronic patient record adoption',
    ],
  },
  {
    nation: 'england', fullName: 'South London and Maudsley NHS Foundation Trust', shortName: 'SLaM', region: 'London',
    priorities: [
      'Leading mental health Trust — research through King\'s Health Partners',
      'Recovery-focused care and service user involvement',
      'Reducing inequalities in mental health access and outcomes',
      'Innovation in psychological therapies and community mental health',
      'Staff wellbeing and support in a demanding specialism',
    ],
  },
  {
    nation: 'england', fullName: 'Oxleas NHS Foundation Trust', shortName: 'Oxleas', region: 'London',
    priorities: [
      'Community and mental health services across south east London and Kent',
      'Recovery-focused and trauma-informed care',
      'Community-based care as an alternative to inpatient admission',
      'Staff development and progression in community settings',
      'Integration with local authorities and social care',
    ],
  },
  {
    nation: 'england', fullName: 'North East London NHS Foundation Trust', shortName: 'NELFT', region: 'London',
    priorities: [
      'Our NELFT Way values — Positively welcoming, Actively respectful, Courageously kind, Compassionately honest',
      'Community and mental health services across east London and Essex',
      'Early intervention and prevention in mental health',
      'Physical and mental health integration',
      'Reducing health inequalities in east London\'s diverse communities',
    ],
  },
  {
    nation: 'england', fullName: 'Chelsea and Westminster Hospital NHS Foundation Trust', shortName: 'C&W', region: 'London',
    priorities: [
      'Our PROUD values — Passionate, Respectful, Open, United, Determined',
      'Specialist HIV and sexual health services of international standing',
      'Paediatric and neonatal services for west London',
      'Outstanding patient experience — consistently high CQC ratings',
      'Research and innovation through CW+ charity',
    ],
  },
  {
    nation: 'england', fullName: 'Whittington Health NHS Trust', shortName: 'Whittington', region: 'London',
    priorities: [
      'Integrated care — acute, community and social care under one roof',
      'Serving Islington and Haringey — among London\'s most deprived boroughs',
      'Community-centred care and strong primary care partnerships',
      'Staff development and progression in an integrated setting',
      'Innovation in joined-up care pathways',
    ],
  },
  {
    nation: 'england', fullName: 'Homerton Healthcare NHS Foundation Trust', shortName: 'Homerton', region: 'London',
    priorities: [
      'Serving Hackney — one of London\'s most diverse and deprived boroughs',
      'Integrated acute and community care',
      'Outstanding maternity services and family health',
      'Staff diversity and inclusion as a lived commitment',
      'Community partnerships and social prescribing',
    ],
  },
  {
    nation: 'england', fullName: 'London Ambulance Service NHS Trust', shortName: 'LAS', region: 'London',
    priorities: [
      'Responding to over 2 million emergency calls per year in London',
      'Clinical excellence in pre-hospital care',
      'Equity in emergency response across all London communities',
      'Innovation in see-and-treat and mental health crisis response',
      'Staff wellbeing and resilience in a high-demand service',
    ],
  },

  // ── NHS ENGLAND — MIDLANDS ────────────────────────────────────────────────

  {
    nation: 'england', fullName: 'University Hospitals Birmingham NHS Foundation Trust', shortName: 'UHB', region: 'Midlands',
    priorities: [
      'Our values — Caring, Collaborative, Committed',
      'One of the largest NHS Trusts in England',
      'Research and innovation through the NIHR Birmingham Biomedical Research Centre',
      'Specialist and tertiary services for the West Midlands',
      'Staff development and education as a teaching hospital Trust',
    ],
  },
  {
    nation: 'england', fullName: 'Nottingham University Hospitals NHS Trust', shortName: 'NUH', region: 'Midlands',
    priorities: [
      'Our TREAT values — Teamwork, Respect, Excellence, Accountability, Transparency',
      'Academic medicine through University of Nottingham partnership',
      'Major trauma and specialist services for the East Midlands',
      'Patient safety improvement programmes',
      'Workforce development and staff progression',
    ],
  },
  {
    nation: 'england', fullName: "University Hospitals of Leicester NHS Trust", shortName: 'UHL', region: 'Midlands',
    priorities: [
      'Our values — Caring, Ambitious, Inclusive, Creative',
      'Academic medicine through University of Leicester',
      'Specialist cardiac, respiratory and cancer services',
      'Serving a diverse East Midlands population',
      'Research and innovation in clinical practice',
    ],
  },

  // ── NHS ENGLAND — NORTH ───────────────────────────────────────────────────

  {
    nation: 'england', fullName: 'Leeds Teaching Hospitals NHS Trust', shortName: 'LTHT', region: 'Yorkshire and Humber',
    priorities: [
      'Our values — Patient-centred, Fair, Collaborative, Accountable, Empowered',
      'One of the largest teaching hospital Trusts in England',
      'Academic partnership with University of Leeds',
      'Specialist and tertiary services for Yorkshire and beyond',
      'Staff development through the Leeds Institute of Medical Education',
    ],
  },
  {
    nation: 'england', fullName: 'Manchester University NHS Foundation Trust', shortName: 'MFT', region: 'North West',
    priorities: [
      'Our PROUD2CARE values — Professional, Respectful, Open, Understanding, Dignified, Caring, Achieving, Responsible, Excellent',
      'Largest NHS Foundation Trust in England',
      'Academic medicine through University of Manchester',
      'Innovation through the Manchester Academic Health Science Centre',
      'Specialist services including transplant and genomics',
    ],
  },
  {
    nation: 'england', fullName: 'Newcastle upon Tyne Hospitals NHS Foundation Trust', shortName: 'Newcastle Hospitals', region: 'North East',
    priorities: [
      'Our values — Respect, Compassion, Learning, Inclusion, Teamwork',
      'Academic medicine through Newcastle University',
      'Specialist services including transplant, neurosciences and cancer',
      'Research through the NIHR Newcastle Biomedical Research Centre',
      'Serving north east England and border communities',
    ],
  },
  {
    nation: 'england', fullName: 'Sheffield Teaching Hospitals NHS Foundation Trust', shortName: 'STH', region: 'Yorkshire and Humber',
    priorities: [
      'Our values — Patient First, Respectful, Inclusive, Compassionate, Always Improving',
      'Academic medicine through the University of Sheffield',
      'Specialist tertiary services for South Yorkshire',
      'Research through NIHR Sheffield Biomedical Research Centres',
      'Staff development and education as a leading teaching Trust',
    ],
  },

  // ── NHS ENGLAND — SOUTH AND EAST ─────────────────────────────────────────

  {
    nation: 'england', fullName: 'Oxford University Hospitals NHS Foundation Trust', shortName: 'OUH', region: 'South East',
    priorities: [
      'Our values — Caring, Safe, Excellent',
      'Academic medicine through University of Oxford',
      'World-leading research through NIHR Oxford Biomedical Research Centre',
      'Specialist and tertiary services for the Thames Valley',
      'Innovation in clinical research embedded in patient care',
    ],
  },
  {
    nation: 'england', fullName: 'Cambridge University Hospitals NHS Foundation Trust', shortName: 'CUH', region: 'East of England',
    priorities: [
      'Our CARE values — Compassionate, Aspirational, Respectful, Excellent',
      'Addenbrooke\'s Hospital — a leading academic medical centre',
      'Research through NIHR Cambridge Biomedical Research Centre',
      'Complex specialist care for the East of England',
      'Innovation in precision medicine and genomics',
    ],
  },
  {
    nation: 'england', fullName: 'Brighton and Sussex University Hospitals NHS Trust', shortName: 'BSUH', region: 'South East',
    priorities: [
      'Academic medicine through University of Brighton and University of Sussex',
      'Specialist services for Sussex and the south east coast',
      'Patient safety and quality as core priorities',
      'Innovation in clinical research and education',
      'Diverse workforce reflecting Sussex communities',
    ],
  },
  {
    nation: 'england', fullName: 'Gloucestershire Hospitals NHS Foundation Trust', shortName: 'GHT', region: 'South West',
    priorities: [
      'Our values — Proud of our past, Confident in our future',
      'Patient safety and quality improvement as ongoing priorities',
      'Serving a mix of urban and rural Gloucestershire communities',
      'Digital transformation and electronic patient records',
      'Staff wellbeing and development programmes',
    ],
  },

  // ── NHS WALES ─────────────────────────────────────────────────────────────

  {
    nation: 'wales', fullName: 'Cardiff and Vale University Health Board', shortName: 'Cardiff and Vale UHB', region: 'South Wales',
    priorities: [
      'Our values — Caring for People, Keeping People Safe, Working Together, Always Improving',
      'University health board partnership with Cardiff University',
      'Specialist tertiary services for Wales at University Hospital Wales',
      'Welsh language services and cultural competence',
      'Research and innovation through Wales Cancer Research Centre',
    ],
  },
  {
    nation: 'wales', fullName: 'Aneurin Bevan University Health Board', shortName: 'Aneurin Bevan UHB', region: 'South East Wales',
    priorities: [
      'Our CARE values — Caring, Achieving, Respect and Dignity, Excellence',
      'Serving the south east Wales valleys communities',
      'Grange University Hospital as the major acute facility',
      'Reducing health inequalities in former mining communities',
      'Integration with local authority social care',
    ],
  },
  {
    nation: 'wales', fullName: 'Swansea Bay University Health Board', shortName: 'Swansea Bay UHB', region: 'South West Wales',
    priorities: [
      'Our values — Caring, Working Together, Always Improving, Trusted',
      'Academic health board partnership with Swansea University',
      'Morriston Hospital as the regional major trauma centre',
      'Welsh language services across west Wales',
      'Innovation through the Applied Research Collaboration Wales',
    ],
  },
  {
    nation: 'wales', fullName: 'Betsi Cadwaladr University Health Board', shortName: 'Betsi Cadwaladr UHB', region: 'North Wales',
    priorities: [
      'Largest health board in Wales — serving north Wales and border communities',
      'Welsh language as a core service standard',
      'Rural healthcare across north Wales and Anglesey',
      'Academic partnership with Bangor University',
      'Improving quality and safety following special measures',
    ],
  },
  {
    nation: 'wales', fullName: 'Hywel Dda University Health Board', shortName: 'Hywel Dda UHB', region: 'West Wales',
    priorities: [
      'Serving rural and coastal communities across west Wales',
      'Welsh language as an integral part of care delivery',
      'Integration with local authority social care',
      'Prevention and community resilience',
      'Recruiting and retaining staff in a rural health board',
    ],
  },
  {
    nation: 'wales', fullName: 'Cwm Taf Morgannwg University Health Board', shortName: 'CTM UHB', region: 'Mid South Wales',
    priorities: [
      'Serving the south Wales valleys — one of Wales\' most deprived areas',
      'Our values — Working Together, Caring, Always Improving, Trusted',
      'Reducing health inequalities as a central strategic priority',
      'Community and prevention-focused care',
      'Workforce development in a predominantly community-based health board',
    ],
  },

  // ── HSC NORTHERN IRELAND ─────────────────────────────────────────────────

  {
    nation: 'northern_ireland', fullName: 'Belfast Health and Social Care Trust', shortName: 'Belfast HSC Trust', region: 'Belfast',
    priorities: [
      'Largest HSC Trust in Northern Ireland — acute, community and social care',
      'Royal Victoria Hospital and Belfast City Hospital as major acute sites',
      'Academic partnership with Queen\'s University Belfast',
      'Specialist tertiary services for Northern Ireland',
      'Workforce development and education in a teaching Trust',
    ],
  },
  {
    nation: 'northern_ireland', fullName: 'South Eastern Health and Social Care Trust', shortName: 'South Eastern HSC Trust', region: 'South Eastern NI',
    priorities: [
      'Integrated health and social care across Down and North Down',
      'Ulster Hospital as the main acute facility',
      'Community-based care as a strategic priority',
      'Staff development and progressive workforce culture',
      'Partnership working with voluntary and community sector',
    ],
  },
  {
    nation: 'northern_ireland', fullName: 'Northern Health and Social Care Trust', shortName: 'Northern HSC Trust', region: 'Northern NI',
    priorities: [
      'Integrated health and social care across Antrim, Causeway and Mid Ulster',
      'Antrim Area Hospital and Causeway Hospital as main acute sites',
      'Rural healthcare across Northern Ireland\'s largest geographic Trust',
      'Prevention and early intervention as strategic priorities',
      'Staff wellbeing and retention in rural and remote settings',
    ],
  },
  {
    nation: 'northern_ireland', fullName: 'Southern Health and Social Care Trust', shortName: 'Southern HSC Trust', region: 'Southern NI',
    priorities: [
      'Integrated health and social care across Armagh, Newry and Mourne, Down',
      'Craigavon Area Hospital as the main acute facility',
      'Cross-border healthcare partnerships with Republic of Ireland',
      'Community and mental health services transformation',
      'Cultural diversity and inclusion in service delivery',
    ],
  },
  {
    nation: 'northern_ireland', fullName: 'Western Health and Social Care Trust', shortName: 'Western HSC Trust', region: 'Western NI',
    priorities: [
      'Integrated health and social care across Derry, Strabane and Omagh',
      'Altnagelvin Hospital as the main acute facility including cancer services',
      'Cross-border cooperation with Letterkenny University Hospital',
      'Rural healthcare across the west of Northern Ireland',
      'Community resilience and preventative care',
    ],
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// DETECTION FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

// Keywords that strongly signal each nation
const SCOTLAND_SIGNALS = [
  'nhs scotland', 'health board', 'nhs lothian', 'nhs ggc', 'nhs grampian',
  'nhs tayside', 'nhs highland', 'nhs lanarkshire', 'nhs fife', 'nhs borders',
  'nhs ayrshire', 'nhs forth valley', 'nhs dumfries', 'nhs western isles',
  'nhs orkney', 'nhs shetland', 'nhs 24', 'scottish ambulance', 'public health scotland',
  'nhs education for scotland', 'jobtrain', 'nes', 'scot',
]

const WALES_SIGNALS = [
  'nhs wales', 'health board', 'cardiff and vale', 'aneurin bevan', 'swansea bay',
  'betsi cadwaladr', 'hywel dda', 'cwm taf', 'powys teaching', 'velindre',
  'wales', 'cymru', 'uhb', 'welsh',
]

const NI_SIGNALS = [
  'hsc', 'health and social care trust', 'belfast trust', 'south eastern trust',
  'northern trust', 'southern trust', 'western trust', 'northern ireland',
  'hscni', 'stormont',
]

export function detectNation(employer: string): NHSNation {
  if (!employer || employer.trim().length < 2) return 'unknown'
  const lower = employer.toLowerCase()

  // Scotland — check first because "health board" appears in both Scotland and Wales
  // but Scotland signals are usually distinctive
  if (SCOTLAND_SIGNALS.some(s => lower.includes(s))) return 'scotland'
  if (NI_SIGNALS.some(s => lower.includes(s))) return 'northern_ireland'
  if (WALES_SIGNALS.some(s => lower.includes(s))) return 'wales'

  // England — large set of known Trust names
  // Rather than exhaustive keywords, default to england if "nhs" or "hospital" or "trust" is present
  // and no other nation matched
  if (
    lower.includes('nhs') ||
    lower.includes('hospital') ||
    lower.includes('trust') ||
    lower.includes('foundation trust') ||
    lower.includes('icb') ||
    lower.includes('integrated care')
  ) return 'england'

  return 'unknown'
}

export function resolveEmployer(employer: string): EmployerInfo | null {
  if (!employer) return null
  const lower = employer.toLowerCase().trim()

  // Exact match first
  let match = EMPLOYER_REGISTRY.find(e => e.fullName.toLowerCase() === lower)
  if (match) return match

  // Short name match
  match = EMPLOYER_REGISTRY.find(e => e.shortName.toLowerCase() === lower)
  if (match) return match

  // Substring match — find first registry entry whose fullName is contained in employer or vice versa
  match = EMPLOYER_REGISTRY.find(e =>
    lower.includes(e.fullName.toLowerCase()) ||
    lower.includes(e.shortName.toLowerCase()) ||
    e.fullName.toLowerCase().includes(lower) ||
    e.shortName.toLowerCase().includes(lower)
  )
  return match ?? null
}

export function getNationConfig(employer: string): NationConfig {
  const nation = detectNation(employer)
  return NATION_CONFIGS[nation]
}

// ─────────────────────────────────────────────────────────────────────────────
// STATEMENT FORMAT HELPERS
// ─────────────────────────────────────────────────────────────────────────────

export interface StatementStructure {
  nation: NHSNation
  format: StatementFormat
  nationLabel: string
  // For three_question (Scotland)
  q1?: { label: string; hardLimit: number; targetLimit: number }
  q2?: { label: string; hardLimit: number; targetLimit: number }
  q3?: { label: string; description: string }
  // For single_statement (England, Wales, NI)
  single?: { defaultWordLimit: number; description: string }
}

export function getStatementStructure(employer: string): StatementStructure {
  const nation = detectNation(employer)
  const config = NATION_CONFIGS[nation]

  if (config.format === 'three_question') {
    return {
      nation,
      format: 'three_question',
      nationLabel: config.label,
      q1: { label: config.q1!, hardLimit: 500, targetLimit: 480 },
      q2: { label: config.q2!, hardLimit: 500, targetLimit: 450 },
      q3: { label: config.q3!, description: '100–200 words, or "None." if nothing applies' },
    }
  }

  const descriptions: Record<NHSNation, string> = {
    england: 'Single supporting statement — word limit set by the Trust on NHS Jobs or Trac',
    wales: 'Single supporting statement on NHS Wales Jobs — typically 1,500 words',
    northern_ireland: 'Single supporting statement on HSC Recruitment — typically 1,200 words',
    unknown: 'Single supporting statement — check the job advert for the word limit',
    scotland: '',
  }

  return {
    nation,
    format: 'single_statement',
    nationLabel: config.label,
    single: {
      defaultWordLimit: config.defaultWordLimit,
      description: descriptions[nation],
    },
  }
}

// Helper used by the launcher UI to show the right hint text
export function getEmployerHint(nation: NHSNation): string {
  const hints: Record<NHSNation, string> = {
    scotland: 'e.g. NHS Lothian, NHS Greater Glasgow and Clyde',
    england: 'e.g. Guy\'s and St Thomas\' NHS Foundation Trust, Leeds Teaching Hospitals',
    wales: 'e.g. Cardiff and Vale University Health Board',
    northern_ireland: 'e.g. Belfast Health and Social Care Trust',
    unknown: 'e.g. NHS Trust or Health Board name',
  }
  return hints[nation]
}