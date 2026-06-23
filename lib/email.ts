// lib/email.ts
import nodemailer from 'nodemailer'

export type EmailPayload = {
  to:      string
  subject: string
  html:    string
  text?:   string
}

// Build transporter once — nodemailer reuses the connection
function getTransporter() {
  const host = process.env.SMTP_HOST
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS

  if (!host || !user || !pass) {
    throw new Error(
      'Email not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS in your Vercel environment variables.'
    )
  }

  return nodemailer.createTransport({
    host,
    port:   Number(process.env.SMTP_PORT ?? 465),
    secure: process.env.SMTP_SECURE !== 'false', // true for port 465
    auth:   { user, pass },
    tls:    { rejectUnauthorized: false },        // needed for some cPanel setups
  })
}

export async function sendEmail(
  payload: EmailPayload
): Promise<{ ok: boolean; error?: string }> {
  try {
    const transporter = getTransporter()
    const from = `${process.env.EMAIL_FROM_NAME ?? 'OmniJobReady AI'} <${process.env.EMAIL_FROM ?? process.env.SMTP_USER}>`

    await transporter.sendMail({
      from,
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