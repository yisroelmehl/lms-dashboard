import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/payment-links/[id] - Get a single payment link
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const link = await prisma.paymentLink.findUnique({
    where: { id },
    include: {
      salesAgent: { select: { id: true, firstName: true, lastName: true } },
      course: { select: { id: true, fullNameMoodle: true, fullNameOverride: true } },
      student: true,
      payments: { orderBy: { processedAt: "desc" } },
    },
  });

  if (!link) {
    return NextResponse.json({ error: "קישור תשלום לא נמצא" }, { status: 404 });
  }

  return NextResponse.json(link);
}

// PATCH /api/payment-links/[id] - Update a payment link
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { status, firstName, lastName, email, phone, courseId, courseName, totalAmount, couponCode, discountAmount, numPayments, chargeDay, kesherPaymentPageId } = body;

  const updateData: Record<string, unknown> = {};
  if (status !== undefined) updateData.status = status;
  if (kesherPaymentPageId !== undefined) updateData.kesherPaymentPageId = kesherPaymentPageId;
  if (firstName !== undefined) updateData.firstName = firstName;
  if (lastName !== undefined) updateData.lastName = lastName;
  if (email !== undefined) updateData.email = email || null;
  if (phone !== undefined) updateData.phone = phone || null;
  if (courseId !== undefined) updateData.courseId = courseId || null;
  if (courseName !== undefined) updateData.courseName = courseName || null;
  if (couponCode !== undefined) updateData.couponCode = couponCode || null;
  if (numPayments !== undefined) updateData.numPayments = numPayments;
  if (chargeDay !== undefined) updateData.chargeDay = chargeDay || null;

  // Recalculate final amount if pricing changed
  if (totalAmount !== undefined || discountAmount !== undefined) {
    const link = await prisma.paymentLink.findUnique({ where: { id }, select: { totalAmount: true, discountAmount: true } });
    if (!link) {
      return NextResponse.json({ error: "קישור תשלום לא נמצא" }, { status: 404 });
    }
    const newTotal = totalAmount ?? link.totalAmount;
    const newDiscount = discountAmount ?? link.discountAmount;
    updateData.totalAmount = newTotal;
    updateData.discountAmount = newDiscount;
    updateData.finalAmount = newTotal - newDiscount;
  }

  const updated = await prisma.paymentLink.update({
    where: { id },
    data: updateData,
    include: {
      salesAgent: { select: { firstName: true, lastName: true } },
      course: { select: { id: true, fullNameMoodle: true, fullNameOverride: true } },
    },
  });

  return NextResponse.json(updated);
}

// DELETE /api/payment-links/[id] - Delete a payment link
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const link = await prisma.paymentLink.findUnique({
    where: { id },
  });

  if (!link) {
    return NextResponse.json({ error: "קישור תשלום לא נמצא" }, { status: 404 });
  }

  await prisma.paymentLink.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
