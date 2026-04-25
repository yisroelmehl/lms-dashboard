"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Course {
  id: string;
  fullNameMoodle: string | null;
  fullNameOverride: string | null;
}

interface Template {
  id: string;
  title: string;
  description: string | null;
  type: string;
  timeLimit: number | null;
  totalPoints: number | null;
  dueDate: string | null;
  course: Course | null;
  _count: { questions: number };
}

interface Submission {
  id: string;
  startedAt: string | null;
  submittedAt: string | null;
  grade: number | null;
  maxGrade: number | null;
  gradingStatus: string;
}

interface Assignment {
  id: string;
  attempt: number;
  deadline: string | null;
  template: Template;
  submission: Submission | null;
}

function statusInfo(a: Assignment): { label: string; color: string; cta: string } {
  if (a.submission?.submittedAt) {
    if (a.submission.grade !== null) {
      return {
        label: `הוגש · ציון ${Math.round(a.submission.grade)}/${a.submission.maxGrade}`,
        color: "bg-green-100 text-green-700",
        cta: "צפה בתשובות ובמשוב",
      };
    }
    return { label: "הוגש · בבדיקה", color: "bg-blue-100 text-blue-700", cta: "צפה בהגשה" };
  }
  if (a.submission?.startedAt) {
    return { label: "החל ולא הוגש", color: "bg-orange-100 text-orange-700", cta: "המשך" };
  }
  if (a.deadline && new Date(a.deadline) < new Date()) {
    return { label: "פג תוקף", color: "bg-gray-200 text-gray-500", cta: "סגור" };
  }
  return { label: "פתוח", color: "bg-yellow-100 text-yellow-800", cta: "התחל מבחן" };
}

export default function PortalExamsPage() {
  const router = useRouter();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/portal/exams")
      .then(r => {
        if (r.status === 401) { router.push("/portal"); return null; }
        return r.json();
      })
      .then(data => {
        if (data?.assignments) setAssignments(data.assignments);
      })
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center" dir="rtl">
        <div className="text-gray-500">טוען מבחנים...</div>
      </div>
    );
  }

  const pending = assignments.filter(a => !a.submission?.submittedAt);
  const done = assignments.filter(a => !!a.submission?.submittedAt);

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      <header className="bg-blue-900 text-white">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/portal/dashboard" className="flex items-center gap-3 hover:opacity-80">
            <span className="text-2xl">←</span>
            <h1 className="font-bold text-lg">המבחנים שלי</h1>
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3">לביצוע</h2>
          {pending.length === 0 ? (
            <div className="text-center py-10 text-gray-400 bg-white rounded-xl border">
              אין מבחנים פתוחים כרגע 🎉
            </div>
          ) : (
            <div className="space-y-3">
              {pending.map(a => {
                const s = statusInfo(a);
                return (
                  <Link
                    key={a.id}
                    href={`/portal/exams/${a.id}`}
                    className="block bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900">{a.template.title}</h3>
                        {a.template.course && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            {a.template.course.fullNameOverride || a.template.course.fullNameMoodle}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-3 mt-3 text-xs text-gray-600">
                          <span>📝 {a.template._count.questions} שאלות</span>
                          {a.template.timeLimit && <span>⏱️ {a.template.timeLimit} דק'</span>}
                          {a.deadline && (
                            <span>📅 עד {new Date(a.deadline).toLocaleDateString("he-IL")}</span>
                          )}
                          {a.attempt > 1 && (
                            <span className="text-orange-600">מועד {a.attempt}</span>
                          )}
                        </div>
                      </div>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${s.color}`}>
                        {s.label}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {done.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">הוגשו</h2>
            <div className="space-y-3">
              {done.map(a => {
                const s = statusInfo(a);
                return (
                  <Link
                    key={a.id}
                    href={`/portal/exams/${a.id}`}
                    className="block bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-medium text-gray-700 text-sm truncate">{a.template.title}</h3>
                        <p className="text-xs text-gray-400">
                          {a.submission?.submittedAt && new Date(a.submission.submittedAt).toLocaleString("he-IL")}
                        </p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${s.color} whitespace-nowrap`}>
                        {s.label}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
