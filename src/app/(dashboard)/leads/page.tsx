"use client";

// src/app/leads/page.tsx
// לשונית לידים — ממשק ניהול מתעניינים

import { useEffect, useState, useCallback } from "react";

// ── טיפוסים ──────────────────────────────────────────────────
type LeadStatus =
  | "new"
  | "contacted"
  | "interested"
  | "pending_docs"
  | "registered"
  | "lost";

interface Lead {
  id: string;
  name: string;
  phone: string;
  email?: string;
  courseInterest?: string;
  inquiryDate: string;
  status: LeadStatus;
  notes?: string;
  convertedAt?: string;
  studentId?: string;
}

// ── קבועים ───────────────────────────────────────────────────
const STATUS_LABELS: Record<LeadStatus, string> = {
  new: "ליד חדש",
  contacted: "נוצר קשר",
  interested: "מתעניין",
  pending_docs: "ממתין למסמכים",
  registered: "נרשם ✓",
  lost: "אבד",
};

const STATUS_COLORS: Record<LeadStatus, string> = {
  new: "#6366f1",
  contacted: "#f59e0b",
  interested: "#10b981",
  pending_docs: "#3b82f6",
  registered: "#22c55e",
  lost: "#ef4444",
};

const STATUS_BG: Record<LeadStatus, string> = {
  new: "#eef2ff",
  contacted: "#fffbeb",
  interested: "#ecfdf5",
  pending_docs: "#eff6ff",
  registered: "#f0fdf4",
  lost: "#fef2f2",
};

// ── קומפוננט ראשי ────────────────────────────────────────────
export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [courses, setCourses] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesText, setNotesText] = useState("");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  // פילטרים
  const [status, setStatus] = useState("all");
  const [course, setCourse] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        status,
        course,
        search,
        page: String(page),
      });
      const res = await fetch(`/api/leads?${params}`);
      const data = await res.json();
      setLeads(data.leads || []);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
      setCourses(data.courses || []);
    } catch {
      showToast("שגיאה בטעינת לידים", "error");
    } finally {
      setLoading(false);
    }
  }, [status, course, search, page]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // ── פעולות ───────────────────────────────────────────────
  const updateStatus = async (id: string, newStatus: LeadStatus) => {
    await fetch("/api/leads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: newStatus }),
    });
    setLeads((prev) =>
      prev.map((l) => (l.id === id ? { ...l, status: newStatus } : l))
    );
  };

  const saveNotes = async (id: string) => {
    await fetch("/api/leads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, notes: notesText }),
    });
    setLeads((prev) =>
      prev.map((l) => (l.id === id ? { ...l, notes: notesText } : l))
    );
    setEditingNotes(null);
    showToast("הערה נשמרה");
  };

  const convertLead = async (lead: Lead) => {
    if (!confirm(`להמיר את ${lead.name} לתלמיד רשום?`)) return;
    setConverting(lead.id);
    try {
      const res = await fetch(`/api/leads/${lead.id}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.ok) {
        setLeads((prev) =>
          prev.map((l) =>
            l.id === lead.id
              ? { ...l, status: "registered", convertedAt: new Date().toISOString() }
              : l
          )
        );
        showToast(data.message || "הומר בהצלחה!");
      } else {
        showToast(data.error || "שגיאה בהמרה", "error");
      }
    } catch {
      showToast("שגיאה בהמרה", "error");
    } finally {
      setConverting(null);
    }
  };

  // ── render ────────────────────────────────────────────────
  return (
    <div dir="rtl" style={styles.page}>
      {/* Toast */}
      {toast && (
        <div style={{ ...styles.toast, background: toast.type === "success" ? "#22c55e" : "#ef4444" }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>מתעניינים</h1>
          <p style={styles.subtitle}>{total.toLocaleString()} לידים סה״כ</p>
        </div>
        <button style={styles.syncBtn} onClick={fetchLeads}>
          🔄 רענן
        </button>
      </div>

      {/* פילטרים */}
      <div style={styles.filters}>
        <input
          style={styles.input}
          placeholder="🔍 חיפוש שם, טלפון, אימייל..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />

        <select
          style={styles.select}
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
        >
          <option value="all">כל הסטטוסים</option>
          {Object.entries(STATUS_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>

        <select
          style={styles.select}
          value={course}
          onChange={(e) => { setCourse(e.target.value); setPage(1); }}
        >
          <option value="all">כל הקורסים</option>
          {courses.map((c) => (
            <option key={c} value={c!}>{c}</option>
          ))}
        </select>
      </div>

      {/* ספירת סטטוסים מהירה */}
      <div style={styles.statusStrip}>
        {Object.entries(STATUS_LABELS).map(([v, l]) => {
          const count = leads.filter((x) => x.status === v).length;
          return (
            <button
              key={v}
              onClick={() => setStatus(v === status ? "all" : v)}
              style={{
                ...styles.statusChip,
                background: status === v ? STATUS_COLORS[v as LeadStatus] : STATUS_BG[v as LeadStatus],
                color: status === v ? "#fff" : STATUS_COLORS[v as LeadStatus],
                border: `1px solid ${STATUS_COLORS[v as LeadStatus]}`,
              }}
            >
              {l} ({count})
            </button>
          );
        })}
      </div>

      {/* טבלה */}
      {loading ? (
        <div style={styles.loading}>טוען...</div>
      ) : leads.length === 0 ? (
        <div style={styles.empty}>אין לידים תואמים</div>
      ) : (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.thead}>
                <th style={styles.th}>שם</th>
                <th style={styles.th}>טלפון</th>
                <th style={styles.th}>קורס</th>
                <th style={styles.th}>תאריך</th>
                <th style={styles.th}>סטטוס</th>
                <th style={styles.th}>הערות</th>
                <th style={styles.th}>פעולה</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr
                  key={lead.id}
                  style={{
                    ...styles.tr,
                    opacity: lead.status === "lost" ? 0.5 : 1,
                    background: lead.convertedAt ? "#f0fdf4" : "white",
                  }}
                >
                  <td style={styles.td}>
                    <strong>{lead.name}</strong>
                  </td>
                  <td style={styles.td}>
                    <a href={`tel:${lead.phone}`} style={styles.phone}>
                      {lead.phone}
                    </a>
                  </td>
                  <td style={styles.td}>
                    <span style={styles.coursePill}>
                      {lead.courseInterest || "—"}
                    </span>
                  </td>
                  <td style={styles.td}>
                    {new Date(lead.inquiryDate).toLocaleDateString("he-IL")}
                  </td>
                  <td style={styles.td}>
                    <select
                      style={{
                        ...styles.statusSelect,
                        background: STATUS_BG[lead.status],
                        color: STATUS_COLORS[lead.status],
                        border: `1px solid ${STATUS_COLORS[lead.status]}`,
                      }}
                      value={lead.status}
                      onChange={(e) => updateStatus(lead.id, e.target.value as LeadStatus)}
                      disabled={!!lead.convertedAt}
                    >
                      {Object.entries(STATUS_LABELS).map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                  </td>
                  <td style={styles.td}>
                    {editingNotes === lead.id ? (
                      <div style={{ display: "flex", gap: 4 }}>
                        <input
                          style={{ ...styles.input, fontSize: 12, padding: "4px 8px" }}
                          value={notesText}
                          onChange={(e) => setNotesText(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && saveNotes(lead.id)}
                          autoFocus
                        />
                        <button style={styles.saveBtnSmall} onClick={() => saveNotes(lead.id)}>✓</button>
                        <button style={styles.cancelBtnSmall} onClick={() => setEditingNotes(null)}>✕</button>
                      </div>
                    ) : (
                      <span
                        style={styles.notesCell}
                        onClick={() => {
                          setEditingNotes(lead.id);
                          setNotesText(lead.notes || "");
                        }}
                        title="לחץ לעריכה"
                      >
                        {lead.notes || <span style={{ color: "#ccc" }}>+ הוסף</span>}
                      </span>
                    )}
                  </td>
                  <td style={styles.td}>
                    {lead.convertedAt ? (
                      <span style={styles.convertedBadge}>✓ תלמיד</span>
                    ) : (
                      <button
                        style={styles.convertBtn}
                        onClick={() => convertLead(lead)}
                        disabled={converting === lead.id || lead.status === "lost"}
                      >
                        {converting === lead.id ? "..." : "המר לתלמיד →"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* עימוד */}
      {pages > 1 && (
        <div style={styles.pagination}>
          {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              style={{ ...styles.pageBtn, ...(p === page ? styles.pageBtnActive : {}) }}
              onClick={() => setPage(p)}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── סטיילים ──────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  page: {
    fontFamily: "'Heebo', sans-serif",
    padding: "24px",
    background: "#f8fafc",
    minHeight: "100vh",
    position: "relative",
  },
  toast: {
    position: "fixed",
    top: 24,
    left: "50%",
    transform: "translateX(-50%)",
    color: "white",
    padding: "12px 28px",
    borderRadius: 10,
    fontWeight: 600,
    zIndex: 9999,
    boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  title: { fontSize: 28, fontWeight: 800, margin: 0, color: "#1e293b" },
  subtitle: { color: "#64748b", margin: "4px 0 0", fontSize: 14 },
  syncBtn: {
    padding: "8px 18px",
    borderRadius: 8,
    border: "1px solid #e2e8f0",
    background: "white",
    cursor: "pointer",
    fontSize: 14,
    fontFamily: "inherit",
  },
  filters: {
    display: "flex",
    gap: 12,
    marginBottom: 16,
    flexWrap: "wrap",
  },
  input: {
    flex: 1,
    minWidth: 200,
    padding: "10px 14px",
    borderRadius: 8,
    border: "1px solid #e2e8f0",
    fontSize: 14,
    fontFamily: "'Heebo', sans-serif",
    outline: "none",
    background: "white",
  },
  select: {
    padding: "10px 14px",
    borderRadius: 8,
    border: "1px solid #e2e8f0",
    fontSize: 14,
    fontFamily: "'Heebo', sans-serif",
    background: "white",
    cursor: "pointer",
  },
  statusStrip: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    marginBottom: 20,
  },
  statusChip: {
    padding: "5px 12px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "'Heebo', sans-serif",
    transition: "all 0.15s",
  },
  tableWrap: {
    background: "white",
    borderRadius: 12,
    boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
    overflow: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 14,
  },
  thead: {
    background: "#f1f5f9",
  },
  th: {
    padding: "12px 16px",
    textAlign: "right",
    fontWeight: 700,
    color: "#475569",
    fontSize: 13,
    borderBottom: "1px solid #e2e8f0",
    whiteSpace: "nowrap",
  },
  tr: {
    borderBottom: "1px solid #f1f5f9",
    transition: "background 0.1s",
  },
  td: {
    padding: "12px 16px",
    verticalAlign: "middle",
  },
  phone: {
    color: "#6366f1",
    textDecoration: "none",
    fontWeight: 500,
    direction: "ltr",
    display: "inline-block",
  },
  coursePill: {
    background: "#f0f9ff",
    color: "#0284c7",
    padding: "3px 8px",
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 500,
    whiteSpace: "nowrap",
  },
  statusSelect: {
    padding: "5px 10px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "'Heebo', sans-serif",
  },
  notesCell: {
    cursor: "pointer",
    color: "#475569",
    fontSize: 13,
    maxWidth: 160,
    overflow: "hidden",
    textOverflow: "ellipsis",
    display: "block",
    whiteSpace: "nowrap",
  },
  saveBtnSmall: {
    background: "#22c55e",
    color: "white",
    border: "none",
    borderRadius: 6,
    padding: "4px 8px",
    cursor: "pointer",
    fontSize: 13,
  },
  cancelBtnSmall: {
    background: "#e2e8f0",
    color: "#64748b",
    border: "none",
    borderRadius: 6,
    padding: "4px 8px",
    cursor: "pointer",
    fontSize: 13,
  },
  convertBtn: {
    background: "#6366f1",
    color: "white",
    border: "none",
    borderRadius: 8,
    padding: "7px 14px",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
    fontFamily: "'Heebo', sans-serif",
    whiteSpace: "nowrap",
    transition: "opacity 0.15s",
  },
  convertedBadge: {
    background: "#dcfce7",
    color: "#16a34a",
    padding: "5px 12px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 700,
  },
  loading: {
    textAlign: "center",
    padding: 60,
    color: "#94a3b8",
    fontSize: 16,
  },
  empty: {
    textAlign: "center",
    padding: 60,
    color: "#94a3b8",
    fontSize: 16,
  },
  pagination: {
    display: "flex",
    gap: 8,
    justifyContent: "center",
    marginTop: 24,
  },
  pageBtn: {
    padding: "8px 14px",
    borderRadius: 8,
    border: "1px solid #e2e8f0",
    background: "white",
    cursor: "pointer",
    fontSize: 14,
    fontFamily: "'Heebo', sans-serif",
  },
  pageBtnActive: {
    background: "#6366f1",
    color: "white",
    border: "1px solid #6366f1",
    fontWeight: 700,
  },
};