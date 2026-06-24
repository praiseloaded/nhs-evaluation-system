// app/api/stripe/webhook/route.ts

import { prisma }  from '@/lib/prisma'
import { prisma2 } from '@/lib/db-router'
import Stripe     from 'stripe'
import { headers } from 'next/headers'

export const runtime = 'nodejs'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-05-28.basil',
})

export async function POST(req: Request) {
  const body      = await req.text()
  const headersList = await headers()
  const sig       = headersList.get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!,
    )
  } catch (err: any) {
    console.error('[webhook] Signature verification failed:', err.message)
    return new Response(`Webhook Error: ${err.message}`, { status: 400 })
  }

  // ── Handle events ──────────────────────────────────────────────────────────
  switch (event.type) {

    // Payment succeeded — set user to Pro
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const userId  = session.metadata?.userId

      if (!userId) {
        console.error('[webhook] No userId in metadata')
        break
      }

      // Update in whichever database this user belongs to
      const updateData = {
        tier:                 'pro' as const,
        analysisLimit:        999,
        stripeCustomerId:     session.customer as string ?? undefined,
        stripeSubscriptionId: session.subscription as string ?? undefined,
      }
      const updatedInPrimary = await prisma.user.updateMany({ where: { id: userId }, data: updateData })
      if (updatedInPrimary.count === 0) {
        await prisma2.user.updateMany({ where: { id: userId }, data: updateData }).catch(() => {})
      }

      console.log(`[webhook] User ${userId} upgraded to Pro`)
      break
    }

    // Subscription active (renewal confirmed)
    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice
      const subId   = invoice.subscription as string

      if (!subId) break

      const sub = await stripe.subscriptions.retrieve(subId)
      const userId = sub.metadata?.userId

      if (userId) {
        const updated = await prisma.user.updateMany({ where: { id: userId }, data: { tier: 'pro', analysisLimit: 999 } })
        if (updated.count === 0) await prisma2.user.updateMany({ where: { id: userId }, data: { tier: 'pro', analysisLimit: 999 } }).catch(() => {})
      }
      break
    }

    // Subscription cancelled or payment failed — revert to free
    case 'customer.subscription.deleted':
    case 'invoice.payment_failed': {
      const obj   = event.data.object as any
      const subId = obj.id ?? obj.subscription

      if (!subId) break

      // Find user by subscription ID — check both databases
      let user = await prisma.user.findFirst({ where: { stripeSubscriptionId: subId } })
      let userDb = prisma
      if (!user) {
        user = await prisma2.user.findFirst({ where: { stripeSubscriptionId: subId } }).catch(() => null)
        if (user) userDb = prisma2
      }

      if (user) {
        await userDb.user.update({ where: { id: user.id }, data: { tier: 'free', analysisLimit: 1 } })
        console.log(`[webhook] User ${user.id} reverted to Free`)
      }
      break
    }

    default:
      // Unhandled event type — ignore
      break
  }

  return new Response('ok', { status: 200 })
}
