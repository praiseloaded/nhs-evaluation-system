// lib/billing/tier.ts

import { prisma }  from '@/lib/prisma'
import { prisma2 } from '@/lib/db-router'

export type UserTier = 'free' | 'pro' | 'elite'

export async function getUserTier(userId: string): Promise<UserTier> {
  try {
    // Check primary database first
    let user = await prisma.user.findUnique({
      where:  { id: userId },
      select: { tier: true, dbShard: true },
    })

    // If not found or shard says secondary, check secondary database
    if (!user || user.dbShard === 'secondary') {
      const user2 = await prisma2.user.findUnique({
        where:  { id: userId },
        select: { tier: true },
      }).catch(() => null)
      if (user2) user = user2
    }

    const tier = user?.tier
    if (tier === 'elite') return 'elite'
    if (tier === 'pro')   return 'pro'
    return 'free'
  } catch {
    return 'free'
  }
}