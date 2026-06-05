import { prisma } from '@/lib/prisma'

export type UserTier = "free" | "pro"

export async function getUserTier(userId: string): Promise<UserTier> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { tier: true },
    })
    return user?.tier === 'pro' ? 'pro' : 'free'
  } catch {
    return 'free'
  }
}