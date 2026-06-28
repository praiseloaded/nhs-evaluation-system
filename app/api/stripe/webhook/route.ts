// app/api/stripe/webhook/route.ts

import { prisma }        from '@/lib/prisma'
import { prisma2, getDb } from '@/lib/db-router'
import Stripe            from 'stripe'
import { headers }       from 'next/headers'

export const runtime = 'nodejs'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil' as any,
})

async function findUserBySubscription(subId: string) {
  const user = await prisma.user.findFirst({ where: { stripeSubscriptionId: subId }, select: { id: true } }).catch(() => null)
  if (user) return user
  return await prisma2.user.findFirst({ where: { stripeSubscriptionId: subId }, select: { id: true } }).catch(() => null)
}

async function findUserByCustomer(customerId: string) {
  const user = await prisma.user.findFirst({ where: { stripeCustomerId: customerId }, select: { id: true } }).catch(() => null)
  if (user) return user
  return await prisma2.user.findFirst({ where: { stripeCustomerId: customerId }, select: { id: true } }).catch(() => null)
}

export async function POST(req: Request) {
  const body        = await req.text()
  const headersList = await headers()
  const sig         = headersList.get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err: any) {
    console.error('[webhook] Signature verification failed:', err.message)
    return new Response(`Webhook Error: ${err.message}`, { status: 400 })
  }

  switch (event.type) {

    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const userId  = session.metadata?.userId
      if (!userId) { console.error('[webhook] No userId in metadata'); break }

      const db = await getDb(userId)
      await db.user.update({
        where: { id: userId },
        data: {
          tier:                 'pro',
          analysisLimit:        999,
          stripeCustomerId:     session.customer as string ?? undefined,
          stripeSubscriptionId: session.subscription as string ?? undefined,
        },
      }).catch(err => console.error('[webhook] checkout update failed:', err))
      console.log(`[webhook] User ${userId} upgraded to Pro`)
      break
    }

    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice
      const subId   = (invoice as any).subscription as string
      if (!subId) break

      const sub    = await stripe.subscriptions.retrieve(subId)
      const userId = sub.metadata?.userId

      if (userId) {
        const db = await getDb(userId)
        await db.user.update({ where: { id: userId }, data: { tier: 'pro', analysisLimit: 999 } })
          .catch(err => console.error('[webhook] renewal update failed:', err))
        console.log(`[webhook] User ${userId} renewal confirmed`)
      } else {
        const customerId = invoice.customer as string
        if (customerId) {
          const found = await findUserByCustomer(customerId)
          if (found) {
            const db = await getDb(found.id)
            await db.user.update({ where: { id: found.id }, data: { tier: 'pro', analysisLimit: 999 } }).catch(() => {})
          }
        }
      }
      break
    }

    case 'customer.subscription.deleted':
    case 'invoice.payment_failed': {
      const obj   = event.data.object as any
      const subId = obj.id ?? obj.subscription
      if (!subId) break

      const user = await findUserBySubscription(subId)
      if (user) {
        const db = await getDb(user.id)
        await db.user.update({ where: { id: user.id }, data: { tier: 'free', analysisLimit: 1 } })
          .catch(err => console.error('[webhook] revert failed:', err))
        console.log(`[webhook] User ${user.id} reverted to Free`)
      }
      break
    }

    default:
      break
  }

  return new Response('ok', { status: 200 })
}