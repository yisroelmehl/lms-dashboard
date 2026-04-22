import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "student_session";

const SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || "student-portal-secret-change-me"
);

export async function createStudentSession(studentId: string): Promise<string> {
  return new SignJWT({ studentId })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("30d")
    .sign(SECRET);
}

/** For use in API route handlers (Node.js runtime only) */
export async function getStudentSession(): Promise<{ studentId: string } | null> {
  try {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, SECRET);
    return { studentId: payload.studentId as string };
  } catch {
    return null;
  }
}
