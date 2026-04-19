import { prisma } from "@/lib/prisma";
import { resolveField } from "@/lib/utils";
import { ExamBuilder } from "@/components/exams/exam-builder";

export const dynamic = "force-dynamic";

export default async function CreateExamPage() {
  const courses = await prisma.course.findMany({
    where: { isActive: true },
    select: {
      id: true,
      fullNameMoodle: true,
      fullNameOverride: true,
      fullNameSource: true,
      driveFolderId: true,
      learningUnits: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          name: true,
          description: true,
          files: {
            select: { id: true, fileName: true, fileType: true, fileSize: true },
          },
        },
      },
    },
    orderBy: { fullNameMoodle: "asc" },
  });

  const formattedCourses = courses.map((c) => ({
    id: c.id,
    name: resolveField(c.fullNameMoodle, c.fullNameOverride) || "ללא שם",
    driveFolderId: c.driveFolderId,
    learningUnits: c.learningUnits,
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">יצירת מבחן חדש</h1>
      <ExamBuilder courses={formattedCourses} />
    </div>
  );
}
