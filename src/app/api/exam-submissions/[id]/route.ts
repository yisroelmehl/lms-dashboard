import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/exam-submissions/:id — full submission for admin review
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const submission = await prisma.examSubmission.findUnique({
    where: { id },
    include: {
      examTemplate: {
        select: {
          id: true,
          title: true,
          questions: {
            orderBy: { sortOrder: "asc" },
            select: {
              id: true,
              questionText: true,
              questionType: true,
              points: true,
              options: true,
              correctAnswer: true,
              sortOrder: true,
            },
          },
        },
      },
      student: {
        select: {
          id: true,
          firstNameMoodle: true, firstNameOverride: true,
          lastNameMoodle: true, lastNameOverride: true,
          emailMoodle: true, emailOverride: true,
        },
      },
      assignment: {
        select: { id: true, slotKey: true, attempt: true, deadline: true },
      },
    },
  });

  if (!submission) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ submission });
}

// PATCH /api/exam-submissions/:id — teacher overrides grade/feedback
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const { grade, teacherFeedback, perQuestion } = body as {
    grade?: number;
    teacherFeedback?: string;
    perQuestion?: Array<{ questionId: string; score: number; max: number; feedback?: string }>;
  };

  const data: {
    grade?: number;
    teacherFeedback?: string;
    aiPerQuestion?: typeof perQuestion;
    reviewedAt?: Date;
    gradingStatus?: string;
  } = { reviewedAt: new Date(), gradingStatus: "graded" };

  if (typeof grade === "number") data.grade = grade;
  if (typeof teacherFeedback === "string") data.teacherFeedback = teacherFeedback;
  if (Array.isArray(perQuestion)) data.aiPerQuestion = perQuestion;

  const updated = await prisma.examSubmission.update({ where: { id }, data });
  return NextResponse.json({ submission: updated });
}
