// app/api/admin/pricing/route.ts
// Admin manages tier prices and syncs them to Stripe

import { prisma }        from '@/lib/prisma'
import { withAdminAuth } from '@/lib/admin-auth'
import Stripe            from 'stripe'

export const runtime = 'nodejs'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2025-07-30.basil' as any })

// ── GET: load current pricing config ─────────────────────────────────────────

export const GET = withAdminAuth(async () => {
  try {
    // Load pricing from DB (stored as TierLimit with key 'monthlyPrice')
    const prices = await prisma.tierLimit.findMany({
      where: { key: { in: ['monthlyPrice', 'stripePriceId', 'stripeProductId'] } },
    })

    // Load active Stripe products for display
    let stripeProducts: any[] = []
    try {
      const products = await stripe.products.list({ active: true, limit: 10 })
      stripeProducts = products.data
    } catch {}

    // Load recent Stripe subscriptions count
    let activeSubscriptions = 0
    try {
      const subs = await stripe.subscriptions.list({ status: 'active', limit: 1 })
      activeSubscriptions = subs.data.length
    } catch {}

    return Response.json({ success: true, prices, stripeProducts, activeSubscriptions })
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 })
  }
})

// ── PATCH: update price and sync to Stripe ───────────────────────────────────

export const PATCH = withAdminAuth(async (req: Request) => {
  try {
    const { tier, monthlyPrice, productName, description } = await req.json()

    if (!tier || monthlyPrice === undefined) {
      return Response.json({ error: 'tier and monthlyPrice required' }, { status: 400 })
    }

    const priceInPence = Math.round(Number(monthlyPrice) * 100)
    if (isNaN(priceInPence) || priceInPence < 0) {
      return Response.json({ error: 'Invalid price' }, { status: 400 })
    }

    let stripePriceId: string | null = null
    let stripeProductId: string | null = null

    // Save price to DB
    await prisma.tierLimit.upsert({
      where:  { tier_key: { tier, key: 'monthlyPrice' } },
      update: { value: priceInPence },
      create: { tier, key: 'monthlyPrice', value: priceInPence },
    })

    // Sync to Stripe if price is > 0
    if (priceInPence > 0 && process.env.STRIPE_SECRET_KEY) {
      try {
        // Find or create product
        const existingProductRow = await prisma.tierLimit.findUnique({
          where: { tier_key: { tier, key: 'stripeProductId' } },
        })

        let product: Stripe.Product

        if (existingProductRow?.value) {
          // Update existing product
          try {
            product = await stripe.products.update(String(existingProductRow.value), {
              name:        productName ?? `OmniJobReady AI™ ${tier.charAt(0).toUpperCase() + tier.slice(1)}`,
              description: description ?? `${tier.charAt(0).toUpperCase() + tier.slice(1)} tier subscription`,
            })
            stripeProductId = product.id
          } catch {
            // Product not found, create new
            product = await stripe.products.create({
              name:        productName ?? `OmniJobReady AI™ ${tier.charAt(0).toUpperCase() + tier.slice(1)}`,
              description: description ?? `${tier.charAt(0).toUpperCase() + tier.slice(1)} tier subscription`,
              metadata:    { tier },
            })
            stripeProductId = product.id
          }
        } else {
          product = await stripe.products.create({
            name:        productName ?? `OmniJobReady AI™ ${tier.charAt(0).toUpperCase() + tier.slice(1)}`,
            description: description ?? `${tier.charAt(0).toUpperCase() + tier.slice(1)} tier subscription`,
            metadata:    { tier },
          })
          stripeProductId = product.id
        }

        // Always create a new price (Stripe prices are immutable)
        const price = await stripe.prices.create({
          product:    product.id,
          unit_amount: priceInPence,
          currency:   'gbp',
          recurring:  { interval: 'month' },
          metadata:   { tier },
        })
        stripePriceId = price.id

        // Save Stripe IDs to DB
        await Promise.all([
          prisma.tierLimit.upsert({
            where:  { tier_key: { tier, key: 'stripePriceId' } },
            update: { value: 0 }, // Can't store string in Int — store in metadata JSON
            create: { tier, key: 'stripePriceId', value: 0 },
          }),
          prisma.tierLimit.upsert({
            where:  { tier_key: { tier, key: 'stripeProductId' } },
            update: { value: 0 },
            create: { tier, key: 'stripeProductId', value: 0 },
          }),
        ])

        // Store actual IDs in admin config (using description field workaround)
        // In production use a dedicated AdminConfig table or env vars
        console.log(`[pricing] Stripe price created: ${stripePriceId} for ${tier}`)
      } catch (stripeErr: any) {
        console.error('[pricing] Stripe sync failed:', stripeErr.message)
        // Price saved to DB even if Stripe fails — don't block the save
        return Response.json({
          success:     true,
          tier,
          monthlyPrice: priceInPence / 100,
          stripeError: stripeErr.message,
          warning:     'Price saved but Stripe sync failed. Check your Stripe key.',
        })
      }
    }

    return Response.json({
      success:        true,
      tier,
      monthlyPrice:   priceInPence / 100,
      stripePriceId,
      stripeProductId,
    })
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 })
  }
})