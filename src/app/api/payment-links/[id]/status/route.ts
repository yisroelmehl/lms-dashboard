import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Public endpoint - returns only the status of a payment link
// Used by the payment page to poll for payment completion
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const link = await prisma.paymentLink.findUnique({
    where: { id },
    select: { status: true, paidAt: true },
  });

  if (!link) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  return NextResponse.json({ status: link.status, paidAt: link.paidAt });
}
