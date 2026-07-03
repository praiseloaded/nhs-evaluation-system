// app/api/webhooks/stripe/route.ts
//
// Detects tier from PRODUCT ID (permanent) not price ID (changes every price update).
// Map:  STRIPE_PRO_PRODUCT_ID → 'pro'
//       STRIPE_ELITE_PRODUCT_ID → 'elite'
//       STRIPE_PREMIUM_PRODUCT_ID → 'premium'

import { stripe }    from '@/lib/stripe'
import { prisma }    from '@/lib/prisma'
import { prisma2 }   from '@/lib/db-router'
import { getDb }     from '@/lib/db-router'
import { NextRequest }        from 'next/server'
import { createNotification } from '@/lib/notifications'

export const runtime = 'nodejs'

// Resolve tier from product ID — permanent mapping, survives any price change
function tierFromProductId(productId: string | null | undefined): 'free' | 'pro' | 'elite' | 'premium' {
  if (!productId) return 'pro'
  if (productId === process.env.STRIPE_PREMIUM_PRODUCT_ID) return 'premium'
  if (productId === process.env.STRIPE_ELITE_PRODUCT_ID)   return 'elite'
  if (productId === process.env.STRIPE_PRO_PRODUCT_ID)     return 'pro'
  return 'pro'
}

async function findUserByEmail(email: string) {
  const u = await prisma.user.findUnique({ where: { email }, select: { id: true } }).catch(() => null)
  return u ?? await prisma2.user.findUnique({ where: { email }, select: { id: true } }).catch(() => null)
}

async function resolveProductId(session: any): Promise<string | null> {
  // 1. Check metadata tier (most reliable — set by our checkout route)
  const tierFromMeta = session.metadata?.tier
  if (tierFromMeta === 'premium') return process.env.STRIPE_PREMIUM_PRODUCT_ID ?? null
  if (tierFromMeta === 'elite')   return process.env.STRIPE_ELITE_PRODUCT_ID   ?? null
  if (tierFromMeta === 'pro')     return process.env.STRIPE_PRO_PRODUCT_ID     ?? null

  // 2. Try inline line_items product
  const inline = session.line_items?.data?.[0]?.price?.product
  if (inline) return inline

  // 3. Expand from Stripe API
  try {
    const expanded = await stripe.checkout.sessions.retrieve(session.id, {
      expand: ['line_items.data.price.product'],
    })
    return expanded.line_items?.data?.[0]?.price?.product as string ?? null
  } catch {
    return null
  }
}

async function resolveProductIdFromSubscription(subscription: any): Promise<string | null> {
  try {
    const productId = subscription.items?.data?.[0]?.price?.product
    if (typeof productId === 'string') return productId
    // Expand if needed
    const expanded  = await stripe.subscriptions.retrieve(subscription.id, {
      expand: ['items.data.price.product'],
    })
    return expanded.items?.data?.[0]?.price?.product as string ?? null
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

  // ── Checkout completed → upgrade ─────────────────────────────────────────
  if (event.type === 'checkout.session.completed') {
    const session   = event.data.object as any
    const email     = session.customer_email
    const userId    = session.metadata?.userId

    const productId = await resolveProductId(session)
    const tier      = tierFromProductId(productId)
    const limit     = tier === 'premium' || tier === 'elite' ? -1 : 999

    console.log(`[webhook] checkout.session.completed tier=${tier} product=${productId}`)

    if (userId) {
      const db = await getDb(userId)
      await db.user.update({
        where: { id: userId },
        data:  {
          tier,
          analysisLimit:        limit,
          stripeCustomerId:     session.customer     ?? undefined,
          stripeSubscriptionId: session.subscription ?? undefined,
        },
      }).catch(e => console.error('[webhook] update failed:', e))
      console.log(`✅ User ${userId} → ${tier}`)
      createNotification({
        userId,
        type:    'upgrade_welcome',
        title:   `Welcome to ${tier.charAt(0).toUpperCase() + tier.slice(1)}!`,
        body:    `Your account has been upgraded to ${tier.charAt(0).toUpperCase() + tier.slice(1)}. All ${tier} features are now unlocked.`,
        linkUrl: '/dashboard',
      }).catch(() => {})
    } else if (email) {
      const user = await findUserByEmail(email)
      if (user) {
        const db = await getDb(user.id)
        await db.user.update({
          where: { id: user.id },
          data:  { tier, analysisLimit: limit },
        }).catch(e => console.error('[webhook] email update failed:', e))
        console.log(`✅ User ${email} → ${tier}`)
      }
    }
  }

  // ── Subscription updated → handle plan changes mid-cycle ─────────────────
  if (event.type === 'customer.subscription.updated') {
    const subscription = event.data.object as any
    const productId    = await resolveProductIdFromSubscription(subscription)
    const tier         = tierFromProductId(productId)
    const limit        = tier === 'premium' || tier === 'elite' ? -1 : tier === 'pro' ? 999 : 1

    try {
      const customer = await stripe.customers.retrieve(subscription.customer as string) as any
      const email    = customer?.email
      if (email) {
        const user = await findUserByEmail(email)
        if (user) {
          const db = await getDb(user.id)
          await db.user.update({ where: { id: user.id }, data: { tier, analysisLimit: limit } })
          console.log(`🔄 User ${email} plan updated → ${tier}`)
        }
      }
    } catch (e) { console.error('[webhook] plan update failed:', e) }
  }

  // ── Subscription cancelled → downgrade to free ───────────────────────────
  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as any
    try {
      const customer = await stripe.customers.retrieve(subscription.customer as string) as any
      const email    = customer?.email
      if (email) {
        const user = await findUserByEmail(email)
        if (user) {
          const db = await getDb(user.id)
          await db.user.update({ where: { id: user.id }, data: { tier: 'free', analysisLimit: 1 } })
          console.log(`⬇️ User ${email} cancelled → free`)
        }
      }
    } catch (e) { console.error('[webhook] downgrade failed:', e) }
  }

  return new Response('ok', { status: 200 })
}