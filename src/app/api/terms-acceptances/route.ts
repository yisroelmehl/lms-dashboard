import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { processTermsAcceptance } from "@/lib/services/terms-pdf";

export async function POST(request: NextRequest) {
  try {
    console.log("[Terms API] POST received");

    const body = await request.json();
    const { token, studentId, firstName, email, courseName, signature } = body;
    console.log("[Terms API] Student:", firstName, "Email:", email, "HasSignature:", !!signature);

    // Auth: either via token (public terms page) or session (admin dashboard)
    if (token) {
      const link = await prisma.paymentLink.findUnique({ where: { token } });
      if (!link || link.studentId !== studentId) {
        console.error("[Terms API] Auth failed - token mismatch");
        return NextResponse.json({ error: "Invalid token" }, { status: 401 });
      }
    } else {
      const session = await getServerSession(authOptions);
      if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    if (!studentId || !firstName || !email || !signature) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const result = await processTermsAcceptance({
      studentId,
      firstName,
      email,
      courseName: courseName || "לא צוין",
      signature,
      ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || undefined,
      userAgent: request.headers.get("user-agent") || undefined,
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        termsAcceptanceId: result.termsAcceptanceId,
      });
    } else {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
  } catch (error) {
    console.error("Terms acceptance error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process terms acceptance" },
      { status: 500 }
    );
  }
}
