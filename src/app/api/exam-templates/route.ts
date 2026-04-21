import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get("courseId");

    const where: any = {};
    if (courseId) where.courseId = courseId;

    const templates = await prisma.examTemplate.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        course: { select: { id: true, fullNameMoodle: true, fullNameOverride: true } },
        _count: { select: { questions: true, examTemplateUnits: true } }
      }
    });

    return NextResponse.json({ templates });
  } catch (error: any) {
    console.error("Failed to fetch exam templates:", error);
    return NextResponse.json({ error: "שגיאה בשליפת מבחנים" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, description, instructions, courseId, type, timeLimit, passingScore, unitIds } = body;

    if (!title) {
      return NextResponse.json({ error: "שם המבחן הוא שדה חובה" }, { status: 400 });
    }

    const template = await prisma.examTemplate.create({
      data: {
        title,
        description,
        instructions,
        courseId: courseId || null,
        type: type || "exam",
        timeLimit: timeLimit ? parseInt(timeLimit) : null,
        passingScore: passingScore ? parseFloat(passingScore) : 60,
        examTemplateUnits: unitIds && unitIds.length > 0 ? {
          create: unitIds.map((id: string) => ({ studyUnitId: id }))
        } : undefined
      },
    });

    return NextResponse.json({ template });
  } catch (error: any) {
    console.error("Failed to create exam template:", error);
    return NextResponse.json({ error: "שגיאה ביצירת המבחן" }, { status: 500 });
  }
}
