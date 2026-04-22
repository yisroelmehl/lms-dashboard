import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getStudentSession } from "@/lib/student-session";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const { pathname } = request.nextUrl;

  // Allow embed routes to be loaded inside iframes (Moodle)
  if (pathname.startsWith("/embed")) {
    response.headers.delete("X-Frame-Options");
    response.headers.set("Content-Security-Policy", "frame-ancestors 'self' *");
    return response;
  }

  // Protect student dashboard
  if (pathname.startsWith("/portal/dashboard")) {
    const session = await getStudentSession(request);
    if (!session) {
      return NextResponse.redirect(new URL("/portal", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ["/embed/:path*", "/portal/dashboard/:path*"],
};
