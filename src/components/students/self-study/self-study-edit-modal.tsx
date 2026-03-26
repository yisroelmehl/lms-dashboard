"use client";

import { useState } from "react";
import { HebrewDateDisplay } from "@/components/ui/hebrew-date-display";

interface Props {
  enrollment: {
    id: string;
    status: string;
    studyTopic: string | null;
    nextExamDate: string | null;
    examUnits: string | null;
    examNotes: string | null;
    nextContactDate: string | null;
    student: {
      hebrewName: string | null;
      firstNameOverride: string | null;
      lastNameOverride: string | null;
    };
  };
  onClose: () => void;
  onSaved: () => void;
}

function toDateInputValue(dateStr: string | null): string {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toISOString().split("T")[0];
  } catch {
    return "";
  }
}

export function SelfStudyEditModal({ enrollment, onClose, onSaved }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [formData, setFormData] = useState({
    status: enrollment.status,
    studyTopic: enrollment.studyTopic || "",
    nextExamDate: toDateInputValue(enrollment.nextExamDate),
    examUnits: enrollment.examUnits || "",
    examNotes: enrollment.examNotes || "",
    nextContactDate: toDateInputValue(enrollment.nextContactDate),
  });

  const studentName =
    enrollment.student.hebrewName ||
    [enrollment.student.firstNameOverride, enrollment.student.lastNameOverride].filter(Boolean).join(" ") ||
    "תלמיד";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/students/self-study/${enrollment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (res.ok) {
        onSaved();
        onClose();
      } else {
        setError(data.error || "אירעה שגיאה");
      }
    } catch {
      setError("שגיאת תקשורת");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/students/self-study/${enrollment.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        onSaved();
        onClose();
      } else {
        const data = await res.json();
        setError(data.error || "שגיאה במחיקה");
      }
    } catch {
      setError("שגיאת תקשורת");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-lg bg-card p-6 shadow-lg border border-border max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">עריכת לימוד עצמאי - {studentName}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>

        {error && (
          <div className="mb-4 rounded bg-red-50 p-3 text-sm text-red-600">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">סטטוס</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="active">פעיל</option>
              <option value="paused">מושהה</option>
              <option value="completed">סיים</option>
              <option value="withdrawn">פרש</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">נושא לימוד</label>
            <input
              type="text"
              value={formData.studyTopic}
              onChange={(e) => setFormData({ ...formData, studyTopic: e.target.value })}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="border-t border-border pt-4">
            <h3 className="text-sm font-semibold mb-3">פרטי בחינה</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium">תאריך בחינה קרובה</label>
                <input
                  type="date"
                  value={formData.nextExamDate}
                  onChange={(e) => setFormData({ ...formData, nextExamDate: e.target.value })}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <HebrewDateDisplay dateValue={formData.nextExamDate} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">יחידות לימוד</label>
                <input
                  type="text"
                  value={formData.examUnits}
                  onChange={(e) => setFormData({ ...formData, examUnits: e.target.value })}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
            <div className="mt-3">
              <label className="mb-1 block text-sm font-medium">הערות</label>
              <textarea
                value={formData.examNotes}
                onChange={(e) => setFormData({ ...formData, examNotes: e.target.value })}
                rows={2}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <label className="mb-1 block text-sm font-medium">יצירת קשר הבאה</label>
            <input
              type="date"
              value={formData.nextContactDate}
              onChange={(e) => setFormData({ ...formData, nextContactDate: e.target.value })}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <HebrewDateDisplay dateValue={formData.nextContactDate} />
          </div>

          <div className="mt-6 flex justify-between pt-4 border-t">
            <div>
              {!confirmDelete ? (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="rounded-md border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  מחק רישום
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={loading}
                    className="rounded-md bg-red-600 px-3 py-2 text-sm text-white hover:bg-red-700"
                  >
                    אישור מחיקה
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="rounded-md border border-input px-3 py-2 text-sm hover:bg-muted"
                  >
                    ביטול
                  </button>
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-muted"
              >
                ביטול
              </button>
              <button
                type="submit"
                disabled={loading}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? "שומר..." : "שמור שינויים"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
