import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: examTemplateId } = await params;
    const body = await request.json();
    const { questionText, questionType, points, options, correctAnswer, studyUnitId, sortOrder } = body;

    if (!questionText) {
      return NextResponse.json({ error: "טקסט השאלה הוא שדה חובה" }, { status: 400 });
    }

    const question = await prisma.examQuestion.create({
      data: {
        examTemplateId,
        questionText,
        questionType,
        points: points ? parseFloat(points) : 10,
        options: options || null,
        correctAnswer: correctAnswer || null,
        studyUnitId: studyUnitId || null,
        sortOrder: sortOrder || 0,
      },
    });

    return NextResponse.json({ question });
  } catch (error: any) {
    return NextResponse.json({ error: "שגיאה ביצירת השאלה" }, { status: 500 });
  }
}
