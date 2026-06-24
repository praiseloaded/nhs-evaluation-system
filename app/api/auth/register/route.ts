// app/api/auth/register/route.ts
import bcrypt                  from 'bcryptjs'
import { getDbForNewUser }     from '@/lib/db-router'
import { sendEmail }           from '@/lib/email'
import { welcomeEmail }        from '@/lib/email-templates'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const body     = await req.json()
    const name     = body.name?.trim()
    const email    = body.email?.trim().toLowerCase()
    const password = body.password

    if (!name || !email || !password) {
      return Response.json({ error: 'All fields are required' }, { status: 400 })
    }

    // Assign user to the less-loaded database
    const { client, shard } = await getDbForNewUser()

    const existingUser = await client.user.findUnique({ where: { email } })
    if (existingUser) {
      return Response.json({ error: 'Email already exists' }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    const user = await client.user.create({
      data: {
        name,
        email,
        password:   hashedPassword,
        dbShard:    shard,   // saved so every subsequent request routes correctly
      },
    })

    console.log(`[register] User ${user.id} assigned to ${shard} database`)

    sendEmail({
      to:      user.email!,
      subject: 'Welcome to OmniJobReady AI™',
      html:    welcomeEmail(
        user.name ?? '',
        `${process.env.NEXTAUTH_URL}/dashboard`,
      ),
    }).catch(err => console.error('[register] welcome email failed:', err))

    return Response.json({ success: true, userId: user.id })
  } catch (error) {
    console.error(error)
    return Response.json({ error: 'Registration failed' }, { status: 500 })
  }
}
