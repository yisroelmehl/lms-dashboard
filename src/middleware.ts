import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Allow embed routes to be loaded inside iframes (Moodle)
  if (request.nextUrl.pathname.startsWith("/embed")) {
    response.headers.delete("X-Frame-Options");
    response.headers.set(
      "Content-Security-Policy",
      "frame-ancestors 'self' *"
    );
  }

  return response;
}

export const config = {
  matcher: ["/embed/:path*"],
};
