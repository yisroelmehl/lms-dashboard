"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CreateTaskModal({ 
  isOpen, 
  onClose, 
  adminId, 
  studentId 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  adminId: string;
  studentId?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    dueDate: "",
    assignedToId: adminId, // Default self
    priority: "0",
  });

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
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
          scope: studentId ? "student" : "general",
          studentIds: studentId ? [studentId] : [],
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
      <div className="w-full max-w-md rounded-lg bg-card p-6 shadow-lg border border-border">
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
            <textarea name="description" rows={3} value={formData.description} onChange={handleChange} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-ring" placeholder="פירוט המשימה..." />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">תאריך יעד לביצוע</label>
              <input type="date" name="dueDate" value={formData.dueDate} onChange={handleChange} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">עדיפות / רמת דחיפות</label>
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
