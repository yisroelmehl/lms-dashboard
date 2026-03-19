"use client";

import { useState, useEffect } from "react";

interface MoodleCourseItem {
  id: number;
  fullname: string;
  shortname: string;
  categoryid: number;
  startdate: number;
  enddate: number;
  visible: number;
}

interface ImportResult {
  coursesImported: number;
  studentsImported: number;
  studentsUpdated: number;
  enrollmentsCreated: number;
  groupsCreated: number;
  errors: string[];
}

export function ImportCoursesModal({
  open,
  onClose,
  onImported,
}: {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [available, setAvailable] = useState<MoodleCourseItem[]>([]);
  const [alreadyImported, setAlreadyImported] = useState<
    { id: number; fullname: string; shortname: string }[]
  >([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      loadMoodleCourses();
      setSelected(new Set());
      setResult(null);
      setError(null);
      setSearch("");
    }
  }, [open]);

  async function loadMoodleCourses() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/courses/moodle-available");
      if (!res.ok) throw new Error("שגיאה בטעינת קורסים");
      const data = await res.json();
      setAvailable(data.available);
      setAlreadyImported(data.alreadyImported);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בטעינת קורסים מהמודל");
    }
    setLoading(false);
  }

  function toggleCourse(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(filtered.map((c) => c.id)));
  }

  function deselectAll() {
    setSelected(new Set());
  }

  async function handleImport() {
    if (selected.size === 0) return;
    setImporting(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/courses/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moodleCourseIds: Array.from(selected) }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "שגיאה בייבוא");
      }
      const data: ImportResult = await res.json();
      setResult(data);
      onImported();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בייבוא קורסים");
    }
    setImporting(false);
  }

  const filtered = available.filter(
    (c) =>
      c.fullname.toLowerCase().includes(search.toLowerCase()) ||
      c.shortname.toLowerCase().includes(search.toLowerCase())
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-2xl rounded-lg bg-card shadow-lg max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="text-lg font-semibold">ייבוא קורסים מהמודל</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground text-xl"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="py-12 text-center text-muted-foreground">
              טוען קורסים מהמודל...
            </div>
          ) : error && !result ? (
            <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          ) : result ? (
            <div className="space-y-3">
              <div className="rounded-md bg-green-50 p-4 text-sm text-green-800">
                <p className="font-medium mb-2">הייבוא הושלם!</p>
                <ul className="space-y-1">
                  <li>קורסים שיובאו: {result.coursesImported}</li>
                  <li>תלמידים חדשים: {result.studentsImported}</li>
                  <li>תלמידים שעודכנו: {result.studentsUpdated}</li>
                  <li>הרשמות שנוצרו: {result.enrollmentsCreated}</li>
                  {result.groupsCreated > 0 && (
                    <li>קבוצות שנוצרו: {result.groupsCreated}</li>
                  )}
                </ul>
                {result.errors.length > 0 && (
                  <div className="mt-3 border-t border-green-200 pt-2">
                    <p className="font-medium text-amber-700">שגיאות:</p>
                    {result.errors.map((e, i) => (
                      <p key={i} className="text-amber-700">{e}</p>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={onClose}
                className="w-full rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
              >
                סגור
              </button>
            </div>
          ) : (
            <>
              {/* Search */}
              <div>
                <input
                  type="text"
                  placeholder="חיפוש קורס..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </div>

              {/* Select all / deselect */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {available.length} קורסים זמינים לייבוא
                  {alreadyImported.length > 0 &&
                    ` (${alreadyImported.length} כבר יובאו)`}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={selectAll}
                    className="text-primary hover:underline"
                  >
                    בחר הכל
                  </button>
                  <button
                    onClick={deselectAll}
                    className="text-muted-foreground hover:underline"
                  >
                    נקה
                  </button>
                </div>
              </div>

              {/* Available courses list */}
              {filtered.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  {available.length === 0
                    ? "כל הקורסים כבר יובאו מהמודל"
                    : "לא נמצאו קורסים"}
                </p>
              ) : (
                <div className="space-y-1 max-h-80 overflow-y-auto">
                  {filtered.map((course) => (
                    <label
                      key={course.id}
                      className={`flex items-center gap-3 rounded-md border p-3 cursor-pointer transition-colors ${
                        selected.has(course.id)
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-muted"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(course.id)}
                        onChange={() => toggleCourse(course.id)}
                        className="rounded"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {course.fullname}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {course.shortname}
                        </p>
                      </div>
                      {course.visible === 0 && (
                        <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                          מוסתר
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer - only show when not showing results */}
        {!loading && !result && (
          <div className="border-t border-border p-4 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {selected.size > 0
                ? `${selected.size} קורסים נבחרו`
                : "בחר קורסים לייבוא"}
            </span>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted"
              >
                ביטול
              </button>
              <button
                onClick={handleImport}
                disabled={selected.size === 0 || importing}
                className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {importing
                  ? "מייבא..."
                  : `ייבא ${selected.size > 0 ? selected.size + " קורסים" : ""}`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
