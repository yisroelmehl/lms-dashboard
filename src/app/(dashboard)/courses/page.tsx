import { prisma } from "@/lib/prisma";
import { CoursesHeader } from "@/components/courses/courses-header";
import { CoursesGrid } from "@/components/courses/courses-grid";

export const dynamic = "force-dynamic";

export default async function CoursesPage() {
  try {
    const [courses, tags] = await Promise.all([
      prisma.course.findMany({
        include: {
          _count: {
            select: { enrollments: true, semesters: true, classGroups: true },
          },
          enrollments: {
            select: { id: true, statusMoodle: true, statusOverride: true },
          },
          tags: {
            include: { tag: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.tag.findMany({
        where: { category: "subject" },
        orderBy: { name: "asc" },
      }),
    ]);

    return (
      <div className="space-y-6">
        <CoursesHeader />
        <CoursesGrid courses={courses} tags={tags} />
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
