import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/services/email";

const BASE_URL = process.env.NEXTAUTH_URL || "https://lms-dashboard-qx2u.onrender.com";

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email?.trim()) return NextResponse.json({ error: "נדרש מייל" }, { status: 400 });

  const normalized = email.trim().toLowerCase();

  const student = await prisma.student.findFirst({
    where: {
      OR: [
        { emailMoodle: normalized },
        { emailOverride: normalized },
      ],
    },
  });

  // Always return success to prevent email enumeration
  if (!student) {
    return NextResponse.json({ ok: true });
  }

  // Expire old links for this student
  await prisma.studentMagicLink.updateMany({
    where: { studentId: student.id, usedAt: null },
    data: { expiresAt: new Date() },
  });

  const link = await prisma.studentMagicLink.create({
    data: {
      studentId: student.id,
      email: normalized,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  const url = `${BASE_URL}/api/student-auth/verify?token=${link.token}`;
  const name = student.firstNameOverride || student.firstNameMoodle || "תלמיד";

  const html = `
    <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #1e40af;">שלום ${name} 👋</h2>
      <p>לחץ על הכפתור להתחברות לפורטל הסטודנטים:</p>
      <p>
        <a href="${url}" style="display:inline-block;background:#1e40af;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:16px;margin:16px 0;">
          כניסה לפורטל
        </a>
      </p>
      <p style="color:#6b7280;font-size:13px;">
        או העתק את הקישור הבא:<br/>
        <span style="word-break:break-all;color:#1e40af;">${url}</span>
      </p>
      <p style="color:#9ca3af;font-size:12px;margin-top:24px;">
        הקישור תקף ל-24 שעות ולשימוש חד-פעמי.<br/>
        אם לא ביקשת כניסה — התעלם ממייל זה.
      </p>
    </div>
  `;

  const sent = await sendEmail({
    to: normalized,
    subject: "קישור כניסה לפורטל הסטודנטים",
    html,
  });

  if (!sent) {
    console.log(`[student-auth] Email NOT sent. Magic link for ${normalized}: ${url}`);
  }

  return NextResponse.json({ ok: true });
}
