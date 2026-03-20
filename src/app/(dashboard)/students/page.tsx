import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { resolveField, getStudentName, getCourseName } from "@/lib/utils";
import { StudentsFilters } from "./students-filters";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ q?: string; course?: string; group?: string }>;
}

export default async function StudentsPage({ searchParams }: Props) {
  const params = await searchParams;
  const { q, course, group } = params;

  // Build where clause
  const where: Prisma.StudentWhereInput = {};

  // Text search
  if (q) {
    where.OR = [
      { firstNameMoodle: { contains: q, mode: "insensitive" } },
      { lastNameMoodle: { contains: q, mode: "insensitive" } },
      { firstNameOverride: { contains: q, mode: "insensitive" } },
      { lastNameOverride: { contains: q, mode: "insensitive" } },
      { emailMoodle: { contains: q, mode: "insensitive" } },
      { emailOverride: { contains: q, mode: "insensitive" } },
      { hebrewName: { contains: q, mode: "insensitive" } },
      { moodleUsername: { contains: q, mode: "insensitive" } },
    ];
  }

  // Course filter
  if (course) {
    where.enrollments = {
      some: { courseId: course },
    };
  }

  // Group filter
  if (group) {
    where.enrollments = {
      some: {
        classGroupId: group,
        ...(course ? { courseId: course } : {}),
      },
    };
  }

  // Fetch students + filter options in parallel
  const [students, courses, groups] = await Promise.all([
    prisma.student.findMany({
      where,
      include: {
        enrollments: {
          include: {
            course: { select: { id: true, fullNameMoodle: true, fullNameOverride: true } },
            classGroup: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.course.findMany({
      orderBy: { fullNameMoodle: "asc" },
      select: { id: true, fullNameMoodle: true, fullNameOverride: true },
    }),
    prisma.classGroup.findMany({
      orderBy: { name: "asc" },
      include: { course: { select: { fullNameMoodle: true, fullNameOverride: true } } },
    }),
  ]);

  const courseOptions = courses.map((c) => ({
    id: c.id,
    name: getCourseName(c),
  }));

  const groupOptions = groups.map((g) => ({
    id: g.id,
    name: g.name,
    courseName: getCourseName(g.course),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">תלמידים</h1>
        <span className="text-sm text-muted-foreground">
          {students.length} תלמידים
        </span>
      </div>

      <StudentsFilters courses={courseOptions} groups={groupOptions} />

      <div className="rounded-lg border border-border bg-card overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                שם
              </th>
              <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                אימייל
              </th>
              <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                טלפון
              </th>
              <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                קורסים
              </th>
              <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                קבוצה
              </th>
              <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                גישה אחרונה
              </th>
            </tr>
          </thead>
          <tbody>
            {students.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-12 text-center text-sm text-muted-foreground"
                >
                  {q || course || group
                    ? "לא נמצאו תלמידים התואמים לסינון"
                    : "אין תלמידים. בצע סנכרון מהמודל כדי לייבא תלמידים."}
                </td>
              </tr>
            ) : (
              students.map((student) => {
                const name = getStudentName(student);
                const email = resolveField(
                  student.emailMoodle,
                  student.emailOverride
                );
                const phone = resolveField(
                  student.phoneMoodle,
                  student.phoneOverride
                );

                return (
                  <tr
                    key={student.id}
                    className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/students/${student.id}`}
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        {name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm" dir="ltr">
                      {email || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm" dir="ltr">
                      {phone || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {student.enrollments.slice(0, 3).map((e) => (
                          <span
                            key={e.id}
                            className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-900 dark:text-blue-200"
                          >
                            {getCourseName(e.course)}
                          </span>
                        ))}
                        {student.enrollments.length > 3 && (
                          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                            +{student.enrollments.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {student.enrollments
                        .filter((e) => e.classGroup)
                        .map((e) => e.classGroup!.name)
                        .filter((v, i, a) => a.indexOf(v) === i)
                        .join(", ") || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {student.moodleLastAccess
                        ? new Date(
                            student.moodleLastAccess
                          ).toLocaleDateString("he-IL")
                        : "—"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
