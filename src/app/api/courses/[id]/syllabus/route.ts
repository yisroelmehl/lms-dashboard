import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: courseId } = await params;
    const body = await req.json();
    const { semesterId, title, description, type, weight, maxScore, sortOrder } = body;

    if (!title || !type) {
      return NextResponse.json({ error: "כותרת וסוג הם שדות חובה" }, { status: 400 });
    }

    const syllabusItem = await prisma.syllabusItem.create({
      data: {
        courseId,
        semesterId: semesterId || null,
        title,
        description,
        type, // e.g., 'lesson', 'exam', 'assignment'
        weight: weight ? parseFloat(weight) : null,
        maxScore: maxScore ? parseFloat(maxScore) : null,
        sortOrder: sortOrder ? parseInt(sortOrder) : 0,
      },
    });

    return NextResponse.json({ success: true, item: syllabusItem });
  } catch (error) {
    console.error("Error creating syllabus item:", error);
    return NextResponse.json({ error: "שגיאה ביצירת פריט סילבוס" }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: courseId } = await params;
    const body = await req.json();
    const { id: itemId, semesterId, title, description, type, weight, maxScore, sortOrder, moodleCmId } = body;

    if (!itemId || !title || !type) {
      return NextResponse.json({ error: "מזהה, כותרת וסוג הם שדות חובה" }, { status: 400 });
    }

    // Build update data
    const updateData: Record<string, unknown> = {
      semesterId: semesterId || null,
      title,
      description,
      type,
      weight: weight ? parseFloat(weight) : null,
      maxScore: maxScore ? parseFloat(maxScore) : null,
      sortOrder: sortOrder ? parseInt(sortOrder) : 0,
    };

    // If moodleCmId was explicitly provided (including null to unmap), update mapping
    if (moodleCmId !== undefined) {
      updateData.moodleCmId = moodleCmId ? Number(moodleCmId) : null;
      updateData.isMapped = !!moodleCmId;
    }

    const syllabusItem = await prisma.syllabusItem.update({
      where: {
        id: itemId,
        courseId,
      },
      data: updateData,
    });

    return NextResponse.json({ success: true, item: syllabusItem });
  } catch (error) {
    console.error("Error updating syllabus item:", error);
    return NextResponse.json({ error: "שגיאה בעדכון פריט סילבוס" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: courseId } = await params;
    const url = new URL(req.url);
    const itemId = url.searchParams.get("itemId");

    if (!itemId) {
      return NextResponse.json({ error: "חסר מזהה פריט למחיקה" }, { status: 400 });
    }

    await prisma.syllabusItem.delete({
      where: {
        id: itemId,
        courseId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting syllabus item:", error);
    return NextResponse.json({ error: "שגיאה במחיקת פריט סילבוס" }, { status: 500 });
  }
}
