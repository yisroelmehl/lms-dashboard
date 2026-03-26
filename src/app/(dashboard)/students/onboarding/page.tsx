import { prisma } from "@/lib/prisma";
import { OnboardingChecklist } from "@/components/students/onboarding-checklist";

export const dynamic = "force-dynamic";

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

      <OnboardingChecklist initialData={onboardingStudents as any} />
    </div>
  );
}
