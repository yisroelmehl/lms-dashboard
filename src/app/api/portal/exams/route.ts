import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStudentSession } from "@/lib/student-session";

// GET /api/portal/exams — list assignments for current student
export async function GET() {
  const session = await getStudentSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const assignments = await prisma.examAssignment.findMany({
    where: { studentId: session.studentId },
    include: {
      template: {
        select: {
          id: true,
          title: true,
          description: true,
          type: true,
          timeLimit: true,
          totalPoints: true,
          dueDate: true,
          course: {
            select: { id: true, fullNameMoodle: true, fullNameOverride: true },
          },
          _count: { select: { questions: true } },
        },
      },
      submission: {
        select: {
          id: true,
          startedAt: true,
          submittedAt: true,
          grade: true,
          maxGrade: true,
          gradingStatus: true,
        },
      },
    },
    orderBy: [{ submission: { submittedAt: "asc" } }, { publishedAt: "desc" }],
  });

  return NextResponse.json({ assignments });
}
