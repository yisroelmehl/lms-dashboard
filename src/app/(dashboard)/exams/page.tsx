import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ExamList } from "@/components/exams/exam-list";

export const dynamic = "force-dynamic";

export default async function ExamsPage() {
  const exams = await prisma.examTemplate.findMany({
    include: {
      course: {
        select: {
          id: true,
          fullNameMoodle: true,
          fullNameOverride: true,
          fullNameSource: true,
        },
      },
      createdBy: { select: { id: true, name: true } },
      _count: { select: { submissions: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">מבחנים ומטלות</h1>
        <Link
          href="/exams/create"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          + יצירת מבחן חדש
        </Link>
      </div>

      <ExamList exams={exams as any} />
    </div>
  );
}
