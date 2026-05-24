import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
])

export default clerkMiddleware(async (auth, req: NextRequest) => {
  const pathname = req.nextUrl.pathname

  if (/\.(png|jpe?g|webp|gif|svg|ico)$/i.exec(pathname)) {
    return NextResponse.next()
  }

  // Protect all non-public routes
  if (!isPublicRoute(req)) {
    const { userId } = await auth()
    
    // Redirect unauthenticated users to sign-in
    if (!userId) {
      return NextResponse.redirect(new URL("/sign-in", req.url))
    }
    
    // Redirect authenticated users from home to editor
    if (req.nextUrl.pathname === "/") {
      return NextResponse.redirect(new URL("/editor", req.url))
    }
  }
})

export const config = {
  matcher: [
    "/((?!_next).*)",
    "/(api|trpc)(.*)",
  ],
}
