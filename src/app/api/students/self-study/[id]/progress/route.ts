import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getActivitiesCompletion, getGradesTable } from "@/lib/moodle/endpoints";

// GET - fetch Moodle progress for a self-study student
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const enrollment = await prisma.selfStudyEnrollment.findUnique({
      where: { id },
      include: {
        student: {
          select: { id: true, moodleUserId: true },
        },
        course: {
          select: {
            id: true,
            moodleCourseId: true,
            syllabusItems: {
              select: {
                id: true,
                title: true,
                type: true,
                sortOrder: true,
                moodleCmId: true,
                weight: true,
                maxScore: true,
              },
              orderBy: { sortOrder: "asc" },
            },
          },
        },
      },
    });

    if (!enrollment) {
      return NextResponse.json({ error: "רישום לא נמצא" }, { status: 404 });
    }

    const { moodleUserId } = enrollment.student;
    const { moodleCourseId } = enrollment.course;

    if (!moodleUserId || !moodleCourseId) {
      return NextResponse.json({
        progress: null,
        message: "התלמיד או הקורס לא מקושרים למודל",
      });
    }

    // Fetch completion data and grades from Moodle in parallel
    const [completionData, gradesData] = await Promise.all([
      getActivitiesCompletion(moodleCourseId, moodleUserId).catch(() => null),
      getGradesTable(moodleCourseId, moodleUserId).catch(() => null),
    ]);

    // Also fetch local override grades
    const localGrades = await prisma.grade.findMany({
      where: {
        studentId: enrollment.studentId,
        courseId: enrollment.courseId,
      },
      include: { syllabusItem: true },
    });

    // Build activity progress list matching syllabus items
    const activities = enrollment.course.syllabusItems.map((item) => {
      const completion = completionData?.statuses?.find(
        (s) => s.cmid === item.moodleCmId
      );
      const localGrade = localGrades.find(
        (g) => g.syllabusItemId === item.id
      );

      return {
        syllabusItemId: item.id,
        title: item.title,
        type: item.type,
        moodleCmId: item.moodleCmId,
        // Completion
        completed: completion ? completion.state >= 1 : false,
        completionState: completion?.state ?? null,
        completedAt: completion?.timecompleted
          ? new Date(completion.timecompleted * 1000).toISOString()
          : null,
        // Grade (local override takes priority)
        grade: localGrade
          ? (localGrade.scoreOverride ?? localGrade.scoreMoodle ?? null)
          : null,
        gradeMax: localGrade?.maxScore ?? item.maxScore ?? null,
        gradeSource: localGrade?.scoreSource ?? null,
        isOverride: localGrade?.scoreSource === "manual",
      };
    });

    // Calculate summary stats
    const totalItems = activities.length;
    const completedItems = activities.filter((a) => a.completed).length;
    const exams = activities.filter((a) => a.type === "exam");
    const completedExams = exams.filter((a) => a.completed).length;
    const lessons = activities.filter(
      (a) => a.type === "lesson" || a.type === "activity"
    );
    const completedLessons = lessons.filter((a) => a.completed).length;

    return NextResponse.json({
      progress: {
        activities,
        summary: {
          totalItems,
          completedItems,
          completionPercent:
            totalItems > 0
              ? Math.round((completedItems / totalItems) * 100)
              : 0,
          totalExams: exams.length,
          completedExams,
          totalLessons: lessons.length,
          completedLessons,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching self-study progress:", error);
    return NextResponse.json(
      { error: "שגיאה בשאיבת נתוני התקדמות" },
      { status: 500 }
    );
  }
}
