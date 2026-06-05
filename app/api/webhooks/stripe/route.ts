import { stripe } from "@/lib/stripe"
import { prisma } from "@/lib/prisma"
import { NextRequest } from "next/server"

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get("stripe-signature")!

  let event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err: any) {
    console.error("Webhook signature failed:", err.message)
    return new Response(`Webhook Error: ${err.message}`, { status: 400 })
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as any

    const email = session.customer_email

    if (email) {
      await prisma.user.update({
        where: { email },
        data: { tier: "pro" },
      })

      console.log(`✅ User ${email} upgraded to pro`)
    }
  }

  return new Response("ok", { status: 200 })
}