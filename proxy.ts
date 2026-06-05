import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const isProtectedRoute = createRouteMatcher(["/editor(.*)", "/api(.*)"]);

export default clerkMiddleware(async (auth, req: NextRequest) => {
  const pathname = req.nextUrl.pathname;

  if (/\.(png|jpe?g|webp|gif|svg|ico)$/i.exec(pathname)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/trigger")) {
    return NextResponse.next();
  }

  if (!isProtectedRoute(req)) {
    return NextResponse.next();
  }

  const { userId } = await auth();

  if (!userId) {
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next).*)", "/(api|trpc)(.*)"],
};
