"use client";

import { useState, useEffect } from "react";

interface MoodleCourse {
  id: number;
  fullname: string;
  shortname: string;
}

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
  onClose: () => void;
  onPublished: () => void;
}

export function PublishToMoodleModal({ syllabusItem, onClose, onPublished }: Props) {
  const [courses, setCourses] = useState<MoodleCourse[]>([]);
  const [sections, setSections] = useState<MoodleSection[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [selectedSection, setSelectedSection] = useState<number>(0);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [loadingSections, setLoadingSections] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");

  const typeLabel =
    syllabusItem.type === "exam" ? "מבחן" :
    syllabusItem.type === "assignment" ? "מטלה" :
    syllabusItem.type === "quiz" ? "בוחן" :
    syllabusItem.type;

  // Fetch Moodle courses
  useEffect(() => {
    fetch("/api/moodle/courses")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setCourses(data);
        else setError(data.error || "שגיאה בטעינת קורסים");
      })
      .catch(() => setError("שגיאה בתקשורת"))
      .finally(() => setLoadingCourses(false));
  }, []);

  // Fetch sections when course selected
  useEffect(() => {
    if (!selectedCourseId) {
      setSections([]);
      return;
    }

    setLoadingSections(true);
    setSections([]);
    setSelectedSection(0);

    fetch(`/api/moodle/courses/${selectedCourseId}/sections`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setSections(data);
        else setError(data.error || "שגיאה בטעינת נושאים");
      })
      .catch(() => setError("שגיאה בתקשורת"))
      .finally(() => setLoadingSections(false));
  }, [selectedCourseId]);

  async function handlePublish() {
    if (!selectedCourseId) return;

    setPublishing(true);
    setError("");

    try {
      const res = await fetch("/api/moodle/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          syllabusItemId: syllabusItem.id,
          moodleCourseId: selectedCourseId,
          sectionNum: selectedSection,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
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
            בחר קורס ונושא במודל. הפעילות תופיע כקישור שהתלמידים ילחצו עליו כדי לפתוח את ה{typeLabel} באתר שלנו.
          </p>

          {/* Course selection */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              קורס במודל
            </label>
            {loadingCourses ? (
              <p className="text-sm text-slate-400">טוען קורסים...</p>
            ) : (
              <select
                value={selectedCourseId || ""}
                onChange={(e) =>
                  setSelectedCourseId(e.target.value ? parseInt(e.target.value) : null)
                }
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-white"
              >
                <option value="">-- בחר קורס --</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.fullname} ({c.shortname})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Section selection */}
          {selectedCourseId && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                נושא / שבוע
              </label>
              {loadingSections ? (
                <p className="text-sm text-slate-400">טוען נושאים...</p>
              ) : (
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
              )}
            </div>
          )}

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
            disabled={!selectedCourseId || publishing}
            className="bg-purple-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-purple-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
          >
            {publishing ? "מפרסם..." : "פרסם למודל"}
          </button>
        </div>
      </div>
    </div>
  );
}
