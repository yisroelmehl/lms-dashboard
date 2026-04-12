import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { resolveField } from "@/lib/utils";
import Link from "next/link";
import { CourseGeneralSettingsForm } from "@/components/courses/course-general-settings-form";
import { CourseRequirementsForm } from "@/components/courses/course-requirements-form";
import { CourseSemestersManager } from "@/components/courses/course-semesters-manager";
import { CourseSyllabusManager } from "@/components/courses/course-syllabus-manager";
import { CourseTagsPicker } from "@/components/courses/course-tags-picker";

export const dynamic = "force-dynamic";

export default async function CourseSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  try {
    const { id } = await params;
    const [course, allTags, courseTags] = await Promise.all([
      prisma.course.findUnique({
        where: { id },
        include: {
          semesters: { orderBy: { sortOrder: "asc" } },
          syllabusItems: { orderBy: { sortOrder: "asc" } },
        },
      }),
      prisma.tag.findMany({
        where: { category: "subject" },
        orderBy: { name: "asc" },
      }),
      prisma.courseTag.findMany({
        where: { courseId: id },
        select: { tagId: true },
      }),
    ]);

    if (!course) notFound();

    const courseName = resolveField(
      course.fullNameMoodle,
      course.fullNameOverride
    );

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href={`/courses/${course.id}`} className="text-blue-600 hover:underline">
            &larr; חזרה לקורס
          </Link>
          <h1 className="text-2xl font-bold">הגדרות קורס: {courseName}</h1>
        </div>

        <CourseGeneralSettingsForm courseId={course.id} initialData={course} />

        {/* נושאי לימוד */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="mb-3 text-lg font-semibold">נושאי לימוד</h2>
          <p className="mb-3 text-sm text-muted-foreground">שייך את הקורס לנושאי לימוד לצורך סינון וארגון</p>
          <CourseTagsPicker
            courseId={course.id}
            allTags={allTags}
            currentTagIds={courseTags.map((ct) => ct.tagId)}
          />
        </div>

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
          moodleCourseId={course.moodleCourseId}
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