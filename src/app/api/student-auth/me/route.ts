import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStudentSession } from "@/lib/student-session";

const HEBREW_DAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

function nextOccurrence(dayOfWeek: number | null, hours: string | null): { iso: string; label: string } | null {
  if (dayOfWeek === null || dayOfWeek < 0 || dayOfWeek > 6) return null;

  // hours like "18:00-21:00" → take the start time
  let hour = 18;
  let minute = 0;
  if (hours) {
    const m = hours.match(/(\d{1,2})[:.](\d{2})/);
    if (m) {
      hour = parseInt(m[1], 10);
      minute = parseInt(m[2], 10);
    }
  }

  const now = new Date();
  const todayDow = now.getDay();
  let daysUntil = (dayOfWeek - todayDow + 7) % 7;

  // If today is the day, check if the start time hasn't passed
  if (daysUntil === 0) {
    const sessionStart = new Date(now);
    sessionStart.setHours(hour, minute, 0, 0);
    if (sessionStart < now) daysUntil = 7;
  }

  const next = new Date(now);
  next.setDate(now.getDate() + daysUntil);
  next.setHours(hour, minute, 0, 0);

  const dateLabel = next.toLocaleDateString("he-IL", { day: "numeric", month: "numeric" });
  const timeLabel = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
  const dayLabel = HEBREW_DAYS[dayOfWeek];

  return {
    iso: next.toISOString(),
    label: `יום ${dayLabel} (${dateLabel}) ב-${timeLabel}`,
  };
}

export async function GET() {
  const session = await getStudentSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const moodleBase = process.env.MOODLE_URL || process.env.MOODLE_BASE_URL || "";

  const student = await prisma.student.findUnique({
    where: { id: session.studentId },
    select: {
      id: true,
      firstNameMoodle: true, firstNameOverride: true,
      lastNameMoodle: true, lastNameOverride: true,
      emailMoodle: true, emailOverride: true,
      enrollments: {
        where: {
          OR: [
            { statusOverride: "active" },
            { statusMoodle: "active", statusOverride: null },
          ],
        },
        include: {
          course: {
            select: {
              id: true,
              fullNameMoodle: true,
              fullNameOverride: true,
              moodleCourseId: true,
              shortNameMoodle: true,
              dayOfWeek: true,
              hours: true,
              startDate: true,
            },
          },
        },
      },
    },
  });

  if (!student) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Augment each enrollment's course with computed url + nextSession
  const enrollments = student.enrollments.map(e => {
    const courseUrl = e.course.moodleCourseId && moodleBase
      ? `${moodleBase.replace(/\/$/, "")}/course/view.php?id=${e.course.moodleCourseId}`
      : null;
    const nextSession = nextOccurrence(e.course.dayOfWeek, e.course.hours);
    return {
      ...e,
      course: {
        ...e.course,
        moodleUrl: courseUrl,
        nextSession,
      },
    };
  });

  return NextResponse.json({
    student: { ...student, enrollments },
  });
}
