import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

const COOKIE = "student_session";
const SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || "student-portal-secret-change-me"
);

export async function createStudentSession(studentId: string): Promise<string> {
  return new SignJWT({ studentId })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("30d")
    .sign(SECRET);
}

export async function getStudentSession(
  req?: NextRequest
): Promise<{ studentId: string } | null> {
  try {
    let token: string | undefined;
    if (req) {
      token = req.cookies.get(COOKIE)?.value;
    } else {
      const cookieStore = await cookies();
      token = cookieStore.get(COOKIE)?.value;
    }
    if (!token) return null;
    const { payload } = await jwtVerify(token, SECRET);
    return { studentId: payload.studentId as string };
  } catch {
    return null;
  }
}

export const SESSION_COOKIE = COOKIE;
