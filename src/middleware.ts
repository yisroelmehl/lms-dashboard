import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || "student-portal-secret-change-me"
);

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const { pathname } = request.nextUrl;

  // Allow embed routes inside iframes (Moodle)
  if (pathname.startsWith("/embed")) {
    response.headers.delete("X-Frame-Options");
    response.headers.set("Content-Security-Policy", "frame-ancestors 'self' *");
    return response;
  }

  // Protect student dashboard — inline JWT check (Edge-compatible)
  if (pathname.startsWith("/portal/dashboard")) {
    const token = request.cookies.get("student_session")?.value;
    if (!token) return NextResponse.redirect(new URL("/portal", request.url));
    try {
      await jwtVerify(token, SECRET);
    } catch {
      return NextResponse.redirect(new URL("/portal", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ["/embed/:path*", "/portal/dashboard/:path*"],
};
