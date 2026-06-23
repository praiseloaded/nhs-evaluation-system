// app/api/cron/deadline-reminders/route.ts


import { NextRequest, NextResponse } from 'next/server'
import { prisma }                    from '@/lib/prisma'
import { sendEmail }                 from '@/lib/email'
import { deadlineReminderEmail }     from '@/lib/email-templates'

export async function GET(req: NextRequest) {
  // Verify this is a legitimate Vercel cron call (not someone hitting the URL manually)
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now       = new Date()
  const in48h     = new Date(now.getTime() + 48 * 60 * 60 * 1000)

  // Find all applications with a deadline in the next 48 hours
  // that we haven't already reminded about
  const applications = await prisma.application.findMany({
    where: {
      deadlineDate:          { gte: now, lte: in48h },
      deadlineReminderSent:  false,
      status:                { notIn: ['submitted', 'shortlisted', 'interview', 'offer', 'rejected'] },
    },
    include: {
      user: { select: { email: true, name: true } }
    },
  })

  let sent   = 0
  let failed = 0

  for (const app of applications) {
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
      // Mark as reminded so we don't send again tomorrow
      await prisma.application.update({
        where: { id: app.id },
        data:  { deadlineReminderSent: true },
      })
      sent++
    } else {
      failed++
    }
  }

  console.log(`[cron] Deadline reminders: ${sent} sent, ${failed} failed, ${applications.length} checked`)
  return NextResponse.json({ sent, failed, checked: applications.length })
}