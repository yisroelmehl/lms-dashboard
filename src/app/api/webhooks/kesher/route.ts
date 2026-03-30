import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

import { autoEnrollStudentInMoodle } from "@/lib/services/moodle-enrollment";
import { submitToJotform } from "@/lib/services/jotform";
import { createBaldarShipment } from "@/lib/shipping/yahav-baldar";

/**
 * Kesher Payment Page Callback Handler
 * 
 * Kesher payment page (325869) sends callbacks here after payment.
 * Configure Success/Failure/Action URLs in Kesher payment page settings.
 * 
 * We pass adddata=<our-token> in the payment page URL params.
 * Kesher returns it in callbacks, allowing us to link the payment.
 * 
 * Callback params: isSucces, ref, total, transactionNumber, obligationRef, adddata, receiptLink, docNumber
 * 
 * NOTE: Kesher may omit adddata/isSucces in some callbacks.
 * If adddata is missing, we fall back to matching by amount among recent opened links.
 * If isSucces is missing, we infer success from presence of ref/docNumber.
 */

// Shared logic for processing a confirmed payment
async function processPayment(
  link: Awaited<ReturnType<typeof findLink>>,
  params: {
    isSuccess: boolean;
    amount: number;
    transactionNumber: string | null;
    obligationRef: string | null;
    ref: string | null;
    receiptLink: string | null;
    docNumber: string | null;
    rawData: Record<string, unknown>;
  }
) {
  if (!link) return;

  await prisma.payment.create({
    data: {
      paymentLinkId: link.id,
      salesAgentId: link.salesAgentId,
      studentId: link.studentId,
      amount: params.amount,
      paymentMethod: "credit_card",
      kesherTransactionNum: params.transactionNumber,
      kesherOKNum: params.ref,
      kesherStatus: params.isSuccess ? "success" : "failed",
      kesherRawResponse: params.rawData as Record<string, string>,
      kesherReceiptLink: params.receiptLink,
      kesherDocNumber: params.docNumber,
      isSuccess: params.isSuccess,
      failureReason: params.isSuccess ? null : "Payment declined",
      processedAt: new Date(),
    },
  });

  if (params.isSuccess) {
    await prisma.paymentLink.update({
      where: { id: link.id },
      data: {
        status: "paid",
        paidAt: new Date(),
        kesherTransactionNum: params.transactionNumber,
        kesherObligationRef: params.obligationRef,
      },
    });

    if (link.studentId && link.courseId) {
      const existingEnrollment = await prisma.enrollment.findFirst({
        where: { studentId: link.studentId, courseId: link.courseId },
      });
      if (!existingEnrollment) {
        const newEnrollment = await prisma.enrollment.create({
          data: { studentId: link.studentId, courseId: link.courseId },
        });

        // Auto-create onboarding checklist for new student
        const existingOnboarding = await prisma.studentOnboarding.findFirst({
          where: { studentId: link.studentId, completedAt: null },
        });
        if (!existingOnboarding) {
          await prisma.studentOnboarding.create({
            data: {
              studentId: link.studentId,
              enrollmentId: newEnrollment.id,
            },
          });
        }
      }
      // Auto-create shipment for new enrollment and send to Baldar
      const student = await prisma.student.findUnique({
        where: { id: link.studentId },
        select: { hebrewName: true, firstNameOverride: true, lastNameOverride: true, firstNameMoodle: true, lastNameMoodle: true, city: true, address: true, phoneMoodle: true, phoneOverride: true, emailMoodle: true, emailOverride: true },
      });
      if (student && student.city) {
        const studentName = student.hebrewName || 
          `${student.firstNameOverride || student.firstNameMoodle || link.firstName} ${student.lastNameOverride || student.lastNameMoodle || link.lastName}`.trim();
        
        const shipment = await prisma.shipment.create({
          data: {
            studentId: link.studentId,
            carrier: "yahav_baldar",
            recipientName: studentName,
            address: student.address || undefined,
            city: student.city,
            country: "IL",
            phone: student.phoneOverride || student.phoneMoodle || undefined,
            email: student.emailOverride || student.emailMoodle || link.email || undefined,
            status: "pending",
          },
        });

        // Auto-send to Baldar (non-blocking)
        createBaldarShipment({
          recipientName: studentName,
          address: student.address || "",
          city: student.city,
          phone: student.phoneOverride || student.phoneMoodle || "",
          email: student.emailOverride || student.emailMoodle || link.email || "",
          orderNum: shipment.id.slice(-8),
          packageCount: 1,
        }, shipment.id).then(async (result) => {
          if (result.success && result.deliveryNumber) {
            await prisma.shipment.update({
              where: { id: shipment.id },
              data: {
                status: "created",
                trackingNumber: result.deliveryNumber,
                carrierRef: result.deliveryNumber,
              },
            });
            console.log(`[Auto-Ship] Shipment ${shipment.id} sent to Baldar: ${result.deliveryNumber}`);
          } else {
            console.error(`[Auto-Ship] Baldar failed for ${shipment.id}:`, result.error);
          }
        }).catch(err => {
          console.error(`[Auto-Ship] Error sending to Baldar:`, err);
        });
      }

      await prisma.paymentLink.update({
        where: { id: link.id },
        data: { moodleEnrolled: false },
      });

      // Auto-enroll in Moodle asynchronously
      autoEnrollStudentInMoodle(link.id).catch(err => {
        console.error(`Failed to auto-enroll student in background:`, err);
      });

      // Submit Terms of Service to Jotform asynchronously (non-blocking)
      if (link.studentId) {
        submitToJotform({
          studentId: link.studentId,
          firstName: link.firstName,
          lastName: link.lastName,
          email: link.email || "",
          courseId: link.courseId,
          courseName: link.courseName,
          paymentLinkId: link.id,
        }).catch(err => {
          console.error(`Failed to submit to Jotform in background:`, err);
        });
      }

      // Generate terms PDF + send welcome email (after payment confirmed)
      if (link.studentId && link.registrationData) {
        const regData = link.registrationData as Record<string, string>;
        const sig = regData.signature;
        if (sig) {
          const courseName = link.course?.fullNameOverride || link.course?.fullNameMoodle || link.courseName || "";
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://lms-dashboard-qx2u.onrender.com";
          fetch(`${appUrl}/api/terms-acceptances`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              token: link.token,
              studentId: link.studentId,
              firstName: regData.firstName || link.firstName,
              email: regData.email || link.email || "",
              courseName,
              signature: sig,
            }),
          }).then(r => {
            if (r.ok) console.log(`[Terms] Welcome email sent after payment for ${link.firstName}`);
            else console.error(`[Terms] Failed to send after payment:`, r.status);
          }).catch(err => {
            console.error(`[Terms] Error sending welcome email:`, err);
          });
        }
      }
    }

    await prisma.notification.create({
      data: {
        type: "payment_received",
        title: "תשלום התקבל",
        message: `${link.firstName} ${link.lastName} ביצע תשלום בסך ${params.amount} ${link.currency}${link.course ? ` עבור ${link.course.fullNameOverride || link.course.fullNameMoodle}` : ""}`,
        metadata: {
          paymentLinkId: link.id,
          studentId: link.studentId,
          courseId: link.courseId,
          amount: params.amount,
          currency: link.currency,
          transactionNumber: params.transactionNumber,
        },
      },
    });
  } else {
    await prisma.paymentLink.update({
      where: { id: link.id },
      data: { status: "failed" },
    });
  }
}

type LinkWithCourse = {
  id: string;
  token: string;
  firstName: string;
  lastName: string;
  email: string | null;
  courseName: string | null;
  studentId: string | null;
  courseId: string | null;
  salesAgentId: string | null;
  finalAmount: number;
  currency: string;
  status: string;
  registrationData: Record<string, unknown> | null;
  course: { fullNameMoodle: string; fullNameOverride: string | null } | null;
};

// Find payment link by token, or fall back to amount matching
async function findLink(token: string | null, amount: number | null): Promise<LinkWithCourse | null> {
  // Primary: find by token (adddata)
  if (token) {
    const link = await prisma.paymentLink.findUnique({
      where: { token },
      include: { course: { select: { fullNameMoodle: true, fullNameOverride: true } } },
    });
    if (link) return link as LinkWithCourse;
  }

  // Fallback: if no token, try to match by amount among unpaid opened links
  if (amount && amount > 0) {
    const candidates = await prisma.paymentLink.findMany({
      where: { status: "opened", finalAmount: amount },
      include: { course: { select: { fullNameMoodle: true, fullNameOverride: true } } },
      orderBy: { createdAt: "desc" },
      take: 1,
    });
    if (candidates.length === 1) {
      console.log(`Kesher webhook: matched payment link by amount ${amount} (no adddata)`);
      return candidates[0] as LinkWithCourse;
    }
    if (candidates.length > 1) {
      console.warn(`Kesher webhook: multiple links match amount ${amount}, cannot auto-match`);
    }
  }

  return null;
}

// Determine if a callback represents a successful payment
function inferSuccess(isSucces: string | null, ref: string | null, docNumber: string | null): boolean {
  // Explicit isSucces flag
  if (isSucces === "true" || isSucces === "True") return true;
  if (isSucces === "false" || isSucces === "False") return false;
  // If no isSucces but has ref and docNumber, it's a success redirect
  if (ref && docNumber) return true;
  // If ref exists (approval code), likely success
  if (ref) return true;
  return false;
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;

  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    body = await request.json();
  } else {
    const text = await request.text();
    body = Object.fromEntries(new URLSearchParams(text));
  }

  console.log("Kesher webhook POST:", JSON.stringify(body));

  const {
    isSucces,
    transactionNumber,
    total,
    obligationRef,
    adddata,
    ref,
    docNumber,
    receiptLink,
  } = body as Record<string, string>;

  const amount = total ? parseFloat(total) : null;
  const link = await findLink(adddata || null, amount);

  if (!link) {
    console.error("Kesher webhook POST: no matching payment link", { adddata, total });
    return NextResponse.json(
      { error: "link not found", receivedParams: { adddata, total, transactionNumber, ref } },
      { status: 404 }
    );
  }

  if (link.status === "paid") {
    return NextResponse.json({ success: true, message: "already paid" });
  }

  const isSuccess = inferSuccess(isSucces, ref, docNumber);
  const finalAmount = amount ?? link.finalAmount;

  await processPayment(link, {
    isSuccess,
    amount: finalAmount,
    transactionNumber: transactionNumber || null,
    obligationRef: obligationRef || null,
    ref: ref || null,
    receiptLink: receiptLink || null,
    docNumber: docNumber || null,
    rawData: body,
  });

  return NextResponse.json({ success: true });
}

// GET handler for Kesher success/failure redirect callbacks
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  console.log("Kesher webhook GET:", Object.fromEntries(searchParams.entries()));

  const adddata = searchParams.get("adddata");
  const isSucces = searchParams.get("isSucces");
  const transactionNumber = searchParams.get("transactionNumber");
  const total = searchParams.get("total");
  const ref = searchParams.get("ref");
  const docNumber = searchParams.get("docNumber");
  const obligationRef = searchParams.get("obligationRef");
  const receiptLink = searchParams.get("receiptLink");

  const amount = total ? parseFloat(total) : null;
  const link = await findLink(adddata, amount);

  const isSuccessInfer = inferSuccess(isSucces, ref, docNumber);

  if (link && link.status !== "paid") {
    const finalAmount = amount ?? link.finalAmount;

    await processPayment(link, {
      isSuccess: isSuccessInfer,
      amount: finalAmount,
      transactionNumber: transactionNumber || null,
      obligationRef: obligationRef || null,
      ref: ref || null,
      receiptLink: receiptLink || null,
      docNumber: docNumber || null,
      rawData: Object.fromEntries(searchParams.entries()),
    });
  }

  // Redirect to success page to show result
  if (isSuccessInfer || link?.status === "paid") {
    return NextResponse.redirect(
      new URL(`/pay/success?token=${adddata}&transactionNumber=${transactionNumber}`, request.url)
    );
  }

  // Failure redirect
  const redirectToken = adddata || "";
  return NextResponse.redirect(
    new URL(`/pay/${redirectToken}?status=failed`, request.url)
  );
}
