"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDateHe } from "@/lib/utils";
import { HebrewDateDisplay } from "@/components/ui/hebrew-date-display";

interface Semester {
  id: string;
  name: string;
  startDate: Date | null;
  endDate: Date | null;
  sortOrder: number;
}

interface CourseSemestersManagerProps {
  courseId: string;
  initialSemesters: Semester[];
}

export function CourseSemestersManager({
  courseId,
  initialSemesters,
}: CourseSemestersManagerProps) {
  const router = useRouter();
  const [semesters, setSemesters] = useState<Semester[]>(initialSemesters);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  // State for new/edit form
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    startDate: "",
    endDate: "",
    sortOrder: "0",
  });

  const handleOpenAdd = () => {
    setFormData({ name: "", startDate: "", endDate: "", sortOrder: (semesters.length * 10).toString() });
    setIsAdding(true);
    setEditingId(null);
    setError("");
  };

  const handleOpenEdit = (semester: Semester) => {
    setFormData({
      name: semester.name,
      startDate: semester.startDate ? new Date(semester.startDate).toISOString().split("T")[0] : "",
      endDate: semester.endDate ? new Date(semester.endDate).toISOString().split("T")[0] : "",
      sortOrder: semester.sortOrder.toString(),
    });
    setEditingId(semester.id);
    setIsAdding(false);
    setError("");
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setError("");
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const url = `/api/courses/${courseId}/semesters`;
      const method = editingId ? "PUT" : "POST";
      const body = editingId ? { ...formData, id: editingId } : formData;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (res.ok) {
        if (editingId) {
          setSemesters(semesters.map((s) => (s.id === editingId ? data.semester : s)));
        } else {
          setSemesters([...semesters, data.semester]);
        }
        
        // Re-sort locally
        setSemesters(prev => [...prev].sort((a, b) => a.sortOrder - b.sortOrder));
        
        handleCancel();
        router.refresh();
      } else {
        setError(data.error || "שגיאה בשמירת סמסטר");
      }
    } catch {
      setError("שגיאה בחיבור לשרת");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (semesterId: string) => {
    if (!confirm("האם אתה בטוח שברצונך למחוק סמסטר זה? מחיקה עלולה למחוק גם את נתוני הרישום של התלמידים לסמסטר זה!")) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/courses/${courseId}/semesters?semesterId=${semesterId}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (res.ok) {
        setSemesters(semesters.filter((s) => s.id !== semesterId));
        router.refresh();
      } else {
        setError(data.error || "שגיאה במחיקת סמסטר");
      }
    } catch {
      setError("שגיאה בחיבור לשרת");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <span>🗓️</span> ניהול סמסטרים / שלבי קורס
        </h2>
        {!isAdding && !editingId && (
          <button
            onClick={handleOpenAdd}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            + הוסף סמסטר
          </button>
        )}
      </div>

      {error && <div className="mb-4 text-sm text-red-600 bg-red-50 p-3 rounded">{error}</div>}

      {(isAdding || editingId) && (
        <form onSubmit={handleSave} className="mb-6 bg-slate-50 p-4 rounded-md border border-slate-200">
          <h3 className="font-medium mb-3">{editingId ? "ערוך סמסטר" : "סמסטר חדש"}</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="md:col-span-2">
              <label className="block text-xs text-muted-foreground mb-1">שם הסמסטר (למשל: סמסטר א', שבת ח"א) *</label>
              <input required type="text" name="name" value={formData.name} onChange={handleChange} className="w-full border rounded px-3 py-1.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">תאריך התחלה (אופציונלי)</label>
              <input type="date" name="startDate" value={formData.startDate} onChange={handleChange} className="w-full border rounded px-3 py-1.5 text-sm" />
              <HebrewDateDisplay dateValue={formData.startDate} />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">תאריך סיום (אופציונלי)</label>
              <input type="date" name="endDate" value={formData.endDate} onChange={handleChange} className="w-full border rounded px-3 py-1.5 text-sm" />
              <HebrewDateDisplay dateValue={formData.endDate} />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">סדר תצוגה (מספר)</label>
              <input type="number" name="sortOrder" value={formData.sortOrder} onChange={handleChange} className="w-full border rounded px-3 py-1.5 text-sm" />
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={loading} className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm hover:bg-blue-700 disabled:opacity-50">
              {loading ? "שומר..." : "שמור"}
            </button>
            <button type="button" onClick={handleCancel} disabled={loading} className="text-slate-600 border border-slate-300 px-4 py-1.5 rounded text-sm hover:bg-slate-100">
              ביטול
            </button>
          </div>
        </form>
      )}

      {semesters.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4 bg-slate-50 rounded">לא הוגדרו סמסטרים. לחץ על "הוסף סמסטר" כדי ליצור חלוקה.</p>
      ) : (
        <div className="space-y-2">
          {semesters.map((s) => (
            <div key={s.id} className="flex items-center justify-between p-3 border rounded-md hover:bg-slate-50 transition-colors">
              <div>
                <span className="font-medium ml-2">{s.name}</span>
                <span className="text-xs text-muted-foreground border-r pr-2 ml-2">סדר: {s.sortOrder}</span>
                {(s.startDate || s.endDate) && (
                  <span className="text-xs text-muted-foreground">
                    תקופה: {s.startDate ? formatDateHe(new Date(s.startDate)) : "—"} עד {s.endDate ? formatDateHe(new Date(s.endDate)) : "—"}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => handleOpenEdit(s)} disabled={loading || isAdding || editingId !== null} className="text-blue-600 text-sm hover:underline disabled:opacity-50 disabled:no-underline">
                  ערוך
                </button>
                <button onClick={() => handleDelete(s.id)} disabled={loading || isAdding || editingId !== null} className="text-red-500 text-sm hover:underline disabled:opacity-50 disabled:no-underline">
                  מחק
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
