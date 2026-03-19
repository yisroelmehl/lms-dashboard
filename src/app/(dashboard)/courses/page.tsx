import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { resolveField } from "@/lib/utils";
import { CoursesHeader } from "@/components/courses/courses-header";

export const dynamic = "force-dynamic";

export default async function CoursesPage() {
  try {
    const courses = await prisma.course.findMany({
      include: {
        enrollments: true,
        semesters: { orderBy: { sortOrder: "asc" } },
        classGroups: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return (
      <div className="space-y-6">
        <CoursesHeader />

        {courses.length === 0 ? (
          <div className="rounded-lg border border-border bg-card p-8 text-center">
            <p className="text-muted-foreground">
              אין קורסים. ייבא קורסים מהמודל באמצעות הכפתור למעלה.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => {
              const name = resolveField(
                course.fullNameMoodle,
                course.fullNameOverride
              );
              const activeEnrollments = course.enrollments.filter(
                (e) =>
                  (e.statusOverride ?? e.statusMoodle ?? "active") === "active"
              );

              return (
                <Link
                  key={course.id}
                  href={`/courses/${course.id}`}
                  className="rounded-lg border border-border bg-card p-6 transition-shadow hover:shadow-md"
                >
                  <h3 className="text-lg font-semibold">{name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {resolveField(
                      course.shortNameMoodle,
                      course.shortNameOverride
                    )}
                  </p>

                  <div className="mt-4 flex items-center gap-4 text-sm">
                    <span className="text-muted-foreground">
                      {activeEnrollments.length} תלמידים
                    </span>
                    <span className="text-muted-foreground">
                      {course.semesters.length} סמסטרים
                    </span>
                    <span className="text-muted-foreground">
                      {course.classGroups.length} קבוצות
                    </span>
                  </div>

                  <div className="mt-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        course.isActive
                          ? "bg-green-100 text-green-700"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {course.isActive ? "פעיל" : "לא פעיל"}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  } catch (error) {
    console.error("Failed to fetch courses:", error);
    return (
      <div className="space-y-6">
        <CoursesHeader />
        <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center">
          <p className="text-red-700">
            שגיאה בטעינת הקורסים. אנא נסה שוב מאוחר יותר.
          </p>
        </div>
      </div>
    );
  }
}
