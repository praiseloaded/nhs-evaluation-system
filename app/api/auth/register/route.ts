// app/api/auth/register/route.ts

export const runtime = 'nodejs'

import bcrypt              from 'bcryptjs'
import { getDbForNewUser } from '@/lib/db-router'
import { sendEmail }       from '@/lib/email'
import { welcomeEmail }    from '@/lib/email-templates'
import { headers }         from 'next/headers'

// ── Rate limiter — max 5 registrations per IP per hour ────────────────────────
const ipAttempts = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string): boolean {
  const now   = Date.now()
  const entry = ipAttempts.get(ip)
  if (!entry || now > entry.resetAt) {
    ipAttempts.set(ip, { count: 1, resetAt: now + 60 * 60 * 1000 })
    return true
  }
  if (entry.count >= 5) return false
  entry.count++
  return true
}

// ── Validation helpers ────────────────────────────────────────────────────────

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function isValidPassword(password: string): { ok: boolean; reason?: string } {
  if (password.length < 8)   return { ok: false, reason: 'Password must be at least 8 characters' }
  if (password.length > 128) return { ok: false, reason: 'Password is too long' }
  return { ok: true }
}

function sanitiseName(name: string): string {
  return name.replace(/[<>{}[\]\\\/]/g, '').trim().slice(0, 100)
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const headersList = await headers()
    const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim()
              ?? headersList.get('x-real-ip')
              ?? 'unknown'

    // Rate limit
    if (!checkRateLimit(ip)) {
      return Response.json(
        { error: 'Too many registration attempts. Please try again later.' },
        { status: 429 }
      )
    }

    const body = await req.json().catch(() => ({}))

    const rawName  = String(body.name     ?? '').trim()
    const rawEmail = String(body.email    ?? '').trim().toLowerCase()
    const password = String(body.password ?? '')

    // ── Validation ────────────────────────────────────────────────────────────
    if (!rawName || !rawEmail || !password) {
      return Response.json({ error: 'All fields are required' }, { status: 400 })
    }

    const name = sanitiseName(rawName)
    if (name.length < 2) {
      return Response.json({ error: 'Please enter your full name' }, { status: 400 })
    }

    if (!isValidEmail(rawEmail)) {
      return Response.json({ error: 'Please enter a valid email address' }, { status: 400 })
    }

    const pwCheck = isValidPassword(password)
    if (!pwCheck.ok) {
      return Response.json({ error: pwCheck.reason }, { status: 400 })
    }

    // ── Database ──────────────────────────────────────────────────────────────
    const { client, shard } = await getDbForNewUser()

    const existingUser = await client.user.findUnique({ where: { email: rawEmail } })
    if (existingUser) {
      return Response.json({ error: 'An account with this email already exists' }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    const user = await client.user.create({
      data: {
        name,
        email:    rawEmail,
        password: hashedPassword,
        dbShard:  shard,
      },
    })

    console.log(`[register] User ${user.id} created in ${shard} database`)

    // ── Welcome email — fire and forget ───────────────────────────────────────
    sendEmail({
      to:      user.email!,
      subject: 'Welcome to OmniJobReady AI™',
      html:    welcomeEmail(user.name ?? '', `${process.env.NEXTAUTH_URL}/dashboard`),
    }).catch(err => console.error('[register] welcome email failed:', err))

    return Response.json({ success: true, userId: user.id })

  } catch (error: any) {
    console.error('[register]', error)
    return Response.json({ error: 'Registration failed. Please try again.' }, { status: 500 })
  }
}