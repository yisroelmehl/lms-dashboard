import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStudentSession } from "@/lib/student-session";

// GET /api/portal/exams/:assignmentId — get full exam (without correct answers)
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  const session = await getStudentSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { assignmentId } = await params;
  const assignment = await prisma.examAssignment.findFirst({
    where: { id: assignmentId, studentId: session.studentId },
    include: {
      template: {
        include: {
          course: {
            select: { id: true, fullNameMoodle: true, fullNameOverride: true },
          },
          questions: {
            orderBy: { sortOrder: "asc" },
            select: {
              id: true,
              questionText: true,
              questionType: true,
              points: true,
              options: true,
              sortOrder: true,
              // intentionally omit correctAnswer
            },
          },
        },
      },
      submission: {
        select: {
          id: true,
          startedAt: true,
          submittedAt: true,
          answers: true,
          grade: true,
          maxGrade: true,
          gradingStatus: true,
          aiOverallEval: true,
          aiPerQuestion: true,
          teacherFeedback: true,
        },
      },
    },
  });

  if (!assignment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Strip isCorrect from MC options (don't reveal answers to student)
  if (assignment.template?.questions) {
    assignment.template.questions = assignment.template.questions.map(q => {
      if (Array.isArray(q.options)) {
        return {
          ...q,
          options: (q.options as Array<{ id?: string; text?: string; isCorrect?: boolean }>).map(o => ({
            id: o.id,
            text: o.text,
          })),
        };
      }
      return q;
    });
  }

  return NextResponse.json({ assignment });
}
