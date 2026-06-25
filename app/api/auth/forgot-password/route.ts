// app/api/auth/forgot-password/route.ts
//
// Security measures:
//  1. Rate limited — max 3 requests per email per hour, max 10 per IP per hour
//  2. Always returns success — never reveals whether email is registered
//  3. Token is 32 random bytes — cryptographically unguessable
//  4. Token expires in 1 hour and is single-use
//  5. Google-only accounts (no password) silently ignored
//  6. Both primary and secondary databases checked

export const runtime = 'nodejs'

import { prisma }    from '@/lib/prisma'
import { prisma2 }   from '@/lib/db-router'
import { sendEmail } from '@/lib/email'
import crypto        from 'crypto'
import { headers }   from 'next/headers'

// ── In-memory rate limiter ─────────────────────────────────────────────────
// Resets on server restart — sufficient for abuse prevention without Redis.
// Limits: 3 attempts per email per hour, 10 per IP per hour.

const emailAttempts = new Map<string, { count: number; resetAt: number }>()
const ipAttempts    = new Map<string, { count: number; resetAt: number }>()

const EMAIL_LIMIT = 3   // per email per hour
const IP_LIMIT    = 10  // per IP per hour
const WINDOW_MS   = 60 * 60 * 1000 // 1 hour

function checkRateLimit(map: Map<string, { count: number; resetAt: number }>, key: string, limit: number): boolean {
  const now    = Date.now()
  const entry  = map.get(key)

  if (!entry || now > entry.resetAt) {
    map.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return true // allowed
  }

  if (entry.count >= limit) return false // blocked

  entry.count++
  return true // allowed
}

// ── Route handler ─────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const headersList = await headers()
    const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim()
              ?? headersList.get('x-real-ip')
              ?? 'unknown'

    const body = await req.json().catch(() => ({}))
    const email = (body.email ?? '').trim().toLowerCase()

    if (!email || !email.includes('@')) {
      return Response.json({ error: 'Please enter a valid email address' }, { status: 400 })
    }

    // ── Rate limit by IP first (blocks scanners) ──────────────────────────
    if (!checkRateLimit(ipAttempts, ip, IP_LIMIT)) {
      console.warn(`[forgot-password] IP rate limited: ${ip}`)
      // Return generic success — don't tell attacker they are blocked
      return Response.json({ success: true })
    }

    // ── Rate limit by email (blocks targeted abuse) ───────────────────────
    if (!checkRateLimit(emailAttempts, email, EMAIL_LIMIT)) {
      console.warn(`[forgot-password] Email rate limited: ${email}`)
      return Response.json({ success: true })
    }

    // ── Look up user in both databases ────────────────────────────────────
    let user = await prisma.user.findUnique({
      where:  { email },
      select: { id: true, name: true, email: true, password: true },
    }).catch(() => null)

    if (!user) {
      user = await prisma2.user.findUnique({
        where:  { email },
        select: { id: true, name: true, email: true, password: true },
      }).catch(() => null)
    }

    // Always return success — never reveal if email is registered or not
    if (!user) {
      console.log(`[forgot-password] Email not found: ${email}`)
      return Response.json({ success: true })
    }

    // Google-only accounts have no password — silently ignore
    if (!user.password) {
      console.log(`[forgot-password] Google-only account, no password to reset: ${email}`)
      // Could send "sign in with Google" email here instead
      return Response.json({ success: true })
    }

    // ── Generate secure reset token ───────────────────────────────────────
    const token   = crypto.randomBytes(32).toString('hex')
    const expires = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    // Delete any existing token for this email, then create a fresh one
    // (VerificationToken uses compound unique key so upsert by identifier alone fails)
    await prisma.verificationToken.deleteMany({
      where: { identifier: `reset:${email}` },
    }).catch(() => {}) // ignore if none exists

    await prisma.verificationToken.create({
      data: { identifier: `reset:${email}`, token, expires },
    })

    const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}&email=${encodeURIComponent(email)}`

    // ── Send email ────────────────────────────────────────────────────────
    const emailResult = await sendEmail({
      to:      email,
      subject: 'Reset your OmniJobReady AI™ password',
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#0f172a">
          <div style="margin-bottom:24px">
            <span style="font-weight:900;font-size:16px;color:#1e293b">OmniJobReady <span style="color:#3b82f6">AI</span></span>
          </div>

          <h1 style="font-size:20px;font-weight:800;margin:0 0 8px">Reset your password</h1>
          <p style="color:#64748b;font-size:14px;margin:0 0 24px;line-height:1.6">
            Hi ${user.name ?? 'there'},<br><br>
            We received a request to reset the password for your OmniJobReady AI account.
            Click the button below — this link expires in <strong>1 hour</strong>.
          </p>

          <a href="${resetUrl}"
            style="display:inline-block;background:linear-gradient(135deg,#2563eb,#3b82f6);color:#fff;text-decoration:none;padding:13px 28px;border-radius:10px;font-size:14px;font-weight:700;letter-spacing:0.01em">
            Reset Password →
          </a>

          <div style="margin-top:28px;padding:16px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0">
            <p style="color:#64748b;font-size:12px;margin:0 0 6px;font-weight:600">DIDN'T REQUEST THIS?</p>
            <p style="color:#94a3b8;font-size:12px;margin:0;line-height:1.5">
              If you didn't request a password reset, you can safely ignore this email.
              Your password will not be changed. If you're concerned, contact us at
              <a href="mailto:noreply@omnijobready.com" style="color:#3b82f6">noreply@omnijobready.com</a>.
            </p>
          </div>

          <p style="color:#94a3b8;font-size:11px;margin:20px 0 0;line-height:1.5">
            Link not working? Copy and paste this into your browser:<br>
            <span style="color:#3b82f6;word-break:break-all">${resetUrl}</span>
          </p>

          <div style="margin-top:24px;padding-top:16px;border-top:1px solid #e2e8f0">
            <p style="color:#cbd5e1;font-size:11px;margin:0">
              OmniJobReady AI™ · This is an automated message, please do not reply.
            </p>
          </div>
        </div>
      `,
    })

    if (!emailResult.ok) {
      console.error('[forgot-password] Email send failed:', emailResult.error)
      // Still return success — token is saved so they can retry
    } else {
      console.log(`[forgot-password] Reset email sent to ${email}`)
    }

    return Response.json({ success: true })

  } catch (error: any) {
    console.error('[forgot-password] Unexpected error:', error)
    // Always return success — never leak error details to the client
    return Response.json({ success: true })
  }
}