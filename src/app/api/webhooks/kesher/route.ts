import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Kesher Payment Page Callback Handler
 * 
 * Kesher payment page (325855) sends callbacks here after payment.
 * Configure Success/Failure/Action URLs in Kesher payment page settings.
 * 
 * We pass adddata=<our-token> in the payment page URL params.
 * Kesher returns it in callbacks, allowing us to link the payment.
 * 
 * Callback params: isSucces, ref, total, transactionNumber, obligationRef, adddata
 */
export async function POST(request: Request) {
  let body: Record<string, unknown>;

  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    body = await request.json();
  } else {
    // Form-encoded or query params
    const text = await request.text();
    body = Object.fromEntries(new URLSearchParams(text));
  }

  const {
    isSucces,
    transactionNumber,
    total,
    obligationRef,
    adddata,
    ref,
  } = body as Record<string, string>;

  // adddata contains our payment link token
  const token = adddata;
  if (!token) {
    console.error("Kesher webhook: missing adddata (token)");
    return NextResponse.json({ error: "missing token" }, { status: 400 });
  }

  const link = await prisma.paymentLink.findUnique({
    where: { token },
    include: { course: true },
  });

  if (!link) {
    console.error(`Kesher webhook: payment link not found for token ${token}`);
    return NextResponse.json({ error: "link not found" }, { status: 404 });
  }

  const isSuccess = isSucces === "true" || isSucces === "True";
  const amount = total ? parseFloat(total) : link.finalAmount;

  // Create payment record
  await prisma.payment.create({
    data: {
      paymentLinkId: link.id,
      salesAgentId: link.salesAgentId,
      studentId: link.studentId,
      amount,
      paymentMethod: "credit_card",
      kesherTransactionNum: transactionNumber || null,
      kesherOKNum: ref || null,
      kesherStatus: isSuccess ? "success" : "failed",
      kesherRawResponse: body as Record<string, string>,
      isSuccess,
      failureReason: isSuccess ? null : "Payment declined",
      processedAt: new Date(),
    },
  });

  if (isSuccess) {
    // Update payment link status
    await prisma.paymentLink.update({
      where: { id: link.id },
      data: {
        status: "paid",
        paidAt: new Date(),
        kesherTransactionNum: transactionNumber || null,
        kesherObligationRef: obligationRef || null,
      },
    });

    // Enroll student in course if student and course exist
    if (link.studentId && link.courseId) {
      // Check if enrollment already exists
      const existingEnrollment = await prisma.enrollment.findFirst({
        where: {
          studentId: link.studentId,
          courseId: link.courseId,
        },
      });

      if (!existingEnrollment) {
        await prisma.enrollment.create({
          data: {
            studentId: link.studentId,
            courseId: link.courseId,
          },
        });
      }

      // TODO: Trigger Moodle enrollment via Moodle API
      // await enrollStudentInMoodle(link.studentId, link.courseId);

      await prisma.paymentLink.update({
        where: { id: link.id },
        data: {
          moodleEnrolled: false, // Will be true once Moodle enrollment completes
        },
      });
    }

    // Create notification for dashboard
    await prisma.notification.create({
      data: {
        type: "payment_received",
        title: "תשלום התקבל",
        message: `${link.firstName} ${link.lastName} ביצע תשלום בסך ${amount} ${link.currency}${link.course ? ` עבור ${link.course.fullNameOverride || link.course.fullNameMoodle}` : ""}`,
        metadata: {
          paymentLinkId: link.id,
          studentId: link.studentId,
          courseId: link.courseId,
          amount,
          currency: link.currency,
          transactionNumber,
        },
      },
    });
  } else {
    // Mark as failed
    await prisma.paymentLink.update({
      where: { id: link.id },
      data: { status: "failed" },
    });
  }

  // Kesher expects a 200 response
  return NextResponse.json({ success: true });
}

// Also handle GET for Kesher success/failure redirect callbacks
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const adddata = searchParams.get("adddata");
  const isSucces = searchParams.get("isSucces");
  const transactionNumber = searchParams.get("transactionNumber");
  const total = searchParams.get("total");
  const ref = searchParams.get("ref");

  if (adddata) {
    const link = await prisma.paymentLink.findUnique({
      where: { token: adddata },
      include: { course: true },
    });

    if (link && isSucces === "true" && link.status !== "paid") {
      const amount = total ? parseFloat(total) : link.finalAmount;

      // Create payment record
      await prisma.payment.create({
        data: {
          paymentLinkId: link.id,
          salesAgentId: link.salesAgentId,
          studentId: link.studentId,
          amount,
          paymentMethod: "credit_card",
          kesherTransactionNum: transactionNumber || null,
          kesherOKNum: ref || null,
          kesherStatus: "success",
          kesherRawResponse: Object.fromEntries(searchParams.entries()),
          isSuccess: true,
          processedAt: new Date(),
        },
      });

      // Update payment link status
      await prisma.paymentLink.update({
        where: { id: link.id },
        data: {
          status: "paid",
          paidAt: new Date(),
          kesherTransactionNum: transactionNumber || null,
        },
      });

      // Enroll student if applicable
      if (link.studentId && link.courseId) {
        const existingEnrollment = await prisma.enrollment.findFirst({
          where: { studentId: link.studentId, courseId: link.courseId },
        });
        if (!existingEnrollment) {
          await prisma.enrollment.create({
            data: { studentId: link.studentId, courseId: link.courseId },
          });
        }
      }

      // Create notification
      await prisma.notification.create({
        data: {
          type: "payment_received",
          title: "תשלום התקבל",
          message: `${link.firstName} ${link.lastName} ביצע תשלום בסך ${amount} ${link.currency}${link.course ? ` עבור ${link.course.fullNameOverride || link.course.fullNameMoodle}` : ""}`,
          metadata: {
            paymentLinkId: link.id,
            studentId: link.studentId,
            courseId: link.courseId,
            amount,
            currency: link.currency,
            transactionNumber,
          },
        },
      });
    } else if (link && isSucces !== "true" && link.status !== "paid") {
      await prisma.paymentLink.update({
        where: { id: link.id },
        data: { status: "failed" },
      });
    }
  }

  // Redirect to payment page to show success/failure
  const redirectToken = adddata || "";
  const status = isSucces === "true" ? "success" : "failed";
  return NextResponse.redirect(
    new URL(`/pay/${redirectToken}?status=${status}`, request.url)
  );
}
