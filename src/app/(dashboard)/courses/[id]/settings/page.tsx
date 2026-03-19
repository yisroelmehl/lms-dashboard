import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { resolveField } from "@/lib/utils";
import Link from "next/link";
import { CourseGeneralSettingsForm } from "@/components/courses/course-general-settings-form";
import { CourseRequirementsForm } from "@/components/courses/course-requirements-form";
import { CourseSemestersManager } from "@/components/courses/course-semesters-manager";
import { CourseSyllabusManager } from "@/components/courses/course-syllabus-manager";

export const dynamic = "force-dynamic";

export default async function CourseSettingsPage({
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
        syllabusItems: { orderBy: { sortOrder: "asc" } },
      },
    });

    if (!course) notFound();

    const courseName = resolveField(
      course.fullNameMoodle,
      course.fullNameOverride
    );

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href={`/dashboard/courses/${course.id}`} className="text-blue-600 hover:underline">
            &larr; חזרה לקורס
          </Link>
          <h1 className="text-2xl font-bold">הגדרות קורס: {courseName}</h1>
        </div>

        <CourseGeneralSettingsForm courseId={course.id} initialData={course} />

        <CourseRequirementsForm
          courseId={course.id}
          initialExams={course.reqExamsCount}
          initialGrade={course.reqGradeAverage}
          initialAttendance={course.reqAttendancePercent}
        />

        <CourseSemestersManager 
          courseId={course.id} 
          initialSemesters={course.semesters} 
        />

        <CourseSyllabusManager
          courseId={course.id}
          semesters={course.semesters}
          initialItems={course.syllabusItems}
        />
      </div>
    );
  } catch (error) {
    console.error("Failed to fetch course details:", error);
    notFound();
  }
}