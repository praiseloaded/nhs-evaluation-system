import { stripe } from "@/lib/stripe"
import { auth } from "@/auth"

export async function POST() {
  try {
    const session = await auth()

    if (!session?.user?.id || !session.user.email) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    // HARDCODED temporarily to debug
    const baseUrl = "http://localhost:3000"

    console.log("baseUrl:", baseUrl)
    console.log("priceId:", process.env.STRIPE_PRO_PRICE_ID)

    const checkout = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer_email: session.user.email,
      line_items: [
        {
          price: process.env.STRIPE_PRO_PRICE_ID!,
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/dashboard?upgrade=success`,
      cancel_url: `${baseUrl}/upgrade?canceled=true`,
    })

    return Response.json({ success: true, url: checkout.url })
  } catch (error: any) {
    console.error("Stripe error:", error)
    return Response.json(
      { error: error.message || "Stripe error" },
      { status: 500 }
    )
  }
}