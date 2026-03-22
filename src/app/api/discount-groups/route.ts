import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const groups = await prisma.discountGroup.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      include: {
        _count: { select: { paymentLinks: true } },
      },
    });

    return NextResponse.json({ groups });
  } catch (error) {
    console.error("Error fetching discount groups:", error);
    return NextResponse.json({ error: "שגיאה בטעינת קבוצות הנחה" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, description, discountType = "fixed", discountValue, color } = body;

    if (!name?.trim() || discountValue == null) {
      return NextResponse.json({ error: "שם וערך הנחה הם שדות חובה" }, { status: 400 });
    }

    const group = await prisma.discountGroup.create({
      data: {
        name: name.trim(),
        description: description || null,
        discountType,
        discountValue: Number(discountValue),
        color: color || null,
      },
    });

    return NextResponse.json({ group }, { status: 201 });
  } catch (error: unknown) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "קבוצת הנחה עם שם זה כבר קיימת" }, { status: 409 });
    }
    console.error("Error creating discount group:", error);
    return NextResponse.json({ error: "שגיאה ביצירת קבוצת הנחה" }, { status: 500 });
  }
}
