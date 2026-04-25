import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStudentSession } from "@/lib/student-session";

// GET /api/portal/profile — full student card view
export async function GET() {
  const session = await getStudentSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const studentId = session.studentId;

  const [student, recentGrades, attendance, recentSubmissions, examStats] = await Promise.all([
    prisma.student.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        hebrewName: true,
        firstNameMoodle: true, firstNameOverride: true,
        lastNameMoodle: true, lastNameOverride: true,
        emailMoodle: true, emailOverride: true,
        phoneMoodle: true, phoneOverride: true,
        idNumberMoodle: true, idNumberOverride: true,
        city: true,
        address: true,
        dateOfBirth: true,
        torahBackground: true,
        smichaBackground: true,
        participationType: true,
        hasChavrusa: true,
        moodleUserId: true,
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
                shortNameMoodle: true,
                moodleCourseId: true,
              },
            },
            classGroup: { select: { id: true, name: true } },
          },
        },
      },
    }),

    prisma.grade.findMany({
      where: { studentId },
      include: {
        course: { select: { id: true, fullNameMoodle: true, fullNameOverride: true } },
        syllabusItem: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 15,
    }),

    prisma.attendance.findMany({
      where: { studentId },
      include: { course: { select: { id: true, fullNameMoodle: true, fullNameOverride: true } } },
      orderBy: { date: "desc" },
      take: 60,
    }),

    prisma.studentSubmission.findMany({
      where: { studentId },
      include: {
        syllabusItem: { select: { id: true, title: true } },
        course: { select: { id: true, fullNameMoodle: true, fullNameOverride: true } },
      },
      orderBy: { submittedAt: "desc" },
      take: 10,
    }),

    prisma.examAssignment.groupBy({
      by: ["studentId"],
      where: { studentId },
      _count: { _all: true },
    }),
  ]);

  if (!student) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Attendance stats per course
  const attendanceStats: Record<string, { present: number; absent: number; late: number; excused: number; total: number; courseName: string }> = {};
  for (const a of attendance) {
    const courseId = a.course.id;
    const courseName = a.course.fullNameOverride || a.course.fullNameMoodle || "—";
    if (!attendanceStats[courseId]) {
      attendanceStats[courseId] = { present: 0, absent: 0, late: 0, excused: 0, total: 0, courseName };
    }
    const s = attendanceStats[courseId];
    const status = a.statusOverride || a.statusMoodle;
    if (status === "present") s.present++;
    else if (status === "absent") s.absent++;
    else if (status === "late") s.late++;
    else if (status === "excused") s.excused++;
    s.total++;
  }

  return NextResponse.json({
    student,
    recentGrades,
    attendanceStats,
    attendanceRecent: attendance.slice(0, 20),
    recentSubmissions,
    examCount: examStats[0]?._count._all || 0,
  });
}
