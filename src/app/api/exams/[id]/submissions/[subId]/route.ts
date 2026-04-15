import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET - single submission detail
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string; subId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { subId } = await params;

  const submission = await prisma.examSubmission.findUnique({
    where: { id: subId },
    include: {
      student: {
        select: {
          id: true,
          firstNameMoodle: true,
          firstNameOverride: true,
          lastNameMoodle: true,
          lastNameOverride: true,
        },
      },
      examTemplate: {
        select: { id: true, title: true, examData: true, totalPoints: true },
      },
    },
  });

  if (!submission) {
    return NextResponse.json({ error: "הגשה לא נמצאה" }, { status: 404 });
  }

  // Don't return raw file data
  const { fileData, ...rest } = submission;
  return NextResponse.json(rest);
}

// PUT - update submission (assign student, manual grade override)
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string; subId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { subId } = await params;

  try {
    const body = await req.json();
    const { studentId, studentName, grade, feedback } = body;

    const data: any = {};
    if (studentId !== undefined) data.studentId = studentId;
    if (studentName !== undefined) data.studentName = studentName;
    if (grade !== undefined) {
      data.grade = grade;
      data.gradingStatus = "graded";
      data.gradedAt = new Date();
    }
    if (feedback !== undefined) data.feedback = feedback;

    const submission = await prisma.examSubmission.update({
      where: { id: subId },
      data,
      include: {
        student: {
          select: {
            id: true,
            firstNameMoodle: true,
            firstNameOverride: true,
            lastNameMoodle: true,
            lastNameOverride: true,
          },
        },
      },
    });

    const { fileData, ...rest } = submission;
    return NextResponse.json(rest);
  } catch (error: any) {
    console.error("[Submission PUT]", error);
    return NextResponse.json(
      { error: "שגיאה בעדכון הגשה" },
      { status: 500 }
    );
  }
}
