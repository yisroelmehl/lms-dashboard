"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Course {
  id: string;
  fullNameMoodle: string | null;
  fullNameOverride: string | null;
  moodleCourseId: number | null;
  shortNameMoodle: string | null;
}

interface Student {
  id: string;
  firstNameMoodle: string | null;
  firstNameOverride: string | null;
  lastNameMoodle: string | null;
  lastNameOverride: string | null;
  emailMoodle: string | null;
  emailOverride: string | null;
  enrollments: { course: Course }[];
}

function resolveName(override: string | null, moodle: string | null) {
  return override || moodle || "";
}

export default function StudentDashboard() {
  const router = useRouter();
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);

  const moodleBase = process.env.NEXT_PUBLIC_MOODLE_URL || "";

  useEffect(() => {
    fetch("/api/student-auth/me")
      .then(r => {
        if (r.status === 401) { router.push("/portal"); return null; }
        return r.json();
      })
      .then(data => {
        if (data?.student) setStudent(data.student);
      })
      .finally(() => setLoading(false));
  }, [router]);

  const handleLogout = async () => {
    await fetch("/api/student-auth/logout", { method: "POST" });
    router.push("/portal");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-950 to-blue-900 flex items-center justify-center">
        <div className="text-white text-xl">טוען...</div>
      </div>
    );
  }

  if (!student) return null;

  const firstName = resolveName(student.firstNameOverride, student.firstNameMoodle);
  const lastName = resolveName(student.lastNameOverride, student.lastNameMoodle);
  const email = student.emailOverride || student.emailMoodle || "";

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      {/* Header */}
      <header className="bg-blue-900 text-white">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📚</span>
            <div>
              <h1 className="font-bold text-lg leading-none">שלום, {firstName}!</h1>
              <p className="text-blue-300 text-xs">{email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="text-xs text-blue-300 hover:text-white border border-blue-700 hover:border-white px-3 py-1.5 rounded-lg transition-colors"
          >
            יציאה
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Quick links */}
        <section className="grid grid-cols-2 gap-3">
          <a
            href="/portal/exams"
            className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-3 hover:shadow-md transition-shadow"
          >
            <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center text-xl">📝</div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">המבחנים שלי</p>
              <p className="text-xs text-gray-500">מבחנים פתוחים והגשות</p>
            </div>
          </a>
        </section>

        {/* Courses */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-4">הקורסים שלי</h2>
          {student.enrollments.length === 0 ? (
            <div className="text-center py-12 text-gray-400 bg-white rounded-xl border">
              <div className="text-4xl mb-3">📭</div>
              <p>לא נמצאו קורסים פעילים</p>
              <p className="text-sm mt-1">פנה למשרד אם אתה חושב שזו שגיאה</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {student.enrollments.map(({ course }) => {
                const name = course.fullNameOverride || course.fullNameMoodle || "קורס";
                const short = course.shortNameMoodle || "";
                const moodleUrl = course.moodleCourseId
                  ? `${moodleBase}/course/view.php?id=${course.moodleCourseId}`
                  : null;

                return (
                  <div
                    key={course.id}
                    className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex flex-col gap-3 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-xl shrink-0">
                        🎓
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2">
                          {name}
                        </h3>
                        {short && (
                          <p className="text-xs text-gray-400 mt-0.5">{short}</p>
                        )}
                      </div>
                    </div>
                    {moodleUrl ? (
                      <a
                        href={moodleUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full text-center bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 rounded-lg transition-colors"
                      >
                        כניסה לקורס ←
                      </a>
                    ) : (
                      <div className="text-xs text-gray-400 text-center py-1">
                        הקורס אינו מקושר למודל עדיין
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Footer note */}
        <p className="text-center text-xs text-gray-400 pb-4">
          בעיות? פנה למשרד הישיבה · למען ילמדו
        </p>
      </main>
    </div>
  );
}
