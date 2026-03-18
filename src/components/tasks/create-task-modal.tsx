"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface CourseOption { id: string; name: string; }
interface StudentOption { id: string; name: string; }

export function CreateTaskModal({ 
  isOpen, 
  onClose, 
  adminId, 
  studentId,
  courseId,
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  adminId: string;
  studentId?: string;
  courseId?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Scope: 'general' | 'student' | 'course'
  const [scope, setScope] = useState<"general" | "student" | "course">(
    studentId ? "student" : courseId ? "course" : "general"
  );

  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState(courseId || "");
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>(studentId ? [studentId] : []);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    dueDate: "",
    priority: "0",
  });

  useEffect(() => {
    if (!isOpen) return;
    // Fetch courses
    fetch("/api/courses")
      .then(r => r.json())
      .then(d => setCourses((d.courses || []).map((c: any) => ({
        id: c.id,
        name: c.fullNameOverride || c.fullNameMoodle || c.id,
      }))));
    // Fetch students
    fetch("/api/students")
      .then(r => r.json())
      .then(d => setStudents((d.students || []).map((s: any) => ({
        id: s.id,
        name: s.hebrewName || `${s.firstNameOverride || s.firstNameMoodle || ""} ${s.lastNameOverride || s.lastNameMoodle || ""}`.trim(),
      }))));
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const toggleStudent = (id: string) => {
    setSelectedStudentIds(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          priority: parseInt(formData.priority),
          scope,
          courseId: scope === "course" ? selectedCourseId : null,
          studentIds: scope === "student" ? selectedStudentIds : [],
        }),
      });

      if (res.ok) {
        onClose();
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error || "שגיאה ביצירת המשימה");
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
          <h2 className="text-xl font-bold">הוספת משימה חדשה</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>

        {error && <div className="mb-4 rounded bg-red-50 p-3 text-sm text-red-600">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">כותרת משימה *</label>
            <input required type="text" name="title" value={formData.title} onChange={handleChange} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-ring" placeholder="למשל: לדבר עם התלמיד על נוכחות" />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">תיאור ופרטים נוספים</label>
            <textarea name="description" rows={2} value={formData.description} onChange={handleChange} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-ring" placeholder="פירוט המשימה..." />
          </div>

          {/* Scope selector */}
          <div>
            <label className="mb-1 block text-sm font-medium">סוג משימה</label>
            <div className="flex gap-2">
              {(["general", "student", "course"] as const).map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setScope(s)}
                  className={`flex-1 py-2 px-3 rounded-md border text-sm font-medium transition-colors ${
                    scope === s
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-background border-input hover:bg-muted"
                  }`}
                >
                  {s === "general" ? "🗂️ כללית" : s === "student" ? "👤 לפי תלמיד" : "📚 לפי קורס"}
                </button>
              ))}
            </div>
          </div>

          {/* Student picker */}
          {scope === "student" && (
            <div>
              <label className="mb-1 block text-sm font-medium">בחר תלמיד/ים</label>
              <div className="max-h-40 overflow-y-auto border rounded-md divide-y text-sm">
                {students.length === 0 ? (
                  <p className="p-3 text-muted-foreground">טוען תלמידים...</p>
                ) : students.map(s => (
                  <label key={s.id} className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-muted">
                    <input
                      type="checkbox"
                      checked={selectedStudentIds.includes(s.id)}
                      onChange={() => toggleStudent(s.id)}
                      className="rounded"
                    />
                    {s.name}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Course picker */}
          {scope === "course" && (
            <div>
              <label className="mb-1 block text-sm font-medium">בחר קורס</label>
              <select
                value={selectedCourseId}
                onChange={e => setSelectedCourseId(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">-- בחר קורס --</option>
                {courses.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">תאריך יעד</label>
              <input type="date" name="dueDate" value={formData.dueDate} onChange={handleChange} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">עדיפות</label>
              <select name="priority" value={formData.priority} onChange={handleChange} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-ring">
                <option value="0">רגילה</option>
                <option value="1">חשובה</option>
                <option value="2">דחופה מאוד</option>
              </select>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={onClose} disabled={loading} className="rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-muted">
              ביטול
            </button>
            <button type="submit" disabled={loading} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {loading ? "יוצר משימה..." : "שמור משימה"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
