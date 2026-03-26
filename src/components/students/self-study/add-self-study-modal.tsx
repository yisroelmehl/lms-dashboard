"use client";

import { useState, useEffect } from "react";

interface StudentOption {
  id: string;
  hebrewName: string | null;
  firstNameMoodle: string | null;
  firstNameOverride: string | null;
  lastNameMoodle: string | null;
  lastNameOverride: string | null;
}

interface CourseOption {
  id: string;
  fullNameMoodle: string | null;
  fullNameOverride: string | null;
}

function getStudentLabel(s: StudentOption): string {
  if (s.hebrewName) return s.hebrewName;
  const first = s.firstNameOverride || s.firstNameMoodle || "";
  const last = s.lastNameOverride || s.lastNameMoodle || "";
  return [first, last].filter(Boolean).join(" ") || "ללא שם";
}

export function AddSelfStudyModal({
  isOpen,
  onClose,
  onCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    studentId: "",
    courseId: "",
    studyTopic: "",
    nextExamDate: "",
    examUnits: "",
    examNotes: "",
    nextContactDate: "",
  });

  const [studentSearch, setStudentSearch] = useState("");

  useEffect(() => {
    // Fetch students and courses for dropdowns
    Promise.all([
      fetch("/api/students").then((r) => r.json()),
      fetch("/api/courses").then((r) => r.json()),
    ]).then(([studentsData, coursesData]) => {
      setStudents(studentsData.students || []);
      setCourses(coursesData.courses || coursesData || []);
    });
  }, []);

  if (!isOpen) return null;

  const filteredStudents = studentSearch
    ? students.filter((s) =>
        getStudentLabel(s).toLowerCase().includes(studentSearch.toLowerCase())
      )
    : students;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/students/self-study", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (res.ok) {
        onCreated();
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-lg bg-card p-6 shadow-lg border border-border max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">רישום תלמיד ללימוד עצמאי</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>

        {error && (
          <div className="mb-4 rounded bg-red-50 p-3 text-sm text-red-600">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Student selection */}
          <div>
            <label className="mb-1 block text-sm font-medium">תלמיד *</label>
            <input
              type="text"
              placeholder="חיפוש תלמיד..."
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm mb-1 focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <select
              required
              value={formData.studentId}
              onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              size={5}
            >
              <option value="" disabled>בחר תלמיד</option>
              {filteredStudents.map((s) => (
                <option key={s.id} value={s.id}>
                  {getStudentLabel(s)}
                </option>
              ))}
            </select>
          </div>

          {/* Course selection */}
          <div>
            <label className="mb-1 block text-sm font-medium">קורס (מודל) *</label>
            <select
              required
              value={formData.courseId}
              onChange={(e) => setFormData({ ...formData, courseId: e.target.value })}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">בחר קורס</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.fullNameOverride || c.fullNameMoodle || "ללא שם"}
                </option>
              ))}
            </select>
          </div>

          {/* Study topic */}
          <div>
            <label className="mb-1 block text-sm font-medium">נושא לימוד</label>
            <input
              type="text"
              value={formData.studyTopic}
              onChange={(e) => setFormData({ ...formData, studyTopic: e.target.value })}
              placeholder="למשל: הלכות שבת, דיני ממונות..."
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Exam info */}
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
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">יחידות לימוד לבחינה</label>
                <input
                  type="text"
                  value={formData.examUnits}
                  onChange={(e) => setFormData({ ...formData, examUnits: e.target.value })}
                  placeholder="יחידות 1-5"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
            <div className="mt-3">
              <label className="mb-1 block text-sm font-medium">הערות לבחינה</label>
              <textarea
                value={formData.examNotes}
                onChange={(e) => setFormData({ ...formData, examNotes: e.target.value })}
                placeholder="הערות מיוחדות..."
                rows={2}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          {/* Next contact */}
          <div className="border-t border-border pt-4">
            <label className="mb-1 block text-sm font-medium">יצירת קשר ראשונה</label>
            <input
              type="date"
              value={formData.nextContactDate}
              onChange={(e) => setFormData({ ...formData, nextContactDate: e.target.value })}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="text-xs text-muted-foreground mt-1">
              תיווצר משימה אוטומטית לתזכורת יצירת קשר
            </p>
          </div>

          <div className="mt-6 flex justify-end gap-3 pt-4 border-t">
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
              {loading ? "שומר..." : "רשום ללימוד עצמאי"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
