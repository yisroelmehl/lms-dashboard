import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/coupons/validate - Validate a coupon code (public endpoint)
export async function POST(request: Request) {
  const { code, courseId } = await request.json();

  if (!code) {
    return NextResponse.json({ valid: false, error: "קוד קופון חסר" });
  }

  const coupon = await prisma.coupon.findUnique({
    where: { code: code.trim().toUpperCase() },
  });

  if (!coupon) {
    return NextResponse.json({ valid: false, error: "קופון לא נמצא" });
  }

  if (!coupon.isActive) {
    return NextResponse.json({ valid: false, error: "קופון לא פעיל" });
  }

  if (coupon.expiresAt && new Date() > coupon.expiresAt) {
    return NextResponse.json({ valid: false, error: "פג תוקף הקופון" });
  }

  if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
    return NextResponse.json({ valid: false, error: "הקופון מוצה" });
  }

  // Check course restriction
  if (coupon.courseId && courseId && coupon.courseId !== courseId) {
    return NextResponse.json({ valid: false, error: "הקופון לא תקף לקורס זה" });
  }

  return NextResponse.json({
    valid: true,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    currency: coupon.currency,
    description: coupon.description,
  });
}
