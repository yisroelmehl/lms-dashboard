import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const template = await prisma.examTemplate.findUnique({
      where: { id },
      include: {
        course: { select: { id: true, fullNameMoodle: true, fullNameOverride: true } },
        questions: { orderBy: { sortOrder: 'asc' }, include: { studyUnit: { select: { title: true } } } },
        examTemplateUnits: {
          include: {
            studyUnit: { select: { id: true, title: true, content: true, unitNumber: true } }
          }
        }
      }
    });

    if (!template) {
      return NextResponse.json({ error: "מבחן לא נמצא" }, { status: 404 });
    }

    return NextResponse.json({ template });
  } catch (error: any) {
    return NextResponse.json({ error: "שגיאה בשליפת המבחן" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { title, description, instructions, courseId, type, timeLimit, passingScore, status, unitIds } = body;

    // Update main fields
    await prisma.examTemplate.update({
      where: { id },
      data: {
        title,
        description,
        instructions,
        type,
        timeLimit: timeLimit ? parseInt(timeLimit) : null,
        passingScore: passingScore ? parseFloat(passingScore) : 60,
        status,
        courseId: courseId || null,
      },
    });

    // Update units if provided
    if (unitIds) {
      await prisma.examTemplateUnit.deleteMany({ where: { examTemplateId: id } });
      if (unitIds.length > 0) {
        await prisma.examTemplateUnit.createMany({
          data: unitIds.map((uId: string) => ({ examTemplateId: id, studyUnitId: uId }))
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: "שגיאה בעדכון" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.examTemplate.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: "שגיאה במחיקה" }, { status: 500 });
  }
}
