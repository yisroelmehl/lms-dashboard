"use client";

import { useState, useEffect } from "react";
import { HebrewDateDisplay } from "@/components/ui/hebrew-date-display";

interface ContactLog {
  id: string;
  summary: string;
  nextContactDate: string | null;
  createdAt: string;
  admin: { id: string; name: string };
}

interface Props {
  enrollment: {
    id: string;
    student: {
      hebrewName: string | null;
      firstNameOverride: string | null;
      lastNameOverride: string | null;
    };
    course: {
      fullNameMoodle: string | null;
      fullNameOverride: string | null;
    };
  };
  onClose: () => void;
  onSaved: () => void;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("he-IL", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function SelfStudyContactModal({ enrollment, onClose, onSaved }: Props) {
  const [logs, setLogs] = useState<ContactLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState("");
  const [nextContactDate, setNextContactDate] = useState("");

  const studentName =
    enrollment.student.hebrewName ||
    [enrollment.student.firstNameOverride, enrollment.student.lastNameOverride].filter(Boolean).join(" ") ||
    "תלמיד";

  useEffect(() => {
    setLoading(true);
    fetch(`/api/students/self-study/${enrollment.id}/contact`)
      .then((r) => r.json())
      .then((data) => setLogs(data.logs || []))
      .finally(() => setLoading(false));
  }, [enrollment.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const res = await fetch(`/api/students/self-study/${enrollment.id}/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summary, nextContactDate: nextContactDate || null }),
      });

      const data = await res.json();
      if (res.ok) {
        // Add to local logs list
        setLogs([data.contactLog, ...logs]);
        setSummary("");
        setNextContactDate("");
        onSaved();
        if (data.taskId) {
          setError(""); // Clear any errors
        }
      } else {
        setError(data.error || "אירעה שגיאה");
      }
    } catch {
      setError("שגיאת תקשורת");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-lg bg-card p-6 shadow-lg border border-border max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">
            יומן תקשורת - {studentName}
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          קורס: {enrollment.course.fullNameOverride || enrollment.course.fullNameMoodle}
        </p>

        {/* Add new contact log form */}
        <form onSubmit={handleSubmit} className="mb-6 rounded-md border border-border p-4 bg-muted/30">
          <h3 className="text-sm font-semibold mb-3">רשום שיחה חדשה</h3>

          {error && (
            <div className="mb-3 rounded bg-red-50 p-2 text-sm text-red-600">{error}</div>
          )}

          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium">תקציר השיחה *</label>
              <textarea
                required
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="מה נאמר בשיחה..."
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">מתי ליצור קשר בפעם הבאה?</label>
              <input
                type="date"
                value={nextContactDate}
                onChange={(e) => setNextContactDate(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <HebrewDateDisplay dateValue={nextContactDate} />
              <p className="text-xs text-muted-foreground mt-1">
                אם תמלא תאריך, תיווצר משימה אוטומטית לתזכורת
              </p>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? "שומר..." : "שמור שיחה"}
            </button>
          </div>
        </form>

        {/* Previous contact logs */}
        <h3 className="text-sm font-semibold mb-3">היסטוריית שיחות</h3>
        {loading ? (
          <p className="text-sm text-muted-foreground">טוען...</p>
        ) : logs.length === 0 ? (
          <p className="text-sm text-muted-foreground">אין שיחות קודמות</p>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <div key={log.id} className="rounded-md border border-border p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">
                    {log.admin.name} • {formatDate(log.createdAt)}
                  </span>
                  {log.nextContactDate && (
                    <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                      יצירת קשר הבאה: {new Date(log.nextContactDate).toLocaleDateString("he-IL")}
                    </span>
                  )}
                </div>
                <p className="text-sm whitespace-pre-wrap">{log.summary}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
