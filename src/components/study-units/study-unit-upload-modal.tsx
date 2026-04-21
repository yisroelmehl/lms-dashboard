"use client";

import { useState } from "react";

interface StudyUnitUploadModalProps {
  courses: { id: string; fullNameOverride: string | null; fullNameMoodle: string | null }[];
  tags: { id: string; name: string }[];
  onClose: () => void;
  onSuccess: () => void;
}

export function StudyUnitUploadModal({ courses, tags, onClose, onSuccess }: StudyUnitUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [courseId, setCourseId] = useState("");
  const [tagId, setTagId] = useState("");
  const [separator, setSeparator] = useState("---");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("אנא בחר קובץ להעלאה");
      return;
    }

    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("courseId", courseId);
    formData.append("tagId", tagId);
    formData.append("separator", separator);

    try {
      const res = await fetch("/api/study-units/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      
      if (res.ok) {
        alert(data.message);
        onSuccess();
      } else {
        setError(data.error || "שגיאה בהעלאה");
      }
    } catch (err) {
      setError("שגיאת תקשורת");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">ייבוא חומרי לימוד</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <div className="bg-blue-50 text-blue-700 p-3 rounded-md text-sm mb-4">
          אפשר להעלות קבצי Word (.docx), PDF או קבצי טקסט פשוט (.txt).
          המערכת תחלק את הטקסט ליחידות לפי תו מפריד.
        </div>

        {error && <div className="bg-red-50 text-red-600 p-3 rounded text-sm mb-4">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">בחר קובץ</label>
            <input 
              type="file" 
              accept=".docx,.pdf,.txt"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full border rounded p-2 text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">קורס (אופציונלי)</label>
            <select 
              value={courseId} 
              onChange={e => setCourseId(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
            >
              <option value="">-- ללא שיוך --</option>
              {courses.map(c => (
                <option key={c.id} value={c.id}>{c.fullNameOverride || c.fullNameMoodle}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">נושא/תגית (אופציונלי)</label>
            <select 
              value={tagId} 
              onChange={e => setTagId(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
            >
              <option value="">-- ללא שיוך --</option>
              {tags.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">תו מפריד בין יחידות (ברירת מחדל '---')</label>
            <input 
              type="text" 
              value={separator}
              onChange={e => setSeparator(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
            />
          </div>

          <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
            <button 
              type="button" 
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm border rounded hover:bg-gray-50"
            >
              ביטול
            </button>
            <button 
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "מעבד קובץ..." : "העלה ופרק ליחידות"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
