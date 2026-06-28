// app/api/cv/upload/route.ts
// Accepts PDF or docx CV upload, extracts content via Gemini,
// returns structured CvData ready to populate the builder

import { auth }  from '@/auth'
import { getDb } from '@/lib/db-router'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const formData = await req.formData()
    const file     = formData.get('file') as File | null
    const saveId   = formData.get('saveId') as string | null // optional: existing profile id to overwrite

    if (!file) return Response.json({ error: 'No file provided' }, { status: 400 })

    const ext  = file.name.split('.').pop()?.toLowerCase()
    const ok   = ['pdf', 'doc', 'docx'].includes(ext ?? '')
    if (!ok) return Response.json({ error: 'Only PDF, DOC or DOCX files are accepted' }, { status: 400 })

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) throw new Error('GEMINI_API_KEY not set')

    // ── Extract text ───────────────────────────────────────────────────────────
    let extractedText = ''

    if (ext === 'pdf') {
      // Send directly to Gemini as base64 document
      const bytes      = await file.arrayBuffer()
      const base64Data = Buffer.from(bytes).toString('base64')

      const extractRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              role: 'user',
              parts: [
                { inline_data: { mime_type: 'application/pdf', data: base64Data } },
                { text: 'Extract ALL text from this CV/resume exactly as written. Return only the raw text, preserving structure. No commentary.' },
              ],
            }],
            generationConfig: { temperature: 0, maxOutputTokens: 8000, thinkingConfig: { thinkingBudget: 0 } },
          }),
        }
      )
      const extractData = await extractRes.json()
      extractedText = extractData?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    } else {
      // DOCX — use mammoth to extract text
      const mammoth = await import('mammoth')
      const bytes   = await file.arrayBuffer()
      const result  = await mammoth.extractRawText({ buffer: Buffer.from(bytes) })
      extractedText = result.value
    }

    if (!extractedText.trim()) {
      return Response.json({ error: 'Could not extract text from the file. Please try a different file.' }, { status: 422 })
    }

    // ── Structure with Gemini ──────────────────────────────────────────────────
    const prompt = `
You are an expert CV parser. Extract all information from this CV text and return it as structured JSON.

CV TEXT:
${extractedText.slice(0, 12000)}

Return ONLY valid JSON with this exact structure (no markdown, no comments):
{
  "fullName": "Full name of the candidate",
  "email": "email address or empty string",
  "phone": "phone number or empty string",
  "location": "city, country or empty string",
  "professionalRegistration": "e.g. NMC PIN, HCPC number, or empty string",
  "personalStatement": "professional summary/personal statement paragraph or empty string",
  "workExperience": [
    {
      "jobTitle": "job title",
      "employer": "employer name",
      "location": "location or empty string",
      "startDate": "e.g. Jan 2020 or 2020",
      "endDate": "e.g. Dec 2023 or empty string if current",
      "current": false,
      "bullets": ["responsibility or achievement 1", "responsibility or achievement 2"]
    }
  ],
  "education": [
    {
      "qualification": "degree or qualification name",
      "institution": "university or college name",
      "location": "location or empty string",
      "startDate": "start year or empty string",
      "endDate": "end year",
      "grade": "grade or classification or empty string"
    }
  ],
  "skills": [
    {
      "category": "skill category name e.g. Clinical Skills",
      "items": "comma separated list of skills in this category"
    }
  ],
  "certifications": [
    {
      "name": "certification name",
      "issuer": "issuing body or empty string",
      "date": "date obtained or empty string",
      "expiryDate": "expiry date or empty string"
    }
  ],
  "additionalInfo": "languages, IT skills, driving licence etc. or empty string",
  "references": [
    {
      "name": "referee name",
      "role": "job title or empty string",
      "organisation": "organisation or empty string",
      "relationship": "relationship e.g. Line manager or empty string",
      "email": "email or empty string",
      "phone": "phone or empty string"
    }
  ]
}

Rules:
- If references say "available on request" leave the references array empty
- Group skills into logical categories (Clinical Skills, IT Skills, Languages etc.)
- Keep bullet points concise — one achievement or responsibility per bullet
- If a date is missing, use empty string not null
- Work experience must be in reverse chronological order (most recent first)
`

    const structureRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature:      0.1,
            maxOutputTokens:  8000,
            responseMimeType: 'application/json',
            thinkingConfig:   { thinkingBudget: 0 },
          },
        }),
      }
    )

    if (!structureRes.ok) throw new Error(`Gemini structure error: ${structureRes.status}`)

    const structureData = await structureRes.json()
    const parts = structureData?.candidates?.[0]?.content?.parts ?? []
    let text = ''
    for (const part of parts) { if (part.text) text = part.text.trim() }

    const clean    = text.replace(/```json|```/g, '').trim()
    const parsed   = JSON.parse(clean)

    // ── Optionally save to DB ──────────────────────────────────────────────────
    let savedProfileId: string | null = null
    try {
      const db = await getDb(session.user.id)

      if (saveId) {
        // Overwrite existing profile
        await db.cvProfile.update({
          where: { id: saveId },
          data: {
            fullName:                parsed.fullName,
            email:                   parsed.email,
            phone:                   parsed.phone,
            location:                parsed.location,
            professionalRegistration: parsed.professionalRegistration,
            personalStatement:       parsed.personalStatement,
            workExperience:          parsed.workExperience,
            education:               parsed.education,
            skills:                  parsed.skills,
            certifications:          parsed.certifications,
            additionalInfo:          parsed.additionalInfo,
            references:              parsed.references,
          },
        })
        savedProfileId = saveId
      } else {
        // Create new profile
        const profile = await db.cvProfile.create({
          data: {
            userId:                  session.user.id,
            title:                   `${parsed.fullName || 'Uploaded'} CV`,
            template:                'classic',
            fullName:                parsed.fullName,
            email:                   parsed.email,
            phone:                   parsed.phone,
            location:                parsed.location,
            professionalRegistration: parsed.professionalRegistration,
            personalStatement:       parsed.personalStatement,
            workExperience:          parsed.workExperience,
            education:               parsed.education,
            skills:                  parsed.skills,
            certifications:          parsed.certifications,
            additionalInfo:          parsed.additionalInfo,
            references:              parsed.references,
          },
        })
        savedProfileId = profile.id
      }
    } catch (dbErr) {
      console.error('DB save error (non-fatal):', dbErr)
    }

    return Response.json({
      success: true,
      profileId: savedProfileId,
      extracted: parsed,
      charCount: extractedText.length,
    })

  } catch (error: any) {
    console.error('[cv/upload]', error)
    return Response.json({ error: error.message ?? 'Upload failed' }, { status: 500 })
  }
}