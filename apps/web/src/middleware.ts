import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * eLIS — Route Protection Middleware
 *
 * Protects /dashboard/* routes by checking for auth token in cookies.
 * Redirects unauthenticated users to the login page.
 *
 * Security layers:
 * 1. Middleware (this file): Fast client-side redirect guard using JWT expiry check
 * 2. Server-side (API): Full JWT signature verification + blocklist check via JwtAuthGuard
 *
 * The middleware decodes (not cryptographically verifies) the JWT to check:
 * - Token exists in cookie
 * - Token has not expired (based on `exp` claim)
 *
 * Full cryptographic verification happens server-side on every API call.
 * NCR-01-05: Upgraded from simple boolean flag to JWT expiry validation.
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

  // Check for auth cookie — now stores actual token for expiry validation
  const authCookie = request.cookies.get("elis_authenticated");
  const tokenCookie = request.cookies.get("elis_token");

  // Determine if user is authenticated:
  // - If elis_token cookie exists, validate its expiry
  // - Fall back to elis_authenticated flag (backward compat during transition)
  let isAuthenticated = false;

  if (tokenCookie?.value) {
    isAuthenticated = !isTokenExpired(tokenCookie.value);
  } else if (authCookie?.value === "true") {
    // Legacy: simple flag check (will be phased out once all clients set elis_token cookie)
    isAuthenticated = true;
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
