"use client";

import { useEffect, useState } from "react";

interface Template {
  id: string;
  title: string;
  courseId: string | null;
}

interface Props {
  studentId: string;
  studentName: string;
  originalSlotKey: string;
  originalAttempt: number;
  originalTemplateId: string;
  defaultCourseId?: string | null;
  onClose: () => void;
  onAssigned: () => void;
}

export function ReassignModal({
  studentId,
  studentName,
  originalSlotKey,
  originalAttempt,
  originalTemplateId,
  defaultCourseId,
  onClose,
  onAssigned,
}: Props) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templateId, setTemplateId] = useState<string>(originalTemplateId);
  const [deadline, setDeadline] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/exam-templates")
      .then(r => r.json())
      .then(d => {
        const list: Template[] = d.templates || d || [];
        // Filter to same course if available
        const filtered = defaultCourseId
          ? list.filter(t => t.courseId === defaultCourseId || t.id === originalTemplateId)
          : list;
        setTemplates(filtered);
      });
  }, [defaultCourseId, originalTemplateId]);

  const handleSubmit = async () => {
    if (!templateId) { setError("בחר מבחן"); return; }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/api/exam-templates/${templateId}/assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          slotKey: originalSlotKey,
          attempt: originalAttempt + 1,
          deadline: deadline ? new Date(deadline).toISOString() : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "שגיאה");
        return;
      }
      onAssigned();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" dir="rtl">
      <div className="w-full max-w-md bg-white rounded-xl shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="font-bold text-lg">הקצאת מועד {originalAttempt + 1}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        <div className="p-5 space-y-4">
          <div className="text-sm bg-blue-50 border border-blue-200 rounded-lg p-3 text-blue-800">
            <p>תלמיד: <strong>{studentName}</strong></p>
            <p className="text-xs mt-1 text-blue-600">
              ההקצאה תקושר לאותו slot כמו המועד הקודם — ייספר כמילוי המכסה של המבחן.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">איזה מבחן?</label>
            <select
              value={templateId}
              onChange={e => setTemplateId(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
            >
              {templates.map(t => (
                <option key={t.id} value={t.id}>
                  {t.title} {t.id === originalTemplateId ? "(אותו מבחן)" : ""}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              ניתן להשתמש באותו מבחן או ביצירה של מבחן חדש על אותו נושא.
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
            disabled={submitting}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? "מקצה..." : "הקצה"}
          </button>
        </div>
      </div>
    </div>
  );
}
