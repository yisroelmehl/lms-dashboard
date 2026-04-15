"use client";

import Link from "next/link";
import { resolveField, formatDateHe } from "@/lib/utils";

interface ExamTemplate {
  id: string;
  title: string;
  type: "exam" | "assignment";
  status: "draft" | "ready" | "grading" | "completed";
  examDate: string | null;
  dueDate: string | null;
  totalPoints: number | null;
  createdAt: string;
  course: {
    id: string;
    fullNameMoodle: string | null;
    fullNameOverride: string | null;
    fullNameSource: string;
  };
  createdBy: { id: string; name: string };
  _count: { submissions: number };
}

const statusLabels: Record<string, { label: string; color: string }> = {
  draft: { label: "טיוטה", color: "bg-gray-100 text-gray-700" },
  ready: { label: "מוכן", color: "bg-blue-100 text-blue-700" },
  grading: { label: "בבדיקה", color: "bg-yellow-100 text-yellow-700" },
  completed: { label: "הסתיים", color: "bg-green-100 text-green-700" },
};

const typeLabels: Record<string, string> = {
  exam: "מבחן",
  assignment: "מטלה",
};

export function ExamList({ exams }: { exams: ExamTemplate[] }) {
  if (exams.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-12 text-center">
        <p className="text-muted-foreground">עדיין לא נוצרו מבחנים או מטלות</p>
        <Link
          href="/exams/create"
          className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
        >
          יצירת מבחן חדש
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-muted-foreground">
            <th className="px-4 py-3 text-right font-medium">כותרת</th>
            <th className="px-4 py-3 text-right font-medium">סוג</th>
            <th className="px-4 py-3 text-right font-medium">קורס</th>
            <th className="px-4 py-3 text-right font-medium">סטטוס</th>
            <th className="px-4 py-3 text-right font-medium">הגשות</th>
            <th className="px-4 py-3 text-right font-medium">ניקוד</th>
            <th className="px-4 py-3 text-right font-medium">תאריך</th>
            <th className="px-4 py-3 text-right font-medium">פעולות</th>
          </tr>
        </thead>
        <tbody>
          {exams.map((exam) => {
            const courseName = resolveField(
              exam.course.fullNameMoodle,
              exam.course.fullNameOverride
            );
            const status = statusLabels[exam.status] || statusLabels.draft;

            return (
              <tr key={exam.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                <td className="px-4 py-3 font-medium">
                  <Link href={`/exams/${exam.id}`} className="hover:text-primary">
                    {exam.title}
                  </Link>
                </td>
                <td className="px-4 py-3">{typeLabels[exam.type] || exam.type}</td>
                <td className="px-4 py-3 text-muted-foreground">{courseName}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${status.color}`}>
                    {status.label}
                  </span>
                </td>
                <td className="px-4 py-3">{exam._count.submissions}</td>
                <td className="px-4 py-3">{exam.totalPoints || "-"}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {exam.examDate ? formatDateHe(exam.examDate) : formatDateHe(exam.createdAt)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <Link
                      href={`/exams/${exam.id}`}
                      className="rounded px-2 py-1 text-xs text-primary hover:bg-primary/10"
                    >
                      צפייה
                    </Link>
                    <Link
                      href={`/exams/${exam.id}/grade`}
                      className="rounded px-2 py-1 text-xs text-primary hover:bg-primary/10"
                    >
                      בדיקה
                    </Link>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
