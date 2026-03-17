import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { resolveField } from "@/lib/utils";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return [];
}

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const course = await prisma.course.findUnique({
    where: { id },
    include: {
      semesters: { orderBy: { sortOrder: "asc" } },
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
    },
  });

  if (!course) notFound();

  const courseName = resolveField(
    course.fullNameMoodle,
    course.fullNameOverride
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{courseName}</h1>
        <span
          className={`rounded-full px-3 py-1 text-sm ${
            course.isActive
              ? "bg-green-100 text-green-700"
              : "bg-slate-100 text-slate-700"
          }`}
        >
          {course.isActive ? "פעיל" : "לא פעיל"}
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
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
        <h2 className="mb-4 text-lg font-semibold">כל התלמידים</h2>
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">
                שם
              </th>
              <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">
                קבוצה
              </th>
              <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">
                סטטוס
              </th>
            </tr>
          </thead>
          <tbody>
            {course.enrollments.map((enrollment) => (
              <tr
                key={enrollment.id}
                className="border-b border-border last:border-0"
              >
                <td className="px-3 py-2 text-sm">
                  {resolveField(
                    enrollment.student.firstNameMoodle,
                    enrollment.student.firstNameOverride
                  )}{" "}
                  {resolveField(
                    enrollment.student.lastNameMoodle,
                    enrollment.student.lastNameOverride
                  )}
                </td>
                <td className="px-3 py-2 text-sm text-muted-foreground">
                  {enrollment.classGroup?.name || "—"}
                </td>
                <td className="px-3 py-2 text-sm">
                  {(resolveField(
                    enrollment.statusMoodle,
                    enrollment.statusOverride
                  ) ?? "active") === "active"
                    ? "פעיל"
                    : "לא פעיל"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
}
