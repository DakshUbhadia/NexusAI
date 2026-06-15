import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes that require authentication
const isProtectedRoute = createRouteMatcher(["/editor(.*)", "/api(.*)"]);

// Public auth routes (sign-in / sign-up)
const isAuthRoute = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)"]);

export default clerkMiddleware(async (auth, req: NextRequest) => {
  const pathname = req.nextUrl.pathname;

  // Always pass through static assets and Clerk-internal routes
  if (
    /\.(png|jpe?g|webp|gif|svg|ico|woff2?|ttf|otf|eot|css|js)$/i.exec(
      pathname,
    )
  ) {
    return NextResponse.next();
  }

  // Always pass through Trigger.dev webhook and other external hooks
  if (pathname.startsWith("/api/trigger")) {
    return NextResponse.next();
  }

  // Protect editor and API routes — Clerk's auth.protect() redirects
  // unauthenticated users to the sign-in page automatically, preserving
  // the original URL as redirect_url so they land back after sign-in.
  if (isProtectedRoute(req)) {
    await auth.protect();
  }

  // For auth routes (sign-in / sign-up): do NOT auto-redirect signed-in users.
  // The ForceSignOut client component rendered on those pages intentionally
  // destroys any active session so the user always authenticates manually.
  // If we redirected authenticated users away here, ForceSignOut would never
  // run and lingering sessions would bypass the mandatory re-authentication.
  if (isAuthRoute(req)) {
    return NextResponse.next();
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files unless in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
    // Always run for Clerk-specific frontend API routes
    "/__clerk/(.*)",
  ],
};