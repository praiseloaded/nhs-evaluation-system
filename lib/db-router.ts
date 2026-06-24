// lib/db-router.ts
// Routes users to their assigned database.
//
// HOW IT WORKS:
//   Registration → getDbForNewUser() assigns the less-loaded DB → saves dbShard on user
//   All subsequent requests → getDb(userId) checks primary first, then secondary
//   All data for a user (applications, statements, analysis) stays in same DB

import { PrismaClient }  from '@prisma/client'
import { prisma }        from '@/lib/prisma'

// ── Secondary database client ─────────────────────────────────────────────────

const g = globalThis as unknown as { prisma2: PrismaClient | undefined }

export const prisma2 = g.prisma2 ?? new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL_2 } },
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
})

if (process.env.NODE_ENV !== 'production') g.prisma2 = prisma2

// ── Get the right database for an existing user ───────────────────────────────
// 1. Check primary DB first — reads dbShard field if present
// 2. If not found in primary, check secondary (user was registered there)
// 3. Default to primary as final fallback

export async function getDb(userId: string): Promise<PrismaClient> {
  if (!process.env.DATABASE_URL_2) return prisma

  // Check primary database
  const userInPrimary = await prisma.user.findUnique({
    where:  { id: userId },
    select: { id: true, dbShard: true },
  }).catch(() => null)

  if (userInPrimary) {
    // Found in primary — return secondary if that's where they were assigned
    return userInPrimary.dbShard === 'secondary' ? prisma2 : prisma
  }

  // Not in primary — check secondary database
  const userInSecondary = await prisma2.user.findUnique({
    where:  { id: userId },
    select: { id: true },
  }).catch(() => null)

  if (userInSecondary) return prisma2

  // Final fallback — should not happen but never crash
  return prisma
}

// ── Pick database for a new user registration ─────────────────────────────────

export async function getDbForNewUser(): Promise<{
  client: PrismaClient
  shard:  'primary' | 'secondary'
}> {
  if (!process.env.DATABASE_URL_2) {
    return { client: prisma, shard: 'primary' }
  }

  const [count1, count2] = await Promise.all([
    prisma.user.count().catch(() => 0),
    prisma2.user.count().catch(() => 0),
  ])

  if (count2 < count1) return { client: prisma2, shard: 'secondary' }
  return { client: prisma, shard: 'primary' }
}
