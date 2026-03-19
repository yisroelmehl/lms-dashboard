import { prisma } from "@/lib/prisma";
import { resolveField } from "@/lib/utils";
import Link from "next/link";
import { LecturersHeader } from "@/components/lecturers/lecturers-header";

export const dynamic = "force-dynamic";

export default async function LecturersPage() {
  const lecturers = await prisma.lecturer.findMany({
    include: {
      mainCourses: {
        include: {
          enrollments: true,
          syllabusItems: {
            include: {
              activityCompletions: true,
              grades: true,
            }
          },
          attendanceRecords: true,
        }
      }
    },
    orderBy: { firstName: "asc" }
  });

  // Calculate overall stats for comparison
  let totalAttendanceCount = 0;
  let totalPresentCount = 0;

  let totalAssignmentsCount = 0;
  let totalAssignmentsCompleted = 0;

  let totalExamsCount = 0;
  let totalExamsPassed = 0;

  const lecturerStats = lecturers.map(lecturer => {
    let classesDelivered = 0;
    let studentsCount = 0;

    let lecAttendanceCount = 0;
    let lecPresentCount = 0;

    let lecAssignmentsCount = 0;
    let lecAssignmentsCompleted = 0;

    let lecExamsCount = 0;
    let lecExamsPassed = 0;

    lecturer.mainCourses.forEach(course => {
      studentsCount += course.enrollments.length;

      // Count classes
      const lessons = course.syllabusItems.filter(i => i.type === "lesson");
      classesDelivered += lessons.length;

      // Attendance
      course.attendanceRecords.forEach(record => {
        const status = resolveField(record.statusMoodle, record.statusOverride);
        if (status) {
          lecAttendanceCount++;
          totalAttendanceCount++;
          if (status === "present" || status === "late") {
            lecPresentCount++;
            totalPresentCount++;
          }
        }
      });

      // Assignments and Exams
      course.syllabusItems.forEach(item => {
        if (item.type === "assignment") {
          lecAssignmentsCount += course.enrollments.length;
          totalAssignmentsCount += course.enrollments.length;

          item.activityCompletions.forEach(completion => {
            const state = resolveField(completion.completionStateMoodle, completion.completionStateOverride);
            if (state === "complete" || state === "complete_with_pass") {
              lecAssignmentsCompleted++;
              totalAssignmentsCompleted++;
            }
          });
        }

        if (item.type === "exam") {
          lecExamsCount += course.enrollments.length;
          totalExamsCount += course.enrollments.length;

          item.grades.forEach(grade => {
            const score = resolveField(grade.scoreMoodle, grade.scoreOverride);
            if (score !== null && score !== undefined) {
              if (score >= (course.reqGradeAverage || 60)) {
                lecExamsPassed++;
                totalExamsPassed++;
              }
            }
          });
        }
      });
    });

    return {
      id: lecturer.id,
      name: `${lecturer.firstName} ${lecturer.lastName}`,
      email: lecturer.email,
      phone: lecturer.phone,
      coursesCount: lecturer.mainCourses.length,
      studentsCount,
      classesDelivered,
      attendancePercent: lecAttendanceCount > 0 ? Math.round((lecPresentCount / lecAttendanceCount) * 100) : 0,
      assignmentPercent: lecAssignmentsCount > 0 ? Math.round((lecAssignmentsCompleted / lecAssignmentsCount) * 100) : 0,
      examSuccessPercent: lecExamsCount > 0 ? Math.round((lecExamsPassed / lecExamsCount) * 100) : 0,
    };
  });

  const avgAttendance = totalAttendanceCount > 0 ? Math.round((totalPresentCount / totalAttendanceCount) * 100) : 0;
  const avgAssignment = totalAssignmentsCount > 0 ? Math.round((totalAssignmentsCompleted / totalAssignmentsCount) * 100) : 0;
  const avgExamSuccess = totalExamsCount > 0 ? Math.round((totalExamsPassed / totalExamsCount) * 100) : 0;

  return (
    <div className="space-y-6">
      <LecturersHeader />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg border border-border bg-blue-50/50 p-4">
          <p className="text-sm text-blue-800 font-medium">ממוצע נוכחות כולל</p>
          <p className="text-3xl font-bold text-blue-900 mt-1">{avgAttendance}%</p>
        </div>
        <div className="rounded-lg border border-border bg-amber-50/50 p-4">
          <p className="text-sm text-amber-800 font-medium">ממוצע הגשת מטלות</p>
          <p className="text-3xl font-bold text-amber-900 mt-1">{avgAssignment}%</p>
        </div>
        <div className="rounded-lg border border-border bg-green-50/50 p-4">
          <p className="text-sm text-green-800 font-medium">ממוצע הצלחה במבחנים</p>
          <p className="text-3xl font-bold text-green-900 mt-1">{avgExamSuccess}%</p>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="p-4 text-right font-medium">שם המרצה</th>
                <th className="p-4 text-center font-medium">קורסים</th>
                <th className="p-4 text-center font-medium">תלמידים</th>
                <th className="p-4 text-center font-medium">סך שיעורים שמסר</th>
                <th className="p-4 text-center font-medium">נוכחות תלמידים</th>
                <th className="p-4 text-center font-medium">הגשת מטלות</th>
                <th className="p-4 text-center font-medium">הצלחה במבחנים</th>
              </tr>
            </thead>
            <tbody>
              {lecturerStats.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">
                    אין מרצים מוגדרים במערכת
                  </td>
                </tr>
              ) : (
                lecturerStats.map((l) => (
                  <tr key={l.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                    <td className="p-4">
                      <Link href={`/lecturers/${l.id}`} className="font-medium text-blue-600 hover:underline">{l.name}</Link>
                      {(l.email || l.phone) && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {l.email && <span>{l.email}</span>}
                          {l.email && l.phone && <span className="mx-2">|</span>}
                          {l.phone && <span>{l.phone}</span>}
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-center">{l.coursesCount}</td>
                    <td className="p-4 text-center">{l.studentsCount}</td>
                    <td className="p-4 text-center font-medium text-slate-700">{l.classesDelivered}</td>
                    
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <span className={`font-medium ${l.attendancePercent >= avgAttendance ? 'text-green-600' : 'text-red-500'}`}>
                          {l.attendancePercent}%
                        </span>
                      </div>
                    </td>
                    
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <span className={`font-medium ${l.assignmentPercent >= avgAssignment ? 'text-green-600' : 'text-amber-600'}`}>
                          {l.assignmentPercent}%
                        </span>
                      </div>
                    </td>
                    
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <span className={`font-medium ${l.examSuccessPercent >= avgExamSuccess ? 'text-green-600' : 'text-red-500'}`}>
                          {l.examSuccessPercent}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}