import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: courseId } = await params;
    const body = await req.json();
    const { itemId, moodleCmId, moodleActivityType } = body;

    if (!itemId) {
      return NextResponse.json({ error: "Missing syllabus item ID" }, { status: 400 });
    }

    const updatedItem = await prisma.syllabusItem.update({
      where: {
        id: itemId,
        courseId,
      },
      data: {
        moodleCmId: moodleCmId || null,
        moodleActivityType: moodleActivityType || null,
        isMapped: !!moodleCmId, // If cmid exists, it's mapped
      },
    });

    return NextResponse.json({ success: true, item: updatedItem });
  } catch (error) {
    console.error("Error mapping syllabus item:", error);
    return NextResponse.json({ error: "שגיאה במיפוי הפריט" }, { status: 500 });
  }
}
