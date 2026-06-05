import { PrismaClient } from "@prisma/client"

// ─────────────────────────────────────────────
// Global type-safe singleton for Next.js
// Prevents multiple Prisma instances in dev
// ─────────────────────────────────────────────

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// ─────────────────────────────────────────────
// Prisma Client Instance
// ─────────────────────────────────────────────

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["error", "warn"]
        : ["error"],
  })

// ─────────────────────────────────────────────
// Dev hot-reload protection
// ─────────────────────────────────────────────

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}

// ─────────────────────────────────────────────
// Default export (for compatibility with NextAuth / libs)
// ─────────────────────────────────────────────

export default prisma