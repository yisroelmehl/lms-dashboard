import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { autoEnrollStudentInMoodle } from "@/lib/services/moodle-enrollment";

// POST /api/payment-links/[id]/register - Student submits registration form
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { token, registrationData, termsAccepted, termsText, couponCode } = body;
  
  // Get IP address for legal tracking
  const clientIp = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";

  // Fetch the payment link
  const link = await prisma.paymentLink.findUnique({ where: { id } });
  if (!link) {
    return NextResponse.json({ error: "קישור לא נמצא" }, { status: 404 });
  }

  // Verify token matches
  if (link.token !== token) {
    return NextResponse.json({ error: "טוקן לא תקין" }, { status: 403 });
  }

  // Check status
  if (link.status === "paid") {
    return NextResponse.json({ error: "הקישור כבר שולם" }, { status: 400 });
  }
  if (link.status === "cancelled" || link.status === "expired") {
    return NextResponse.json({ error: "הקישור אינו פעיל" }, { status: 400 });
  }

  // Create or find student
  let studentId = link.studentId;

  if (!studentId && registrationData) {
    const email = registrationData.email;
    const phone = registrationData.phone;

    // Try to find existing student by email
    let student = null;
    if (email) {
      student = await prisma.student.findFirst({
        where: {
          OR: [
            { emailMoodle: { equals: email, mode: "insensitive" } },
            { emailOverride: { equals: email, mode: "insensitive" } },
          ],
        },
      });
    }

    if (student) {
      // Update existing student with new info
      studentId = student.id;
      await prisma.student.update({
        where: { id: student.id },
        data: {
          phoneOverride: phone || undefined,
          hebrewName: registrationData.hebrewName || undefined,
          city: registrationData.city || undefined,
          address: registrationData.addressNum
            ? `${registrationData.address || ""} ${registrationData.addressNum}`.trim()
            : registrationData.address || undefined,
          dateOfBirth: registrationData.dateOfBirth
            ? new Date(registrationData.dateOfBirth)
            : undefined,
          torahBackground: registrationData.torahBackground || undefined,
          smichaBackground: registrationData.smichaBackground || undefined,
          studyPreferences: registrationData.studyPreferences || undefined,
          hasChavrusa: registrationData.hasChavrusa ?? undefined,
          participationType: registrationData.participationType || undefined,
        },
      });
    } else {
      // Create new student
      const newStudent = await prisma.student.create({
        data: {
          firstNameOverride: registrationData.firstName,
          lastNameOverride: registrationData.lastName,
          emailOverride: email || null,
          phoneOverride: phone || null,
          hebrewName: registrationData.hebrewName || null,
          city: registrationData.city || null,
          address: registrationData.addressNum
            ? `${registrationData.address || ""} ${registrationData.addressNum}`.trim()
            : registrationData.address || null,
          dateOfBirth: registrationData.dateOfBirth
            ? new Date(registrationData.dateOfBirth)
            : null,
          torahBackground: registrationData.torahBackground || null,
          smichaBackground: registrationData.smichaBackground || null,
          studyPreferences: registrationData.studyPreferences || null,
          hasChavrusa: registrationData.hasChavrusa || false,
          participationType: registrationData.participationType || null,
        },
      });
      studentId = newStudent.id;
    }
  }

  // Process coupon if provided by student
  let couponDiscountAmount = 0;
  let appliedCouponCode: string | null = null;
  
  if (couponCode && typeof couponCode === "string" && couponCode.trim()) {
    const normalizedCode = couponCode.trim().toUpperCase();
    const coupon = await prisma.coupon.findUnique({
      where: { code: normalizedCode },
    });
    
    if (coupon && coupon.isActive && 
        (!coupon.expiresAt || new Date() <= coupon.expiresAt) &&
        (!coupon.maxUses || coupon.usedCount < coupon.maxUses) &&
        (!coupon.courseId || coupon.courseId === link.courseId)) {
      
      if (coupon.discountType === "percent") {
        couponDiscountAmount = Math.round((link.totalAmount * coupon.discountValue / 100) * 100) / 100;
      } else {
        couponDiscountAmount = coupon.discountValue;
      }
      
      // Don't let discount exceed total
      couponDiscountAmount = Math.min(couponDiscountAmount, link.totalAmount);
      appliedCouponCode = normalizedCode;
      
      // Increment coupon usage
      await prisma.coupon.update({
        where: { id: coupon.id },
        data: { usedCount: { increment: 1 } },
      });
    }
  }

  // Calculate updated amounts
  const newDiscountAmount = (link.discountAmount || 0) + couponDiscountAmount;
  const newFinalAmount = Math.max(0, link.totalAmount - newDiscountAmount);

  // Update payment link
  const isComplete = link.isRegistrationOnly;
  
  const updatedLink = await prisma.paymentLink.update({
    where: { id },
    data: {
      studentId,
      registrationData: registrationData || undefined,
      termsAcceptedAt: termsAccepted ? new Date() : undefined,
      termsTextAccepted: termsText || undefined,
      clientIp: clientIp,
      firstName: registrationData?.firstName || link.firstName,
      lastName: registrationData?.lastName || link.lastName,
      email: registrationData?.email || link.email,
      phone: registrationData?.phone || link.phone,
      // Update coupon and amounts
      ...(appliedCouponCode ? {
        couponCode: appliedCouponCode,
        discountAmount: newDiscountAmount,
        finalAmount: newFinalAmount,
      } : {}),
      status: isComplete ? "paid" : undefined,
      paidAt: isComplete ? new Date() : undefined,
      moodleEnrolled: isComplete ? false : undefined,
    },
    include: {
      course: { select: { fullNameMoodle: true, fullNameOverride: true } },
    },
  });

  if (isComplete && studentId && link.courseId) {
    // Check if enrollment already exists
    const existingEnrollment = await prisma.enrollment.findFirst({
      where: { studentId, courseId: link.courseId },
    });
    if (!existingEnrollment) {
      await prisma.enrollment.create({
        data: { studentId, courseId: link.courseId },
      });
    }

    // Auto-enroll in Moodle asynchronously since registration is complete
    autoEnrollStudentInMoodle(link.id).catch(err => {
      console.error(`Failed to auto-enroll student in background:`, err);
    });
  }

  if (isComplete && studentId) {
    await prisma.payment.create({
      data: {
        paymentLinkId: link.id,
        salesAgentId: link.salesAgentId,
        studentId,
        amount: newFinalAmount,
        currency: link.currency,
        paymentMethod: "bank_transfer",
        isSuccess: true,
        kesherStatus: "success",
        processedAt: new Date(),
      },
    });
  }

  // Create dashboard notification for new student registration
  const studentName = `${registrationData?.firstName || link.firstName} ${registrationData?.lastName || link.lastName}`;
  const courseName = updatedLink.course
    ? (updatedLink.course.fullNameOverride || updatedLink.course.fullNameMoodle)
    : link.courseName;

  await prisma.notification.create({
    data: {
      type: "new_student",
      title: "תלמיד חדש נרשם",
      message: courseName
        ? `${studentName} נרשם לקורס ${courseName}`
        : `${studentName} השלים טופס רישום`,
      metadata: {
        studentId,
        paymentLinkId: link.id,
        courseId: link.courseId,
        semesterId: link.semesterId,
        classGroupId: link.classGroupId,
      },
    },
  });

  return NextResponse.json({ 
    success: true, 
    studentId,
    finalAmount: newFinalAmount,
    discountAmount: newDiscountAmount,
    couponApplied: !!appliedCouponCode,
  });
}
