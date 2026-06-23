import { prisma }       from "@/lib/prisma"
import bcrypt           from "bcryptjs"
import { sendEmail }    from "@/lib/email"
import { welcomeEmail } from "@/lib/email-templates"

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const name     = body.name?.trim()
    const email    = body.email?.trim().toLowerCase()
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

    // ── Welcome email ──────────────────────────────────────────────────────
    // Fire-and-forget — never let email failure block the registration response
    sendEmail({
      to:      user.email!,
      subject: 'Welcome to OmniJobReady AI™',
      html:    welcomeEmail(
        user.name ?? '',
        `${process.env.NEXTAUTH_URL}/dashboard`,
      ),
    }).catch(err => console.error('[register] welcome email failed:', err))

    return Response.json({
      success: true,
      userId:  user.id,
    })
  } catch (error) {
    console.error(error)

    return Response.json(
      { error: "Registration failed" },
      { status: 500 }
    )
  }
}


