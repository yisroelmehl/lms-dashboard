import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/coupons - List all coupons
export async function GET() {
  const coupons = await prisma.coupon.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      course: { select: { id: true, fullNameMoodle: true, fullNameOverride: true } },
    },
  });

  return NextResponse.json({ coupons });
}

// POST /api/coupons - Create a new coupon
export async function POST(request: Request) {
  const body = await request.json();
  const {
    code,
    description,
    discountType,
    discountValue,
    currency,
    maxUses,
    courseId,
    expiresAt,
  } = body;

  if (!code || !discountValue) {
    return NextResponse.json(
      { error: "קוד הקופון וערך ההנחה הם שדות חובה" },
      { status: 400 }
    );
  }

  // Check for duplicate code
  const existing = await prisma.coupon.findUnique({ where: { code } });
  if (existing) {
    return NextResponse.json(
      { error: "קוד קופון זה כבר קיים" },
      { status: 400 }
    );
  }

  const coupon = await prisma.coupon.create({
    data: {
      code: code.trim().toUpperCase(),
      description: description || null,
      discountType: discountType || "fixed",
      discountValue: Number(discountValue),
      currency: currency || "ILS",
      maxUses: maxUses ? Number(maxUses) : null,
      courseId: courseId || null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    },
  });

  return NextResponse.json(coupon, { status: 201 });
}
