import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const KESHER_API_URL = "https://kesherhk.info/ConnectToKesher/ConnectToKesher";
const KESHER_USERNAME = process.env.KESHER_USERNAME || "";
const KESHER_PASSWORD = process.env.KESHER_PASSWORD || "";

// Public endpoint - verifies payment via Kesher API and updates status
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const link = await prisma.paymentLink.findUnique({
    where: { id },
    include: { course: true },
  });

  if (!link) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  // Already paid
  if (link.status === "paid") {
    return NextResponse.json({ status: "paid", paidAt: link.paidAt });
  }

  // Query Kesher API for recent transactions matching our token
  try {
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const fromDate = `${weekAgo.getFullYear()}/${String(weekAgo.getMonth() + 1).padStart(2, "0")}/${String(weekAgo.getDate()).padStart(2, "0")}`;
    const toDate = `${today.getFullYear()}/${String(today.getMonth() + 1).padStart(2, "0")}/${String(today.getDate()).padStart(2, "0")}`;

    const res = await fetch(KESHER_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        Json: {
          userName: KESHER_USERNAME,
          password: KESHER_PASSWORD,
          func: "GetAllTransForCompany",
          format: "json",
          tranDetails: {
            FromDate: fromDate,
            ToDate: toDate,
            Type: "1",
            Succedded: "1",
          },
        },
        format: "json",
      }),
    });

    if (!res.ok) {
      return NextResponse.json({ status: link.status, verified: false, error: "Kesher API error" });
    }

    const data = await res.json();
    const transactions = data?.GetTransRequestResult?.Data || data?.Data || [];

    // Look for a successful transaction with our token in AddData
    const matchingTran = transactions.find(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (t: any) => t.AddData === link.token || t.adddata === link.token || t.Adddata === link.token
    );

    if (matchingTran) {
      const transactionNumber = matchingTran.NumTransaction || matchingTran.TransactionNumber || matchingTran.numTransaction;
      const total = matchingTran.Total || matchingTran.total;
      const amount = total ? parseFloat(total) / 100 : link.finalAmount; // Kesher returns agorot

      // Create payment record
      await prisma.payment.create({
        data: {
          paymentLinkId: link.id,
          salesAgentId: link.salesAgentId,
          studentId: link.studentId,
          amount: amount > 0 ? amount : link.finalAmount,
          paymentMethod: "credit_card",
          kesherTransactionNum: transactionNumber || null,
          kesherStatus: "success",
          kesherRawResponse: matchingTran,
          isSuccess: true,
          processedAt: new Date(),
        },
      });

      // Update payment link
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
        const existing = await prisma.enrollment.findFirst({
          where: { studentId: link.studentId, courseId: link.courseId },
        });
        if (!existing) {
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
          message: `${link.firstName} ${link.lastName} ביצע תשלום${link.course ? ` עבור ${link.course.fullNameOverride || link.course.fullNameMoodle}` : ""}`,
          metadata: {
            paymentLinkId: link.id,
            studentId: link.studentId,
            courseId: link.courseId,
            transactionNumber,
            verifiedViaApi: true,
          },
        },
      });

      return NextResponse.json({ status: "paid", verified: true });
    }

    return NextResponse.json({ status: link.status, verified: false });
  } catch (err) {
    console.error("Kesher API verify error:", err);
    return NextResponse.json({ status: link.status, verified: false });
  }
}
