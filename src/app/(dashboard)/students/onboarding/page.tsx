import { prisma } from "@/lib/prisma";
import { resolveField, formatDateHe } from "@/lib/utils";
import Link from "next/link";

export const dynamic = "force-dynamic";

const CHECKLIST_LABELS: Record<string, string> = {
  callWithDirector: "שיחה עם מנהל הלימודים",
  callWithRabbi: "שיחה עם הרב של הכיתה",
  materialsSent: "שליחת חומרים",
  materialsReceived: "לוודא שקיבל את החומרים",
  connectedToPortal: "לוודא שמחובר לאיזור האישי",
};

const CHECKLIST_FIELDS = [
  "callWithDirector",
  "callWithRabbi",
  "materialsSent",
  "materialsReceived",
  "connectedToPortal",
] as const;

export default async function OnboardingPage() {
  const onboardingStudents = await prisma.studentOnboarding.findMany({
    where: { completedAt: null },
    include: {
      student: {
        select: {
          id: true,
          hebrewName: true,
          firstNameMoodle: true,
          firstNameOverride: true,
          lastNameMoodle: true,
          lastNameOverride: true,
          emailMoodle: true,
          emailOverride: true,
          phoneMoodle: true,
          phoneOverride: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">🔗 חיבור תלמידים חדשים</h1>
        <span className="text-sm text-muted-foreground">
          {onboardingStudents.length} תלמידים בתהליך חיבור
        </span>
      </div>

      {onboardingStudents.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <p className="text-muted-foreground">כל התלמידים החדשים חוברו בהצלחה!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {onboardingStudents.map((item) => {
            const name =
              item.student.hebrewName ||
              `${resolveField(item.student.firstNameMoodle, item.student.firstNameOverride)} ${resolveField(item.student.lastNameMoodle, item.student.lastNameOverride)}`.trim() ||
              "תלמיד ללא שם";

            const completedSteps = CHECKLIST_FIELDS.filter(
              (f) => item[f]
            ).length;
            const totalSteps = CHECKLIST_FIELDS.length;
            const progressPct = Math.round(
              (completedSteps / totalSteps) * 100
            );

            return (
              <div
                key={item.id}
                className="rounded-lg border border-border bg-card p-5"
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <Link
                      href={`/students/${item.student.id}`}
                      className="text-blue-600 hover:underline font-semibold text-lg"
                    >
                      {name}
                    </Link>
                    <p className="text-xs text-muted-foreground mt-1">
                      נוצר: {formatDateHe(item.createdAt)}
                    </p>
                  </div>
                  <div className="text-left">
                    <span className="text-sm font-medium">
                      {completedSteps}/{totalSteps}
                    </span>
                    <div className="w-24 h-2 bg-gray-200 rounded-full mt-1">
                      <div
                        className="h-full bg-green-500 rounded-full transition-all"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                  {CHECKLIST_FIELDS.map((field) => {
                    const done = item[field];
                    return (
                      <div
                        key={field}
                        className={`rounded-md px-3 py-2 text-xs border ${
                          done
                            ? "bg-green-50 border-green-200 text-green-700"
                            : "bg-gray-50 border-gray-200 text-gray-500"
                        }`}
                      >
                        <span className="ml-1">{done ? "✅" : "⬜"}</span>
                        {CHECKLIST_LABELS[field]}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
