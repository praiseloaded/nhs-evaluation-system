// app/api/stripe/checkout/route.ts

import { auth }   from '@/auth'
import Stripe     from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil' as any,
})

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id || !session.user.email) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { priceId, tier } = await req.json()

    const resolvedPriceId =
      priceId
      ?? (tier === 'premium' ? process.env.STRIPE_PREMIUM_PRICE_ID : null)
      ?? (tier === 'elite'   ? process.env.STRIPE_ELITE_PRICE_ID   : null)
      ?? process.env.STRIPE_PRO_PRICE_ID!

    const checkout = await stripe.checkout.sessions.create({
      mode:                 'subscription',
      payment_method_types: ['card'],
      customer_email:       session.user.email,
      line_items: [
        {
          price:    resolvedPriceId,
          quantity: 1,
        },
      ],
      metadata: {
        userId:  session.user.id,
        priceId: resolvedPriceId,
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