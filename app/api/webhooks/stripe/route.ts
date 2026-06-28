// app/api/webhooks/stripe/route.ts

import { stripe }    from '@/lib/stripe'
import { prisma }    from '@/lib/prisma'
import { prisma2 }   from '@/lib/db-router'
import { getDb }     from '@/lib/db-router'
import { NextRequest } from 'next/server'

export const runtime = 'nodejs'

async function findUserByEmail(email: string) {
  const u = await prisma.user.findUnique({ where: { email }, select: { id: true } }).catch(() => null)
  return u ?? await prisma2.user.findUnique({ where: { email }, select: { id: true } }).catch(() => null)
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig  = req.headers.get('stripe-signature')!

  let event

  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err: any) {
    console.error('Webhook signature failed:', err.message)
    return new Response(`Webhook Error: ${err.message}`, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as any
    const email   = session.customer_email
    const userId  = session.metadata?.userId

    if (userId) {
      // Preferred path — use userId from metadata
      const db = await getDb(userId)
      await db.user.update({
        where: { id: userId },
        data:  { tier: 'pro', analysisLimit: 999,
          stripeCustomerId:     session.customer ?? undefined,
          stripeSubscriptionId: session.subscription ?? undefined,
        },
      }).catch(err => console.error('[webhook] update failed:', err))
      console.log(`✅ User ${userId} upgraded to pro`)
    } else if (email) {
      // Fallback — find by email across both DBs
      const user = await findUserByEmail(email)
      if (user) {
        const db = await getDb(user.id)
        await db.user.update({
          where: { id: user.id },
          data:  { tier: 'pro', analysisLimit: 999 },
        }).catch(err => console.error('[webhook] email update failed:', err))
        console.log(`✅ User ${email} upgraded to pro`)
      }
    }
  }

  return new Response('ok', { status: 200 })
}