// app/api/effective-user/route.ts
// Returns the effective user's profile — impersonated user if admin is impersonating,
// otherwise the logged-in user's own profile.

import { auth }              from '@/auth'
import { getDb }             from '@/lib/db-router'
import { getEffectiveUserId, getImpersonationState } from '@/lib/effective-user'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { isImpersonating, effectiveUserId } = await getImpersonationState()
    const userId = effectiveUserId ?? session.user.id

    const db   = await getDb(userId)
    const user = await db.user.findUnique({
      where:  { id: userId },
      select: {
        id: true, name: true, email: true, image: true,
        tier: true, role: true, createdAt: true,
        analysisUsed: true, analysisLimit: true,
      },
    })

    if (!user) return Response.json({ error: 'User not found' }, { status: 404 })

    return Response.json({
      success: true,
      isImpersonating,
      user: {
        id:            user.id,
        name:          user.name,
        email:         user.email,
        image:         user.image,
        tier:          user.tier,
        role:          user.role,
        analysisUsed:  user.analysisUsed,
        analysisLimit: user.analysisLimit,
      },
    })
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}