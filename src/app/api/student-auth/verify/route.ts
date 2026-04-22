import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createStudentSession, SESSION_COOKIE } from "@/lib/student-session";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.redirect(new URL("/portal?error=invalid", req.url));

  const link = await prisma.studentMagicLink.findUnique({ where: { token } });

  if (!link || link.usedAt || link.expiresAt < new Date()) {
    return NextResponse.redirect(new URL("/portal?error=expired", req.url));
  }

  await prisma.studentMagicLink.update({
    where: { id: link.id },
    data: { usedAt: new Date() },
  });

  const jwt = await createStudentSession(link.studentId);

  const res = NextResponse.redirect(new URL("/portal/dashboard", req.url));
  res.cookies.set(SESSION_COOKIE, jwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
  return res;
}
