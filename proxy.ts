import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const isProtectedRoute = createRouteMatcher(["/editor(.*)", "/api(.*)"]);

const isAuthRoute = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)"]);

export default clerkMiddleware(async (auth, req: NextRequest) => {
  const pathname = req.nextUrl.pathname;

  if (
    /\.(png|jpe?g|webp|gif|svg|ico|woff2?|ttf|otf|eot|css|js)$/i.exec(
      pathname,
    )
  ) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/trigger")) {
    return NextResponse.next();
  }
  if (isAuthRoute(req)) {
    return NextResponse.next();
  }

  if (isProtectedRoute(req)) {
    // LOAD_TEST_MODE: bypass Clerk JWT verification for local load testing only.
    // This guard is never active in production because LOAD_TEST_MODE is never
    // set in production environment variables.
    const isMockRequest =
      process.env.LOAD_TEST_MODE === 'true' &&
      req.headers.get('x-mock-user-id') !== null

    console.log(`proxy.ts: isMockRequest=${isMockRequest} (LOAD_TEST_MODE=${process.env.LOAD_TEST_MODE}, x-mock-user-id=${req.headers.get('x-mock-user-id')})`)

    if (!isMockRequest) {
      await auth.protect()
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/(.*)",
  ],
};