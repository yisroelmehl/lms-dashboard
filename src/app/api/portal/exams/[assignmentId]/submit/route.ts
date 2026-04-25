import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStudentSession } from "@/lib/student-session";

// POST /api/portal/exams/:assignmentId/submit
// Body: { answers: [{questionId, answer}] }
// Saves answers, auto-grades multiple_choice/true_false, queues open Qs for AI grading.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  const session = await getStudentSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { assignmentId } = await params;
  const body = await request.json();
  const submittedAnswers = (body.answers || []) as Array<{ questionId: string; answer: string }>;

  const assignment = await prisma.examAssignment.findFirst({
    where: { id: assignmentId, studentId: session.studentId },
    include: {
      submission: true,
      template: {
        include: {
          questions: {
            select: {
              id: true,
              questionType: true,
              points: true,
              options: true,
              correctAnswer: true,
            },
          },
        },
      },
    },
  });

  if (!assignment) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!assignment.submission) return NextResponse.json({ error: "Submission not started" }, { status: 400 });
  if (assignment.submission.submittedAt) return NextResponse.json({ error: "כבר הוגש" }, { status: 409 });

  const questions = assignment.template.questions;

  // Auto-grade objective questions
  let autoScore = 0;
  let maxScore = 0;
  const perQuestion: Array<{ questionId: string; score: number; max: number; auto: boolean; correct?: boolean }> = [];

  for (const q of questions) {
    maxScore += q.points;
    const sub = submittedAnswers.find(a => a.questionId === q.id);
    if (!sub) {
      perQuestion.push({ questionId: q.id, score: 0, max: q.points, auto: true, correct: false });
      continue;
    }

    if (q.questionType === "multiple_choice" && Array.isArray(q.options)) {
      const correctOpt = (q.options as Array<{ id?: string; text?: string; isCorrect?: boolean }>)
        .find(o => o.isCorrect);
      const isCorrect = !!correctOpt && (sub.answer === correctOpt.id || sub.answer === correctOpt.text);
      const score = isCorrect ? q.points : 0;
      autoScore += score;
      perQuestion.push({ questionId: q.id, score, max: q.points, auto: true, correct: isCorrect });
    } else if (q.questionType === "true_false") {
      const isCorrect = !!q.correctAnswer && sub.answer.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase();
      const score = isCorrect ? q.points : 0;
      autoScore += score;
      perQuestion.push({ questionId: q.id, score, max: q.points, auto: true, correct: isCorrect });
    } else {
      // open / fill_in_the_blank — needs AI grading
      perQuestion.push({ questionId: q.id, score: 0, max: q.points, auto: false });
    }
  }

  const hasOpenQs = perQuestion.some(p => !p.auto);

  const updated = await prisma.examSubmission.update({
    where: { id: assignment.submission.id },
    data: {
      answers: submittedAnswers,
      submittedAt: new Date(),
      maxGrade: maxScore,
      grade: hasOpenQs ? null : autoScore,  // wait for AI on open Qs
      aiPerQuestion: perQuestion,
      gradingStatus: hasOpenQs ? "pending" : "graded",
      gradedAt: hasOpenQs ? null : new Date(),
    },
  });

  // Trigger AI grading async (fire-and-forget)
  if (hasOpenQs) {
    const baseUrl = process.env.NEXTAUTH_URL || process.env.SITE_URL || "";
    if (baseUrl) {
      fetch(`${baseUrl}/api/exam-submissions/${updated.id}/ai-grade`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-secret": process.env.SYNC_SECRET || "",
        },
      }).catch(() => {});
    }
  }

  return NextResponse.json({
    ok: true,
    submissionId: updated.id,
    autoScore,
    maxScore,
    pendingAi: hasOpenQs,
  });
}
