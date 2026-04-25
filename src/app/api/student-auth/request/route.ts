import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = process.env.RESEND_FROM_EMAIL || "noreply@lemaanyilmedo.org";
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

  if (resend) {
    try {
      const result = await resend.emails.send({
        from: FROM,
        to: normalized,
        subject: "קישור כניסה לפורטל הסטודנטים",
        html: `
          <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
            <h2 style="color: #1e40af;">שלום ${name} 👋</h2>
            <p>לחץ על הכפתור להתחברות לפורטל:</p>
            <a href="${url}" style="display:inline-block;background:#1e40af;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:16px;margin:16px 0;">
              כניסה לפורטל
            </a>
            <p style="color:#6b7280;font-size:13px;">הקישור תקף ל-24 שעות ולשימוש חד-פעמי.<br/>אם לא ביקשת כניסה, התעלם ממייל זה.</p>
          </div>
        `,
      });
      if ("error" in result && result.error) {
        console.error("[student-auth] Resend error:", result.error);
      }
    } catch (err) {
      console.error("[student-auth] Resend send threw:", err);
    }
  } else {
    console.log(`[student-auth] No RESEND_API_KEY. Magic link for ${normalized}: ${url}`);
  }

  return NextResponse.json({ ok: true });
}
