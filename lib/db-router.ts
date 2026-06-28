// lib/db-router.ts
import { PrismaClient } from '@prisma/client'
import { prisma }       from '@/lib/prisma'

// ── Secondary client ──────────────────────────────────────────────────────────
const globalForPrisma2 = globalThis as unknown as { prisma2: PrismaClient | undefined }

export const prisma2 = globalForPrisma2.prisma2 ?? new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL_2 } },
})

if (process.env.NODE_ENV !== 'production') globalForPrisma2.prisma2 = prisma2

// ── In-memory shard cache — avoids 2 DB lookups per request ──────────────────
// Maps userId → 'primary' | 'secondary'
// Cache is per-process and resets on server restart — safe, no stale data risk
const shardCache = new Map<string, 'primary' | 'secondary'>()

// ── getDb — route a userId to the correct shard ───────────────────────────────
// Checks BOTH shards in parallel (not serial) so neither shard has priority.
// Throws a clear error if user is not found in either — prevents silent
// fallback to the wrong shard which causes FK constraint violations.
export async function getDb(userId: string): Promise<PrismaClient> {
  // Return cached result if available
  const cached = shardCache.get(userId)
  if (cached) return cached === 'primary' ? prisma : prisma2

  // Check both shards simultaneously
  const [inPrimary, inSecondary] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { id: true } }).catch(() => null),
    prisma2.user.findUnique({ where: { id: userId }, select: { id: true } }).catch(() => null),
  ])

  if (inPrimary) {
    shardCache.set(userId, 'primary')
    return prisma
  }

  if (inSecondary) {
    shardCache.set(userId, 'secondary')
    return prisma2
  }

  // User not found in either shard — surface a clear error instead of
  // silently returning primary (which causes FK violations)
  throw new Error(
    `User ${userId} not found in any database shard. ` +
    `The session may be stale — please sign out and sign back in.`
  )
}

// ── getDbForNewUser — pick the shard with fewer users for load balancing ──────
export async function getDbForNewUser(): Promise<PrismaClient> {
  if (!process.env.DATABASE_URL_2) return prisma

  const [count1, count2] = await Promise.all([
    prisma.user.count().catch(() => 0),
    prisma2.user.count().catch(() => 0),
  ])

  return count2 < count1 ? prisma2 : prisma
}

// ── clearShardCache — call after user deletion or shard migration ─────────────
export function clearShardCache(userId?: string) {
  if (userId) shardCache.delete(userId)
  else shardCache.clear()
}