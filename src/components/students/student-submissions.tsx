"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface StudentSubmission {
  id: string;
  syllabusItemId: string;
  syllabusItemTitle: string;
  syllabusItemType: string;
  maxScore: number | null;
  courseId: string;
  courseName: string;
  answers: Record<string, unknown>;
  grade: number | null;
  feedback: string | null;
  submittedAt: string;
  gradedAt: string | null;
}

export function StudentSubmissions({ studentId }: { studentId: string }) {
  const [submissions, setSubmissions] = useState<StudentSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/students/${studentId}/submissions`)
      .then((r) => r.json())
      .then(setSubmissions)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [studentId]);

  const typeLabel = (t: string) =>
    t === "exam" ? "מבחן" : t === "quiz" ? "חידון" : t === "assignment" ? "מטלה" : t;

  const typeIcon = (t: string) =>
    t === "exam" ? "📝" : t === "quiz" ? "❓" : "📄";

  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4">📋 הגשות מבחנים ומטלות</h2>
        <p className="text-sm text-muted-foreground">טוען...</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h2 className="text-lg font-semibold mb-4">📋 הגשות מבחנים ומטלות ({submissions.length})</h2>

      {submissions.length === 0 ? (
        <p className="text-sm text-muted-foreground">אין הגשות</p>
      ) : (
        <>
          {/* Summary */}
          <div className="flex gap-3 mb-4 text-sm">
            <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full">
              {submissions.length} הגשות
            </span>
            <span className="bg-green-50 text-green-700 px-3 py-1 rounded-full">
              {submissions.filter((s) => s.grade != null).length} נבדקו
            </span>
            {submissions.filter((s) => s.grade != null).length > 0 && (
              <span className="bg-purple-50 text-purple-700 px-3 py-1 rounded-full">
                ממוצע: {Math.round(
                  submissions.filter((s) => s.grade != null).reduce((a, s) => a + (s.grade || 0), 0) /
                  submissions.filter((s) => s.grade != null).length
                )}
              </span>
            )}
          </div>

          <table className="w-full">
            <thead>
              <tr className="border-b text-xs text-muted-foreground">
                <th className="px-3 py-2 text-right">קורס</th>
                <th className="px-3 py-2 text-right">מטלה</th>
                <th className="px-3 py-2 text-right">סוג</th>
                <th className="px-3 py-2 text-right">תאריך הגשה</th>
                <th className="px-3 py-2 text-right">ציון</th>
                <th className="px-3 py-2 text-right">סטטוס</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((sub) => (
                <tr key={sub.id} className="border-b last:border-0 hover:bg-slate-50">
                  <td className="px-3 py-2 text-sm">
                    <Link href={`/courses/${sub.courseId}`} className="text-blue-600 hover:underline">
                      {sub.courseName}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-sm font-medium">
                    {typeIcon(sub.syllabusItemType)} {sub.syllabusItemTitle}
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-500">
                    {typeLabel(sub.syllabusItemType)}
                  </td>
                  <td className="px-3 py-2 text-sm text-slate-600">
                    {new Date(sub.submittedAt).toLocaleDateString("he-IL")}
                  </td>
                  <td className="px-3 py-2">
                    {sub.grade != null ? (
                      <span className={`text-sm font-bold ${sub.grade >= 60 ? "text-green-700" : "text-red-600"}`}>
                        {sub.grade}{sub.maxScore ? `/${sub.maxScore}` : ""}
                      </span>
                    ) : (
                      <span className="text-sm text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {sub.grade != null ? (
                      <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full">נבדק</span>
                    ) : (
                      <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">ממתין לבדיקה</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Feedback section for graded items */}
          {submissions.filter((s) => s.feedback).length > 0 && (
            <div className="mt-4 space-y-2">
              <h3 className="text-sm font-semibold text-slate-700">משובים שהתקבלו</h3>
              {submissions.filter((s) => s.feedback).map((sub) => (
                <div key={sub.id} className="bg-slate-50 rounded p-3 text-sm">
                  <span className="font-medium">{sub.syllabusItemTitle}:</span>{" "}
                  <span className="text-slate-600">{sub.feedback}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
