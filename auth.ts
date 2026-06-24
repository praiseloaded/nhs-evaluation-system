// auth.ts — clean version, no Node.js imports
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
      tier:   "free" | "pro"
    }
  }
  interface JWT {
    id:   string
    tier: "free" | "pro"
  }
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
        email:    { label: "Email",    type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        // Check primary database first
        let user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        })

        // If not found check secondary
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
          tier:  user.tier as "free" | "pro",
        }
      },
    }),
  ],

  session: { strategy: "jwt" },

  // ── Google sign-up welcome email ──────────────────────────────────────────
  // Handled via a separate API route to keep auth.ts free of Node.js imports.
  // See app/api/auth/welcome/route.ts — called by the signIn callback below.
  callbacks: {
    async signIn({ user, account }) {
      // For Google sign-ins, trigger welcome email via internal API call
      // This runs server-side so we can use fetch to our own Node.js route
      if (account?.provider === 'google' && user.email) {
        fetch(`${process.env.NEXTAUTH_URL}/api/auth/welcome`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            email:  user.email,
            name:   user.name ?? '',
            secret: process.env.NEXTAUTH_SECRET,
          }),
        }).catch(() => {})  // fire and forget — never block sign-in
      }
      return true
    },

    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id!

        let dbUser = await prisma.user.findUnique({
          where:  { id: user.id! },
          select: { tier: true },
        }).catch(() => null)

        if (!dbUser) {
          dbUser = await prisma2.user.findUnique({
            where:  { id: user.id! },
            select: { tier: true },
          }).catch(() => null)
        }

        token.tier = (dbUser?.tier ?? "free") as "free" | "pro"
      }

      if (trigger === "update") {
        let dbUser = await prisma.user.findUnique({
          where:  { id: token.id as string },
          select: { tier: true },
        }).catch(() => null)

        if (!dbUser) {
          dbUser = await prisma2.user.findUnique({
            where:  { id: token.id as string },
            select: { tier: true },
          }).catch(() => null)
        }

        if (dbUser) token.tier = dbUser.tier as "free" | "pro"
      }

      return token
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id   = token.id   as string
        session.user.tier = token.tier as "free" | "pro"
      }
      return session
    },
  },

  pages:  { signIn: "/login" },
  secret: process.env.NEXTAUTH_SECRET,
})