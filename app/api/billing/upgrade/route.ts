import { stripe } from "@/lib/stripe"
import { auth } from "@/auth"

export async function POST() {
  try {
    const session = await auth()

    if (!session?.user?.email) {
      return Response.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const baseUrl = "http://localhost:3000"

    const checkout = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: process.env.STRIPE_PRO_PRICE_ID!,
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/dashboard?upgrade=success`,
      cancel_url: `${baseUrl}/upgrade?cancelled=true`,
      customer_email: session.user.email,
    })

    return Response.json({ success: true, url: checkout.url })
  } catch (err: any) {
    console.error("Stripe error:", err)
    return Response.json({ success: false, error: err.message }, { status: 500 })
  }
}