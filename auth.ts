import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import Credentials from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      tier: "free" | "pro"
    }
  }
  interface JWT {
    id: string
    tier: "free" | "pro"
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),

  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),

    Credentials({
      credentials: {
        email:    { label: "Email",    type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        })

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

  // JWT is required when using Credentials — database strategy doesn't
  // support credentials provider in NextAuth v5
  session: { strategy: "jwt" },

  callbacks: {
    async jwt({ token, user, account, trigger }) {
      // On first sign-in, user object is populated
      if (user) {
        token.id = user.id!

        // Fetch tier from DB
        const dbUser = await prisma.user.findUnique({
          where:  { id: user.id! },
          select: { tier: true },
        })
        token.tier = (dbUser?.tier ?? "free") as "free" | "pro"
      }

      // On session update (e.g. after upgrade), refresh tier from DB
      if (trigger === "update") {
        const dbUser = await prisma.user.findUnique({
          where:  { id: token.id as string },
          select: { tier: true },
        })
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

  pages: {
    signIn: "/login",
  },

  secret: process.env.NEXTAUTH_SECRET,
})