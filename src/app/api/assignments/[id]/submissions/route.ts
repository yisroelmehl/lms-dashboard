import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/assignments/[id]/submissions — get all submissions for an assignment
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: syllabusItemId } = await params;

  const submissions = await prisma.studentSubmission.findMany({
    where: { syllabusItemId },
    include: {
      student: {
        select: {
          id: true,
          hebrewName: true,
          firstNameOverride: true,
          firstNameMoodle: true,
          lastNameOverride: true,
          lastNameMoodle: true,
          emailMoodle: true,
          emailOverride: true,
        },
      },
    },
    orderBy: { submittedAt: "desc" },
  });

  const result = submissions.map((s) => ({
    id: s.id,
    studentId: s.studentId,
    studentName:
      s.student.hebrewName ||
      `${s.student.firstNameOverride || s.student.firstNameMoodle || ""} ${s.student.lastNameOverride || s.student.lastNameMoodle || ""}`.trim(),
    studentEmail: s.student.emailOverride || s.student.emailMoodle || "",
    answers: s.answers,
    grade: s.grade,
    feedback: s.feedback,
    submittedAt: s.submittedAt,
    gradedAt: s.gradedAt,
  }));

  return NextResponse.json(result);
}

// PATCH /api/assignments/[id]/submissions — grade a submission
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await params; // consume but we don't need syllabusItemId for grading
  const body = await request.json();
  const { submissionId, grade, feedback } = body;

  if (!submissionId) {
    return NextResponse.json({ error: "submissionId is required" }, { status: 400 });
  }

  const submission = await prisma.studentSubmission.update({
    where: { id: submissionId },
    data: {
      grade: grade != null ? parseFloat(grade) : undefined,
      feedback: feedback || undefined,
      gradedAt: grade != null ? new Date() : undefined,
    },
  });

  return NextResponse.json({ success: true, submission });
}
