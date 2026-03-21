import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";
import { getLinkToken, buildPaymentPageUrl } from "@/lib/kesher/client";

// GET /api/payment-links - List payment links
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const agentId = searchParams.get("agentId");
  const status = searchParams.get("status");

  const where: Record<string, unknown> = {};
  if (agentId) where.salesAgentId = agentId;
  if (status) where.status = status;

  const links = await prisma.paymentLink.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      salesAgent: { select: { firstName: true, lastName: true } },
      course: { select: { id: true, fullNameMoodle: true, fullNameOverride: true } },
      student: { select: { id: true, firstNameMoodle: true, lastNameMoodle: true, firstNameOverride: true, lastNameOverride: true, hebrewName: true } },
    },
  });

  return NextResponse.json(links);
}

// POST /api/payment-links - Create a new payment link
export async function POST(request: Request) {
  const body = await request.json();
  const {
    salesAgentId,
    firstName,
    lastName,
    email,
    phone,
    courseId,
    courseName,
    totalAmount,
    couponCode,
    discountAmount = 0,
    numPayments = 1,
    chargeDay,
    kesherPaymentPageId,
  } = body;

  if (!salesAgentId || !firstName || !lastName || !totalAmount) {
    return NextResponse.json(
      { error: "שדות חובה: איש מכירות, שם פרטי, שם משפחה וסכום" },
      { status: 400 }
    );
  }

  const finalAmount = totalAmount - (discountAmount || 0);
  const token = randomUUID();

  // Try to generate a Kesher payment page token if payment page ID is provided
  let kesherToken: string | null = null;
  let paymentPageUrl: string | null = null;

  if (kesherPaymentPageId) {
    try {
      const kesherResponse = await getLinkToken({
        PaymentPageId: kesherPaymentPageId,
        Total: String(finalAmount),
        NumPayment: numPayments > 1 ? numPayments : undefined,
        FirstName: firstName,
        LastName: lastName,
        Phone: phone || undefined,
        Mail: email || undefined,
      });

      if (kesherResponse.RequestResult?.Status && kesherResponse.Token) {
        kesherToken = kesherResponse.Token;
        paymentPageUrl = buildPaymentPageUrl(kesherPaymentPageId, {
          token: kesherResponse.Token,
        });
      }
    } catch (err) {
      console.error("Failed to generate Kesher token:", err);
      // Continue without Kesher token - link will still be created
    }
  }

  const paymentLink = await prisma.paymentLink.create({
    data: {
      token,
      salesAgentId,
      firstName,
      lastName,
      email: email || null,
      phone: phone || null,
      courseId: courseId || null,
      courseName: courseName || null,
      totalAmount,
      couponCode: couponCode || null,
      discountAmount,
      finalAmount,
      numPayments,
      chargeDay: chargeDay || null,
      kesherPaymentPageId: kesherPaymentPageId || null,
      kesherToken,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    },
    include: {
      salesAgent: { select: { firstName: true, lastName: true } },
      course: { select: { id: true, fullNameMoodle: true, fullNameOverride: true } },
    },
  });

  return NextResponse.json(
    {
      ...paymentLink,
      paymentPageUrl,
      registrationUrl: `/pay/${token}`,
    },
    { status: 201 }
  );
}
