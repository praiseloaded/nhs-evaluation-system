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
    const prices = await prisma.tierLimit.findMany({
      where: { key: 'monthlyPrice' },
    })

    const stripeConfigs = await prisma.adminStripeConfig.findMany()

    let stripeProducts: any[] = []
    try {
      const products = await stripe.products.list({ active: true, limit: 10 })
      stripeProducts = products.data
    } catch {}

    let activeSubscriptions = 0
    try {
      const subs = await stripe.subscriptions.list({ status: 'active', limit: 1 })
      activeSubscriptions = subs.data.length
    } catch {}

    return Response.json({ success: true, prices, stripeConfigs, stripeProducts, activeSubscriptions })
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 })
  }
})

// ── PATCH: update price, sync to Stripe, optionally migrate existing subs ────
//
// Body:
//   tier              string   required
//   monthlyPrice      number   required (in GBP, e.g. 29.00)
//   productName       string   optional
//   description       string   optional
//   migrateExisting   boolean  optional — if true, move current subscribers on
//                              this tier onto the new price. Default false
//                              (grandfather existing subs at their old price).
//   prorationBehavior 'create_prorations' | 'none'  optional, default 'none'
//                      'create_prorations' charges/credits the difference now.
//                      'none' applies the new price starting next renewal.

export const PATCH = withAdminAuth(async (req: Request) => {
  try {
    const {
      tier,
      monthlyPrice,
      productName,
      description,
      migrateExisting = false,
      prorationBehavior = 'none',
    } = await req.json()

    if (!tier || monthlyPrice === undefined) {
      return Response.json({ error: 'tier and monthlyPrice required' }, { status: 400 })
    }

    const priceInPence = Math.round(Number(monthlyPrice) * 100)
    if (isNaN(priceInPence) || priceInPence < 0) {
      return Response.json({ error: 'Invalid price' }, { status: 400 })
    }

    let stripePriceId: string | null = null
    let stripeProductId: string | null = null
    let migration: { attempted: number; migrated: number; failed: number; errors: string[] } | null = null

    // Save numeric price to DB
    await prisma.tierLimit.upsert({
      where:  { tier_key: { tier, key: 'monthlyPrice' } },
      update: { value: priceInPence },
      create: { tier, key: 'monthlyPrice', value: priceInPence },
    })

    if (priceInPence > 0 && process.env.STRIPE_SECRET_KEY) {
      try {
        const existingConfig = await prisma.adminStripeConfig.findUnique({
          where: { tier },
        })

        let product: Stripe.Product

        if (existingConfig?.stripeProductId) {
          try {
            product = await stripe.products.update(existingConfig.stripeProductId, {
              name:        productName ?? `OmniJobReady AI™ ${tier.charAt(0).toUpperCase() + tier.slice(1)}`,
              description: description ?? `${tier.charAt(0).toUpperCase() + tier.slice(1)} tier subscription`,
            })
          } catch {
            product = await stripe.products.create({
              name:        productName ?? `OmniJobReady AI™ ${tier.charAt(0).toUpperCase() + tier.slice(1)}`,
              description: description ?? `${tier.charAt(0).toUpperCase() + tier.slice(1)} tier subscription`,
              metadata:    { tier },
            })
          }
        } else {
          product = await stripe.products.create({
            name:        productName ?? `OmniJobReady AI™ ${tier.charAt(0).toUpperCase() + tier.slice(1)}`,
            description: description ?? `${tier.charAt(0).toUpperCase() + tier.slice(1)} tier subscription`,
            metadata:    { tier },
          })
        }
        stripeProductId = product.id

        // Stripe prices are immutable — creating a new one is required, not optional
        const price = await stripe.prices.create({
          product:     product.id,
          unit_amount: priceInPence,
          currency:    'gbp',
          recurring:   { interval: 'month' },
          metadata:    { tier },
        })
        stripePriceId = price.id

        // Persist real string IDs (fixes prior Int-column placeholder bug)
        await prisma.adminStripeConfig.upsert({
          where:  { tier },
          update: { stripeProductId, stripePriceId },
          create: { tier, stripeProductId, stripePriceId },
        })

        console.log(`[pricing] Stripe price created: ${stripePriceId} (product ${stripeProductId}) for ${tier}`)

        // ── Optionally migrate existing subscribers onto the new price ──────
        if (migrateExisting) {
          const oldPriceId = existingConfig?.stripePriceId ?? null

          const subscribers = await prisma.user.findMany({
            where: {
              tier,
              stripeSubscriptionId: { not: null },
            },
            select: { id: true, email: true, stripeSubscriptionId: true },
          })

          migration = { attempted: subscribers.length, migrated: 0, failed: 0, errors: [] }

          for (const u of subscribers) {
            try {
              const sub = await stripe.subscriptions.retrieve(u.stripeSubscriptionId!)
              const item = sub.items.data[0]
              if (!item) throw new Error('No subscription item found')

              // Skip if already on the new price (avoid redundant updates)
              if (item.price.id === stripePriceId) {
                migration.migrated++
                continue
              }

              await stripe.subscriptions.update(u.stripeSubscriptionId!, {
                items: [{ id: item.id, price: stripePriceId! }],
                proration_behavior: prorationBehavior === 'create_prorations' ? 'create_prorations' : 'none',
              })

              migration.migrated++
            } catch (subErr: any) {
              migration.failed++
              migration.errors.push(`${u.email ?? u.id}: ${subErr.message}`)
            }
          }

          console.log(
            `[pricing] Migration for ${tier}: ${migration.migrated}/${migration.attempted} migrated, ${migration.failed} failed` +
            (oldPriceId ? ` (from ${oldPriceId} to ${stripePriceId})` : '')
          )
        }
      } catch (stripeErr: any) {
        console.error('[pricing] Stripe sync failed:', stripeErr.message)
        return Response.json({
          success:      true,
          tier,
          monthlyPrice: priceInPence / 100,
          stripeError:  stripeErr.message,
          warning:      'Price saved but Stripe sync failed. Check your Stripe key.',
        })
      }
    }

    return Response.json({
      success:      true,
      tier,
      monthlyPrice: priceInPence / 100,
      stripePriceId,
      stripeProductId,
      migration,
    })
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 })
  }
})