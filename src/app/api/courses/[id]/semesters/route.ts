import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: courseId } = await params;
    const body = await req.json();
    const { name, startDate, endDate, sortOrder } = body;

    if (!name) {
      return NextResponse.json({ error: "שם הסמסטר הוא שדה חובה" }, { status: 400 });
    }

    const semester = await prisma.semester.create({
      data: {
        courseId,
        name,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        sortOrder: sortOrder ? parseInt(sortOrder) : 0,
      },
    });

    return NextResponse.json({ success: true, semester });
  } catch (error) {
    console.error("Error creating semester:", error);
    return NextResponse.json({ error: "שגיאה ביצירת סמסטר" }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: courseId } = await params;
    const body = await req.json();
    const { id: semesterId, name, startDate, endDate, sortOrder } = body;

    if (!semesterId || !name) {
      return NextResponse.json({ error: "שם הסמסטר ומזהה הם שדות חובה" }, { status: 400 });
    }

    const semester = await prisma.semester.update({
      where: {
        id: semesterId,
        courseId, // Ensure it belongs to this course
      },
      data: {
        name,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        sortOrder: sortOrder ? parseInt(sortOrder) : 0,
      },
    });

    return NextResponse.json({ success: true, semester });
  } catch (error) {
    console.error("Error updating semester:", error);
    return NextResponse.json({ error: "שגיאה בעדכון סמסטר" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: courseId } = await params;
    const url = new URL(req.url);
    const semesterId = url.searchParams.get("semesterId");

    if (!semesterId) {
      return NextResponse.json({ error: "חסר מזהה סמסטר למחיקה" }, { status: 400 });
    }

    await prisma.semester.delete({
      where: {
        id: semesterId,
        courseId, // Ensure it belongs to this course
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting semester:", error);
    return NextResponse.json({ error: "שגיאה במחיקת סמסטר. ייתכן שיש תלמידים רשומים אליו." }, { status: 500 });
  }
}
