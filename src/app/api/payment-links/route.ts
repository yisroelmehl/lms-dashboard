import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";
import { buildPaymentPageUrl } from "@/lib/kesher/client";

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
    semesterId,
    classGroupId,
    currency = "ILS",
    totalAmount,
    couponCode,
    discountAmount = 0,
    numPayments = 1,
    chargeDay,
    showCouponField = false,
    showTotalOnForm = false,
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

  // Use provided payment page ID or default from env
  const pageId = kesherPaymentPageId || process.env.KESHER_PAYMENT_PAGE_ID || null;

  // Kesher currency codes: 1=ILS, 2=USD
  const kesherCurrency = currency === "USD" ? "2" : "1";

  // Build Kesher payment URL directly with query params (no API call needed)
  let paymentPageUrl: string | null = null;
  if (pageId) {
    paymentPageUrl = buildPaymentPageUrl(pageId, {
      name: `${firstName} ${lastName}`,
      total: String(finalAmount),
      currency: kesherCurrency,
      numpayment: numPayments > 1 ? String(numPayments) : "",
      tel: phone || "",
      mail: email || "",
      firstName,
      lastName,
      adddata: token, // Our token - returned in callback for linking
    });
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
      semesterId: semesterId || null,
      classGroupId: classGroupId || null,
      currency,
      totalAmount,
      couponCode: couponCode || null,
      showCouponField,
      discountAmount,
      finalAmount,
      showTotalOnForm,
      numPayments,
      chargeDay: chargeDay || null,
      kesherPaymentPageId: pageId,
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
