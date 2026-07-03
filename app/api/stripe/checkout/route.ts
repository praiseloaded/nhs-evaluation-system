// app/api/stripe/checkout/route.ts
//
// Price is read from the database at checkout time using price_data.
// Only three env vars needed — one Stripe Product ID per tier.
// These are set ONCE and never change even when you update prices.
//
// STRIPE_PRO_PRODUCT_ID     = prod_xxx  (create in Stripe dashboard once)
// STRIPE_ELITE_PRODUCT_ID   = prod_xxx
// STRIPE_PREMIUM_PRODUCT_ID = prod_xxx
// STRIPE_SECRET_KEY         = sk_live_xxx

import { auth }    from '@/auth'
import { prisma }  from '@/lib/prisma'
import { prisma2 } from '@/lib/db-router'
import Stripe      from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil' as any,
})

const PRODUCT_IDS: Record<string, string | undefined> = {
  pro:     process.env.STRIPE_PRO_PRODUCT_ID,
  elite:   process.env.STRIPE_ELITE_PRODUCT_ID,
  premium: process.env.STRIPE_PREMIUM_PRODUCT_ID,
}

// Read monthly price in pence from TierLimit table
// Falls back to sensible defaults so checkout never breaks
const PRICE_DEFAULTS: Record<string, number> = {
  pro: 900, elite: 2900, premium: 4900, // pence
}

async function getPriceInPence(tier: string): Promise<number> {
  try {
    const row = await prisma.tierLimit.findFirst({
      where: { tier, key: 'monthlyPrice' },
      select: { value: true },
    }).catch(() => null)
      ?? await prisma2.tierLimit.findFirst({
           where: { tier, key: 'monthlyPrice' },
           select: { value: true },
         }).catch(() => null)

    if (!row) return PRICE_DEFAULTS[tier] ?? 900

    // value stored as pounds (e.g. 9) → convert to pence
    const raw = row.value
    return raw < 100 ? Math.round(raw * 100) : raw
  } catch {
    return PRICE_DEFAULTS[tier] ?? 900
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id || !session.user.email) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { tier } = await req.json()
    const validTiers = ['pro', 'elite', 'premium']
    if (!tier || !validTiers.includes(tier)) {
      return Response.json({ error: 'Invalid tier' }, { status: 400 })
    }

    const productId = PRODUCT_IDS[tier]
    if (!productId) {
      return Response.json(
        { error: `STRIPE_${tier.toUpperCase()}_PRODUCT_ID is not set in env vars` },
        { status: 500 }
      )
    }

    // Read current price from DB
    const unitAmount = await getPriceInPence(tier)

    const checkout = await stripe.checkout.sessions.create({
      mode:                 'subscription',
      payment_method_types: ['card'],
      customer_email:       session.user.email,
      line_items: [
        {
          quantity:   1,
          price_data: {
            currency:   'gbp',
            unit_amount: unitAmount,
            recurring:  { interval: 'month' },
            product:    productId,  // permanent product ID — never changes
          },
        },
      ],
      metadata: {
        userId: session.user.id,
        tier,
        // store amount for reference (webhook uses product ID for tier detection)
        amountPence: String(unitAmount),
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/upgrade/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${process.env.NEXT_PUBLIC_APP_URL}/upgrade?cancelled=1`,
    })

    return Response.json({ url: checkout.url })
  } catch (err: any) {
    console.error('[stripe/checkout]', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}