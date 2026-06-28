// auth.ts
import NextAuth           from "next-auth"
import Google             from "next-auth/providers/google"
import Credentials        from "next-auth/providers/credentials"
import { PrismaAdapter }  from "@auth/prisma-adapter"
import { prisma }         from "@/lib/prisma"
import { prisma2 }        from "@/lib/db-router"
import bcrypt             from "bcryptjs"

declare module "next-auth" {
  interface Session {
    user: {
      id:     string
      name?:  string | null
      email?: string | null
      image?: string | null
      tier:   "free" | "pro" | "elite"  // ← elite added
      role:   "user" | "admin"           // ← role added
    }
  }
  interface JWT {
    id:   string
    tier: "free" | "pro" | "elite"
    role: "user" | "admin"
  }
}

// ── Helper: check both databases ──────────────────────────────────────────────
async function getDbUser(id: string) {
  return (
    await prisma.user.findUnique({
      where:  { id },
      select: { tier: true, role: true },
    }).catch(() => null)
  ) ?? (
    await prisma2.user.findUnique({
      where:  { id },
      select: { tier: true, role: true },
    }).catch(() => null)
  )
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),

  providers: [
    Google({
      clientId:     process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),

    Credentials({
      credentials: {
        email:    { label: "Email",    type: "email"    },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        let user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        }).catch(() => null)

        if (!user) {
          user = await prisma2.user.findUnique({
            where: { email: credentials.email as string },
          }).catch(() => null)
        }

        if (!user || !user.password) return null

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.password
        )
        if (!valid) return null

        return {
          id:    user.id,
          name:  user.name,
          email: user.email,
          image: user.image,
          tier:  user.tier  as "free" | "pro" | "elite",
          role:  (user.role ?? "user") as "user" | "admin",
        }
      },
    }),
  ],

  session: { strategy: "jwt" },

  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google' && user.email) {
        fetch(`${process.env.NEXTAUTH_URL}/api/auth/welcome`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            email:  user.email,
            name:   user.name ?? '',
            secret: process.env.NEXTAUTH_SECRET,
          }),
        }).catch(() => {})
      }
      return true
    },

    async jwt({ token, user }) {
      // ── First login: seed from the user object ──────────────────────────
      if (user) {
        token.id   = user.id!
        token.tier = ((user as any).tier ?? "free") as "free" | "pro" | "elite"
        token.role = ((user as any).role ?? "user") as "user" | "admin"
      }

      // ── Every request: refresh tier + role from DB ──────────────────────
      // This ensures tier changes (upgrades, admin grants) take effect
      // on the next request without waiting for a full sign-out/sign-in.
      const userId = (token.id ?? token.sub) as string | undefined
      if (userId) {
        const dbUser = await getDbUser(userId)
        if (dbUser) {
          // Admin always gets elite in the session too
          token.tier = (dbUser.role === 'admin' ? 'elite' : dbUser.tier ?? 'free') as "free" | "pro" | "elite"
          token.role = (dbUser.role ?? 'user') as "user" | "admin"
        }
      }

      return token
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id   = (token.id ?? token.sub) as string
        session.user.tier = (token.tier ?? "free") as "free" | "pro" | "elite"
        session.user.role = (token.role ?? "user") as "user" | "admin"
      }
      return session
    },
  },

  pages:  { signIn: "/login" },
  secret: process.env.NEXTAUTH_SECRET,
})