"use client";

import { useState } from "react";

interface CourseRequirementsFormProps {
  courseId: string;
  initialExams: number;
  initialGrade: number;
  initialAttendance: number;
}

export function CourseRequirementsForm({
  courseId,
  initialExams,
  initialGrade,
  initialAttendance,
}: CourseRequirementsFormProps) {
  const [exams, setExams] = useState(initialExams);
  const [grade, setGrade] = useState(initialGrade);
  const [attendance, setAttendance] = useState(initialAttendance);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(`/api/courses/${courseId}/requirements`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exams, grade, attendance }),
      });
      if (res.ok) {
        setMessage("ההגדרות נשמרו בהצלחה.");
      } else {
        setMessage("שגיאה בשמירת ההגדרות.");
      }
    } catch {
      setMessage("שגיאה בחיבור לשרת.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h2 className="mb-4 text-lg font-semibold">דרישות לקבלת תעודה</h2>
      <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="mb-1 block text-sm font-medium text-muted-foreground">
            מספר מבחנים מינימלי
          </label>
          <input
            type="number"
            min={0}
            value={exams}
            onChange={(e) => setExams(Number(e.target.value))}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-muted-foreground">
            ממוצע ציונים מינימלי (%)
          </label>
          <input
            type="number"
            min={0}
            max={100}
            value={grade}
            onChange={(e) => setGrade(Number(e.target.value))}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-muted-foreground">
            נוכחות מינימלית (%)
          </label>
          <input
            type="number"
            min={0}
            max={100}
            value={attendance}
            onChange={(e) => setAttendance(Number(e.target.value))}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="md:col-span-3 flex items-center gap-4 mt-2">
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loading ? "שומר..." : "שמור שינויים"}
          </button>
          {message && (
            <span className={`text-sm ${message.includes("שגיאה") ? "text-red-500" : "text-green-600"}`}>
              {message}
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
