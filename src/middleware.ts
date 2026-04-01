import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes that don't require approval
const PUBLIC_PATHS = [
  "/",
  "/invite",
  "/waitlisted",
  "/api",
  "/_next",
  "/favicon",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  // Allow static files
  if (pathname.includes(".")) {
    return NextResponse.next();
  }

  // For /dashboard — check if user is approved
  // We check by calling our own API (can't import Supabase in edge middleware easily)
  // Use a cookie to cache the approval status so we don't hit the DB on every request
  const approvalCookie = request.cookies.get("na-approved");
  if (approvalCookie?.value === "true") {
    return NextResponse.next();
  }

  // Check if user has a session at all
  const sessionToken =
    request.cookies.get("authjs.session-token")?.value ||
    request.cookies.get("__Secure-authjs.session-token")?.value;

  if (!sessionToken) {
    // Not signed in — redirect to landing page
    return NextResponse.redirect(new URL("/", request.url));
  }

  // User is signed in but we don't have an approval cookie
  // Call check-access API to verify
  try {
    const checkUrl = new URL("/api/auth/check-access", request.url);
    const checkRes = await fetch(checkUrl.toString(), {
      headers: {
        cookie: request.headers.get("cookie") || "",
      },
    });
    const data = await checkRes.json();

    if (data.approved) {
      // Set approval cookie so we don't check every request (24h cache)
      const response = NextResponse.next();
      response.cookies.set("na-approved", "true", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24, // 24 hours
      });
      return response;
    }
  } catch (error) {
    console.error("Middleware approval check failed:", error);
  }

  // Not approved — redirect to waitlisted page
  return NextResponse.redirect(new URL("/waitlisted", request.url));
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
