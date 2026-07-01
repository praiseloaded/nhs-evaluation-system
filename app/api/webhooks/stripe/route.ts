// app/api/webhooks/stripe/route.ts

import { stripe }    from '@/lib/stripe'
import { prisma }    from '@/lib/prisma'
import { prisma2 }   from '@/lib/db-router'
import { getDb }     from '@/lib/db-router'
import { NextRequest } from 'next/server'

export const runtime = 'nodejs'

// ── Map Stripe Price ID → tier name ──────────────────────────────────────────
// Add STRIPE_PREMIUM_PRICE_ID + STRIPE_ELITE_PRICE_ID to Vercel env vars.
function tierFromPriceId(priceId: string | null | undefined): 'free' | 'pro' | 'elite' | 'premium' {
  if (!priceId) return 'pro' // unknown price → safest fallback
  if (priceId === process.env.STRIPE_PREMIUM_PRICE_ID) return 'premium'
  if (priceId === process.env.STRIPE_ELITE_PRICE_ID)   return 'elite'
  if (priceId === process.env.STRIPE_PRO_PRICE_ID)     return 'pro'
  return 'pro' // unrecognised price ID → default to pro
}

async function findUserByEmail(email: string) {
  const u = await prisma.user.findUnique({ where: { email }, select: { id: true } }).catch(() => null)
  return u ?? await prisma2.user.findUnique({ where: { email }, select: { id: true } }).catch(() => null)
}

// ── Resolve priceId from a checkout session ───────────────────────────────────
// Stripe doesn't always include line_items inline — expand if needed.
async function resolvePriceId(session: any): Promise<string | null> {
  // 1. Try metadata (set in checkout route)
  if (session.metadata?.priceId) return session.metadata.priceId

  // 2. Try inline line_items
  const inline = session.line_items?.data?.[0]?.price?.id
  if (inline) return inline

  // 3. Expand from Stripe API
  try {
    const expanded = await stripe.checkout.sessions.retrieve(session.id, {
      expand: ['line_items'],
    })
    return expanded.line_items?.data?.[0]?.price?.id ?? null
  } catch {
    return null
  }
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

  // ── Checkout completed → upgrade ────────────────────────────────────────────
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as any
    const email   = session.customer_email
    const userId  = session.metadata?.userId

    const priceId = await resolvePriceId(session)
    const tier    = tierFromPriceId(priceId)

    console.log(`[webhook] checkout.session.completed — tier: ${tier}, priceId: ${priceId}`)

    if (userId) {
      const db = await getDb(userId)
      await db.user.update({
        where: { id: userId },
        data:  {
          tier,
          analysisLimit:        tier === 'premium' ? -1 : tier === 'elite' ? -1 : 999,
          stripeCustomerId:     session.customer     ?? undefined,
          stripeSubscriptionId: session.subscription ?? undefined,
        },
      }).catch(err => console.error('[webhook] update failed:', err))
      console.log(`✅ User ${userId} upgraded to ${tier}`)
    } else if (email) {
      const user = await findUserByEmail(email)
      if (user) {
        const db = await getDb(user.id)
        await db.user.update({
          where: { id: user.id },
          data:  {
            tier,
            analysisLimit: tier === 'premium' ? -1 : tier === 'elite' ? -1 : 999,
          },
        }).catch(err => console.error('[webhook] email update failed:', err))
        console.log(`✅ User ${email} upgraded to ${tier}`)
      }
    }
  }

  // ── Subscription cancelled → downgrade to free ──────────────────────────────
  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as any
    try {
      const customer = await stripe.customers.retrieve(subscription.customer as string) as any
      const email    = customer?.email
      if (email) {
        const user = await findUserByEmail(email)
        if (user) {
          const db = await getDb(user.id)
          await db.user.update({
            where: { id: user.id },
            data:  { tier: 'free', analysisLimit: 1 },
          })
          console.log(`⬇️ User ${email} downgraded to free (subscription cancelled)`)
        }
      }
    } catch (err) {
      console.error('[webhook] downgrade failed:', err)
    }
  }

  // ── Subscription updated → handle plan changes ──────────────────────────────
  if (event.type === 'customer.subscription.updated') {
    const subscription = event.data.object as any
    const priceId      = subscription.items?.data?.[0]?.price?.id ?? null
    const tier         = tierFromPriceId(priceId)

    try {
      const customer = await stripe.customers.retrieve(subscription.customer as string) as any
      const email    = customer?.email
      if (email) {
        const user = await findUserByEmail(email)
        if (user) {
          const db = await getDb(user.id)
          await db.user.update({
            where: { id: user.id },
            data:  {
              tier,
              analysisLimit: tier === 'premium' ? -1 : tier === 'elite' ? -1 : tier === 'pro' ? 999 : 1,
            },
          })
          console.log(`🔄 User ${email} plan updated to ${tier}`)
        }
      }
    } catch (err) {
      console.error('[webhook] plan update failed:', err)
    }
  }

  return new Response('ok', { status: 200 })
}