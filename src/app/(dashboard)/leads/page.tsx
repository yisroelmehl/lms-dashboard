"use client";

// src/app/(dashboard)/leads/page.tsx
// ׳שם•׳ ׳™׳× ׳׳™׳“׳™׳ ג€” ׳׳שם§ ׳ ׳™׳”׳•׳ ׳׳×׳¢׳ ׳™׳™׳ ׳™׳ ׳¢׳ LeadWorkspace panel

import { useEffect, useState, useCallback } from "react";
import { LeadWorkspace } from "@/components/leads/LeadWorkspace";
import type { LeadFull } from "@/components/leads/LeadWorkspace";

// ג”€ג”€ ׳˜׳™׳₪׳•׳¡׳™׳ ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€
type LeadStatus = "new" | "contacted" | "interested" | "pending_docs" | "registered" | "lost";

interface LeadRow {
  id: string;
  name: string;
  phone: string;
  phone2?: string;
  email?: string;
  courseInterest?: string;
  city?: string;
  salesAgentId?: string;
  salesAgent?: { id: string; firstName: string; lastName: string } | null;
  inquiryDate: string;
  status: LeadStatus;
  notes?: string;
  lastContactDate?: string;
  followUpCount: number;
  convertedAt?: string;
  studentId?: string;
}

interface SalesAgent { id: string; firstName: string; lastName: string; }

// ג”€ג”€ ׳§׳‘׳•׳¢׳™׳ ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€
const STATUS_LABELS: Record<LeadStatus, string> = {
  new: "ליד חדש",
  contacted: "נוצר קשר",
  interested: "מתעניין",
  pending_docs: "ממתין למסמכים",
  registered: "נרשם ✓",
  lost: "אבד",
};

const STATUS_BADGE: Record<LeadStatus, string> = {
  new: "bg-indigo-100 text-indigo-700",
  contacted: "bg-amber-100 text-amber-700",
  interested: "bg-emerald-100 text-emerald-700",
  pending_docs: "bg-blue-100 text-blue-700",
  registered: "bg-green-100 text-green-700",
  lost: "bg-red-100 text-red-600",
};

function fmtDate(d?: string | null) {
  if (!d) return "ג€”";
  return new Date(d).toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

// ג”€ג”€ Add Lead Modal ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€
function AddLeadModal({
  salesAgents,
  onCreated,
  onClose,
}: {
  salesAgents: SalesAgent[];
  onCreated: (lead: LeadRow) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    name: "", phone: "", phone2: "", email: "",
    courseInterest: "", city: "", sourceType: "",
    salesAgentId: "", notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone) { setError("שם ׳•׳˜׳׳₪׳•׳ ׳”׳ שם“׳•׳× ׳—׳•׳‘׳”"); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          phone2: form.phone2 || undefined,
          email: form.email || undefined,
          courseInterest: form.courseInterest || undefined,
          city: form.city || undefined,
          sourceType: form.sourceType || undefined,
          salesAgentId: form.salesAgentId || undefined,
          notes: form.notes || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "שם’׳™׳׳”"); return; }
      onCreated(data);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" dir="rtl">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="mb-4 text-lg font-bold text-slate-800">+ ׳׳™׳“ ׳—׳“׳©</h2>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">שם ׳׳׳ *</label>
              <input required value={form.name} onChange={(e) => set("name", e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">׳˜׳׳₪׳•׳ *</label>
              <input required type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" dir="ltr" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">׳˜׳׳₪׳•׳ 2</label>
              <input type="tel" value={form.phone2} onChange={(e) => set("phone2", e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" dir="ltr" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">׳׳™׳™׳</label>
              <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" dir="ltr" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">קורס ׳׳¢׳ ׳™׳™׳</label>
              <input value={form.courseInterest} onChange={(e) => set("courseInterest", e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">׳¢׳™׳¨</label>
              <input value={form.city} onChange={(e) => set("city", e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">׳׳§׳•׳¨</label>
              <select value={form.sourceType} onChange={(e) => set("sourceType", e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                <option value="">ג€” ׳׳ ׳¦׳•׳™׳ ג€”</option>
                <option value="website">׳׳×׳¨</option>
                <option value="facebook">׳₪׳™׳™׳¡׳‘׳•׳§</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="phone">׳˜׳׳₪׳•׳</option>
                <option value="referral">׳”׳׳׳¦׳”</option>
                <option value="other">׳׳—׳¨</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">׳׳™׳© ׳׳›׳™׳¨׳•׳×</label>
              <select value={form.salesAgentId} onChange={(e) => set("salesAgentId", e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                <option value="">ג€” ׳׳׳ ג€”</option>
                {salesAgents.map((a) => (
                  <option key={a.id} value={a.id}>{a.firstName} {a.lastName}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">׳”׳¢׳¨׳•׳×</label>
            <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm resize-none" />
          </div>
          {error && <p className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>}
          <div className="flex gap-3">
            <button type="submit" disabled={saving}
              className="rounded-lg bg-indigo-600 px-6 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
              {saving ? "שם•׳׳¨..." : "׳”׳•׳¡׳£ ׳׳™׳“"}
            </button>
            <button type="button" onClick={onClose}
              className="rounded-lg border border-slate-200 px-5 py-2 text-sm text-slate-600 hover:bg-slate-50">
              ׳‘׳™׳˜׳•׳
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ג”€ג”€ Main Page ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€
export default function LeadsPage() {
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [salesAgents, setSalesAgents] = useState<SalesAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState("all");
  const [agentFilter, setAgentFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // UI
  const [showAdd, setShowAdd] = useState(false);
  const [workspace, setWorkspace] = useState<LeadFull | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (agentFilter !== "all") params.set("salesAgentId", agentFilter);
      if (search) params.set("search", search);

      const res = await fetch(`/api/leads?${params}`);
      const data = await res.json();
      setLeads(data.leads ?? []);
      setTotal(data.total ?? 0);
      setPages(data.pages ?? 1);
      setSalesAgents(data.salesAgents ?? []);
    } catch {
      showToast("שם’׳™׳׳” ׳‘׳˜׳¢׳™׳ ׳× ׳׳™׳“׳™׳", false);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, agentFilter, search, page]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const openWorkspace = async (id: string) => {
    const res = await fetch(`/api/leads/${id}`);
    if (res.ok) setWorkspace(await res.json());
  };

  const statusCounts = Object.fromEntries(
    Object.keys(STATUS_LABELS).map((s) => [
      s,
      leads.filter((l) => l.status === s).length,
    ])
  ) as Record<LeadStatus, number>;

  return (
    <div className="space-y-5" dir="rtl">
      {toast && (
        <div className={`fixed top-4 left-1/2 z-50 -translate-x-1/2 rounded-xl px-6 py-3 text-sm font-bold text-white shadow-xl ${toast.ok ? "bg-green-500" : "bg-red-500"}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">מתעניינים</h1>
          <p className="text-sm text-slate-500">{total.toLocaleString()} ׳׳™׳“׳™׳ ׳¡׳”׳´׳›</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchLeads}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
            ג†» ׳¨׳¢׳ ׳
          </button>
          <button onClick={() => setShowAdd(true)}
            className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
            + ׳׳™׳“ ׳—׳“׳©
          </button>
        </div>
      </div>

      {/* Status chips */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => { setStatusFilter("all"); setPage(1); }}
          className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${statusFilter === "all" ? "bg-slate-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
        >
          ׳”׳›׳ ({total})
        </button>
        {(Object.entries(STATUS_LABELS) as [LeadStatus, string][]).map(([v, l]) => (
          <button
            key={v}
            onClick={() => { setStatusFilter(v); setPage(1); }}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${statusFilter === v ? "ring-2 ring-indigo-400 " + STATUS_BADGE[v] : STATUS_BADGE[v] + " opacity-70 hover:opacity-100"}`}
          >
            {l} ({statusCounts[v] ?? 0})
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="נ” שם, ׳˜׳׳₪׳•׳, ׳׳™׳™׳..."
          className="w-64 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm"
        />
        <select value={agentFilter} onChange={(e) => { setAgentFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
          <option value="all">׳›׳ ׳׳ שם™ ׳”׳׳›׳™׳¨׳•׳×</option>
          {salesAgents.map((a) => (
            <option key={a.id} value={a.id}>{a.firstName} {a.lastName}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="py-20 text-center text-slate-400">טוען...</div>
        ) : leads.length === 0 ? (
          <div className="py-20 text-center text-slate-400">
            {search || statusFilter !== "all" ? "׳׳ ׳ ׳׳¦׳׳• ׳׳™׳“׳™׳ ׳×׳•׳׳׳™׳" : "׳׳™׳ ׳׳™׳“׳™׳ ׳¢׳“׳™׳™׳"}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-4 py-3 text-right font-medium">שם</th>
                <th className="px-4 py-3 text-right font-medium">׳˜׳׳₪׳•׳</th>
                <th className="px-4 py-3 text-right font-medium">קורס</th>
                <th className="px-4 py-3 text-right font-medium">׳׳™׳© ׳׳›׳™׳¨׳•׳×</th>
                <th className="px-4 py-3 text-right font-medium">׳×׳׳¨׳™׳</th>
                <th className="px-4 py-3 text-right font-medium">׳§שם¨ ׳׳—׳¨׳•׳</th>
                <th className="px-4 py-3 text-right font-medium">׳₪׳ ׳™׳•׳×</th>
                <th className="px-4 py-3 text-right font-medium">סטטוס</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {leads.map((lead) => (
                <tr
                  key={lead.id}
                  onClick={() => openWorkspace(lead.id)}
                  className={`cursor-pointer hover:bg-indigo-50/40 transition-colors ${lead.status === "lost" ? "opacity-50" : ""} ${lead.convertedAt ? "bg-green-50/30" : ""}`}
                >
                  <td className="px-4 py-3 font-medium text-slate-800">{lead.name}</td>
                  <td className="px-4 py-3">
                    <a href={`tel:${lead.phone}`} onClick={(e) => e.stopPropagation()}
                      className="font-medium text-indigo-600 hover:underline" dir="ltr">{lead.phone}</a>
                  </td>
                  <td className="px-4 py-3">
                    {lead.courseInterest ? (
                      <span className="rounded-md bg-sky-50 px-2 py-0.5 text-xs text-sky-700">{lead.courseInterest}</span>
                    ) : <span className="text-slate-300">ג€”</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {lead.salesAgent ? `${lead.salesAgent.firstName} ${lead.salesAgent.lastName}` : <span className="text-slate-300">ג€”</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 tabular-nums">{fmtDate(lead.inquiryDate)}</td>
                  <td className="px-4 py-3 text-xs text-slate-500 tabular-nums">{fmtDate(lead.lastContactDate)}</td>
                  <td className="px-4 py-3 text-center text-xs text-slate-500">{lead.followUpCount || "ג€”"}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_BADGE[lead.status]}`}>
                      {STATUS_LABELS[lead.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {lead.convertedAt ? "ג“" : "ג€÷"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex justify-center gap-1">
          {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`h-8 w-8 rounded-lg text-sm font-medium transition-colors ${p === page ? "bg-indigo-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Add Lead Modal */}
      {showAdd && (
        <AddLeadModal
          salesAgents={salesAgents}
          onCreated={(lead) => {
            setLeads((prev) => [lead as unknown as LeadRow, ...prev]);
            setTotal((t) => t + 1);
            setShowAdd(false);
            showToast("׳׳™׳“ ׳ ׳•׳¡׳£ ׳‘׳”׳¦׳׳—׳”");
          }}
          onClose={() => setShowAdd(false)}
        />
      )}

      {/* Lead Workspace */}
      {workspace && (
        <LeadWorkspace
          lead={workspace}
          salesAgents={salesAgents}
          onClose={() => setWorkspace(null)}
          onUpdated={(updated) => {
            setLeads((prev) =>
              prev.map((l) =>
                l.id === updated.id
                  ? { ...l, status: updated.status as LeadStatus, notes: updated.notes, salesAgentId: updated.salesAgentId, salesAgent: updated.salesAgent, lastContactDate: updated.lastContactDate, followUpCount: updated.followUpCount }
                  : l
              )
            );
            setWorkspace(updated);
          }}
          onConverted={(leadId, studentId) => {
            setLeads((prev) =>
              prev.map((l) =>
                l.id === leadId ? { ...l, status: "registered" as LeadStatus, convertedAt: new Date().toISOString(), studentId } : l
              )
            );
            setWorkspace(null);
            showToast("׳”׳•׳׳¨ ׳׳×׳׳׳™׳“ ׳‘׳”׳¦׳׳—׳” נ‰");
          }}
        />
      )}
    </div>
  );
}
