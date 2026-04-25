import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createStudentSession, SESSION_COOKIE } from "@/lib/student-session";

const BASE_URL = process.env.NEXTAUTH_URL || "https://lms-dashboard-qx2u.onrender.com";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.redirect(`${BASE_URL}/portal?error=invalid`);

  const link = await prisma.studentMagicLink.findUnique({ where: { token } });

  if (!link || link.usedAt || link.expiresAt < new Date()) {
    return NextResponse.redirect(`${BASE_URL}/portal?error=expired`);
  }

  await prisma.studentMagicLink.update({
    where: { id: link.id },
    data: { usedAt: new Date() },
  });

  const jwt = await createStudentSession(link.studentId);

  const res = NextResponse.redirect(`${BASE_URL}/portal/dashboard`);
  res.cookies.set(SESSION_COOKIE, jwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
  return res;
}
