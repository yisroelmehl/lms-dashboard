"use client";

// src/app/(dashboard)/sales-agents/page.tsx
// Full sales agents management: list, stats, create, edit, deactivate

import { useState, useEffect, useCallback } from "react";

// ── Types ────────────────────────────────────────────────────
interface AgentStats {
  totalLeads: number;
  openLeads: number;
  convertedLeads: number;
  conversionRate: number;
  leadsLast30Days?: number;
  interactionsLast30Days?: number;
  totalPaymentLinks: number;
  successfulPayments: number;
  statusDistribution?: { status: string; count: number }[];
}

interface Agent {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  isActive: boolean;
  refCode?: string;
  notes?: string;
  notificationWebhookUrl?: string;
  notifyOnNewLead: boolean;
  createdAt: string;
  updatedAt: string;
  stats: AgentStats;
  recentLeads?: { id: string; name: string; phone: string; status: string; courseInterest?: string; updatedAt: string }[];
}

const STATUS_LABELS: Record<string, string> = {
  new: "ליד חדש",
  contacted: "נוצר קשר",
  interested: "מתעניין",
  pending_docs: "ממתין למסמכים",
  registered: "נרשם",
  lost: "אבד",
};

function fmtDate(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

// ── Agent Form ────────────────────────────────────────────────
interface AgentFormProps {
  initial?: Partial<Agent>;
  onSave: (agent: Agent) => void;
  onCancel: () => void;
}

function AgentForm({ initial, onSave, onCancel }: AgentFormProps) {
  const isEdit = !!initial?.id;
  const [form, setForm] = useState({
    firstName: initial?.firstName ?? "",
    lastName: initial?.lastName ?? "",
    email: initial?.email ?? "",
    phone: initial?.phone ?? "",
    refCode: initial?.refCode ?? "",
    notes: initial?.notes ?? "",
    notificationWebhookUrl: initial?.notificationWebhookUrl ?? "",
    notifyOnNewLead: initial?.notifyOnNewLead !== false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (key: string, val: string | boolean) => setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(
        isEdit ? `/api/sales-agents/${initial!.id}` : "/api/sales-agents",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...form,
            email: form.email || null,
            phone: form.phone || null,
            refCode: form.refCode || null,
            notes: form.notes || null,
            notificationWebhookUrl: form.notificationWebhookUrl || null,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "שגיאה"); return; }
      onSave(data);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" dir="rtl">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">שם פרטי *</label>
          <input required value={form.firstName} onChange={(e) => set("firstName", e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">שם משפחה *</label>
          <input required value={form.lastName} onChange={(e) => set("lastName", e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">מייל</label>
          <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" dir="ltr" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">טלפון</label>
          <input type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" dir="ltr" />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">קוד הפניה (ref code)</label>
        <input value={form.refCode} onChange={(e) => set("refCode", e.target.value)}
          placeholder="למשל: MOSHE2024"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" dir="ltr" />
        <p className="mt-1 text-xs text-slate-400">ייחודי — ישמש לשיוך לידים אוטומטי מטפסים</p>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">URL להתראות על ליד חדש</label>
        <input type="url" value={form.notificationWebhookUrl} onChange={(e) => set("notificationWebhookUrl", e.target.value)}
          placeholder="https://..."
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" dir="ltr" />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={form.notifyOnNewLead} onChange={(e) => set("notifyOnNewLead", e.target.checked)} />
        <span className="text-slate-700">שלח התראה על ליד חדש</span>
      </label>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">הערות פנימיות</label>
        <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={3}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm resize-none" />
      </div>
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="flex gap-3">
        <button type="submit" disabled={saving}
          className="rounded-lg bg-indigo-600 px-6 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
          {saving ? "שומר..." : isEdit ? "שמור שינויים" : "צור איש מכירות"}
        </button>
        <button type="button" onClick={onCancel}
          className="rounded-lg border border-slate-200 px-5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
          ביטול
        </button>
      </div>
    </form>
  );
}

// ── Agent Detail Panel ────────────────────────────────────────
function AgentPanel({
  agent,
  onClose,
  onUpdated,
  onDeactivated,
}: {
  agent: Agent;
  onClose: () => void;
  onUpdated: (a: Agent) => void;
  onDeactivated: (id: string) => void;
}) {
  const [editMode, setEditMode] = useState(false);
  const [detail, setDetail] = useState<Agent>(agent);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const loadDetail = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/sales-agents/${agent.id}`);
    if (res.ok) setDetail(await res.json());
    setLoading(false);
  }, [agent.id]);

  useEffect(() => { loadDetail(); }, [loadDetail]);

  const deactivate = async () => {
    if (!confirm(`להשבית את ${agent.firstName} ${agent.lastName}?`)) return;
    const res = await fetch(`/api/sales-agents/${agent.id}`, { method: "DELETE" });
    if (res.ok) {
      onDeactivated(agent.id);
      onClose();
    } else {
      showToast("שגיאה בהשבתה", false);
    }
  };

  const reactivate = async () => {
    const res = await fetch(`/api/sales-agents/${agent.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: true }),
    });
    if (res.ok) {
      showToast("הופעל מחדש");
      loadDetail();
      onUpdated({ ...detail, isActive: true });
    }
  };

  const statusDist = detail.stats.statusDistribution ?? [];

  return (
    <div className="fixed inset-0 z-50 flex justify-end" dir="rtl">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-xl flex-col bg-white shadow-2xl">
        {toast && (
          <div className={`absolute top-4 left-1/2 -translate-x-1/2 z-50 rounded-xl px-5 py-3 text-sm font-bold text-white shadow-lg ${toast.ok ? "bg-green-500" : "bg-red-500"}`}>
            {toast.msg}
          </div>
        )}
        {/* Header */}
        <div className="flex items-start justify-between border-b bg-slate-50 px-6 py-4">
          <div>
            <h2 className="text-xl font-bold">
              {detail.firstName} {detail.lastName}
              {!detail.isActive && <span className="mr-2 text-sm text-red-500 font-normal">(לא פעיל)</span>}
            </h2>
            <div className="mt-1 flex gap-3 text-sm text-slate-500">
              {detail.email && <a href={`mailto:${detail.email}`} className="text-indigo-600">{detail.email}</a>}
              {detail.phone && <a href={`tel:${detail.phone}`} dir="ltr">{detail.phone}</a>}
              {detail.refCode && <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded">{detail.refCode}</span>}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setEditMode((e) => !e)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100">
              {editMode ? "בטל עריכה" : "ערוך"}
            </button>
            <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 text-xl">✕</button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {editMode ? (
            <AgentForm
              initial={detail}
              onSave={(updated) => {
                setDetail((prev) => ({ ...prev, ...updated }));
                onUpdated({ ...detail, ...updated });
                setEditMode(false);
                showToast("נשמר בהצלחה");
              }}
              onCancel={() => setEditMode(false)}
            />
          ) : (
            <>
              {/* Stats grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-indigo-50 p-3 text-center">
                  <p className="text-xs text-indigo-600">סה"כ לידים</p>
                  <p className="text-2xl font-bold text-indigo-800">{detail.stats.totalLeads}</p>
                </div>
                <div className="rounded-xl bg-green-50 p-3 text-center">
                  <p className="text-xs text-green-600">הומרו</p>
                  <p className="text-2xl font-bold text-green-800">{detail.stats.convertedLeads}</p>
                </div>
                <div className="rounded-xl bg-orange-50 p-3 text-center">
                  <p className="text-xs text-orange-600">שיעור המרה</p>
                  <p className="text-2xl font-bold text-orange-800">{detail.stats.conversionRate}%</p>
                </div>
                <div className="rounded-xl bg-blue-50 p-3 text-center">
                  <p className="text-xs text-blue-600">פתוחים</p>
                  <p className="text-2xl font-bold text-blue-800">{detail.stats.openLeads}</p>
                </div>
                <div className="rounded-xl bg-purple-50 p-3 text-center">
                  <p className="text-xs text-purple-600">30 יום</p>
                  <p className="text-2xl font-bold text-purple-800">{detail.stats.leadsLast30Days ?? "—"}</p>
                </div>
                <div className="rounded-xl bg-teal-50 p-3 text-center">
                  <p className="text-xs text-teal-600">קישורי תשלום</p>
                  <p className="text-2xl font-bold text-teal-800">{detail.stats.totalPaymentLinks}</p>
                </div>
              </div>

              {/* Status distribution */}
              {statusDist.length > 0 && (
                <div>
                  <p className="mb-2 text-sm font-semibold text-slate-700">התפלגות סטטוסים</p>
                  <div className="space-y-2">
                    {statusDist.map((s) => {
                      const pct = detail.stats.totalLeads > 0 ? Math.round((s.count / detail.stats.totalLeads) * 100) : 0;
                      return (
                        <div key={s.status} className="flex items-center gap-3">
                          <span className="w-28 text-xs text-slate-600">{STATUS_LABELS[s.status] ?? s.status}</span>
                          <div className="flex-1 rounded-full bg-slate-100 h-2">
                            <div className="h-2 rounded-full bg-indigo-400 transition-all" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="w-8 text-right text-xs font-medium text-slate-600">{s.count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Recent leads */}
              {(detail.recentLeads?.length ?? 0) > 0 && (
                <div>
                  <p className="mb-2 text-sm font-semibold text-slate-700">לידים אחרונים</p>
                  <div className="space-y-1">
                    {detail.recentLeads!.map((l) => (
                      <a key={l.id} href={`/leads?id=${l.id}`}
                        className="flex items-center justify-between rounded-lg border border-slate-100 bg-white px-3 py-2 hover:bg-slate-50">
                        <div>
                          <span className="text-sm font-medium text-slate-700">{l.name}</span>
                          {l.courseInterest && <span className="mr-2 text-xs text-slate-400">{l.courseInterest}</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-400">{fmtDate(l.updatedAt)}</span>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                            {STATUS_LABELS[l.status] ?? l.status}
                          </span>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {detail.notes && (
                <div className="rounded-lg bg-slate-50 p-4">
                  <p className="text-xs font-semibold text-slate-500 mb-1">הערות</p>
                  <p className="text-sm text-slate-700">{detail.notes}</p>
                </div>
              )}

              {/* Notification webhook */}
              {detail.notificationWebhookUrl && (
                <div className="rounded-lg border border-slate-100 bg-white p-4">
                  <p className="text-xs font-semibold text-slate-500 mb-1">התראות</p>
                  <p className="font-mono text-xs text-slate-600 break-all" dir="ltr">{detail.notificationWebhookUrl}</p>
                  <p className="mt-1 text-xs text-slate-400">{detail.notifyOnNewLead ? "✓ שולח התראה על ליד חדש" : "✗ התראות כבויות"}</p>
                </div>
              )}

              {/* Actions */}
              <div className="border-t border-slate-100 pt-4">
                {detail.isActive ? (
                  <button onClick={deactivate}
                    className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50">
                    השבת איש מכירות
                  </button>
                ) : (
                  <button onClick={reactivate}
                    className="rounded-lg border border-green-200 px-4 py-2 text-sm font-medium text-green-600 hover:bg-green-50">
                    הפעל מחדש
                  </button>
                )}
              </div>
            </>
          )}
          {loading && <div className="text-center text-xs text-slate-400">טוען...</div>}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function SalesAgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [search, setSearch] = useState("");

  const loadAgents = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/sales-agents");
    if (res.ok) setAgents(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { loadAgents(); }, [loadAgents]);

  const filtered = agents.filter((a) => {
    if (!showInactive && !a.isActive) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        a.firstName.toLowerCase().includes(q) ||
        a.lastName.toLowerCase().includes(q) ||
        a.email?.toLowerCase().includes(q) ||
        a.phone?.includes(q) ||
        a.refCode?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const activeCount = agents.filter((a) => a.isActive).length;
  const totalLeads = agents.reduce((s, a) => s + a.stats.totalLeads, 0);
  const totalConverted = agents.reduce((s, a) => s + a.stats.convertedLeads, 0);
  const avgConversion = activeCount > 0
    ? Math.round(agents.filter((a) => a.isActive).reduce((s, a) => s + a.stats.conversionRate, 0) / activeCount)
    : 0;

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">אנשי מכירות</h1>
          <p className="text-sm text-slate-500">ניהול, סטטיסטיקות ושיוך לידים</p>
        </div>
        <button onClick={() => { setShowForm(true); setSelectedAgent(null); }}
          className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
          + איש מכירות חדש
        </button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm text-center">
          <p className="text-xs text-slate-500">פעילים</p>
          <p className="text-3xl font-bold text-indigo-600">{activeCount}</p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm text-center">
          <p className="text-xs text-slate-500">סה"כ לידים</p>
          <p className="text-3xl font-bold text-slate-700">{totalLeads}</p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm text-center">
          <p className="text-xs text-slate-500">הומרו</p>
          <p className="text-3xl font-bold text-green-600">{totalConverted}</p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm text-center">
          <p className="text-xs text-slate-500">המרה ממוצעת</p>
          <p className="text-3xl font-bold text-orange-500">{avgConversion}%</p>
        </div>
      </div>

      {/* Search + filter */}
      <div className="flex flex-wrap items-center gap-3">
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="חיפוש לפי שם / מייל / קוד..."
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm w-64" />
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
          הצג לא פעילים
        </label>
      </div>

      {/* Agents grid */}
      {loading ? (
        <div className="py-20 text-center text-slate-400">טוען נתונים...</div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center text-slate-400">
          {search ? "לא נמצאו תוצאות" : "אין אנשי מכירות עדיין"}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((agent) => (
            <button
              key={agent.id}
              onClick={() => setSelectedAgent(agent)}
              className={`rounded-xl border p-5 text-right shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5
                ${agent.isActive ? "border-slate-200 bg-white" : "border-slate-100 bg-slate-50 opacity-60"}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-bold text-slate-800">{agent.firstName} {agent.lastName}</p>
                  {agent.email && <p className="text-xs text-slate-400 mt-0.5">{agent.email}</p>}
                  {agent.phone && <p className="text-xs text-slate-400" dir="ltr">{agent.phone}</p>}
                </div>
                <div className="flex flex-col items-end gap-1">
                  {!agent.isActive && <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-600">לא פעיל</span>}
                  {agent.refCode && <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-500">{agent.refCode}</span>}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 border-t border-slate-100 pt-3">
                <div className="text-center">
                  <p className="text-xs text-slate-400">לידים</p>
                  <p className="font-bold text-slate-700">{agent.stats.totalLeads}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-slate-400">פתוחים</p>
                  <p className="font-bold text-blue-600">{agent.stats.openLeads}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-slate-400">המרה</p>
                  <p className={`font-bold ${agent.stats.conversionRate >= 20 ? "text-green-600" : agent.stats.conversionRate > 0 ? "text-orange-500" : "text-slate-400"}`}>
                    {agent.stats.conversionRate}%
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Create form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" dir="rtl">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="mb-4 text-lg font-bold">איש מכירות חדש</h2>
            <AgentForm
              onSave={(agent) => {
                setAgents((prev) => [agent, ...prev]);
                setShowForm(false);
              }}
              onCancel={() => setShowForm(false)}
            />
          </div>
        </div>
      )}

      {/* Detail panel */}
      {selectedAgent && (
        <AgentPanel
          agent={selectedAgent}
          onClose={() => setSelectedAgent(null)}
          onUpdated={(updated) => {
            setAgents((prev) => prev.map((a) => (a.id === updated.id ? { ...a, ...updated } : a)));
            setSelectedAgent(updated);
          }}
          onDeactivated={(id) => {
            setAgents((prev) => prev.map((a) => (a.id === id ? { ...a, isActive: false } : a)));
          }}
        />
      )}
    </div>
  );
}
