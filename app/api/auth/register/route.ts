import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const name = body.name?.trim()
    const email = body.email?.trim().toLowerCase()
    const password = body.password

    if (!name || !email || !password) {
      return Response.json(
        { error: "All fields are required" },
        { status: 400 }
      )
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return Response.json(
        { error: "Email already exists" },
        { status: 400 }
      )
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
    })

    return Response.json({
      success: true,
      userId: user.id,
    })
  } catch (error) {
    console.error(error)

    return Response.json(
      { error: "Registration failed" },
      { status: 500 }
    )
  }
}