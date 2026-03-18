import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { exams, grade, attendance } = await req.json();

    const updatedCourse = await prisma.course.update({
      where: { id },
      data: {
        reqExamsCount: Number(exams) || 0,
        reqGradeAverage: Number(grade) || 0,
        reqAttendancePercent: Number(attendance) || 0,
      },
    });

    return NextResponse.json(updatedCourse);
  } catch (error) {
    console.error("Error updating course requirements:", error);
    return NextResponse.json(
      { error: "Failed to update course requirements" },
      { status: 500 }
    );
  }
}
