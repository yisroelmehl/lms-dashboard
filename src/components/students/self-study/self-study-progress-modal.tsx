"use client";

import { useState, useEffect } from "react";

interface Activity {
  syllabusItemId: string;
  title: string;
  type: string;
  moodleCmId: number | null;
  completed: boolean;
  completionState: number | null;
  completedAt: string | null;
  grade: number | null;
  gradeMax: number | null;
  gradeSource: string | null;
  isOverride: boolean;
}

interface ProgressData {
  activities: Activity[];
  summary: {
    totalItems: number;
    completedItems: number;
    completionPercent: number;
    totalExams: number;
    completedExams: number;
    totalLessons: number;
    completedLessons: number;
  };
}

interface Props {
  enrollment: {
    id: string;
    examUnits: string | null;
    nextExamDate: string | null;
    student: {
      hebrewName: string | null;
      firstNameOverride: string | null;
      lastNameOverride: string | null;
      moodleUserId: number | null;
    };
    course: {
      fullNameMoodle: string | null;
      fullNameOverride: string | null;
      moodleCourseId: number | null;
    };
  };
  onClose: () => void;
}

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max === 0 ? 0 : Math.round((value / max) * 100);
  const color = pct === 100 ? "bg-green-500" : pct >= 60 ? "bg-blue-500" : pct >= 30 ? "bg-amber-500" : "bg-red-400";

  return (
    <div className="flex items-center gap-2">
      <div className="h-2.5 flex-1 rounded-full bg-slate-200">
        <div className={`h-2.5 rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-16 text-left text-xs text-muted-foreground font-medium">
        {value}/{max} ({pct}%)
      </span>
    </div>
  );
}

export function SelfStudyProgressModal({ enrollment, onClose }: Props) {
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const studentName =
    enrollment.student.hebrewName ||
    [enrollment.student.firstNameOverride, enrollment.student.lastNameOverride].filter(Boolean).join(" ") ||
    "תלמיד";

  useEffect(() => {
    fetch(`/api/students/self-study/${enrollment.id}/progress`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else if (data.message) {
          setError(data.message);
        } else {
          setProgress(data.progress);
        }
      })
      .catch(() => setError("שגיאה בשאיבת נתונים"))
      .finally(() => setLoading(false));
  }, [enrollment.id]);

  const typeLabels: Record<string, string> = {
    exam: "📝 מבחן",
    lesson: "📹 שיעור",
    assignment: "📄 מטלה",
    quiz: "❓ חידון",
    activity: "🔄 פעילות",
    other: "📋 אחר",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-3xl rounded-lg bg-card p-6 shadow-lg border border-border max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">
            התקדמות - {studentName}
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>

        <p className="text-sm text-muted-foreground mb-2">
          קורס: {enrollment.course.fullNameOverride || enrollment.course.fullNameMoodle}
        </p>

        {enrollment.nextExamDate && (
          <div className="mb-4 rounded-md bg-amber-50 border border-amber-200 p-3">
            <p className="text-sm font-medium text-amber-800">
              🗓️ בחינה קרובה: {new Date(enrollment.nextExamDate).toLocaleDateString("he-IL")}
              {enrollment.examUnits && ` | יחידות: ${enrollment.examUnits}`}
            </p>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">טוען נתוני מודל...</div>
        ) : error ? (
          <div className="text-center py-12 text-muted-foreground">{error}</div>
        ) : progress ? (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="rounded-md border border-border p-4 text-center">
                <p className="text-2xl font-bold text-blue-600">{progress.summary.completionPercent}%</p>
                <p className="text-xs text-muted-foreground mt-1">התקדמות כללית</p>
                <ProgressBar value={progress.summary.completedItems} max={progress.summary.totalItems} />
              </div>
              <div className="rounded-md border border-border p-4 text-center">
                <p className="text-2xl font-bold text-green-600">
                  {progress.summary.completedLessons}/{progress.summary.totalLessons}
                </p>
                <p className="text-xs text-muted-foreground mt-1">שיעורים שהושלמו</p>
                <ProgressBar value={progress.summary.completedLessons} max={progress.summary.totalLessons} />
              </div>
              <div className="rounded-md border border-border p-4 text-center">
                <p className="text-2xl font-bold text-amber-600">
                  {progress.summary.completedExams}/{progress.summary.totalExams}
                </p>
                <p className="text-xs text-muted-foreground mt-1">מבחנים שהושלמו</p>
                <ProgressBar value={progress.summary.completedExams} max={progress.summary.totalExams} />
              </div>
            </div>

            {/* Activity details table */}
            <h3 className="text-sm font-semibold mb-3">יחידות לימוד</h3>
            <div className="rounded-lg border border-border overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">סטטוס</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">שם</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">סוג</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">ציון</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">הושלם</th>
                  </tr>
                </thead>
                <tbody>
                  {progress.activities.map((activity) => (
                    <tr key={activity.syllabusItemId} className="border-b border-border last:border-0">
                      <td className="px-3 py-2 text-center">
                        {activity.completed ? (
                          <span className="text-green-600">✅</span>
                        ) : (
                          <span className="text-slate-300">⬜</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-sm">{activity.title}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {typeLabels[activity.type] || activity.type}
                      </td>
                      <td className="px-3 py-2 text-sm">
                        {activity.grade !== null ? (
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            activity.gradeMax && (activity.grade / activity.gradeMax) >= 0.6
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}>
                            {Math.round(activity.grade)}{activity.gradeMax ? `/${Math.round(activity.gradeMax)}` : ""}
                            {activity.isOverride && " ✏️"}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {activity.completedAt
                          ? new Date(activity.completedAt).toLocaleDateString("he-IL")
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="text-center py-12 text-muted-foreground">אין נתונים</div>
        )}
      </div>
    </div>
  );
}
