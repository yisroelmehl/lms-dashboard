import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStudentSession } from "@/lib/student-session";

const HEBREW_DAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

function nextOccurrence(dayOfWeek: number | null, hours: string | null): { iso: string; label: string } | null {
  if (dayOfWeek === null || dayOfWeek < 0 || dayOfWeek > 6) return null;
  let hour = 18, minute = 0;
  if (hours) {
    const m = hours.match(/(\d{1,2})[:.](\d{2})/);
    if (m) { hour = parseInt(m[1], 10); minute = parseInt(m[2], 10); }
  }
  const now = new Date();
  let daysUntil = (dayOfWeek - now.getDay() + 7) % 7;
  if (daysUntil === 0) {
    const sessionStart = new Date(now); sessionStart.setHours(hour, minute, 0, 0);
    if (sessionStart < now) daysUntil = 7;
  }
  const next = new Date(now);
  next.setDate(now.getDate() + daysUntil);
  next.setHours(hour, minute, 0, 0);
  const dateLabel = next.toLocaleDateString("he-IL", { day: "numeric", month: "numeric" });
  const timeLabel = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
  return { iso: next.toISOString(), label: `יום ${HEBREW_DAYS[dayOfWeek]} (${dateLabel}) ב-${timeLabel}` };
}

// GET /api/portal/courses/:courseId — portal view of one course
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const session = await getStudentSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { courseId } = await params;

  // Verify the student is enrolled in this course
  const enrollment = await prisma.enrollment.findFirst({
    where: {
      studentId: session.studentId,
      courseId,
      OR: [
        { statusOverride: "active" },
        { statusMoodle: "active", statusOverride: null },
      ],
    },
  });
  if (!enrollment) return NextResponse.json({ error: "Not enrolled" }, { status: 403 });

  const moodleBase = (process.env.MOODLE_URL || process.env.MOODLE_BASE_URL || "").replace(/\/$/, "");

  const [course, lessons, studyUnits, examAssignments] = await Promise.all([
    prisma.course.findUnique({
      where: { id: courseId },
      include: {
        mainLecturer: { select: { id: true, firstName: true, lastName: true } },
      },
    }),
    prisma.syllabusItem.findMany({
      where: { courseId, type: "lesson" },
      include: { lecturer: { select: { firstName: true, lastName: true } } },
      orderBy: [{ scheduledAt: "asc" }, { sortOrder: "asc" }],
    }),
    prisma.studyUnit.findMany({
      where: {
        OR: [
          { courseId },
          { studySemester: { studyUnits: { some: { courseId } } } },
        ],
      },
      orderBy: { unitNumber: "asc" },
      include: {
        studySemester: { select: { id: true, name: true, studySubject: { select: { name: true } } } },
      },
    }),
    prisma.examAssignment.findMany({
      where: {
        studentId: session.studentId,
        template: { courseId },
      },
      include: {
        template: { select: { id: true, title: true, type: true, dueDate: true } },
        submission: { select: { id: true, submittedAt: true, grade: true, maxGrade: true } },
      },
      orderBy: { publishedAt: "desc" },
    }),
  ]);

  if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });

  const moodleUrl = course.moodleCourseId && moodleBase
    ? `${moodleBase}/course/view.php?id=${course.moodleCourseId}`
    : null;

  // Each lesson: build moodle activity URL (deep link to Zoom activity in Moodle)
  const enrichedLessons = lessons.map(l => {
    let moodleActivityUrl: string | null = null;
    if (l.moodleCmId && moodleBase) {
      const type = l.moodleActivityType || "url";
      moodleActivityUrl = `${moodleBase}/mod/${type}/view.php?id=${l.moodleCmId}`;
    }
    return { ...l, moodleActivityUrl };
  });

  return NextResponse.json({
    course: {
      ...course,
      moodleUrl,
      nextSession: nextOccurrence(course.dayOfWeek, course.hours),
    },
    lessons: enrichedLessons,
    studyUnits,
    examAssignments,
  });
}
