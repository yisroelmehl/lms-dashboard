"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Result {
  zoomLinked: number;
  recordingLinked: number;
  newLessonsCreated: number;
  unmatched: Array<{ name: string; cmid: number; modname: string; reason: string }>;
}

export function CourseSyncMediaButton({ courseId }: { courseId: string }) {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");

  const sync = async () => {
    setSyncing(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch(`/api/courses/${courseId}/sync-media`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "שגיאה");
        return;
      }
      setResult(data);
      router.refresh();
    } catch {
      setError("שגיאת תקשורת");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h3 className="font-semibold text-sm">סנכרון Zoom + הקלטות מ-Moodle</h3>
          <p className="text-xs text-muted-foreground mt-1">
            סורק את כל הפעילויות במודל. מעדכן אוטומטית: <strong>Zoom</strong> (mod_zoom),
            <strong> URL/הקלטה</strong> (mod_url, mod_resource, mod_page).
          </p>
        </div>
        <button
          onClick={sync}
          disabled={syncing}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap"
        >
          {syncing ? "מסנכרן..." : "🔄 סנכרן עכשיו"}
        </button>
      </div>

      {error && (
        <div className="mt-3 text-sm text-red-600 bg-red-50 p-3 rounded">{error}</div>
      )}

      {result && (
        <div className="mt-3 text-sm bg-green-50 border border-green-200 p-3 rounded space-y-1">
          <p>✅ Zoom מקושרים: <strong>{result.zoomLinked}</strong></p>
          <p>✅ הקלטות מקושרות: <strong>{result.recordingLinked}</strong></p>
          {result.newLessonsCreated > 0 && (
            <p>➕ שיעורים חדשים שנוצרו: <strong>{result.newLessonsCreated}</strong></p>
          )}
          {result.unmatched.length > 0 && (
            <details className="mt-2">
              <summary className="text-xs text-yellow-700 cursor-pointer">
                ⚠️ {result.unmatched.length} פעילויות לא נמצאו עם URL — לחץ לפרטים
              </summary>
              <ul className="text-xs mt-2 space-y-1">
                {result.unmatched.map(u => (
                  <li key={u.cmid} className="text-gray-600">
                    {u.name} ({u.modname}) — {u.reason}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
