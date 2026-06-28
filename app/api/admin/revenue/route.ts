// app/api/admin/revenue/route.ts
// Pulls revenue data from Stripe

import { withAdminAuth } from '@/lib/admin-auth'
import { prisma }        from '@/lib/prisma'
import Stripe            from 'stripe'

export const runtime = 'nodejs'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2025-07-30.basil' as any })

export const GET = withAdminAuth(async (req: Request) => {
  try {
    const url    = new URL(req.url)
    const period = url.searchParams.get('period') ?? '30'
    const days   = parseInt(period)
    const since  = Math.floor(Date.now() / 1000) - days * 86400

    // Active subscriptions by tier
    const [proSubs, eliteSubs] = await Promise.all([
      stripe.subscriptions.list({
        status: 'active', limit: 100,
        expand: ['data.customer'],
      }).catch(() => ({ data: [] })),
      stripe.subscriptions.list({
        status: 'active', limit: 100,
        expand: ['data.customer'],
      }).catch(() => ({ data: [] })),
    ])

    // Recent payments
    const charges = await stripe.paymentIntents.list({
      limit:      20,
      created:    { gte: since },
    }).catch(() => ({ data: [] }))

    // MRR from active subscriptions
    const allSubs = await stripe.subscriptions.list({
      status: 'active', limit: 100,
    }).catch(() => ({ data: [] }))

    const mrr = allSubs.data.reduce((sum: number, sub: any) => {
      const amount = sub.items?.data?.[0]?.price?.unit_amount ?? 0
      return sum + amount
    }, 0) / 100

    // Cancelled this month
    const cancelled = await stripe.subscriptions.list({
      status: 'canceled', limit: 20,
      created: { gte: since },
    }).catch(() => ({ data: [] }))

    // Invoices for period
    const invoices = await stripe.invoices.list({
      limit:   50,
      created: { gte: since },
      status:  'paid',
    }).catch(() => ({ data: [] }))

    const periodRevenue = invoices.data.reduce((sum: number, inv: any) => sum + (inv.amount_paid ?? 0), 0) / 100

    // Users breakdown from DB
    const tierBreakdown = await prisma.user.groupBy({
      by:    ['tier'],
      _count: { tier: true },
    })

    return Response.json({
      success: true,
      mrr:     Math.round(mrr * 100) / 100,
      periodRevenue: Math.round(periodRevenue * 100) / 100,
      activeSubscriptions: allSubs.data.length,
      cancelledThisPeriod: cancelled.data.length,
      recentPayments: charges.data.slice(0, 10).map((c: any) => ({
        id:       c.id,
        amount:   (c.amount ?? 0) / 100,
        currency: c.currency,
        status:   c.status,
        created:  c.created,
        email:    c.receipt_email ?? null,
      })),
      tierBreakdown: tierBreakdown.reduce((acc: any, row: any) => {
        acc[row.tier] = row._count.tier
        return acc
      }, {}),
    })
  } catch (err: any) {
    console.error('[admin/revenue]', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
})