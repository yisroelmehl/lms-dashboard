import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Get tags for a specific course
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const courseTags = await prisma.courseTag.findMany({
      where: { courseId: id },
      include: { tag: true },
    });

    return NextResponse.json({ tags: courseTags.map((ct) => ct.tag) });
  } catch (error) {
    console.error("Error fetching course tags:", error);
    return NextResponse.json({ error: "שגיאה בטעינת תגיות" }, { status: 500 });
  }
}

// Set tags for a course (replace all)
export async function PUT(
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
    const { tagIds } = body;

    if (!Array.isArray(tagIds)) {
      return NextResponse.json({ error: "tagIds must be an array" }, { status: 400 });
    }

    // Replace all course tags in a transaction
    await prisma.$transaction([
      prisma.courseTag.deleteMany({ where: { courseId: id } }),
      ...tagIds.map((tagId: string) =>
        prisma.courseTag.create({
          data: { courseId: id, tagId },
        })
      ),
    ]);

    const updatedTags = await prisma.courseTag.findMany({
      where: { courseId: id },
      include: { tag: true },
    });

    return NextResponse.json({ tags: updatedTags.map((ct) => ct.tag) });
  } catch (error) {
    console.error("Error updating course tags:", error);
    return NextResponse.json({ error: "שגיאה בעדכון תגיות" }, { status: 500 });
  }
}
