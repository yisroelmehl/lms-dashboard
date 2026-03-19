import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { resolveField } from "@/lib/utils";
import Link from "next/link";
import { TaskList } from "@/components/tasks/task-list";
import { CourseProgressTable } from "@/components/courses/course-progress-table";

export const dynamic = "force-dynamic";

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  try {
    const { id } = await params;
    const course = await prisma.course.findUnique({
      where: { id },
      include: {
        semesters: { orderBy: { sortOrder: "asc" } },
        mainLecturer: true,
        syllabusItems: { orderBy: { sortOrder: "asc" } },
        classGroups: {
          include: {
            enrollments: {
              include: { student: true },
            },
          },
        },
        enrollments: {
          include: {
            student: true,
            classGroup: true,
          },
        },
        calendarEvents: {
          where: { startDate: { gte: new Date() } },
          orderBy: { startDate: "asc" },
          take: 5,
        },
        tasks: {
          where: { status: { not: "completed" } },
          include: { assignedTo: true, createdBy: true, students: { include: { student: true } } },
          orderBy: { dueDate: "asc" },
          take: 5,
        }
      },
    });

    if (!course) notFound();

    // Fetch activity completions for all students in the course
    const studentIds = course.enrollments.map((e) => e.studentId);
    const syllabusItemIds = course.syllabusItems.map((si) => si.id);
    const activityCompletions = await prisma.activityCompletion.findMany({
      where: {
        studentId: { in: studentIds },
        syllabusItemId: { in: syllabusItemIds },
      },
    });

    const courseName = resolveField(
      course.fullNameMoodle,
      course.fullNameOverride
    );
    
    // Calculate overall course progress (based on syllabus item completions vs total possible)
    const totalPossibleCompletions = studentIds.length * syllabusItemIds.length;
    const actualCompletions = activityCompletions.filter((c) => {
      const state = resolveField(c.completionStateMoodle, c.completionStateOverride);
      return state === "complete" || state === "complete_with_pass";
    }).length;
    const courseProgressPercent = totalPossibleCompletions > 0 
      ? Math.round((actualCompletions / totalPossibleCompletions) * 100) 
      : 0;
    
    const days = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
    
    // Calculate at-risk students (not accessed in 14 days)
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    
    const atRiskStudents = course.enrollments.filter(e => {
      if ((resolveField(e.statusMoodle, e.statusOverride) ?? "active") !== "active") return false;
      return !e.student.moodleLastAccess || e.student.moodleLastAccess < twoWeeksAgo;
    });

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{courseName}</h1>
            <div className="mt-1 flex items-center gap-4 text-sm text-muted-foreground">
              {course.dayOfWeek !== null && <span>יום {days[course.dayOfWeek]}</span>}
              {course.hours && <span>{course.hours}</span>}
              {course.mainLecturer && (
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  הרב {course.mainLecturer.firstName} {course.mainLecturer.lastName}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link 
              href={`/courses/${course.id}/settings`}
              className="rounded-md bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
            >
              ⚙️ הגדרות קורס
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">תלמידים רשומים</p>
            <p className="text-2xl font-bold">{course.enrollments.length}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">קבוצות</p>
            <p className="text-2xl font-bold">{course.classGroups.length}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">סמסטרים</p>
            <p className="text-2xl font-bold">{course.semesters.length}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">התקדמות הקורס</p>
            <div className="mt-1 flex items-center gap-2">
              <div className="h-2 flex-1 rounded-full bg-slate-100 overflow-hidden">
                <div 
                  className="h-full bg-blue-600 rounded-full" 
                  style={{ width: `${courseProgressPercent}%` }}
                />
              </div>
              <span className="text-sm font-bold">{courseProgressPercent}%</span>
            </div>
          </div>
        </div>

        {/* Widgets Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* At Risk Students */}
          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="text-lg font-semibold mb-4 text-red-700">תלמידים שנעדרו מעל שבועיים ({atRiskStudents.length})</h2>
            {atRiskStudents.length === 0 ? (
              <p className="text-sm text-muted-foreground">אין תלמידים בסיכון</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {atRiskStudents.map(e => (
                  <div key={e.id} className="flex justify-between items-center text-sm border-b pb-2 last:border-0">
                    <Link href={`/students/${e.student.id}`} className="hover:underline font-medium text-blue-600">
                      {resolveField(e.student.firstNameMoodle, e.student.firstNameOverride)} {resolveField(e.student.lastNameMoodle, e.student.lastNameOverride)}
                    </Link>
                    <span className="text-xs text-red-600">
                      {e.student.moodleLastAccess ? new Date(e.student.moodleLastAccess).toLocaleDateString("he-IL") : "לא התחבר מעולם"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Course Tasks */}
          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="text-lg font-semibold mb-4">משימות קורס פתוחות</h2>
            {course.tasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">אין משימות פתוחות לקורס זה</p>
            ) : (
              <TaskList tasks={course.tasks as any} />
            )}
          </div>
        </div>

      {/* Class Groups */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">קבוצות</h2>
        {course.classGroups.length === 0 ? (
          <p className="text-sm text-muted-foreground">אין קבוצות מוגדרות</p>
        ) : (
          course.classGroups.map((group) => (
            <div
              key={group.id}
              className="rounded-lg border border-border bg-card p-4"
            >
              <h3 className="font-medium">{group.name}</h3>
              <div className="mt-2 space-y-1">
                {group.enrollments.map((enrollment) => (
                  <div
                    key={enrollment.id}
                    className="flex items-center justify-between rounded-md bg-muted px-3 py-1.5 text-sm"
                  >
                    <span>
                      {resolveField(
                        enrollment.student.firstNameMoodle,
                        enrollment.student.firstNameOverride
                      )}{" "}
                      {resolveField(
                        enrollment.student.lastNameMoodle,
                        enrollment.student.lastNameOverride
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* All Students */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">התקדמות ונוכחות סטודנטים</h2>
        <CourseProgressTable
          courseId={course.id}
          students={course.enrollments.map((e) => e.student)}
          syllabusItems={course.syllabusItems}
          initialCompletions={activityCompletions}
        />
      </div>

      {/* Upcoming Events */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">אירועים קרובים</h2>
        {course.calendarEvents.length === 0 ? (
          <p className="text-sm text-muted-foreground">אין אירועים קרובים</p>
        ) : (
          <div className="space-y-2">
            {course.calendarEvents.map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between rounded-md border border-border p-3"
              >
                <p className="text-sm font-medium">{event.title}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(event.startDate).toLocaleDateString("he-IL")}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
  } catch (error) {
    console.error("Failed to fetch course details:", error);
    notFound();
  }
}
