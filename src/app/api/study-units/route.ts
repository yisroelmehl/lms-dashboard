import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get("courseId");
    const tagId = searchParams.get("tagId");

    const where: any = {};
    if (courseId) where.courseId = courseId;
    if (tagId) where.tagId = tagId;

    const units = await prisma.studyUnit.findMany({
      where,
      orderBy: [
        { courseId: 'asc' },
        { tagId: 'asc' },
        { unitNumber: 'asc' },
        { sortOrder: 'asc' }
      ],
      include: {
        course: { select: { id: true, fullNameMoodle: true, fullNameOverride: true } },
        tag: { select: { id: true, name: true } },
      }
    });

    return NextResponse.json({ units });
  } catch (error: any) {
    console.error("Failed to fetch study units:", error);
    return NextResponse.json({ error: "שגיאה בשליפת יחידות לימוד" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, description, content, courseId, tagId, unitNumber, sortOrder } = body;

    if (!title || !content) {
      return NextResponse.json({ error: "שם ותוכן הם חובה" }, { status: 400 });
    }

    const newUnit = await prisma.studyUnit.create({
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

    return NextResponse.json({ unit: newUnit });
  } catch (error: any) {
    console.error("Failed to create study unit:", error);
    return NextResponse.json({ error: "שגיאה ביצירת יחידת לימוד" }, { status: 500 });
  }
}
