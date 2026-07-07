import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * eLIS — Route Protection Middleware
 *
 * Protects /dashboard/* routes by checking for auth token in cookies.
 * Redirects unauthenticated users to the login page.
 *
 * Note: Since we store token in localStorage (client-side),
 * this middleware checks for a cookie-based flag that gets set
 * alongside localStorage. For full SSR protection, a cookie
 * token strategy would be needed. This provides a lightweight
 * client-side redirect guard.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check for auth cookie (set by client when logging in)
  const authToken = request.cookies.get("elis_authenticated");

  // Protected routes: /dashboard/*
  if (pathname.startsWith("/dashboard")) {
    if (!authToken) {
      const loginUrl = new URL("/", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // If user is authenticated and visits login page, redirect to dashboard
  if (pathname === "/" && authToken) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/dashboard/:path*"],
};
