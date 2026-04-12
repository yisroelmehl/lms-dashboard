import { prisma } from "@/lib/prisma";
import crypto from "crypto";

const JWT_SECRET = process.env.JWT_SECRET || "";

interface EmbedPayload {
  email: string;
  syllabusItemId: string;
  exp: number;
}

/**
 * Create a signed embed token for a student to access an assignment
 */
export function createEmbedToken(email: string, syllabusItemId: string): string {
  const payload: EmbedPayload = {
    email,
    syllabusItemId,
    exp: Math.floor(Date.now() / 1000) + 4 * 60 * 60, // 4 hour expiry
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(payloadB64)
    .digest("base64url");

  return `${payloadB64}.${signature}`;
}

/**
 * Verify and decode an embed token
 */
export function verifyEmbedToken(token: string): EmbedPayload | null {
  if (!JWT_SECRET) return null;

  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [payloadB64, signature] = parts;
  const expectedSig = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(payloadB64)
    .digest("base64url");

  if (signature !== expectedSig) return null;

  try {
    const payload: EmbedPayload = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString("utf8")
    );

    // Check expiry
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;

    return payload;
  } catch {
    return null;
  }
}

/**
 * Authenticate an embed request - find student by email or embed token
 */
export async function authenticateEmbed(params: {
  token?: string | null;
  email?: string | null;
  embedToken?: string | null; // The per-item embed token from DB
  syllabusItemId: string;
}): Promise<{
  student: { id: string; email: string; name: string } | null;
  error: string | null;
}> {
  // Method 1: Signed JWT token (from Moodle PHP filter or direct link)
  if (params.token) {
    const payload = verifyEmbedToken(params.token);
    if (!payload) {
      return { student: null, error: "טוקן לא תקין או שפג תוקפו" };
    }

    if (payload.syllabusItemId !== params.syllabusItemId) {
      return { student: null, error: "טוקן לא מתאים למטלה" };
    }

    const student = await findStudentByEmail(payload.email);
    if (!student) {
      return { student: null, error: "תלמיד לא נמצא במערכת" };
    }

    return { student, error: null };
  }

  // Method 2: Email + embed token verification (for Moodle URL with substitution variable)
  if (params.email && params.embedToken) {
    // Verify the embed token matches the syllabus item
    const item = await prisma.syllabusItem.findUnique({
      where: { id: params.syllabusItemId },
      select: { embedToken: true },
    });

    if (!item || item.embedToken !== params.embedToken) {
      return { student: null, error: "טוקן embed לא תקין" };
    }

    const student = await findStudentByEmail(params.email);
    if (!student) {
      return { student: null, error: "תלמיד לא נמצא במערכת" };
    }

    return { student, error: null };
  }

  return { student: null, error: "חסרים פרטי הזדהות" };
}

async function findStudentByEmail(email: string): Promise<{
  id: string;
  email: string;
  name: string;
} | null> {
  const student = await prisma.student.findFirst({
    where: {
      OR: [
        { emailMoodle: { equals: email, mode: "insensitive" } },
        { emailOverride: { equals: email, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      emailMoodle: true,
      emailOverride: true,
      firstNameMoodle: true,
      firstNameOverride: true,
      lastNameMoodle: true,
      lastNameOverride: true,
      hebrewName: true,
    },
  });

  if (!student) return null;

  const name =
    student.hebrewName ||
    `${student.firstNameOverride || student.firstNameMoodle || ""} ${student.lastNameOverride || student.lastNameMoodle || ""}`.trim();

  return {
    id: student.id,
    email: (student.emailOverride || student.emailMoodle || email).toLowerCase(),
    name,
  };
}
