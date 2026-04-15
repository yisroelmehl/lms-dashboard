import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET - list exam templates
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const courseId = searchParams.get("courseId");

  const where = courseId ? { courseId } : {};

  const exams = await prisma.examTemplate.findMany({
    where,
    include: {
      course: { select: { id: true, fullNameMoodle: true, fullNameOverride: true, fullNameSource: true } },
      createdBy: { select: { id: true, name: true } },
      _count: { select: { submissions: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(exams);
}

// POST - create new exam template
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { courseId, title, description, type, examDate, dueDate } = body;

    if (!courseId || !title) {
      return NextResponse.json({ error: "חסר קורס או כותרת" }, { status: 400 });
    }

    const exam = await prisma.examTemplate.create({
      data: {
        courseId,
        title,
        description: description || null,
        type: type || "exam",
        examDate: examDate ? new Date(examDate) : null,
        dueDate: dueDate ? new Date(dueDate) : null,
        createdById: (session.user as any).id,
      },
      include: {
        course: { select: { id: true, fullNameMoodle: true, fullNameOverride: true, fullNameSource: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(exam, { status: 201 });
  } catch (error: any) {
    console.error("[Exams POST]", error);
    return NextResponse.json(
      { error: "שגיאה ביצירת מבחן: " + (error.message || "תקלה") },
      { status: 500 }
    );
  }
}
