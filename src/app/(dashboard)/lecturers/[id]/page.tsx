import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { resolveField } from "@/lib/utils";
import Link from "next/link";
import { LecturerSettingsForm } from "@/components/lecturers/lecturer-settings-form";

export const dynamic = "force-dynamic";

export default async function LecturerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const lecturer = await prisma.lecturer.findUnique({
    where: { id },
    include: {
      mainCourses: {
        include: {
          enrollments: true,
          syllabusItems: {
            orderBy: { sortOrder: "asc" },
          },
        },
      },
      lessons: {
        include: {
          course: true,
        },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!lecturer) notFound();

  // Group lessons by month for billing summary
  const lessonsByMonth: Record<string, { lessons: typeof lecturer.lessons; total: number }> = {};
  for (const lesson of lecturer.lessons) {
    const monthKey = lesson.createdAt
      ? `${lesson.createdAt.getFullYear()}-${String(lesson.createdAt.getMonth() + 1).padStart(2, "0")}`
      : "לא ידוע";
    if (!lessonsByMonth[monthKey]) {
      lessonsByMonth[monthKey] = { lessons: [], total: 0 };
    }
    lessonsByMonth[monthKey].lessons.push(lesson);
    const perLesson = lecturer.baseRatePerLesson + lecturer.bonusRate + lesson.paymentBonus;
    lessonsByMonth[monthKey].total += perLesson;
  }

  const totalLessons = lecturer.lessons.length;
  const totalPayment = lecturer.lessons.reduce(
    (sum, l) => sum + lecturer.baseRatePerLesson + lecturer.bonusRate + l.paymentBonus,
    0
  );

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div className="flex items-center gap-3">
        <Link href="/lecturers" className="text-blue-600 hover:underline text-sm">
          ← חזרה לרשימת מרצים
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            👨‍🏫 {lecturer.firstName} {lecturer.lastName}
          </h1>
          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
            {lecturer.email && <span>📧 {lecturer.email}</span>}
            {lecturer.phone && <span>📱 {lecturer.phone}</span>}
          </div>
        </div>
      </div>

      {/* Summary stats row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-lg border border-border bg-blue-50/50 p-4">
          <p className="text-sm text-blue-800 font-medium">קורסים</p>
          <p className="text-3xl font-bold text-blue-900 mt-1">{lecturer.mainCourses.length}</p>
        </div>
        <div className="rounded-lg border border-border bg-purple-50/50 p-4">
          <p className="text-sm text-purple-800 font-medium">סך שיעורים משויכים</p>
          <p className="text-3xl font-bold text-purple-900 mt-1">{totalLessons}</p>
        </div>
        <div className="rounded-lg border border-border bg-green-50/50 p-4">
          <p className="text-sm text-green-800 font-medium">תעריף לשיעור</p>
          <p className="text-3xl font-bold text-green-900 mt-1" dir="ltr">
            ₪{(lecturer.baseRatePerLesson + lecturer.bonusRate).toLocaleString()}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-amber-50/50 p-4">
          <p className="text-sm text-amber-800 font-medium">סה״כ שכר מצטבר</p>
          <p className="text-3xl font-bold text-amber-900 mt-1" dir="ltr">
            ₪{totalPayment.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Settings form */}
        <LecturerSettingsForm lecturer={lecturer} />

        {/* Monthly Billing Summary */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-lg font-semibold mb-4">💰 סיכום חיוב חודשי</h2>
          {Object.keys(lessonsByMonth).length === 0 ? (
            <p className="text-sm text-muted-foreground">אין שיעורים משויכים עדיין</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(lessonsByMonth)
                .sort(([a], [b]) => b.localeCompare(a))
                .map(([month, data]) => (
                  <div key={month} className="flex items-center justify-between p-3 border rounded-md bg-slate-50">
                    <div>
                      <p className="font-medium text-sm">{month}</p>
                      <p className="text-xs text-muted-foreground">{data.lessons.length} שיעורים</p>
                    </div>
                    <p className="font-bold text-green-700" dir="ltr">₪{data.total.toLocaleString()}</p>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Courses list */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4">📚 קורסים מנוהלים</h2>
        {lecturer.mainCourses.length === 0 ? (
          <p className="text-sm text-muted-foreground">אין קורסים משויכים</p>
        ) : (
          <div className="space-y-2">
            {lecturer.mainCourses.map((course) => (
              <Link
                key={course.id}
                href={`/courses/${course.id}`}
                className="flex items-center justify-between p-3 border rounded-md hover:bg-slate-50 transition-colors"
              >
                <div>
                  <p className="font-medium text-sm text-blue-700 hover:underline">
                    {resolveField(course.fullNameMoodle, course.fullNameOverride) || "ללא שם"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {course.enrollments.length} תלמידים · {course.syllabusItems.length} פריטי סילבוס
                  </p>
                </div>
                <span className="text-slate-400">←</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Lesson breakdown table */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4">📋 פירוט שיעורים ותשלום</h2>
        {lecturer.lessons.length === 0 ? (
          <p className="text-sm text-muted-foreground">אין שיעורים משויכים עדיין. ניתן לשייך מרצה לשיעורים בהגדרות כל קורס.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="p-3 text-right font-medium">שיעור</th>
                  <th className="p-3 text-right font-medium">קורס</th>
                  <th className="p-3 text-center font-medium">תעריף בסיס</th>
                  <th className="p-3 text-center font-medium">בונוס</th>
                  <th className="p-3 text-center font-medium">תוספת מיוחדת</th>
                  <th className="p-3 text-center font-medium">סה״כ</th>
                  <th className="p-3 text-center font-medium">סטטוס</th>
                </tr>
              </thead>
              <tbody>
                {lecturer.lessons.map((lesson) => {
                  const total = lecturer.baseRatePerLesson + lecturer.bonusRate + lesson.paymentBonus;
                  return (
                    <tr key={lesson.id} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="p-3 font-medium">{lesson.title}</td>
                      <td className="p-3">
                        <Link href={`/courses/${lesson.course.id}`} className="text-blue-600 hover:underline">
                          {resolveField(lesson.course.fullNameMoodle, lesson.course.fullNameOverride) || "ללא שם"}
                        </Link>
                      </td>
                      <td className="p-3 text-center" dir="ltr">₪{lecturer.baseRatePerLesson}</td>
                      <td className="p-3 text-center" dir="ltr">₪{lecturer.bonusRate}</td>
                      <td className="p-3 text-center" dir="ltr">₪{lesson.paymentBonus}</td>
                      <td className="p-3 text-center font-bold text-green-700" dir="ltr">₪{total}</td>
                      <td className="p-3 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          lesson.paymentStatus === "paid"
                            ? "bg-green-100 text-green-700"
                            : lesson.paymentStatus === "cancelled"
                            ? "bg-red-100 text-red-700"
                            : "bg-amber-100 text-amber-700"
                        }`}>
                          {lesson.paymentStatus === "paid" ? "שולם" : lesson.paymentStatus === "cancelled" ? "בוטל" : "ממתין"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
