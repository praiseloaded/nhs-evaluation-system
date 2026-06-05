import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  const body = await req.json()

  const email = body.data?.object?.customer_email

  if (!email) {
    return NextResponse.json({ error: "No email" }, { status: 400 })
  }

  await prisma.user.update({
    where: { email },
    data: { tier: "pro" },
  })

  return NextResponse.json({ success: true })
}