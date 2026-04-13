"use client";

// src/components/leads/LeadWorkspace.tsx
// Slide-in panel for viewing & editing a full lead

import { useState } from "react";

// ── טיפוסים ──────────────────────────────────────────────────
export interface LeadInteraction {
  id: string;
  interactionType: string;
  description?: string;
  callStatus?: string;
  durationSec?: number;
  createdByName?: string;
  nextContactDate?: string;
  createdAt: string;
}

export interface LeadFull {
  id: string;
  name: string;
  phone: string;
  phone2?: string;
  email?: string;
  address?: string;
  city?: string;
  idNumber?: string;
  courseInterest?: string;
  courseId?: string;
  course?: { id: string; fullNameMoodle?: string; fullNameOverride?: string } | null;
  sourceType?: string;
  sourceName?: string;
  campaignName?: string;
  salesAgentId?: string;
  salesAgent?: { id: string; firstName: string; lastName: string } | null;
  leadResponse?: string;
  followUpCount: number;
  lastContactDate?: string;
  discountNotes?: string;
  inquiryDate: string;
  status: string;
  notes?: string;
  // Conversion checklist
  paymentCompleted: boolean;
  paymentCompletedAt?: string;
  paymentAmount?: number;
  paymentMethod?: string;
  paymentReference?: string;
  kinyanSigned: boolean;
  kinyanSignedAt?: string;
  kinyanMethod?: string;
  kinyanNotes?: string;
  shippingDetailsComplete: boolean;
  shippingAddress?: string;
  shippingCity?: string;
  shippingPhone?: string;
  shippingNotes?: string;
  studentChatAdded: boolean;
  studentChatAddedAt?: string;
  studentChatPlatform?: string;
  handoffToManager: boolean;
  handoffAt?: string;
  handoffNotes?: string;
  conversionChecklistComplete: boolean;
  conversionCompletedAt?: string;
  convertedAt?: string;
  studentId?: string;
  interactions: LeadInteraction[];
}

interface SalesAgent {
  id: string;
  firstName: string;
  lastName: string;
}

interface Props {
  lead: LeadFull;
  salesAgents: SalesAgent[];
  onClose: () => void;
  onUpdated: (lead: LeadFull) => void;
  onConverted: (leadId: string, studentId: string) => void;
}

const STATUS_OPTIONS = [
  { value: "new", label: "ליד חדש" },
  { value: "contacted", label: "נוצר קשר" },
  { value: "interested", label: "מתעניין" },
  { value: "pending_docs", label: "ממתין למסמכים" },
  { value: "registered", label: "נרשם ✓" },
  { value: "lost", label: "אבד" },
];

const INTERACTION_TYPES = [
  { value: "outbound_call", label: "שיחה יוצאת" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "אימייל" },
  { value: "note", label: "הערה פנימית" },
  { value: "website_form", label: "טופס אינטרנט" },
];

const CALL_STATUS_OPTIONS = [
  { value: "answered", label: "ענה" },
  { value: "no_answer", label: "לא ענה" },
  { value: "busy", label: "תפוס" },
  { value: "callback", label: "ביקש חזרה" },
];

function formatDate(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

function formatDateTime(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString("he-IL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

// ── ChecklistStep component ───────────────────────────────────
function ChecklistStep({
  step,
  done,
  label,
  doneAt,
  children,
}: {
  step: number;
  done: boolean;
  label: string;
  doneAt?: string | null;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`rounded-lg border p-4 ${done ? "border-green-200 bg-green-50" : "border-slate-200 bg-white"}`}>
      <button
        type="button"
        className="flex w-full items-center gap-3 text-right"
        onClick={() => setOpen((o) => !o)}
      >
        <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${done ? "bg-green-500 text-white" : "bg-slate-200 text-slate-600"}`}>
          {done ? "✓" : step}
        </div>
        <span className={`flex-1 font-medium ${done ? "text-green-800" : "text-slate-700"}`}>{label}</span>
        {doneAt && <span className="text-xs text-green-600">{formatDate(doneAt)}</span>}
        <span className="text-slate-400 text-xs">{open ? "▲" : "▼"}</span>
      </button>
      {open && <div className="mt-3 border-t border-slate-100 pt-3">{children}</div>}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────
export function LeadWorkspace({ lead: initial, salesAgents, onClose, onUpdated, onConverted }: Props) {
  const [lead, setLead] = useState<LeadFull>(initial);
  const [activeTab, setActiveTab] = useState<"details" | "checklist" | "history" | "notes">("details");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [converting, setConverting] = useState(false);

  // New interaction form
  const [intType, setIntType] = useState("outbound_call");
  const [intDesc, setIntDesc] = useState("");
  const [intCallStatus, setIntCallStatus] = useState("");
  const [intNextDate, setIntNextDate] = useState("");
  const [savingInt, setSavingInt] = useState(false);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const patch = async (fields: Partial<LeadFull>) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      if (!res.ok) throw new Error();
      const updated: LeadFull = await res.json();
      setLead(updated);
      onUpdated(updated);
      showToast("נשמר");
    } catch {
      showToast("שגיאה בשמירה", "error");
    } finally {
      setSaving(false);
    }
  };

  const addInteraction = async () => {
    if (!intDesc && intType === "note") {
      showToast("יש להוסיף תיאור להערה", "error");
      return;
    }
    setSavingInt(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}/interactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          interactionType: intType,
          description: intDesc || undefined,
          callStatus: intCallStatus || undefined,
          nextContactDate: intNextDate || undefined,
        }),
      });
      if (!res.ok) throw new Error();
      const newInt: LeadInteraction = await res.json();
      setLead((prev) => ({ ...prev, interactions: [newInt, ...prev.interactions] }));
      setIntDesc("");
      setIntCallStatus("");
      setIntNextDate("");
      showToast("אינטראקציה נוספה");
    } catch {
      showToast("שגיאה", "error");
    } finally {
      setSavingInt(false);
    }
  };

  const handleConvert = async () => {
    if (!confirm(`להמיר את ${lead.name} לתלמיד רשום?`)) return;
    setConverting(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.ok) {
        setLead((prev) => ({ ...prev, status: "registered", convertedAt: new Date().toISOString(), studentId: data.studentId }));
        onConverted(lead.id, data.studentId);
        showToast(data.message || "הומר בהצלחה!");
      } else {
        showToast(data.error || "שגיאה בהמרה", "error");
      }
    } catch {
      showToast("שגיאה בהמרה", "error");
    } finally {
      setConverting(false);
    }
  };

  const checklistProgress = [
    lead.paymentCompleted,
    lead.kinyanSigned,
    lead.shippingDetailsComplete,
    lead.studentChatAdded,
    lead.handoffToManager,
  ].filter(Boolean).length;

  const tabs = [
    { id: "details", label: "פרטים" },
    { id: "checklist", label: `הסבה (${checklistProgress}/5)` },
    { id: "history", label: `היסטוריה (${lead.interactions.length})` },
    { id: "notes", label: "הערות" },
  ] as const;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" dir="rtl">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Panel */}
      <div className="relative flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl overflow-hidden">

        {/* Toast */}
        {toast && (
          <div className={`absolute top-4 left-1/2 -translate-x-1/2 z-50 rounded-xl px-6 py-3 text-sm font-bold text-white shadow-lg ${toast.type === "success" ? "bg-green-500" : "bg-red-500"}`}>
            {toast.msg}
          </div>
        )}

        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800">{lead.name}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-slate-500">
              <a href={`tel:${lead.phone}`} className="text-indigo-600 font-medium" dir="ltr">{lead.phone}</a>
              {lead.phone2 && <a href={`tel:${lead.phone2}`} className="text-indigo-500" dir="ltr">{lead.phone2}</a>}
              {lead.email && <span>{lead.email}</span>}
              {lead.city && <span>📍 {lead.city}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!lead.convertedAt && (
              <button
                onClick={handleConvert}
                disabled={converting || lead.status === "lost"}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {converting ? "..." : "המר לתלמיד →"}
              </button>
            )}
            {lead.convertedAt && (
              <a href={`/students/${lead.studentId}`} className="rounded-lg bg-green-100 px-4 py-2 text-sm font-semibold text-green-800 hover:bg-green-200">
                ✓ עבור לתלמיד
              </a>
            )}
            <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 text-xl">✕</button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 bg-white">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === t.id ? "border-b-2 border-indigo-600 text-indigo-600" : "text-slate-500 hover:text-slate-700"}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* ── פרטים ── */}
          {activeTab === "details" && (
            <div className="space-y-6">

              {/* סטטוס + איש מכירות */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">סטטוס</label>
                  <select
                    value={lead.status}
                    onChange={(e) => patch({ status: e.target.value })}
                    disabled={saving || !!lead.convertedAt}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                  >
                    {STATUS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">איש מכירות</label>
                  <select
                    value={lead.salesAgentId || ""}
                    onChange={(e) => patch({ salesAgentId: e.target.value || undefined })}
                    disabled={saving}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                  >
                    <option value="">— ללא —</option>
                    {salesAgents.map((a) => (
                      <option key={a.id} value={a.id}>{a.firstName} {a.lastName}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* תגובת ליד */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">תגובת ליד</label>
                  <select
                    value={lead.leadResponse || ""}
                    onChange={(e) => patch({ leadResponse: e.target.value || undefined })}
                    disabled={saving}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                  >
                    <option value="">— לא צוין —</option>
                    <option value="interested">מעוניין</option>
                    <option value="needs_to_think">צריך לחשוב</option>
                    <option value="not_available">לא זמין</option>
                    <option value="not_interested">לא מעוניין</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">פניות: {lead.followUpCount}</label>
                  <p className="mt-1 text-sm text-slate-600">קשר אחרון: {formatDateTime(lead.lastContactDate)}</p>
                </div>
              </div>

              {/* קורס מעניין */}
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">קורס מעניין</label>
                <input
                  defaultValue={lead.courseInterest || ""}
                  onBlur={(e) => { if (e.target.value !== (lead.courseInterest || "")) patch({ courseInterest: e.target.value }); }}
                  disabled={saving}
                  placeholder="שם קורס"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </div>

              {/* מקור */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">סוג מקור</label>
                  <select
                    value={lead.sourceType || ""}
                    onChange={(e) => patch({ sourceType: e.target.value || undefined })}
                    disabled={saving}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                  >
                    <option value="">— לא צוין —</option>
                    <option value="website">אתר</option>
                    <option value="facebook">פייסבוק</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="phone">טלפון</option>
                    <option value="referral">המלצה</option>
                    <option value="other">אחר</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">קמפיין</label>
                  <input
                    defaultValue={lead.campaignName || ""}
                    onBlur={(e) => { if (e.target.value !== (lead.campaignName || "")) patch({ campaignName: e.target.value }); }}
                    disabled={saving}
                    placeholder="שם קמפיין"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              {/* תאריך פנייה */}
              <p className="text-xs text-slate-400">
                תאריך פנייה: {formatDate(lead.inquiryDate)} | עודכן לאחרונה ע&quot;י: {lead.salesAgent ? `${lead.salesAgent.firstName} ${lead.salesAgent.lastName}` : "—"}
              </p>
            </div>
          )}

          {/* ── רשימת תיוג הסבה ── */}
          {activeTab === "checklist" && (
            <div className="space-y-3">
              {/* Progress bar */}
              <div className="mb-4">
                <div className="mb-1 flex justify-between text-sm">
                  <span className="font-medium text-slate-700">התקדמות הסבה</span>
                  <span className={`font-bold ${checklistProgress === 5 ? "text-green-600" : "text-indigo-600"}`}>{checklistProgress}/5</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-100">
                  <div className={`h-2 rounded-full transition-all ${checklistProgress === 5 ? "bg-green-500" : "bg-indigo-500"}`} style={{ width: `${(checklistProgress / 5) * 100}%` }} />
                </div>
              </div>

              {/* שלב 1: תשלום */}
              <ChecklistStep step={1} done={lead.paymentCompleted} label="תשלום" doneAt={lead.paymentCompletedAt}>
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={lead.paymentCompleted}
                      onChange={(e) => patch({ paymentCompleted: e.target.checked, paymentCompletedAt: e.target.checked ? new Date().toISOString() : undefined })} />
                    תשלום בוצע
                  </label>
                  {lead.paymentCompleted && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-xs text-slate-500">שיטת תשלום</label>
                        <select value={lead.paymentMethod || ""} onChange={(e) => patch({ paymentMethod: e.target.value })}
                          className="w-full rounded border border-slate-200 px-2 py-1 text-sm">
                          <option value="">—</option>
                          <option value="credit">אשראי</option>
                          <option value="bank">העברה בנקאית</option>
                          <option value="cash">מזומן</option>
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-slate-500">סכום</label>
                        <input type="number" defaultValue={lead.paymentAmount || ""}
                          onBlur={(e) => patch({ paymentAmount: e.target.value ? parseFloat(e.target.value) : undefined })}
                          className="w-full rounded border border-slate-200 px-2 py-1 text-sm" placeholder="₪" />
                      </div>
                      <div className="col-span-2">
                        <label className="mb-1 block text-xs text-slate-500">אסמכתא</label>
                        <input type="text" defaultValue={lead.paymentReference || ""}
                          onBlur={(e) => patch({ paymentReference: e.target.value })}
                          className="w-full rounded border border-slate-200 px-2 py-1 text-sm" />
                      </div>
                    </div>
                  )}
                </div>
              </ChecklistStep>

              {/* שלב 2: קניין */}
              <ChecklistStep step={2} done={lead.kinyanSigned} label="קניין / תקנון" doneAt={lead.kinyanSignedAt}>
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={lead.kinyanSigned}
                      onChange={(e) => patch({ kinyanSigned: e.target.checked, kinyanSignedAt: e.target.checked ? new Date().toISOString() : undefined })} />
                    קניין/תקנון נחתמו
                  </label>
                  {lead.kinyanSigned && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-xs text-slate-500">שיטה</label>
                        <select value={lead.kinyanMethod || ""} onChange={(e) => patch({ kinyanMethod: e.target.value })}
                          className="w-full rounded border border-slate-200 px-2 py-1 text-sm">
                          <option value="">—</option>
                          <option value="phone">טלפון</option>
                          <option value="email">מייל</option>
                          <option value="digital">חתימה דיגיטלית</option>
                          <option value="sms">SMS</option>
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-slate-500">הערות</label>
                        <input type="text" defaultValue={lead.kinyanNotes || ""}
                          onBlur={(e) => patch({ kinyanNotes: e.target.value })}
                          className="w-full rounded border border-slate-200 px-2 py-1 text-sm" />
                      </div>
                    </div>
                  )}
                </div>
              </ChecklistStep>

              {/* שלב 3: משלוח */}
              <ChecklistStep step={3} done={lead.shippingDetailsComplete} label="פרטי משלוח" doneAt={undefined}>
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={lead.shippingDetailsComplete}
                      onChange={(e) => patch({ shippingDetailsComplete: e.target.checked })} />
                    פרטי משלוח מלאים
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs text-slate-500">כתובת</label>
                      <input type="text" defaultValue={lead.shippingAddress || ""}
                        onBlur={(e) => patch({ shippingAddress: e.target.value })}
                        className="w-full rounded border border-slate-200 px-2 py-1 text-sm" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-slate-500">עיר</label>
                      <input type="text" defaultValue={lead.shippingCity || ""}
                        onBlur={(e) => patch({ shippingCity: e.target.value })}
                        className="w-full rounded border border-slate-200 px-2 py-1 text-sm" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-slate-500">טלפון למשלוח</label>
                      <input type="text" defaultValue={lead.shippingPhone || ""}
                        onBlur={(e) => patch({ shippingPhone: e.target.value })}
                        className="w-full rounded border border-slate-200 px-2 py-1 text-sm" dir="ltr" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-slate-500">הערות</label>
                      <input type="text" defaultValue={lead.shippingNotes || ""}
                        onBlur={(e) => patch({ shippingNotes: e.target.value })}
                        className="w-full rounded border border-slate-200 px-2 py-1 text-sm" />
                    </div>
                  </div>
                </div>
              </ChecklistStep>

              {/* שלב 4: צ'אט תלמידים */}
              <ChecklistStep step={4} done={lead.studentChatAdded} label="צ'אט תלמידים" doneAt={lead.studentChatAddedAt}>
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={lead.studentChatAdded}
                      onChange={(e) => patch({ studentChatAdded: e.target.checked, studentChatAddedAt: e.target.checked ? new Date().toISOString() : undefined })} />
                    נוסף לקבוצת צ&apos;אט תלמידים
                  </label>
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">פלטפורמה</label>
                    <select value={lead.studentChatPlatform || ""} onChange={(e) => patch({ studentChatPlatform: e.target.value })}
                      className="w-full rounded border border-slate-200 px-2 py-1 text-sm">
                      <option value="">—</option>
                      <option value="whatsapp">WhatsApp</option>
                      <option value="telegram">Telegram</option>
                    </select>
                  </div>
                </div>
              </ChecklistStep>

              {/* שלב 5: מסירה למנהל */}
              <ChecklistStep step={5} done={lead.handoffToManager} label="מסירה למנהל כיתות" doneAt={lead.handoffAt}>
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={lead.handoffToManager}
                      onChange={(e) => patch({ handoffToManager: e.target.checked, handoffAt: e.target.checked ? new Date().toISOString() : undefined })} />
                    הועבר למנהל כיתות
                  </label>
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">הערות למנהל</label>
                    <textarea defaultValue={lead.handoffNotes || ""}
                      onBlur={(e) => patch({ handoffNotes: e.target.value })}
                      rows={2}
                      className="w-full rounded border border-slate-200 px-2 py-1 text-sm" />
                  </div>
                </div>
              </ChecklistStep>

              {checklistProgress === 5 && !lead.conversionChecklistComplete && (
                <button onClick={() => patch({ conversionChecklistComplete: true, conversionCompletedAt: new Date().toISOString() })}
                  className="w-full rounded-lg bg-green-600 py-3 font-bold text-white hover:bg-green-700">
                  ✓ סמן הסבה כהושלמה
                </button>
              )}
              {lead.conversionChecklistComplete && (
                <div className="rounded-lg bg-green-50 p-4 text-center text-sm font-bold text-green-700">
                  ✅ הסבה הושלמה בהצלחה — {formatDate(lead.conversionCompletedAt)}
                </div>
              )}
            </div>
          )}

          {/* ── היסטוריית אינטראקציות ── */}
          {activeTab === "history" && (
            <div className="space-y-4">
              {/* טופס הוספה */}
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
                <p className="text-sm font-semibold text-slate-700">הוסף פעולה</p>
                <div className="grid grid-cols-2 gap-3">
                  <select value={intType} onChange={(e) => setIntType(e.target.value)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                    {INTERACTION_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                  {(intType === "outbound_call") && (
                    <select value={intCallStatus} onChange={(e) => setIntCallStatus(e.target.value)}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                      <option value="">— תוצאת שיחה —</option>
                      {CALL_STATUS_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  )}
                </div>
                <input type="text" value={intDesc} onChange={(e) => setIntDesc(e.target.value)}
                  placeholder="תיאור / הערה..."
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="mb-1 block text-xs text-slate-500">תאריך מעקב הבא</label>
                    <input type="date" value={intNextDate} onChange={(e) => setIntNextDate(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                  </div>
                  <button onClick={addInteraction} disabled={savingInt}
                    className="self-end rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
                    {savingInt ? "..." : "+ הוסף"}
                  </button>
                </div>
              </div>

              {/* רשימת אינטראקציות */}
              {lead.interactions.length === 0 ? (
                <p className="text-center py-8 text-sm text-slate-400">אין היסטוריה עדיין</p>
              ) : (
                <div className="space-y-2">
                  {lead.interactions.map((int) => {
                    const typeLabel = INTERACTION_TYPES.find((t) => t.value === int.interactionType)?.label || int.interactionType;
                    const callLabel = CALL_STATUS_OPTIONS.find((o) => o.value === int.callStatus)?.label;
                    return (
                      <div key={int.id} className="flex gap-3 rounded-lg border border-slate-100 bg-white p-3">
                        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm">
                          {int.interactionType === "outbound_call" ? "📞" :
                            int.interactionType === "whatsapp" ? "💬" :
                            int.interactionType === "email" ? "✉️" : "📝"}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-700">{typeLabel}</span>
                            {callLabel && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{callLabel}</span>}
                            <span className="mr-auto text-xs text-slate-400">{formatDateTime(int.createdAt)}</span>
                          </div>
                          {int.description && <p className="mt-1 text-sm text-slate-600">{int.description}</p>}
                          {int.nextContactDate && (
                            <p className="mt-1 text-xs text-orange-600">⏰ מעקב: {formatDate(int.nextContactDate)}</p>
                          )}
                          {int.createdByName && <p className="mt-1 text-xs text-slate-400">{int.createdByName}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── הערות ── */}
          {activeTab === "notes" && (
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">הערות כלליות</label>
                <textarea
                  key={lead.id + "-notes"}
                  defaultValue={lead.notes || ""}
                  onBlur={(e) => { if (e.target.value !== (lead.notes || "")) patch({ notes: e.target.value }); }}
                  rows={6}
                  placeholder="הוסף הערות..."
                  className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
              {lead.discountNotes !== undefined && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">הערות הנחה</label>
                  <textarea
                    key={lead.id + "-discount"}
                    defaultValue={lead.discountNotes || ""}
                    onBlur={(e) => { if (e.target.value !== (lead.discountNotes || "")) patch({ discountNotes: e.target.value }); }}
                    rows={3}
                    placeholder="הנחות / תנאים מיוחדים..."
                    className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
              )}
              {saving && <p className="text-xs text-slate-400">שומר...</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
