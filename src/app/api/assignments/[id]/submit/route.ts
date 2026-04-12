import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/assignments/[id]/submit — student submits their answers
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: syllabusItemId } = await params;
  const body = await request.json();
  const { studentId, courseId, answers } = body;

  if (!studentId || !courseId || !answers) {
    return NextResponse.json(
      { error: "חסרים שדות חובה" },
      { status: 400 }
    );
  }

  // Verify the syllabus item exists and is published
  const item = await prisma.syllabusItem.findUnique({
    where: { id: syllabusItemId },
    select: { id: true, publishedToMoodle: true, courseId: true },
  });

  if (!item) {
    return NextResponse.json({ error: "פריט לא נמצא" }, { status: 404 });
  }

  if (!item.publishedToMoodle) {
    return NextResponse.json(
      { error: "פריט זה לא פורסם למודל" },
      { status: 400 }
    );
  }

  // Verify student exists
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { id: true },
  });

  if (!student) {
    return NextResponse.json({ error: "תלמיד לא נמצא" }, { status: 404 });
  }

  // Check for existing submission
  const existing = await prisma.studentSubmission.findUnique({
    where: {
      studentId_syllabusItemId: {
        studentId,
        syllabusItemId,
      },
    },
  });

  if (existing) {
    return NextResponse.json(
      { error: "כבר הגשת מטלה זו" },
      { status: 400 }
    );
  }

  const submission = await prisma.studentSubmission.create({
    data: {
      studentId,
      syllabusItemId,
      courseId: item.courseId,
      answers,
    },
  });

  return NextResponse.json({ success: true, submissionId: submission.id });
}
