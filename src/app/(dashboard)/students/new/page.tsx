import { prisma } from "@/lib/prisma";
import { resolveField, formatDateHe } from "@/lib/utils";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function NewStudentsPage() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const newStudents = await prisma.student.findMany({
    where: {
      createdAt: { gte: thirtyDaysAgo },
    },
    include: {
      enrollments: {
        include: {
          course: {
            select: { fullNameMoodle: true, fullNameOverride: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">🆕 תלמידים חדשים</h1>
        <span className="text-sm text-muted-foreground">
          {newStudents.length} תלמידים ב-30 הימים האחרונים
        </span>
      </div>

      {newStudents.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <p className="text-muted-foreground">אין תלמידים חדשים ב-30 הימים האחרונים</p>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-right">
                <th className="p-3 font-medium">שם</th>
                <th className="p-3 font-medium">אימייל</th>
                <th className="p-3 font-medium">טלפון</th>
                <th className="p-3 font-medium">קורסים</th>
                <th className="p-3 font-medium">תאריך הצטרפות</th>
              </tr>
            </thead>
            <tbody>
              {newStudents.map((student) => {
                const name =
                  student.hebrewName ||
                  `${resolveField(student.firstNameMoodle, student.firstNameOverride)} ${resolveField(student.lastNameMoodle, student.lastNameOverride)}`.trim();
                const email = resolveField(student.emailMoodle, student.emailOverride);
                const phone = resolveField(student.phoneMoodle, student.phoneOverride);
                const courses = student.enrollments
                  .map((e) => resolveField(e.course.fullNameMoodle, e.course.fullNameOverride))
                  .filter(Boolean)
                  .join(", ");

                return (
                  <tr key={student.id} className="border-b hover:bg-muted/50">
                    <td className="p-3">
                      <Link
                        href={`/students/${student.id}`}
                        className="text-blue-600 hover:underline font-medium"
                      >
                        {name || "ללא שם"}
                      </Link>
                    </td>
                    <td className="p-3 text-muted-foreground" dir="ltr">
                      {email || "—"}
                    </td>
                    <td className="p-3 text-muted-foreground" dir="ltr">
                      {phone || "—"}
                    </td>
                    <td className="p-3 text-muted-foreground text-xs">
                      {courses || "—"}
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {formatDateHe(student.createdAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
