"use client";

// src/app/(dashboard)/webhook-logs/page.tsx
// Combined page: Webhook Logs + Webhook Queue monitor

import { useState, useEffect, useCallback } from "react";

// ── Types ────────────────────────────────────────────────────
interface WebhookLogItem {
  id: string;
  webhookType: string;
  sourceIp?: string;
  success: boolean;
  action?: string;
  errorMessage?: string;
  entityType?: string;
  entityId?: string;
  processingTimeMs?: number;
  createdAt: string;
  queueItem?: { id: string; status: string; retryCount: number } | null;
}

interface WebhookQueueItem {
  id: string;
  webhookType: string;
  status: string;
  retryCount: number;
  maxRetries: number;
  errorMessage?: string;
  lastError?: string;
  sourceIp?: string;
  lastRetryAt?: string;
  nextRetryAt?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
  webhookLogId?: string;
}

interface Stats {
  totalWebhooks: number;
  successful: number;
  failed: number;
  byType: Record<string, number>;
  avgProcessingTimeMs?: number;
}

interface QueueStats {
  pending: number;
  failed: number;
  processing: number;
  byType: Record<string, number>;
}

// ── Helpers ──────────────────────────────────────────────────
function fmtDate(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString("he-IL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function StatusBadge({ success, action }: { success: boolean; action?: string | null }) {
  if (success) {
    const label = action === "duplicate" ? "כפול" : action === "created" ? "נוצר" : "הצלחה";
    return <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">{label}</span>;
  }
  return <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">כשלון</span>;
}

function QueueStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700",
    processing: "bg-blue-100 text-blue-700",
    success: "bg-green-100 text-green-700",
    failed: "bg-red-100 text-red-700",
    archived: "bg-slate-100 text-slate-500",
  };
  const labels: Record<string, string> = {
    pending: "ממתין", processing: "בטיפול", success: "הצליח", failed: "נכשל", archived: "ארכיון",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${map[status] ?? "bg-slate-100 text-slate-600"}`}>
      {labels[status] ?? status}
    </span>
  );
}

// ── Main Component ────────────────────────────────────────────
export default function WebhookLogsPage() {
  const [tab, setTab] = useState<"logs" | "queue">("logs");

  // Logs state
  const [logs, setLogs] = useState<WebhookLogItem[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [logsLoading, setLogsLoading] = useState(true);
  const [hoursFilter, setHoursFilter] = useState("24");
  const [typeFilter, setTypeFilter] = useState("");
  const [successFilter, setSuccessFilter] = useState("");
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [logDetail, setLogDetail] = useState<Record<string, unknown> | null>(null);

  // Queue state
  const [queue, setQueue] = useState<WebhookQueueItem[]>([]);
  const [queueStats, setQueueStats] = useState<QueueStats | null>(null);
  const [queueLoading, setQueueLoading] = useState(false);
  const [queueStatusFilter, setQueueStatusFilter] = useState("");
  const [retrying, setRetrying] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4000);
  };

  // Load logs
  const loadLogs = useCallback(async () => {
    setLogsLoading(true);
    const qs = new URLSearchParams();
    qs.set("hours", hoursFilter);
    if (typeFilter) qs.set("webhookType", typeFilter);
    if (successFilter) qs.set("success", successFilter);

    const [logsRes, statsRes] = await Promise.all([
      fetch(`/api/webhook-logs?${qs}`),
      fetch(`/api/webhook-logs?stats&hours=${hoursFilter}`),
    ]);

    if (logsRes.ok) setLogs(await logsRes.json());
    if (statsRes.ok) setStats(await statsRes.json());
    setLogsLoading(false);
  }, [hoursFilter, typeFilter, successFilter]);

  // Load queue
  const loadQueue = useCallback(async () => {
    setQueueLoading(true);
    const qs = new URLSearchParams();
    if (queueStatusFilter) qs.set("status", queueStatusFilter);

    const [queueRes, qStatsRes] = await Promise.all([
      fetch(`/api/webhook-queue?${qs}&limit=100`),
      fetch(`/api/webhook-queue?stats`),
    ]);

    if (queueRes.ok) {
      const data = await queueRes.json();
      setQueue(data.items ?? []);
    }
    if (qStatsRes.ok) setQueueStats(await qStatsRes.json());
    setQueueLoading(false);
  }, [queueStatusFilter]);

  useEffect(() => { loadLogs(); }, [loadLogs]);
  useEffect(() => { if (tab === "queue") loadQueue(); }, [tab, loadQueue]);

  const loadLogDetail = async (id: string) => {
    if (expandedLog === id) { setExpandedLog(null); setLogDetail(null); return; }
    setExpandedLog(id);
    const res = await fetch(`/api/webhook-logs/${id}`);
    if (res.ok) setLogDetail(await res.json());
  };

  const retryItem = async (id: string) => {
    setRetrying(id);
    const res = await fetch(`/api/webhook-queue/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "retry" }),
    });
    const data = await res.json();
    showToast(data.message ?? (res.ok ? "ניסיון חוזר הצלח" : "שגיאה"), res.ok && data.success);
    setRetrying(null);
    loadQueue();
  };

  const archiveItem = async (id: string) => {
    await fetch(`/api/webhook-queue/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "archive" }),
    });
    showToast("הועבר לארכיון");
    loadQueue();
  };

  const deleteItem = async (id: string) => {
    if (!confirm("למחוק לצמיתות?")) return;
    await fetch(`/api/webhook-queue/${id}`, { method: "DELETE" });
    showToast("נמחק");
    loadQueue();
  };

  return (
    <div className="space-y-6" dir="rtl">
      {toast && (
        <div className={`fixed top-4 left-1/2 z-50 -translate-x-1/2 rounded-xl px-6 py-3 text-sm font-bold text-white shadow-lg ${toast.ok ? "bg-green-500" : "bg-red-500"}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">מוניטורינג ובהוקים</h1>
          <p className="text-sm text-slate-500">לוגים, תור ניסיונות חוזרים ומעקב כשלונות</p>
        </div>
        <button onClick={() => { loadLogs(); if (tab === "queue") loadQueue(); }}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
          ↻ רענן
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">סה"כ {hoursFilter}ש'</p>
          <p className="mt-1 text-3xl font-bold text-slate-800">{stats?.totalWebhooks ?? "—"}</p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">הצליחו</p>
          <p className="mt-1 text-3xl font-bold text-green-600">{stats?.successful ?? "—"}</p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">נכשלו</p>
          <p className="mt-1 text-3xl font-bold text-red-500">{stats?.failed ?? "—"}</p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">בתור (ממתין)</p>
          <p className="mt-1 text-3xl font-bold text-orange-500">{queueStats?.pending ?? "—"}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-slate-100 p-1 w-fit">
        <button onClick={() => setTab("logs")}
          className={`rounded-lg px-5 py-2 text-sm font-medium transition-colors ${tab === "logs" ? "bg-white shadow text-slate-800" : "text-slate-500 hover:text-slate-700"}`}>
          לוגים ({stats?.totalWebhooks ?? 0})
        </button>
        <button onClick={() => setTab("queue")}
          className={`rounded-lg px-5 py-2 text-sm font-medium transition-colors ${tab === "queue" ? "bg-white shadow text-slate-800" : "text-slate-500 hover:text-slate-700"}`}>
          תור ניסיונות ({(queueStats?.pending ?? 0) + (queueStats?.failed ?? 0)})
        </button>
      </div>

      {/* ── LOGS TAB ── */}
      {tab === "logs" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <select value={hoursFilter} onChange={(e) => setHoursFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
              <option value="1">שעה אחרונה</option>
              <option value="6">6 שעות</option>
              <option value="24">24 שעות</option>
              <option value="72">3 ימים</option>
              <option value="168">שבוע</option>
              <option value="720">30 יום</option>
            </select>
            <select value={successFilter} onChange={(e) => setSuccessFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
              <option value="">הכל</option>
              <option value="true">הצלחות בלבד</option>
              <option value="false">כשלונות בלבד</option>
            </select>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
              <option value="">כל הסוגים</option>
              <option value="lead">lead</option>
              <option value="elementor">elementor</option>
              <option value="nedarim">nedarim</option>
              <option value="generic">generic</option>
            </select>
          </div>

          {/* Logs table */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            {logsLoading ? (
              <div className="py-16 text-center text-sm text-slate-400">טוען לוגים...</div>
            ) : logs.length === 0 ? (
              <div className="py-16 text-center text-sm text-slate-400">אין לוגים בטווח הנבחר</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="border-b border-slate-100 bg-slate-50 text-xs text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-right font-medium">זמן</th>
                    <th className="px-4 py-3 text-right font-medium">סוג</th>
                    <th className="px-4 py-3 text-right font-medium">סטטוס</th>
                    <th className="px-4 py-3 text-right font-medium">פעולה</th>
                    <th className="px-4 py-3 text-right font-medium">ישות</th>
                    <th className="px-4 py-3 text-right font-medium">עיבוד</th>
                    <th className="px-4 py-3 text-right font-medium">תור</th>
                    <th className="w-8 px-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {logs.map((log) => (
                    <>
                      <tr key={log.id} className={`hover:bg-slate-50 cursor-pointer ${!log.success ? "bg-red-50/30" : ""}`}
                        onClick={() => loadLogDetail(log.id)}>
                        <td className="px-4 py-3 text-slate-600 tabular-nums" dir="ltr">{fmtDate(log.createdAt)}</td>
                        <td className="px-4 py-3 font-mono text-xs text-indigo-600">{log.webhookType}</td>
                        <td className="px-4 py-3"><StatusBadge success={log.success} action={log.action} /></td>
                        <td className="px-4 py-3 text-slate-500">{log.action ?? "—"}</td>
                        <td className="px-4 py-3 text-slate-500 text-xs">{log.entityType ? `${log.entityType} #${log.entityId?.slice(0, 8)}` : "—"}</td>
                        <td className="px-4 py-3 text-slate-400 tabular-nums">{log.processingTimeMs != null ? `${log.processingTimeMs}ms` : "—"}</td>
                        <td className="px-4 py-3">
                          {log.queueItem ? (
                            <span className={`text-xs ${log.queueItem.status === "failed" ? "text-red-500" : "text-yellow-600"}`}>
                              {log.queueItem.status} ({log.queueItem.retryCount})
                            </span>
                          ) : "—"}
                        </td>
                        <td className="px-2 py-3 text-slate-400">{expandedLog === log.id ? "▲" : "▼"}</td>
                      </tr>
                      {expandedLog === log.id && logDetail && (
                        <tr key={`${log.id}-detail`}>
                          <td colSpan={8} className="bg-slate-50 px-6 py-4">
                            {log.errorMessage && (
                              <div className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                                <strong>שגיאה:</strong> {log.errorMessage}
                              </div>
                            )}
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="mb-1 text-xs font-semibold text-slate-500">Payload שנשלח</p>
                                <pre className="max-h-48 overflow-auto rounded bg-slate-800 p-3 text-xs text-green-300" dir="ltr">
                                  {JSON.stringify(
                                    typeof (logDetail as { rawPayload?: unknown }).rawPayload === "string"
                                      ? JSON.parse((logDetail as { rawPayload: string }).rawPayload)
                                      : (logDetail as { rawPayload?: unknown }).rawPayload,
                                    null, 2)}
                                </pre>
                              </div>
                              <div>
                                <p className="mb-1 text-xs font-semibold text-slate-500">תוצאה</p>
                                <pre className="max-h-48 overflow-auto rounded bg-slate-800 p-3 text-xs text-blue-300" dir="ltr">
                                  {JSON.stringify(
                                    typeof (logDetail as { resultData?: unknown }).resultData === "string"
                                      ? JSON.parse((logDetail as { resultData: string }).resultData || "null")
                                      : (logDetail as { resultData?: unknown }).resultData,
                                    null, 2)}
                                </pre>
                              </div>
                            </div>
                            <p className="mt-2 text-xs text-slate-400 text-left" dir="ltr">IP: {log.sourceIp ?? "—"} | ID: {log.id}</p>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── QUEUE TAB ── */}
      {tab === "queue" && (
        <div className="space-y-4">
          {/* Queue stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-xl border border-yellow-100 bg-yellow-50 p-4">
              <p className="text-xs text-yellow-700">ממתינים</p>
              <p className="text-2xl font-bold text-yellow-800">{queueStats?.pending ?? 0}</p>
            </div>
            <div className="rounded-xl border border-red-100 bg-red-50 p-4">
              <p className="text-xs text-red-700">נכשלו (מקסימום ניסיונות)</p>
              <p className="text-2xl font-bold text-red-800">{queueStats?.failed ?? 0}</p>
            </div>
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
              <p className="text-xs text-blue-700">בטיפול</p>
              <p className="text-2xl font-bold text-blue-800">{queueStats?.processing ?? 0}</p>
            </div>
          </div>

          {/* Filter */}
          <select value={queueStatusFilter} onChange={(e) => setQueueStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
            <option value="">כל הסטטוסים</option>
            <option value="pending">ממתין</option>
            <option value="failed">נכשל</option>
            <option value="processing">בטיפול</option>
            <option value="success">הצליח</option>
            <option value="archived">ארכיון</option>
          </select>

          {/* Queue table */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            {queueLoading ? (
              <div className="py-16 text-center text-sm text-slate-400">טוען תור...</div>
            ) : queue.length === 0 ? (
              <div className="py-16 text-center text-sm text-slate-400">
                {queueStatusFilter ? `אין פריטים עם סטטוס "${queueStatusFilter}"` : "התור ריק 🎉"}
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="border-b border-slate-100 bg-slate-50 text-xs text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-right font-medium">זמן</th>
                    <th className="px-4 py-3 text-right font-medium">סוג</th>
                    <th className="px-4 py-3 text-right font-medium">סטטוס</th>
                    <th className="px-4 py-3 text-right font-medium">ניסיונות</th>
                    <th className="px-4 py-3 text-right font-medium">שגיאה</th>
                    <th className="px-4 py-3 text-right font-medium">ניסיון הבא</th>
                    <th className="px-4 py-3 text-right font-medium">פעולות</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {queue.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-600 tabular-nums" dir="ltr">{fmtDate(item.createdAt)}</td>
                      <td className="px-4 py-3 font-mono text-xs text-indigo-600">{item.webhookType}</td>
                      <td className="px-4 py-3"><QueueStatusBadge status={item.status} /></td>
                      <td className="px-4 py-3 text-slate-600 tabular-nums">{item.retryCount}/{item.maxRetries}</td>
                      <td className="max-w-xs truncate px-4 py-3 text-xs text-red-600">{item.lastError ?? item.errorMessage ?? "—"}</td>
                      <td className="px-4 py-3 text-xs text-slate-500" dir="ltr">{fmtDate(item.nextRetryAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          {(item.status === "pending" || item.status === "failed") && (
                            <button
                              onClick={() => retryItem(item.id)}
                              disabled={retrying === item.id}
                              className="rounded bg-indigo-100 px-3 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-200 disabled:opacity-50"
                            >
                              {retrying === item.id ? "..." : "נסה שוב"}
                            </button>
                          )}
                          {item.status !== "archived" && item.status !== "success" && (
                            <button onClick={() => archiveItem(item.id)}
                              className="rounded bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200">
                              ארכיון
                            </button>
                          )}
                          <button onClick={() => deleteItem(item.id)}
                            className="rounded bg-red-50 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-100">
                            מחק
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
