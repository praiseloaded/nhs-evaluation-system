// lib/email.ts
// cPanel / AsuraHosting SMTP sender.
// FROM address must match SMTP_USER — host enforces this.
// Display name and reply-to use your brand domain.
//
// ENV VARS (no spaces around = in .env.local):
//   SMTP_HOST=mail.omnijobready.com
//   SMTP_PORT=587
//   SMTP_SECURE=false
//   SMTP_USER=noreply@omnijobready.com
//   SMTP_PASS=your-password
//   EMAIL_FROM=noreply@omnijobready.com
//   EMAIL_FROM_NAME=OmniJobReady AI
//   EMAIL_REPLY_TO=noreply@omnijobready.com

import nodemailer from 'nodemailer'

export type EmailPayload = {
  to:      string
  subject: string
  html:    string
  text?:   string
}

function getTransporter() {
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  const host = process.env.SMTP_HOST

  if (!host || !user || !pass) {
    throw new Error('Email not configured. Set SMTP_HOST, SMTP_USER and SMTP_PASS in .env.local')
  }

  return nodemailer.createTransport({
    host,
    port:   Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth:   { user, pass },
    tls:    { rejectUnauthorized: false },
  })
}

export async function sendEmail(
  payload: EmailPayload
): Promise<{ ok: boolean; error?: string }> {
  try {
    const transporter = getTransporter()
    const smtpUser    = process.env.SMTP_USER!
    const fromName    = process.env.EMAIL_FROM_NAME ?? 'OmniJobReady AI'
    const replyTo     = process.env.EMAIL_REPLY_TO  ?? smtpUser

    await transporter.sendMail({
      from:    `${fromName} <${smtpUser}>`,
      replyTo: `${fromName} <${replyTo}>`,
      to:      payload.to,
      subject: payload.subject,
      html:    payload.html,
      text:    payload.text ?? stripHtml(payload.html),
    })

    console.log(`[email] ✓ Sent to ${payload.to} — ${payload.subject}`)
    return { ok: true }
  } catch (err: any) {
    console.error('[email] ✗ Failed:', err.message)
    return { ok: false, error: err.message }
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
