import { prisma } from "@/lib/prisma";
import { resolveField } from "@/lib/utils";

export const dynamic = "force-dynamic";

async function getStats() {
  const [studentCount, courseCount, openTaskCount, openRequestCount] =
    await Promise.all([
      prisma.student.count(),
      prisma.course.count({ where: { isActive: true } }),
      prisma.task.count({ where: { status: "open" } }),
      prisma.serviceRequest.count({ where: { status: "open" } }),
    ]);

  return { studentCount, courseCount, openTaskCount, openRequestCount };
}

async function getTodayTasks() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return prisma.task.findMany({
    where: {
      OR: [
        { status: "open" },
        { status: "in_progress" },
        {
          dueDate: {
            gte: today,
            lt: tomorrow,
          },
        },
      ],
    },
    include: {
      students: {
        include: { student: true },
      },
      classGroups: {
        include: { classGroup: true },
      },
      course: true,
    },
    orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
    take: 10,
  });
}

async function getAtRiskStudents() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  return prisma.student.findMany({
    where: {
      OR: [
        { moodleLastAccess: { lt: thirtyDaysAgo } },
        { moodleLastAccess: null },
      ],
      enrollments: {
        some: {
          OR: [
            { statusMoodle: "active", statusOverride: null },
            { statusOverride: "active" },
          ],
        },
      },
    },
    include: {
      enrollments: {
        include: { course: true },
        where: {
          OR: [
            { statusMoodle: "active", statusOverride: null },
            { statusOverride: "active" },
          ],
        },
      },
    },
    take: 20,
  });
}

async function getOpenRequests() {
  return prisma.serviceRequest.findMany({
    where: { status: { in: ["open", "in_progress"] } },
    include: { student: true },
    orderBy: { createdAt: "desc" },
    take: 5,
  });
}

export default async function DashboardPage() {
  const [stats, tasks, atRiskStudents, openRequests] = await Promise.all([
    getStats(),
    getTodayTasks(),
    getAtRiskStudents(),
    getOpenRequests(),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">לוח בקרה</h1>

      {/* Stats Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="תלמידים" value={stats.studentCount} />
        <StatCard label="קורסים פעילים" value={stats.courseCount} />
        <StatCard
          label="משימות פתוחות"
          value={stats.openTaskCount}
          highlight={stats.openTaskCount > 0}
        />
        <StatCard
          label="בקשות שירות פתוחות"
          value={stats.openRequestCount}
          highlight={stats.openRequestCount > 0}
        />
      </div>

      {/* Widgets Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Daily Tasks Widget */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold">משימות להיום</h2>
          {tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">אין משימות פתוחות</p>
          ) : (
            <ul className="space-y-3">
              {tasks.map((task) => (
                <li
                  key={task.id}
                  className="flex items-start justify-between rounded-md border border-border p-3"
                >
                  <div>
                    <p className="text-sm font-medium">{task.title}</p>
                    <div className="mt-1 flex gap-2">
                      {task.students.map((ts) => (
                        <span
                          key={ts.studentId}
                          className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700"
                        >
                          {resolveField(
                            ts.student.firstNameMoodle,
                            ts.student.firstNameOverride
                          )}
                        </span>
                      ))}
                      {task.classGroups.map((tcg) => (
                        <span
                          key={tcg.classGroupId}
                          className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700"
                        >
                          {tcg.classGroup.name}
                        </span>
                      ))}
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      task.priority >= 2
                        ? "bg-red-100 text-red-700"
                        : task.priority === 1
                        ? "bg-amber-100 text-amber-700"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {task.status === "open"
                      ? "פתוח"
                      : task.status === "in_progress"
                      ? "בביצוע"
                      : task.status === "overdue"
                      ? "באיחור"
                      : "הושלם"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* At-Risk Students Widget */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold">
            תלמידים בסיכון
            {atRiskStudents.length > 0 && (
              <span className="mr-2 rounded-full bg-red-100 px-2 py-0.5 text-sm text-red-700">
                {atRiskStudents.length}
              </span>
            )}
          </h2>
          {atRiskStudents.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              כל התלמידים פעילים
            </p>
          ) : (
            <ul className="space-y-2">
              {atRiskStudents.map((student) => (
                <li
                  key={student.id}
                  className="flex items-center justify-between rounded-md border border-red-200 bg-red-50 p-3"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {resolveField(
                        student.firstNameMoodle,
                        student.firstNameOverride
                      )}{" "}
                      {resolveField(
                        student.lastNameMoodle,
                        student.lastNameOverride
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {student.enrollments
                        .map((e) =>
                          resolveField(
                            e.course.fullNameMoodle,
                            e.course.fullNameOverride
                          )
                        )
                        .join(", ")}
                    </p>
                  </div>
                  <span className="text-xs text-red-600">
                    {student.moodleLastAccess
                      ? `גישה אחרונה: ${new Date(
                          student.moodleLastAccess
                        ).toLocaleDateString("he-IL")}`
                      : "אין גישה"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Open Service Requests Widget */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold">בקשות שירות פתוחות</h2>
          {openRequests.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              אין בקשות פתוחות
            </p>
          ) : (
            <ul className="space-y-2">
              {openRequests.map((req) => (
                <li
                  key={req.id}
                  className="flex items-center justify-between rounded-md border border-border p-3"
                >
                  <div>
                    <p className="text-sm font-medium">{req.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {resolveField(
                        req.student.firstNameMoodle,
                        req.student.firstNameOverride
                      )}{" "}
                      {resolveField(
                        req.student.lastNameMoodle,
                        req.student.lastNameOverride
                      )}
                    </p>
                  </div>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                    {req.type === "new_shipment"
                      ? "משלוח חדש"
                      : req.type === "study_partner"
                      ? "חברותא"
                      : req.type === "exam_retake"
                      ? "מועד ב"
                      : req.type === "material_request"
                      ? "בקשת חומר"
                      : req.type === "schedule_change"
                      ? "שינוי מערכת"
                      : "אחר"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Quick Course Access Widget */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold">גישה מהירה לקורסים</h2>
          <p className="text-sm text-muted-foreground">
            קורסים יוצגו כאן לאחר סנכרון עם המודל
          </p>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p
        className={`mt-1 text-3xl font-bold ${
          highlight ? "text-amber-600" : "text-foreground"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
