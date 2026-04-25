import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const BASE_URL = process.env.NEXTAUTH_URL || "https://lms-dashboard-qx2u.onrender.com";

// POST /api/admin/students/:id/magic-link
// Creates a one-time login link for a student and returns the URL.
// Admin can copy the URL and send it via WhatsApp / SMS / personal email.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const student = await prisma.student.findUnique({
    where: { id },
    select: {
      id: true,
      emailMoodle: true, emailOverride: true,
      firstNameMoodle: true, firstNameOverride: true,
    },
  });
  if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

  const email = student.emailOverride || student.emailMoodle;
  if (!email) return NextResponse.json({ error: "לתלמיד אין כתובת מייל" }, { status: 400 });

  // Expire old unused links for this student
  await prisma.studentMagicLink.updateMany({
    where: { studentId: student.id, usedAt: null },
    data: { expiresAt: new Date() },
  });

  const link = await prisma.studentMagicLink.create({
    data: {
      studentId: student.id,
      email,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  const url = `${BASE_URL}/api/student-auth/verify?token=${link.token}`;
  return NextResponse.json({
    url,
    expiresAt: link.expiresAt,
    email,
    studentName: student.firstNameOverride || student.firstNameMoodle,
  });
}
