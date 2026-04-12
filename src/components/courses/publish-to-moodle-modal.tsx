"use client";

import { useState, useEffect } from "react";

interface MoodleSection {
  id: number;
  section: number;
  name: string;
}

interface Props {
  syllabusItem: {
    id: string;
    title: string;
    type: string;
  };
  courseId: string;
  moodleCourseId: number | null;
  onClose: () => void;
  onPublished: () => void;
}

export function PublishToMoodleModal({ syllabusItem, courseId, moodleCourseId, onClose, onPublished }: Props) {
  const [sections, setSections] = useState<MoodleSection[]>([]);
  const [selectedSection, setSelectedSection] = useState<number>(0);
  const [loadingSections, setLoadingSections] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");
  const [embedUrl, setEmbedUrl] = useState("");
  const [copied, setCopied] = useState(false);

  const typeLabel =
    syllabusItem.type === "exam" ? "מבחן" :
    syllabusItem.type === "assignment" ? "מטלה" :
    syllabusItem.type === "quiz" ? "חידון" :
    syllabusItem.type;

  // Fetch sections from the course's linked Moodle course
  useEffect(() => {
    if (!moodleCourseId) return;

    setLoadingSections(true);
    fetch(`/api/moodle/courses/${moodleCourseId}/sections`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setSections(data);
        else setError(data.error || "שגיאה בטעינת נושאים");
      })
      .catch(() => setError("שגיאה בתקשורת"))
      .finally(() => setLoadingSections(false));
  }, [moodleCourseId]);

  async function handlePublish() {
    setPublishing(true);
    setError("");

    try {
      const res = await fetch("/api/moodle/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          syllabusItemId: syllabusItem.id,
          courseId,
          sectionNum: selectedSection,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        if (data.embedUrl) setEmbedUrl(data.embedUrl);
        onPublished();
      } else {
        setError(data.error || "שגיאה בפרסום");
      }
    } catch {
      setError("שגיאה בתקשורת");
    } finally {
      setPublishing(false);
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(embedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // If course not linked to Moodle
  if (!moodleCourseId) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="w-full max-w-lg rounded-lg bg-white border border-slate-200 shadow-xl p-6" dir="rtl">
          <h2 className="text-lg font-bold mb-3">🚀 פרסם למודל</h2>
          <p className="text-sm text-red-600 mb-4">
            הקורס הזה לא משויך לקורס במודל. יש לשייך אותו קודם דרך הגדרות הקורס.
          </p>
          <button onClick={onClose} className="text-slate-600 border border-slate-300 px-4 py-2 rounded-md text-sm hover:bg-slate-100">
            סגור
          </button>
        </div>
      </div>
    );
  }

  // Show embed URL after publishing  
  if (embedUrl) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="w-full max-w-lg rounded-lg bg-white border border-slate-200 shadow-xl" dir="rtl">
          <div className="flex items-center justify-between border-b p-6">
            <h2 className="text-lg font-bold">✅ פורסם בהצלחה!</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
          </div>
          <div className="p-6 space-y-4">
            <p className="text-sm text-slate-600">
              הקישור נוצר. העתק אותו והוסף אותו כפעילות URL במודל:
            </p>
            <div className="flex gap-2">
              <input
                readOnly
                value={embedUrl}
                className="flex-1 border border-slate-300 rounded-md px-3 py-2 text-sm bg-slate-50 text-left"
                dir="ltr"
              />
              <button
                onClick={handleCopy}
                className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
              >
                {copied ? "הועתק ✓" : "העתק"}
              </button>
            </div>
          </div>
          <div className="border-t p-6 flex justify-end">
            <button onClick={onClose} className="text-slate-600 border border-slate-300 px-4 py-2 rounded-md text-sm hover:bg-slate-100">
              סגור
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-lg bg-white border border-slate-200 shadow-xl" dir="rtl">
        {/* Header */}
        <div className="flex items-center justify-between border-b p-6">
          <div>
            <h2 className="text-lg font-bold">🚀 פרסם למודל</h2>
            <p className="text-sm text-slate-500 mt-1">
              {typeLabel}: {syllabusItem.title}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-xl"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-600">
            בחר נושא/שבוע במודל. ייווצר קישור שהתלמידים ילחצו עליו כדי לפתוח את ה{typeLabel} באתר שלנו.
          </p>

          {/* Section selection */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              נושא / שבוע
            </label>
            {loadingSections ? (
              <p className="text-sm text-slate-400">טוען נושאים...</p>
            ) : sections.length > 0 ? (
              <select
                value={selectedSection}
                onChange={(e) => setSelectedSection(parseInt(e.target.value))}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-white"
              >
                {sections.map((s) => (
                  <option key={s.id} value={s.section}>
                    {s.name}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-sm text-slate-400">לא נמצאו נושאים</p>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={publishing}
            className="text-slate-600 border border-slate-300 px-4 py-2 rounded-md text-sm hover:bg-slate-100"
          >
            ביטול
          </button>
          <button
            onClick={handlePublish}
            disabled={publishing}
            className="bg-purple-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-purple-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
          >
            {publishing ? "מפרסם..." : "פרסם למודל"}
          </button>
        </div>
      </div>
    </div>
  );
}
