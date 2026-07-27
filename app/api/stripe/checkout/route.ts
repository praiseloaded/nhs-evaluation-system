// app/api/stripe/checkout/route.ts
//
// Product and price now come from AdminStripeConfig / TierLimit in the DB —
// the same records the admin pricing panel writes to on every "Save & sync".
// This removes the old failure mode where checkout used a hardcoded
// STRIPE_*_PRODUCT_ID env var that could silently drift out of sync with
// whatever product the admin panel actually created/updated in Stripe.
//
// Env vars are kept ONLY as a last-resort fallback for a brand-new tier that
// has never been saved from the admin panel yet.
//
// STRIPE_PRO_PRODUCT_ID     = prod_xxx  (fallback only)
// STRIPE_ELITE_PRODUCT_ID   = prod_xxx  (fallback only)
// STRIPE_PREMIUM_PRODUCT_ID = prod_xxx  (fallback only)
// STRIPE_SECRET_KEY         = sk_live_xxx

import { auth }    from '@/auth'
import { prisma }  from '@/lib/prisma'
import { prisma2 } from '@/lib/db-router'
import Stripe      from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil' as any,
})

const FALLBACK_PRODUCT_IDS: Record<string, string | undefined> = {
  pro:     process.env.STRIPE_PRO_PRODUCT_ID,
  elite:   process.env.STRIPE_ELITE_PRODUCT_ID,
  premium: process.env.STRIPE_PREMIUM_PRODUCT_ID,
}

const PRICE_DEFAULTS: Record<string, number> = {
  pro: 900, elite: 2900, premium: 4900, // pence
}

// Tries the primary DB, falls back to the secondary one — same redundancy
// pattern the rest of the app already uses.
async function findFirst<T>(query: (client: typeof prisma) => Promise<T | null>): Promise<T | null> {
  try {
    const result = await query(prisma)
    if (result) return result
  } catch {}
  try {
    return await query(prisma2 as unknown as typeof prisma)
  } catch {
    return null
  }
}

// Prefer the live Stripe Product ID the admin panel created/updated. This is
// the single source of truth going forward — env vars are fallback only.
async function getProductId(tier: string): Promise<string | null> {
  const config = await findFirst(client =>
    client.adminStripeConfig.findUnique({ where: { tier } })
  )
  if (config?.stripeProductId) return config.stripeProductId

  return FALLBACK_PRODUCT_IDS[tier] ?? null
}

// Read monthly price in pence from TierLimit. Falls back to sensible
// defaults so checkout never hard-fails just because pricing hasn't been
// configured yet.
async function getPriceInPence(tier: string): Promise<number> {
  const row = await findFirst(client =>
    client.tierLimit.findFirst({
      where:  { tier, key: 'monthlyPrice' },
      select: { value: true },
    })
  )

  if (!row) return PRICE_DEFAULTS[tier] ?? 900

  // value stored as pence already (route.ts writes Math.round(pounds * 100))
  const raw = row.value
  return raw < 100 ? Math.round(raw * 100) : raw
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

    const productId = await getProductId(tier)
    if (!productId) {
      return Response.json(
        {
          error: `No Stripe product found for tier "${tier}". Save a price for this tier in the admin pricing panel first, or set STRIPE_${tier.toUpperCase()}_PRODUCT_ID as a fallback.`,
        },
        { status: 500 }
      )
    }

    // Defensive check: confirm the product actually exists in whichever
    // Stripe mode/account this key points at, so we fail with a clear error
    // instead of Stripe's generic "No such product" surfacing to the user.
    try {
      await stripe.products.retrieve(productId)
    } catch {
      return Response.json(
        {
          error: `Stripe product ${productId} was not found for tier "${tier}". This usually means the product was created in a different Stripe mode (test vs live) than the current STRIPE_SECRET_KEY, or it was deleted. Re-save the price for this tier in the admin pricing panel to recreate it.`,
        },
        { status: 500 }
      )
    }

    const unitAmount = await getPriceInPence(tier)

    const checkout = await stripe.checkout.sessions.create({
      mode:                 'subscription',
      payment_method_types: ['card'],
      customer_email:       session.user.email,
      line_items: [
        {
          quantity:   1,
          price_data: {
            currency:    'gbp',
            unit_amount: unitAmount,
            recurring:   { interval: 'month' },
            product:     productId,
          },
        },
      ],
      metadata: {
        userId:      session.user.id,
        tier,
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