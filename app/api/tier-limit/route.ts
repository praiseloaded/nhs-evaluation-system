// app/api/tier-limit/route.ts
import { prisma }            from '@/lib/prisma'
import { auth }              from '@/auth'
import { getEffectiveUserId } from '@/lib/effective-user'
import { getUserTier }        from '@/lib/billing/tier'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = await getEffectiveUserId() ?? session.user.id
  const key    = new URL(req.url).searchParams.get('key') ?? 'analysisLimit'
  const tier   = await getUserTier(userId)

  const limit = await prisma.tierLimit.findUnique({
    where: { tier_key: { tier, key } },
    select: { value: true },
  }).catch(() => null)

  return Response.json({ tier, key, value: limit?.value ?? -1 })
}