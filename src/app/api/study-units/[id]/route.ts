import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const unit = await prisma.studyUnit.findUnique({ where: { id } });
  if (!unit) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ unit });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { title, description, content, courseId, tagId, unitNumber, sortOrder } = body;

    const updatedUnit = await prisma.studyUnit.update({
      where: { id },
      data: {
        title,
        description,
        content,
        courseId: courseId || null,
        tagId: tagId || null,
        unitNumber: unitNumber ? parseInt(unitNumber) : 1,
        sortOrder: sortOrder ? parseInt(sortOrder) : 0,
      },
    });

    return NextResponse.json({ unit: updatedUnit });
  } catch (error: any) {
    console.error("Failed to update study unit:", error);
    return NextResponse.json({ error: "שגיאה בעדכון יחידת לימוד" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    await prisma.studyUnit.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to delete study unit:", error);
    return NextResponse.json({ error: "שגיאה במחיקת יחידת לימוד" }, { status: 500 });
  }
}
