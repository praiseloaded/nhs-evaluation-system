// app/api/cv/populate/route.ts
// Shared endpoint — Job Ready and NHS Templates both call this to push
// generated content into the user's active CV Profile.
// Handles profile creation, correct field formatting, and returns the profile ID.

import { auth }  from '@/auth'
import { getDb } from '@/lib/db-router'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const {
      personalStatement,
      keySkills,          // string[] — e.g. ["Venepuncture", "Specimen handling"]
      achievementBullets, // string[] — optional
      title,              // optional CV title
    } = await req.json()

    if (!personalStatement) {
      return Response.json({ error: 'personalStatement is required' }, { status: 400 })
    }

    const db = await getDb(session.user.id)

    // Build skills in the format CV builder expects:
    // [{ category: string, items: string[] }]
    // Items stored as array in DB, CV builder joins with comma on load
    const skillsPayload = keySkills?.length
      ? [{ category: 'Key Skills', items: keySkills }]
      : []

    // Find existing profile
    const existing = await db.cvProfile.findFirst({
      where:   { userId: session.user.id },
      orderBy: { updatedAt: 'desc' },
      select:  { id: true },
    }).catch(() => null)

    let profileId: string

    if (existing) {
      await db.cvProfile.update({
        where: { id: existing.id },
        data:  {
          personalStatement,
          skills: skillsPayload,
          // Store achievement bullets in additionalInfo as backup reference
          ...(achievementBullets?.length ? {
            additionalInfo: achievementBullets.join('\n'),
          } : {}),
        } as any,
      })
      profileId = existing.id
    } else {
      const created = await db.cvProfile.create({
        data: {
          userId:            session.user.id,
          title:             title || 'My CV',
          template:          'classic',
          personalStatement,
          skills:            skillsPayload,
          fullName:          '',
          email:             '',
          phone:             '',
          location:          '',
          ...(achievementBullets?.length ? {
            additionalInfo: achievementBullets.join('\n'),
          } : {}),
        } as any,
      })
      profileId = created.id
    }

    return Response.json({ success: true, profileId })
  } catch (error: any) {
    console.error('[cv/populate]', error)
    return Response.json({ error: error.message ?? 'Failed' }, { status: 500 })
  }
}