// app/api/auth/reset-password/route.ts
//
// Security measures:
//  1. Token verified against database — not just trusted from URL
//  2. Expiry checked server-side — expired tokens always rejected
//  3. Token deleted immediately after use — single use only
//  4. Password hashed with bcrypt cost 12 before storage
//  5. Rate limited — max 5 attempts per IP per hour
//  6. Both databases updated correctly

export const runtime = 'nodejs'

import { prisma }  from '@/lib/prisma'
import { prisma2 } from '@/lib/db-router'
import bcrypt      from 'bcryptjs'
import { headers } from 'next/headers'

// ── Rate limiter ───────────────────────────────────────────────────────────
const ipAttempts = new Map<string, { count: number; resetAt: number }>()
const IP_LIMIT   = 5
const WINDOW_MS  = 60 * 60 * 1000

function checkRateLimit(ip: string): boolean {
  const now   = Date.now()
  const entry = ipAttempts.get(ip)
  if (!entry || now > entry.resetAt) {
    ipAttempts.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return true
  }
  if (entry.count >= IP_LIMIT) return false
  entry.count++
  return true
}

export async function POST(req: Request) {
  try {
    const headersList = await headers()
    const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim()
              ?? headersList.get('x-real-ip')
              ?? 'unknown'

    // Rate limit — max 5 reset attempts per IP per hour
    if (!checkRateLimit(ip)) {
      return Response.json(
        { error: 'Too many attempts. Please wait before trying again.' },
        { status: 429 }
      )
    }

    const { token, email, password } = await req.json().catch(() => ({}))

    // ── Input validation ─────────────────────────────────────────────────
    if (!token || !email || !password) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (typeof password !== 'string' || password.length < 8) {
      return Response.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    if (password.length > 128) {
      return Response.json({ error: 'Password is too long' }, { status: 400 })
    }

    const normalised = email.trim().toLowerCase()

    // ── Verify token exists and matches ──────────────────────────────────
    const record = await prisma.verificationToken.findFirst({
      where: { identifier: `reset:${normalised}` },
    })

    // Use constant-time comparison to prevent timing attacks
    const tokenMatches = record
      ? crypto.timingSafeEqual(Buffer.from(record.token), Buffer.from(token))
      : false

    if (!record || !tokenMatches) {
      return Response.json(
        { error: 'Invalid reset link. Please request a new one.' },
        { status: 400 }
      )
    }

    // ── Check expiry ─────────────────────────────────────────────────────
    if (new Date() > record.expires) {
      // Clean up expired token
      await prisma.verificationToken.deleteMany({
        where: { identifier: `reset:${normalised}` },
      }).catch(() => {})
      return Response.json(
        { error: 'Reset link has expired. Please request a new one.' },
        { status: 400 }
      )
    }

    // ── Delete token immediately — single use ─────────────────────────────
    // Delete BEFORE updating password so token can't be reused
    // even if the password update fails
    await prisma.verificationToken.deleteMany({
      where: { identifier: `reset:${normalised}` },
    })

    // ── Hash new password ─────────────────────────────────────────────────
    const hashed = await bcrypt.hash(password, 12)

    // ── Update password in correct database ───────────────────────────────
    const updated = await prisma.user.updateMany({
      where: { email: normalised },
      data:  { password: hashed },
    })

    if (updated.count === 0) {
      // User is in secondary database
      await prisma2.user.updateMany({
        where: { email: normalised },
        data:  { password: hashed },
      }).catch((err) => {
        console.error('[reset-password] Secondary DB update failed:', err)
        throw new Error('Password update failed — please try again')
      })
    }

    console.log(`[reset-password] Password updated for ${normalised}`)
    return Response.json({ success: true })

  } catch (error: any) {
    console.error('[reset-password] Error:', error)
    return Response.json(
      { error: error?.message ?? 'Reset failed. Please try again.' },
      { status: 500 }
    )
  }
}

// Need crypto for timingSafeEqual
import crypto from 'crypto'