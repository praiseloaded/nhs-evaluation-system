// app/api/cv/templates/route.ts
// GET  → list all templates
// POST → generate ATS-optimised CV content from a template + user profile

import { auth }             from '@/auth'
import { getDb }            from '@/lib/db-router'
import { NHS_TEMPLATES, getTemplate } from '@/lib/cv/nhs-templates'

export const runtime = 'nodejs'

// GET — list all templates (public, no auth needed)
export async function GET() {
  return Response.json({ success: true, templates: NHS_TEMPLATES })
}

// POST — generate CV content for a specific template + user profile
export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })
    const db = await getDb(session.user.id)

    const { templateId, profileId, additionalContext } = await req.json()
    if (!templateId) return Response.json({ error: 'templateId required' }, { status: 400 })

    const template = getTemplate(templateId)
    if (!template) return Response.json({ error: 'Template not found' }, { status: 404 })

    // Load existing CV profile if provided
    let profile: any = null
    if (profileId) {
      profile = await db.cvProfile.findUnique({ where: { id: profileId } }).catch(() => null)
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) throw new Error('GEMINI_API_KEY not set')

    const prompt = buildCVPrompt(template, profile, additionalContext)

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature:        0.3,
            maxOutputTokens:    4000,
            responseMimeType:   'application/json',
            thinkingConfig:     { thinkingBudget: 0 },
          },
        }),
      }
    )

    if (!response.ok) throw new Error(`Gemini error: ${response.status}`)

    const data  = await response.json()
    const parts = data?.candidates?.[0]?.content?.parts ?? []
    let text = ''
    for (const part of parts) { if (part.text) text = part.text.trim() }

    const generated = JSON.parse(text)

    // If user has a profile, optionally save the generated content back
    if (profileId && profile) {
      await db.cvProfile.update({
        where: { id: profileId },
        data: {
          personalStatement: generated.personalStatement ?? profile.personalStatement,
        },
      }).catch(() => {})
    }

    return Response.json({
      success:   true,
      template,
      generated,
    })
  } catch (error: any) {
    console.error('[cv/templates]', error)
    return Response.json({ error: error.message ?? 'Failed' }, { status: 500 })
  }
}

function buildCVPrompt(template: any, profile: any, additionalContext?: string): string {
  const profileBlock = profile ? `
EXISTING PROFILE DATA:
- Name: ${profile.fullName ?? 'Not provided'}
- Current role: ${profile.personalStatement?.slice(0, 200) ?? 'Not provided'}
- Work experience: ${JSON.stringify(profile.workExperience ?? []).slice(0, 1000)}
- Education: ${JSON.stringify(profile.education ?? []).slice(0, 500)}
- Skills: ${JSON.stringify(profile.skills ?? []).slice(0, 300)}
` : 'No existing profile — generate placeholder guidance text the user can replace.'

  return `
You are an expert NHS CV writer. Generate ATS-optimised CV content for this specific NHS role template.

ROLE: ${template.title} (${template.band})
CATEGORY: ${template.category}
DESCRIPTION: ${template.description}
${template.registrationBody ? `REGISTRATION: Required — ${template.registrationBody}` : ''}

ATS KEYWORDS TO INCORPORATE:
${template.atsKeywords.join(', ')}

TYPICAL DUTIES FOR THIS ROLE:
${template.typicalDuties.join('\n')}

STAR ACHIEVEMENT PROMPTS TO REFERENCE:
${template.starPrompts.join('\n')}

${profileBlock}
${additionalContext ? `ADDITIONAL CONTEXT FROM USER:\n${additionalContext}` : ''}

Generate NHS CV content with these sections: ${template.sections.join(', ')}

RULES:
1. Personal statement: 150–200 words, past-tense STAR examples, no banned phrases (eager, passionate, committed)
2. Weave in ATS keywords naturally — never list them
3. Each work experience bullet: start with strong action verb, include measurable outcome
4. For placeholders: use [PLACEHOLDER: description] format so user knows what to fill in
5. ${template.registrationBody ? `Include registration status section — ${template.registrationBody} registration is essential` : 'No registration required for this band'}

Respond ONLY with JSON:
{
  "personalStatement": "150-200 word NHS personal statement",
  "keySkills": ["skill 1", "skill 2", "skill 3", "skill 4", "skill 5", "skill 6"],
  "achievementBullets": ["Past-tense achievement 1", "Past-tense achievement 2", "Past-tense achievement 3"],
  "sectionGuidance": {
    "workExperience": "Advice on formatting work experience for this role",
    "education": "What qualifications to highlight and how",
    "certifications": "Key certifications that strengthen this application"
  },
  "atsScore": {
    "keywordsIncluded": ["keyword1", "keyword2"],
    "keywordsMissing": [],
    "recommendation": "One sentence on how to improve ATS score"
  },
  "coverLetterOpener": "One strong opening sentence for a cover letter for this role"
}
`.trim()
}