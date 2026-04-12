import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/students/[id]/submissions — get all submissions for a student
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: studentId } = await params;

  const submissions = await prisma.studentSubmission.findMany({
    where: { studentId },
    include: {
      syllabusItem: {
        select: {
          id: true,
          title: true,
          type: true,
          maxScore: true,
        },
      },
      course: {
        select: {
          id: true,
          fullNameOverride: true,
          fullNameMoodle: true,
        },
      },
    },
    orderBy: { submittedAt: "desc" },
  });

  const result = submissions.map((s) => ({
    id: s.id,
    syllabusItemId: s.syllabusItemId,
    syllabusItemTitle: s.syllabusItem.title,
    syllabusItemType: s.syllabusItem.type,
    maxScore: s.syllabusItem.maxScore,
    courseId: s.courseId,
    courseName:
      s.course.fullNameOverride || s.course.fullNameMoodle || "",
    answers: s.answers,
    grade: s.grade,
    feedback: s.feedback,
    submittedAt: s.submittedAt,
    gradedAt: s.gradedAt,
  }));

  return NextResponse.json(result);
}
