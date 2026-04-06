import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getLinkToken, buildPaymentPageUrl } from "@/lib/kesher/client";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  const link = await prisma.paymentLink.findUnique({
    where: { id },
  });

  if (!link || !link.kesherPaymentPageId) {
    return NextResponse.json({ error: "No Kesher configuration found" }, { status: 400 });
  }

  try {
    const kesherCurrency = link.currency === "USD" ? 2 : 1;
    const numPayments = link.numPayments > 1 ? link.numPayments : 1;
    const creditType = numPayments > 1 ? 8 : 1; // 8 = installments

    const resp = await getLinkToken({
      PaymentPageId: link.kesherPaymentPageId,
      Total: String(link.finalAmount),
      Currency: kesherCurrency,
      CreditType: creditType,
      NumPayment: numPayments,
      FirstName: link.firstName || undefined,
      LastName: link.lastName || undefined,
      Phone: link.phone || undefined,
      Mail: link.email || undefined,
      CustomerRef: link.token,
    });

    if (resp.RequestResult && resp.RequestResult.Status && resp.Token) {
      // Build the final iframe URL with the generated Token
      const paymentPageUrl = buildPaymentPageUrl(link.kesherPaymentPageId, { 
        token: resp.Token,
        adddata: link.token,
        addactiondata: link.token,
        hidetotaldetails: "true",
      });
      return NextResponse.json({ success: true, paymentPageUrl });
    } else {
      console.error("Kesher getLinkToken failed:", resp.RequestResult);
      return NextResponse.json({ error: resp?.RequestResult?.Description || "GetLinkToken failed" }, { status: 400 });
    }
  } catch (error) {
    console.error("Kesher API error:", error);
    return NextResponse.json({ error: "Failed to communicate with Kesher" }, { status: 500 });
  }
}
