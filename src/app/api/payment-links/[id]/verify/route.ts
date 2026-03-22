import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const KESHER_API_URL = "https://kesherhk.info/ConnectToKesher/ConnectToKesher";
const KESHER_USERNAME = process.env.KESHER_USERNAME || "";
const KESHER_PASSWORD = process.env.KESHER_PASSWORD || "";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function findMatchingTransaction(transactions: any[], token: string) {
  if (!Array.isArray(transactions)) return null;
  return transactions.find((t) => {
    // Check all possible field names for adddata
    const addData = t.AddData || t.adddata || t.Adddata || t.addData || "";
    return addData === token;
  });
}

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

  // Try both Kesher API methods to find the transaction
  try {
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    // Format for GetTrans: yyyy/mm/dd
    const fromDateSlash = `${weekAgo.getFullYear()}/${String(weekAgo.getMonth() + 1).padStart(2, "0")}/${String(weekAgo.getDate()).padStart(2, "0")}`;
    const toDateSlash = `${today.getFullYear()}/${String(today.getMonth() + 1).padStart(2, "0")}/${String(today.getDate()).padStart(2, "0")}`;

    // Format for GetAllTransForCompany: yyyy-mm-ddThh:mm:ss
    const fromDateISO = `${weekAgo.getFullYear()}-${String(weekAgo.getMonth() + 1).padStart(2, "0")}-${String(weekAgo.getDate()).padStart(2, "0")}T00:00:00`;
    const toDateISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}T23:59:59`;

    // Try Method 1: GetTrans (basic)
    const res1 = await fetch(KESHER_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        Json: {
          userName: KESHER_USERNAME,
          password: KESHER_PASSWORD,
          func: "GetTrans",
          format: "json",
          fromDate: fromDateSlash,
          toDate: toDateSlash,
        },
        format: "json",
      }),
    });

    let matchingTran = null;
    let debugInfo: Record<string, unknown> = {};

    if (res1.ok) {
      const data1 = await res1.json();
      debugInfo.getTrans = { keys: Object.keys(data1 || {}), count: 0 };

      // Try to find transactions in the response - check various possible structures
      const tranList1 = data1?.Data || data1?.data || data1?.GetTransRequestResult?.Data || 
                         data1?.Transactions || data1?.transactions || [];
      debugInfo.getTrans = { ...debugInfo.getTrans as object, count: Array.isArray(tranList1) ? tranList1.length : "not-array" };

      if (Array.isArray(tranList1) && tranList1.length > 0) {
        // Log first transaction's keys to understand structure
        debugInfo.sampleTranKeys = Object.keys(tranList1[0]);
        debugInfo.sampleTranAddData = tranList1.slice(0, 3).map(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (t: any) => t.AddData || t.adddata || t.Adddata || t.addData || "(none)"
        );
        matchingTran = findMatchingTransaction(tranList1, link.token);
      }
    }

    // Try Method 2: GetAllTransForCompany if first method didn't find it
    if (!matchingTran) {
      const res2 = await fetch(KESHER_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          Json: {
            userName: KESHER_USERNAME,
            password: KESHER_PASSWORD,
            func: "GetAllTransForCompany",
            format: "json",
            tranDetails: {
              FromDate: fromDateISO,
              ToDate: toDateISO,
              Type: 1,
              Succedded: 0,
            },
          },
          format: "json",
        }),
      });

      if (res2.ok) {
        const data2 = await res2.json();
        debugInfo.getAllTrans = { keys: Object.keys(data2 || {}), count: 0 };

        const tranList2 = data2?.Data || data2?.data || data2?.GetTransRequestResult?.Data || [];
        debugInfo.getAllTrans = { ...debugInfo.getAllTrans as object, count: Array.isArray(tranList2) ? tranList2.length : "not-array" };

        if (Array.isArray(tranList2) && tranList2.length > 0) {
          debugInfo.sampleTran2Keys = Object.keys(tranList2[0]);
          debugInfo.sampleTran2AddData = tranList2.slice(0, 3).map(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (t: any) => t.AddData || t.adddata || t.Adddata || t.addData || "(none)"
          );
          matchingTran = findMatchingTransaction(tranList2, link.token);
        }
      }
    }

    debugInfo.searchingForToken = link.token;

    if (matchingTran) {
      const transactionNumber = matchingTran.NumTransaction || matchingTran.TransactionNumber || 
                                 matchingTran.numTransaction || matchingTran.TransNum;
      const total = matchingTran.Total || matchingTran.total || matchingTran.Sum || matchingTran.sum;
      // Kesher may return agorot or shekels - if > 10000, likely agorot
      const rawAmount = total ? parseFloat(total) : 0;
      const amount = rawAmount > 10000 ? rawAmount / 100 : rawAmount > 0 ? rawAmount : link.finalAmount;

      // Create payment record
      await prisma.payment.create({
        data: {
          paymentLinkId: link.id,
          salesAgentId: link.salesAgentId,
          studentId: link.studentId,
          amount,
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

    // Return debug info to help diagnose
    return NextResponse.json({ status: link.status, verified: false, debug: debugInfo });
  } catch (err) {
    console.error("Kesher API verify error:", err);
    return NextResponse.json({ status: link.status, verified: false, error: String(err) });
  }
}
