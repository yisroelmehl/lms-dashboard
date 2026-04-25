import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string, questionId: string }> }
) {
  try {
    const { questionId } = await params;
    const body = await request.json();
    const { questionText, questionType, points, options, correctAnswer, studyUnitId, sortOrder } = body;

    // Validate studyUnitId exists before using it (prevents FK constraint errors)
    let resolvedUnitId: string | null | undefined = undefined;
    if (studyUnitId !== undefined) {
      if (studyUnitId) {
        const unit = await prisma.studyUnit.findUnique({ where: { id: studyUnitId }, select: { id: true } });
        resolvedUnitId = unit ? studyUnitId : null;
      } else {
        resolvedUnitId = null;
      }
    }

    const question = await prisma.examQuestion.update({
      where: { id: questionId },
      data: {
        questionText,
        questionType,
        points: points ? parseFloat(points) : undefined,
        options,
        correctAnswer,
        ...(resolvedUnitId !== undefined && { studyUnitId: resolvedUnitId }),
        sortOrder,
      },
    });

    return NextResponse.json({ question });
  } catch (error: any) {
    return NextResponse.json({ error: "שגיאה בעדכון השאלה" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string, questionId: string }> }
) {
  try {
    const { questionId } = await params;
    await prisma.examQuestion.delete({ where: { id: questionId } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: "שגיאה במחיקת תשאלה" }, { status: 500 });
  }
}
