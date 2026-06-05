import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { auth } from "@/auth"

export async function middleware(req: NextRequest) {
  const session = await auth()

  const { pathname } = req.nextUrl
  const isDashboardRoute = pathname.startsWith("/dashboard")

  if (isDashboardRoute && !session) {
    const loginUrl = new URL("/login", req.url)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/dashboard/:path*"],
}