import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET - exam report with statistics
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const exam = await prisma.examTemplate.findUnique({
    where: { id },
    include: {
      course: { select: { id: true, fullNameMoodle: true, fullNameOverride: true, fullNameSource: true } },
      submissions: {
        where: { gradingStatus: "graded" },
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
        orderBy: { grade: "desc" },
      },
    },
  });

  if (!exam) {
    return NextResponse.json({ error: "מבחן לא נמצא" }, { status: 404 });
  }

  const grades = exam.submissions
    .map((s) => s.grade)
    .filter((g): g is number => g !== null);

  const totalSubmissions = exam.submissions.length;
  const maxGrade = exam.totalPoints || 100;

  const stats = {
    totalSubmissions,
    gradedCount: grades.length,
    averageGrade: grades.length > 0 ? grades.reduce((a, b) => a + b, 0) / grades.length : 0,
    medianGrade: grades.length > 0 ? getMedian(grades) : 0,
    highestGrade: grades.length > 0 ? Math.max(...grades) : 0,
    lowestGrade: grades.length > 0 ? Math.min(...grades) : 0,
    maxGrade,
    passingCount: grades.filter((g) => (g / maxGrade) * 100 >= 56).length,
    failingCount: grades.filter((g) => (g / maxGrade) * 100 < 56).length,
    distribution: getDistribution(grades, maxGrade),
  };

  // Per-question stats
  let questionStats: any[] = [];
  const examData = exam.examData as any;
  if (examData?.questions) {
    questionStats = examData.questions.map((q: any) => {
      const questionScores: number[] = [];
      for (const sub of exam.submissions) {
        const feedback = sub.feedback as any;
        if (feedback?.perQuestion) {
          const qFeedback = feedback.perQuestion.find(
            (pq: any) => pq.questionId === q.id
          );
          if (qFeedback?.score !== undefined) {
            questionScores.push(qFeedback.score);
          }
        }
      }

      return {
        questionId: q.id,
        question: q.question,
        type: q.type,
        maxScore: q.points || 10,
        averageScore:
          questionScores.length > 0
            ? questionScores.reduce((a, b) => a + b, 0) / questionScores.length
            : 0,
        count: questionScores.length,
      };
    });
  }

  return NextResponse.json({
    exam: {
      id: exam.id,
      title: exam.title,
      type: exam.type,
      course: exam.course,
      totalPoints: exam.totalPoints,
    },
    stats,
    questionStats,
    submissions: exam.submissions.map(({ fileData, ...rest }) => rest),
  });
}

function getMedian(arr: number[]): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

function getDistribution(
  grades: number[],
  maxGrade: number
): { range: string; count: number }[] {
  const ranges = [
    { range: "0-55", min: 0, max: 55 },
    { range: "56-65", min: 56, max: 65 },
    { range: "66-75", min: 66, max: 75 },
    { range: "76-85", min: 76, max: 85 },
    { range: "86-95", min: 86, max: 95 },
    { range: "96-100", min: 96, max: 100 },
  ];

  return ranges.map((r) => ({
    range: r.range,
    count: grades.filter((g) => {
      const pct = (g / maxGrade) * 100;
      return pct >= r.min && pct <= r.max;
    }).length,
  }));
}
