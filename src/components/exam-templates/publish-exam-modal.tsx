"use client";

import { useEffect, useState } from "react";

interface Course {
  id: string;
  fullNameMoodle?: string | null;
  fullNameOverride?: string | null;
}

interface Props {
  templateId: string;
  defaultCourseId?: string | null;
  defaultDeadline?: string | null;
  onClose: () => void;
  onPublished: (info: { created: number; total: number }) => void;
}

export function PublishExamModal({
  templateId,
  defaultCourseId,
  defaultDeadline,
  onClose,
  onPublished,
}: Props) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseId, setCourseId] = useState(defaultCourseId || "");
  const [deadline, setDeadline] = useState(
    defaultDeadline ? new Date(defaultDeadline).toISOString().slice(0, 16) : ""
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/courses")
      .then(r => r.json())
      .then(d => setCourses(d.courses || d || []));
  }, []);

  const handleSubmit = async () => {
    if (!courseId) { setError("בחר קורס"); return; }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/api/exam-templates/${templateId}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId,
          deadline: deadline ? new Date(deadline).toISOString() : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "שגיאה בפרסום");
        return;
      }
      onPublished({ created: data.created, total: data.total });
    } catch {
      setError("שגיאת תקשורת");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" dir="rtl">
      <div className="w-full max-w-md bg-white rounded-xl shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="font-bold text-lg">פרסום מבחן לכיתה</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">קורס *</label>
            <select
              value={courseId}
              onChange={e => setCourseId(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
            >
              <option value="">-- בחר קורס --</option>
              {courses.map(c => (
                <option key={c.id} value={c.id}>
                  {c.fullNameOverride || c.fullNameMoodle}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              המבחן יוקצה לכל תלמיד פעיל בקורס זה.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">תאריך תפוגה</label>
            <input
              type="datetime-local"
              value={deadline}
              onChange={e => setDeadline(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              אופציונלי. אפשר להגדיר deadline פרטני לתלמידים מאוחר יותר.
            </p>
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50"
            disabled={submitting}
          >
            ביטול
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !courseId}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? "מפרסם..." : "פרסם לכיתה"}
          </button>
        </div>
      </div>
    </div>
  );
}
