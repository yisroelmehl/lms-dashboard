import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { resolveField, formatDateHe } from "@/lib/utils";
import { ExamPreview } from "@/components/exams/exam-preview";

export const dynamic = "force-dynamic";

const statusLabels: Record<string, { label: string; color: string }> = {
  draft: { label: "טיוטה", color: "bg-gray-100 text-gray-700" },
  ready: { label: "מוכן", color: "bg-blue-100 text-blue-700" },
  grading: { label: "בבדיקה", color: "bg-yellow-100 text-yellow-700" },
  completed: { label: "הסתיים", color: "bg-green-100 text-green-700" },
};

export default async function ExamDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const exam = await prisma.examTemplate.findUnique({
    where: { id },
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
  });

  if (!exam) return notFound();

  const courseName = resolveField(
    exam.course.fullNameMoodle,
    exam.course.fullNameOverride
  );
  const status = statusLabels[exam.status] || statusLabels.draft;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{exam.title}</h1>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${status.color}`}
            >
              {status.label}
            </span>
          </div>
          <p className="text-muted-foreground mt-1">
            {exam.type === "exam" ? "מבחן" : "מטלה"} | {courseName} | נוצר{" "}
            {formatDateHe(exam.createdAt)} ע&quot;י {exam.createdBy.name}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/exams/${exam.id}/grade`}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            העלאה ובדיקה
          </Link>
          {exam._count.submissions > 0 && (
            <Link
              href={`/exams/${exam.id}/report`}
              className="rounded-md border border-input bg-background px-4 py-2 text-sm hover:bg-muted"
            >
              דוח ציונים
            </Link>
          )}
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <InfoCard label="סה&quot;כ ניקוד" value={exam.totalPoints ? String(exam.totalPoints) : "-"} />
        <InfoCard label="הגשות" value={String(exam._count.submissions)} />
        <InfoCard
          label="תאריך מבחן"
          value={exam.examDate ? formatDateHe(exam.examDate) : "-"}
        />
        <InfoCard
          label="תאריך הגשה"
          value={exam.dueDate ? formatDateHe(exam.dueDate) : "-"}
        />
      </div>

      {/* Description */}
      {exam.description && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="font-medium mb-2">תיאור</h2>
          <p className="text-sm text-muted-foreground">{exam.description}</p>
        </div>
      )}

      {/* Source Files */}
      {exam.sourceFileNames.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="font-medium mb-2">קבצי מקור</h2>
          <div className="flex flex-wrap gap-2">
            {exam.sourceFileNames.map((name, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-sm"
              >
                📄 {name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* AI Prompt */}
      {exam.aiPrompt && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="font-medium mb-2">פרומפט שנעשה בו שימוש</h2>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {exam.aiPrompt}
          </p>
        </div>
      )}

      {/* Questions Preview */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4">שאלות המבחן</h2>
        <ExamPreview
          examData={exam.examData as any}
          totalPoints={exam.totalPoints}
        />
      </div>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 text-center">
      <p className="text-sm text-muted-foreground" dangerouslySetInnerHTML={{ __html: label }} />
      <p className="text-xl font-bold mt-1">{value}</p>
    </div>
  );
}
