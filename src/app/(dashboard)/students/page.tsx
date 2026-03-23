import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { resolveField, getStudentName, getCourseName } from "@/lib/utils";
import { StudentsFilters } from "./students-filters";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

interface Props {
  searchParams: Promise<{ q?: string; course?: string; group?: string; page?: string }>;
}

export default async function StudentsPage({ searchParams }: Props) {
  const params = await searchParams;
  const { q, course, group } = params;
  const currentPage = Math.max(1, parseInt(params.page || "1", 10) || 1);

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

  // Fetch students (paginated) + total count + filter options in parallel
  const [students, totalCount, courses, groups] = await Promise.all([
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
      take: PAGE_SIZE,
      skip: (currentPage - 1) * PAGE_SIZE,
    }),
    prisma.student.count({ where }),
    prisma.course.findMany({
      orderBy: { fullNameMoodle: "asc" },
      select: { id: true, fullNameMoodle: true, fullNameOverride: true },
    }),
    prisma.classGroup.findMany({
      orderBy: { name: "asc" },
      include: { course: { select: { fullNameMoodle: true, fullNameOverride: true } } },
    }),
  ]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const courseOptions = courses.map((c) => ({
    id: c.id,
    name: getCourseName(c),
  }));

  const groupOptions = groups.map((g) => ({
    id: g.id,
    name: g.name,
    courseName: getCourseName(g.course),
  }));

  // Build base URL params for pagination links
  const baseParams = new URLSearchParams();
  if (q) baseParams.set("q", q);
  if (course) baseParams.set("course", course);
  if (group) baseParams.set("group", group);

  function pageUrl(page: number) {
    const p = new URLSearchParams(baseParams);
    if (page > 1) p.set("page", String(page));
    const qs = p.toString();
    return `/students${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">תלמידים</h1>
        <span className="text-sm text-muted-foreground">
          {totalCount} תלמידים
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {currentPage > 1 && (
            <Link
              href={pageUrl(currentPage - 1)}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-muted transition-colors"
            >
              → הקודם
            </Link>
          )}

          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
            .reduce<(number | "ellipsis")[]>((acc, p, idx, arr) => {
              if (idx > 0 && p - (arr[idx - 1]) > 1) acc.push("ellipsis");
              acc.push(p);
              return acc;
            }, [])
            .map((item, idx) =>
              item === "ellipsis" ? (
                <span key={`ellipsis-${idx}`} className="px-2 text-sm text-muted-foreground">…</span>
              ) : (
                <Link
                  key={item}
                  href={pageUrl(item)}
                  className={`rounded-md border px-3 py-2 text-sm transition-colors ${
                    item === currentPage
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input bg-background hover:bg-muted"
                  }`}
                >
                  {item}
                </Link>
              )
            )}

          {currentPage < totalPages && (
            <Link
              href={pageUrl(currentPage + 1)}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-muted transition-colors"
            >
              הבא ←
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
