import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// PATCH /api/coupons/[id] - Update a coupon
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const coupon = await prisma.coupon.update({
    where: { id },
    data: body,
  });

  return NextResponse.json(coupon);
}

// DELETE /api/coupons/[id] - Delete a coupon
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.coupon.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
