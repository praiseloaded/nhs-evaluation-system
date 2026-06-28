// lib/billing/tier.ts
// Admin users always return 'elite' with no limits.

import { prisma }  from '@/lib/prisma'
import { prisma2 } from '@/lib/db-router'

export type Tier = 'free' | 'pro' | 'elite'

export async function getUserTier(userId: string): Promise<Tier> {
  try {
    // Check primary database first
    let user = await prisma.user.findUnique({
      where:  { id: userId },
      select: { tier: true, role: true },
    })

    // Fall back to secondary database
    if (!user) {
      user = await prisma2.user.findUnique({
        where:  { id: userId },
        select: { tier: true, role: true },
      })
    }

    if (!user) return 'free'

    // Admins always get elite — no limits, no gates
    if (user.role === 'admin') return 'elite'

    return (user.tier as Tier) ?? 'free'
  } catch {
    return 'free'
  }
}

// Lightweight version for middleware / server components
export async function getUserTierAndRole(userId: string): Promise<{ tier: Tier; role: string }> {
  try {
    let user = await prisma.user.findUnique({
      where:  { id: userId },
      select: { tier: true, role: true },
    })
    if (!user) {
      user = await prisma2.user.findUnique({
        where:  { id: userId },
        select: { tier: true, role: true },
      })
    }
    if (!user) return { tier: 'free', role: 'user' }

    // Admin always gets elite
    const tier: Tier = user.role === 'admin' ? 'elite' : (user.tier as Tier) ?? 'free'
    return { tier, role: user.role ?? 'user' }
  } catch {
    return { tier: 'free', role: 'user' }
  }
}