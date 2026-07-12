import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * eLIS — Route Protection Middleware
 *
 * Protects /dashboard/* routes by checking for a valid JWT in the `elis_token` cookie.
 * Redirects unauthenticated users to the login page.
 *
 * Security layers:
 * 1. Middleware (this file): Fast client-side redirect guard using JWT expiry check
 * 2. Server-side (API): Full JWT signature verification + blocklist check via JwtAuthGuard
 *
 * The middleware decodes (not cryptographically verifies) the JWT to check:
 * - Token exists in the `elis_token` cookie
 * - Token has not expired (based on `exp` claim)
 *
 * Full cryptographic verification happens server-side on every API call.
 * NCR-01-05: Upgraded from simple boolean flag to JWT expiry validation.
 * NCR-01-09: Removed legacy `elis_authenticated` boolean cookie fallback.
 *            Authentication depends solely on `elis_token` containing a non-expired JWT.
 */

function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return true;

    const payload = JSON.parse(
      Buffer.from(parts[1], "base64url").toString("utf-8")
    );

    if (!payload.exp) return true;

    // exp is in seconds, Date.now() is in milliseconds
    // Add 30s buffer to avoid edge-case clock skew redirects
    return payload.exp * 1000 < Date.now() - 30000;
  } catch {
    return true;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const tokenCookie = request.cookies.get("elis_token");

  // Authentication depends solely on elis_token containing a non-expired JWT
  let isAuthenticated = false;
  if (tokenCookie?.value) {
    isAuthenticated = !isTokenExpired(tokenCookie.value);
  }

  // Protected routes: /dashboard/*
  if (pathname.startsWith("/dashboard")) {
    if (!isAuthenticated) {
      const loginUrl = new URL("/", request.url);
      loginUrl.searchParams.set("redirect", pathname);

      // Clear stale cookies on redirect
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete("elis_authenticated");
      response.cookies.delete("elis_token");
      return response;
    }
  }

  // If user is authenticated and visits login page, redirect to dashboard
  if (pathname === "/" && isAuthenticated) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/dashboard/:path*"],
};
