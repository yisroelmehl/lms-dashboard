import { prisma } from "@/lib/prisma";
import { authenticateEmbed } from "@/lib/embed-auth";
import { notFound } from "next/navigation";
import EmbedAssignmentClient from "./embed-client";

export default async function EmbedAssignmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string; email?: string; et?: string }>;
}) {
  const { id: syllabusItemId } = await params;
  const { token, email, et: embedToken } = await searchParams;

  // Authenticate the student
  const { student, error } = await authenticateEmbed({
    token,
    email,
    embedToken,
    syllabusItemId,
  });

  if (error || !student) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4" dir="rtl">
        <div className="max-w-md text-center space-y-4">
          <span className="text-4xl">🔒</span>
          <h1 className="text-2xl font-bold text-slate-800">גישה נדחתה</h1>
          <p className="text-slate-600">{error || "לא ניתן לזהות את התלמיד"}</p>
          <p className="text-sm text-slate-400">
            אנא ודא שפתחת את הקישור דרך מודל או פנה למשרד.
          </p>
        </div>
      </div>
    );
  }

  // Load the assignment
  const item = await prisma.syllabusItem.findUnique({
    where: { id: syllabusItemId },
    include: {
      course: {
        select: {
          id: true,
          fullNameOverride: true,
          fullNameMoodle: true,
        },
      },
    },
  });

  if (!item || !item.publishedToMoodle) {
    notFound();
  }

  // Check for existing submission
  const existingSubmission = await prisma.studentSubmission.findUnique({
    where: {
      studentId_syllabusItemId: {
        studentId: student.id,
        syllabusItemId,
      },
    },
  });

  const courseName =
    item.course.fullNameOverride || item.course.fullNameMoodle || "";

  return (
    <EmbedAssignmentClient
      syllabusItem={{
        id: item.id,
        title: item.title,
        description: item.description,
        type: item.type,
        maxScore: item.maxScore,
        courseId: item.courseId,
        courseName,
        quizData: item.quizData as any,
      }}
      student={{
        id: student.id,
        name: student.name,
        email: student.email,
      }}
      existingSubmission={
        existingSubmission
          ? {
              answers: existingSubmission.answers as Record<string, unknown>,
              grade: existingSubmission.grade,
              feedback: existingSubmission.feedback,
              submittedAt: existingSubmission.submittedAt.toISOString(),
              gradedAt: existingSubmission.gradedAt?.toISOString() || null,
            }
          : null
      }
    />
  );
}
