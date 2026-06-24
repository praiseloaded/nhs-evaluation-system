// app/api/cron/deadline-reminders/route.ts
// Queries BOTH databases for deadline reminders.
// Vercel Cron — runs daily at 08:00 UTC (vercel.json)

import { NextRequest, NextResponse } from 'next/server'
import { prisma }                    from '@/lib/prisma'
import { prisma2 }                   from '@/lib/db-router'
import { sendEmail }                 from '@/lib/email'
import { deadlineReminderEmail }     from '@/lib/email-templates'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now   = new Date()
  const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000)

  const where = {
    deadlineDate:         { gte: now, lte: in48h },
    deadlineReminderSent: false,
    status:               { notIn: ['submitted', 'shortlisted', 'interview', 'offer', 'rejected'] },
  }

  // Query both databases simultaneously
  const [apps1, apps2] = await Promise.all([
    prisma.application.findMany({
      where,
      include: { user: { select: { email: true, name: true } } },
    }).catch(() => []),
    process.env.DATABASE_URL_2
      ? prisma2.application.findMany({
          where,
          include: { user: { select: { email: true, name: true } } },
        }).catch(() => [])
      : Promise.resolve([]),
  ])

  const allApps = [
    ...apps1.map((a: any) => ({ ...a, _db: prisma })),
    ...apps2.map((a: any) => ({ ...a, _db: prisma2 })),
  ]

  let sent = 0, failed = 0

  for (const app of allApps) {
    if (!app.user?.email) continue

    const hoursLeft = Math.round(
      (new Date(app.deadlineDate!).getTime() - now.getTime()) / (1000 * 60 * 60)
    )

    const { ok } = await sendEmail({
      to:      app.user.email,
      subject: `⏰ ${hoursLeft}h left — ${app.jobTitle} deadline`,
      html:    deadlineReminderEmail({
        name:         app.user.name ?? '',
        jobTitle:     app.jobTitle,
        employer:     app.employer,
        deadline:     new Date(app.deadlineDate!).toLocaleDateString('en-GB', {
          weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
        }),
        hoursLeft,
        completeness: app.completeness ?? 0,
        statementUrl: `${process.env.NEXTAUTH_URL}/dashboard/application/${app.id}`,
      }),
    })

    if (ok) {
      await app._db.application.update({
        where: { id: app.id },
        data:  { deadlineReminderSent: true },
      })
      sent++
    } else {
      failed++
    }
  }

  console.log(`[cron] Deadline reminders: ${sent} sent, ${failed} failed, ${allApps.length} checked`)
  return NextResponse.json({ sent, failed, checked: allApps.length })
}
