"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";

interface Student {
  id: string;
  firstNameMoodle: string | null; firstNameOverride: string | null;
  lastNameMoodle: string | null; lastNameOverride: string | null;
  emailMoodle: string | null; emailOverride: string | null;
}

interface SubmissionRow {
  id: string;
  submittedAt: string | null;
  grade: number | null;
  maxGrade: number | null;
  gradingStatus: string;
}

interface AssignmentRow {
  id: string;
  slotKey: string;
  attempt: number;
  deadline: string | null;
  publishedAt: string;
  student: Student;
  submission: SubmissionRow | null;
}

function studentName(s: Student) {
  return [
    s.firstNameOverride || s.firstNameMoodle,
    s.lastNameOverride || s.lastNameMoodle,
  ].filter(Boolean).join(" ") || s.emailMoodle || s.emailOverride || "(ללא שם)";
}

export default function ExamSubmissionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: templateId } = use(params);

  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/exam-templates/${templateId}/assignments`)
      .then(r => r.json())
      .then(d => setAssignments(d.assignments || []))
      .finally(() => setLoading(false));
  }, [templateId]);

  if (loading) return <div className="p-8 text-center text-gray-500">טוען...</div>;

  const submitted = assignments.filter(a => !!a.submission?.submittedAt);
  const pending = assignments.filter(a => !a.submission?.submittedAt);

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-8" dir="rtl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link href={`/exams/${templateId}`} className="text-sm text-blue-600 hover:underline">← חזרה למבחן</Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">הגשות תלמידים</h1>
        </div>
        <div className="text-sm text-gray-500">
          {submitted.length} הוגשו · {pending.length} פעילים
        </div>
      </div>

      <Section title="הגשות לבדיקה" rows={submitted} templateId={templateId} />
      <div className="h-8" />
      <Section title="ממתינים להגשה" rows={pending} templateId={templateId} pending />
    </div>
  );
}

function Section({ title, rows, templateId, pending = false }: {
  title: string; rows: AssignmentRow[]; templateId: string; pending?: boolean;
}) {
  if (rows.length === 0) {
    return (
      <div>
        <h2 className="text-lg font-semibold mb-3">{title}</h2>
        <div className="text-center py-6 text-gray-400 bg-gray-50 rounded-lg border border-dashed">
          {pending ? "אין הקצאות פעילות" : "אין הגשות עדיין"}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg font-semibold mb-3">{title}</h2>
      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b text-gray-600 text-xs">
            <tr>
              <th className="text-right px-4 py-3">תלמיד</th>
              <th className="text-right px-4 py-3">מועד</th>
              <th className="text-right px-4 py-3">{pending ? "deadline" : "הוגש ב-"}</th>
              <th className="text-right px-4 py-3">ציון</th>
              <th className="text-right px-4 py-3">סטטוס</th>
              <th className="text-right px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(a => (
              <tr key={a.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{studentName(a.student)}</td>
                <td className="px-4 py-3 text-gray-600">{a.attempt > 1 ? `מועד ${a.attempt}` : "א'"}</td>
                <td className="px-4 py-3 text-gray-600">
                  {pending
                    ? a.deadline ? new Date(a.deadline).toLocaleString("he-IL") : "—"
                    : a.submission?.submittedAt ? new Date(a.submission.submittedAt).toLocaleString("he-IL") : "—"
                  }
                </td>
                <td className="px-4 py-3">
                  {a.submission?.grade !== null && a.submission?.grade !== undefined ? (
                    <span className="font-medium">{Math.round(a.submission.grade)} / {a.submission.maxGrade}</span>
                  ) : "—"}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge a={a} />
                </td>
                <td className="px-4 py-3">
                  {a.submission?.id ? (
                    <Link
                      href={`/exams/${templateId}/submissions/${a.submission.id}`}
                      className="text-blue-600 hover:underline text-xs"
                    >
                      צפה ←
                    </Link>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusBadge({ a }: { a: AssignmentRow }) {
  if (a.submission?.gradingStatus === "graded") {
    return <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">נבדק</span>;
  }
  if (a.submission?.submittedAt) {
    return <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">בבדיקה</span>;
  }
  if (a.deadline && new Date(a.deadline) < new Date()) {
    return <span className="text-xs bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full">פג תוקף</span>;
  }
  return <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">פתוח</span>;
}
