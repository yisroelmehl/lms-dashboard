import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStudentSession } from "@/lib/student-session";

// POST /api/portal/exams/:assignmentId/start
// Creates ExamSubmission with startedAt if not exists. Idempotent.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  const session = await getStudentSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { assignmentId } = await params;
  const assignment = await prisma.examAssignment.findFirst({
    where: { id: assignmentId, studentId: session.studentId },
    include: { submission: true, template: { select: { id: true } } },
  });

  if (!assignment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Reject if past deadline
  if (assignment.deadline && assignment.deadline < new Date()) {
    return NextResponse.json({ error: "המבחן עבר את תאריך התפוגה" }, { status: 403 });
  }

  // If submission exists and submitted — block restart
  if (assignment.submission?.submittedAt) {
    return NextResponse.json({ error: "המבחן כבר הוגש" }, { status: 409 });
  }

  // Create or return existing in-progress submission
  let submission = assignment.submission;
  if (!submission) {
    submission = await prisma.examSubmission.create({
      data: {
        examTemplateId: assignment.templateId,
        studentId: session.studentId,
        assignmentId: assignment.id,
        startedAt: new Date(),
        gradingStatus: "pending",
      },
    });
  } else if (!submission.startedAt) {
    submission = await prisma.examSubmission.update({
      where: { id: submission.id },
      data: { startedAt: new Date() },
    });
  }

  return NextResponse.json({
    submissionId: submission.id,
    startedAt: submission.startedAt,
  });
}
