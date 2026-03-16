"use client";

import { useState } from "react";

export default function SettingsPage() {
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);

  async function handleTestConnection() {
    setTestResult("בודק חיבור...");
    try {
      const res = await fetch("/api/sync/trigger?type=courses", {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        setTestResult(
          `חיבור תקין! ${data.recordsProcessed} קורסים נמצאו.`
        );
      } else {
        setTestResult(`שגיאה: ${data.error}`);
      }
    } catch {
      setTestResult("שגיאה בחיבור למודל");
    }
  }

  async function handleFullSync() {
    setSyncing(true);
    setSyncResult("מסנכרן...");
    try {
      const res = await fetch("/api/sync/trigger?type=full", {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        setSyncResult(
          `סנכרון הושלם! עובדו: ${data.recordsProcessed}, נוצרו: ${data.recordsCreated}, עודכנו: ${data.recordsUpdated}`
        );
      } else {
        setSyncResult(`שגיאה: ${data.error}`);
      }
    } catch {
      setSyncResult("שגיאה בסנכרון");
    }
    setSyncing(false);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">הגדרות</h1>

      {/* Moodle Connection */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">חיבור למודל</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          בדוק את החיבור למערכת המודל ובצע סנכרון ידני.
        </p>

        <div className="flex gap-3">
          <button
            onClick={handleTestConnection}
            className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted"
          >
            בדוק חיבור
          </button>
          <button
            onClick={handleFullSync}
            disabled={syncing}
            className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {syncing ? "מסנכרן..." : "סנכרון מלא"}
          </button>
        </div>

        {testResult && (
          <p className="mt-3 text-sm text-muted-foreground">{testResult}</p>
        )}
        {syncResult && (
          <p className="mt-3 text-sm text-muted-foreground">{syncResult}</p>
        )}
      </div>

      {/* Sync History */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">היסטוריית סנכרונים</h2>
        <SyncHistory />
      </div>

      {/* Admin Info */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">פרטי מערכת</h2>
        <div className="space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">כתובת מודל: </span>
            <span dir="ltr">{process.env.NEXT_PUBLIC_MOODLE_URL || "לא מוגדר"}</span>
          </p>
        </div>
      </div>
    </div>
  );
}

function SyncHistory() {
  const [logs, setLogs] = useState<
    Array<{
      id: string;
      syncType: string;
      status: string;
      startedAt: string;
      recordsProcessed: number;
      recordsCreated: number;
      recordsUpdated: number;
    }>
  >([]);
  const [loaded, setLoaded] = useState(false);

  async function loadLogs() {
    const res = await fetch("/api/sync/status");
    const data = await res.json();
    setLogs(data.history || []);
    setLoaded(true);
  }

  if (!loaded) {
    return (
      <button
        onClick={loadLogs}
        className="text-sm text-primary hover:underline"
      >
        טען היסטוריה
      </button>
    );
  }

  if (logs.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">אין היסטוריית סנכרונים</p>
    );
  }

  return (
    <table className="w-full">
      <thead>
        <tr className="border-b border-border">
          <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">
            סוג
          </th>
          <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">
            סטטוס
          </th>
          <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">
            תאריך
          </th>
          <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">
            רשומות
          </th>
        </tr>
      </thead>
      <tbody>
        {logs.map((log) => (
          <tr key={log.id} className="border-b border-border last:border-0">
            <td className="px-3 py-2 text-sm">{log.syncType}</td>
            <td className="px-3 py-2">
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
                  log.status === "completed"
                    ? "bg-green-100 text-green-700"
                    : log.status === "failed"
                    ? "bg-red-100 text-red-700"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                {log.status}
              </span>
            </td>
            <td className="px-3 py-2 text-sm text-muted-foreground">
              {new Date(log.startedAt).toLocaleString("he-IL")}
            </td>
            <td className="px-3 py-2 text-sm">
              {log.recordsProcessed} עובדו, {log.recordsCreated} נוצרו,{" "}
              {log.recordsUpdated} עודכנו
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
