import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { name, description, discountType, discountValue, color, isActive } = body;

    const group = await prisma.discountGroup.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(description !== undefined && { description: description || null }),
        ...(discountType !== undefined && { discountType }),
        ...(discountValue !== undefined && { discountValue: Number(discountValue) }),
        ...(color !== undefined && { color: color || null }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json({ group });
  } catch (error) {
    console.error("Error updating discount group:", error);
    return NextResponse.json({ error: "שגיאה בעדכון קבוצת הנחה" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await prisma.discountGroup.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting discount group:", error);
    return NextResponse.json({ error: "שגיאה במחיקת קבוצת הנחה" }, { status: 500 });
  }
}
