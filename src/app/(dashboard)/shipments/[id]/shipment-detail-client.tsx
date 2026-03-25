"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { COUNTRIES, getStatesForCountry, validatePostalCode } from "@/lib/shipping/countries";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: "ממתין", color: "bg-yellow-100 text-yellow-800" },
  created: { label: "נוצר", color: "bg-blue-100 text-blue-800" },
  in_transit: { label: "בדרך", color: "bg-purple-100 text-purple-800" },
  delivered: { label: "נמסר", color: "bg-green-100 text-green-800" },
  cancelled: { label: "בוטל", color: "bg-red-100 text-red-800" },
  returned: { label: "הוחזר", color: "bg-orange-100 text-orange-800" },
};

const CARRIER_LABELS: Record<string, string> = {
  yahav_baldar: "יהב / בלדר",
  dhl: "DHL",
  other: "אחר",
};



interface Shipment {
  id: string;
  studentId: string;
  carrier: string;
  status: string;
  trackingNumber: string | null;
  recipientName: string;
  recipientNameEn: string | null;
  address: string | null;
  city: string | null;
  country: string;
  state: string | null;
  postalCode: string | null;
  phone: string | null;
  email: string | null;
  packageCount: number;
  remarks: string | null;
  carrierRef: string | null;
  carrierStatus: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  carrierRawData: any;
  labelData: string | null;
  weight: number | null;
  contentDescription: string | null;
  deliveredAt: string | null;
  createdAt: string;
  updatedAt: string;
  student: {
    id: string;
    hebrewName: string | null;
    firstNameOverride: string | null;
    lastNameOverride: string | null;
    firstNameMoodle: string | null;
    lastNameMoodle: string | null;
  };
}

function getStudentName(student: Shipment["student"]) {
  if (student.hebrewName) return student.hebrewName;
  const first = student.firstNameOverride || student.firstNameMoodle || "";
  const last = student.lastNameOverride || student.lastNameMoodle || "";
  return `${first} ${last}`.trim() || "—";
}

export function ShipmentDetailClient({ shipment: initial }: { shipment: Shipment }) {
  const router = useRouter();
  const [shipment, setShipment] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [sendingToCarrier, setSendingToCarrier] = useState(false);
  const [refreshingStatus, setRefreshingStatus] = useState(false);
  const [downloadingLabel, setDownloadingLabel] = useState(false);
  const [postalCodeError, setPostalCodeError] = useState<string | null>(null);

  // Edit form state
  const [form, setForm] = useState({
    recipientName: shipment.recipientName,
    recipientNameEn: shipment.recipientNameEn || "",
    address: shipment.address || "",
    city: shipment.city || "",
    country: shipment.country,
    state: shipment.state || "",
    postalCode: shipment.postalCode || "",
    phone: shipment.phone || "",
    email: shipment.email || "",
    packageCount: shipment.packageCount,
    remarks: shipment.remarks || "",
    status: shipment.status,
    carrier: shipment.carrier,
    trackingNumber: shipment.trackingNumber || "",
    weight: shipment.weight?.toString() || "",
    contentDescription: shipment.contentDescription || "",
  });

  function startEdit() {
    setForm({
      recipientName: shipment.recipientName,
      recipientNameEn: shipment.recipientNameEn || "",
      address: shipment.address || "",
      city: shipment.city || "",
      country: shipment.country,
      state: shipment.state || "",
      postalCode: shipment.postalCode || "",
      phone: shipment.phone || "",
      email: shipment.email || "",
      packageCount: shipment.packageCount,
      remarks: shipment.remarks || "",
      status: shipment.status,
      carrier: shipment.carrier,
      trackingNumber: shipment.trackingNumber || "",
      weight: shipment.weight?.toString() || "",
      contentDescription: shipment.contentDescription || "",
    });
    setEditing(true);
  }

  async function handleSave() {
    setSaving(true);
    // Validate DHL postal code
    if (form.carrier === "dhl") {
      const err = validatePostalCode(form.country, form.postalCode);
      if (err) {
        setPostalCodeError(err);
        setSaving(false);
        return;
      }
    }

    try {
      const res = await fetch(`/api/shipments/${shipment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          packageCount: Number(form.packageCount),
          weight: form.weight ? parseFloat(form.weight) : null,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setShipment({ ...shipment, ...updated });
        setEditing(false);
      } else {
        const err = await res.json().catch(() => null);
        alert(err?.error || "שגיאה בשמירה");
      }
    } catch {
      alert("שגיאה בשמירה");
    } finally {
      setSaving(false);
    }
  }

  const statesForCountry = getStatesForCountry(form.country);

  async function handleDelete() {
    if (!confirm("למחוק את המשלוח? פעולה זו לא ניתנת לביטול.")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/shipments/${shipment.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.push("/shipments");
      } else {
        alert("שגיאה במחיקה");
      }
    } catch {
      alert("שגיאה במחיקה");
    } finally {
      setDeleting(false);
    }
  }

  async function sendToCarrier() {
    if (!confirm("לשלוח את המשלוח לחברת המשלוחים?")) return;
    setSendingToCarrier(true);
    try {
      const res = await fetch(`/api/shipments/${shipment.id}/send`, {
        method: "POST",
      });
      if (res.ok) {
        const updated = await res.json();
        setShipment({ ...shipment, ...updated });
      } else {
        const err = await res.json().catch(() => null);
        alert(err?.error || "שגיאה בשליחה");
      }
    } catch {
      alert("שגיאה בשליחה לחברת המשלוחים");
    } finally {
      setSendingToCarrier(false);
    }
  }

  async function refreshStatus() {
    setRefreshingStatus(true);
    try {
      const res = await fetch(`/api/shipments/${shipment.id}/status`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        setShipment({ ...shipment, ...data.shipment });
      } else {
        const err = await res.json().catch(() => null);
        alert(err?.error || "שגיאה בעדכון סטטוס");
      }
    } catch {
      alert("שגיאה בעדכון סטטוס");
    } finally {
      setRefreshingStatus(false);
    }
  }

  async function downloadLabel() {
    setDownloadingLabel(true);
    try {
      const res = await fetch(`/api/shipments/${shipment.id}/label`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `DHL-Label-${shipment.trackingNumber || shipment.id}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } else {
        alert("שגיאה בהורדת התווית");
      }
    } catch {
      alert("שגיאה בהורדת התווית");
    } finally {
      setDownloadingLabel(false);
    }
  }

  const statusInfo = STATUS_LABELS[shipment.status] || {
    label: shipment.status,
    color: "bg-gray-100 text-gray-800",
  };
  const countryLabel = COUNTRIES.find((c) => c.code === shipment.country)?.hebrewName || shipment.country;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/shipments"
            className="text-muted-foreground hover:text-foreground text-sm"
          >
            ← חזרה למשלוחים
          </Link>
          <h1 className="text-2xl font-bold">📦 משלוח</h1>
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${statusInfo.color}`}
          >
            {shipment.carrierStatus || statusInfo.label}
          </span>
        </div>
        <div className="flex gap-2">
          {!editing && (
            <>
              <button
                onClick={startEdit}
                className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted"
              >
                ✏️ עריכה
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-md bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? "מוחק..." : "🗑️ מחיקה"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Action buttons */}
      {!editing && (
        <div className="flex gap-2 flex-wrap">
          {shipment.status === "pending" &&
            (shipment.carrier === "yahav_baldar" || shipment.carrier === "dhl") && (
              <button
                onClick={sendToCarrier}
                disabled={sendingToCarrier}
                className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {sendingToCarrier
                  ? "שולח..."
                  : shipment.carrier === "dhl"
                  ? "📤 שלח ל-DHL"
                  : "📤 שלח לבלדר"}
              </button>
            )}
          {shipment.trackingNumber && (
            <button
              onClick={refreshStatus}
              disabled={refreshingStatus}
              className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted disabled:opacity-50"
            >
              {refreshingStatus ? "בודק..." : "🔄 עדכן סטטוס"}
            </button>
          )}
          {shipment.labelData && (
            <button
              onClick={downloadLabel}
              disabled={downloadingLabel}
              className="rounded-md bg-yellow-600 px-4 py-2 text-sm text-white hover:bg-yellow-700 disabled:opacity-50"
            >
              {downloadingLabel ? "מוריד..." : "🏷️ הורד תווית"}
            </button>
          )}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Shipment Info Card */}
        <div className="rounded-lg border border-border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold border-b border-border pb-2">פרטי משלוח</h2>

          {editing ? (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">חברת משלוחים</label>
                <select
                  value={form.carrier}
                  onChange={(e) => setForm({ ...form, carrier: e.target.value })}
                  className="w-full rounded-md border border-input px-3 py-2 text-sm bg-background"
                >
                  <option value="yahav_baldar">יהב / בלדר (ארץ)</option>
                  <option value="dhl">DHL (חו&quot;ל)</option>
                  <option value="other">אחר</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">סטטוס</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full rounded-md border border-input px-3 py-2 text-sm bg-background"
                >
                  {Object.entries(STATUS_LABELS).map(([key, val]) => (
                    <option key={key} value={key}>
                      {val.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">מספר מעקב</label>
                <input
                  type="text"
                  value={form.trackingNumber}
                  onChange={(e) => setForm({ ...form, trackingNumber: e.target.value })}
                  className="w-full rounded-md border border-input px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">מספר חבילות</label>
                <input
                  type="number"
                  min={1}
                  value={form.packageCount}
                  onChange={(e) =>
                    setForm({ ...form, packageCount: parseInt(e.target.value) || 1 })
                  }
                  className="w-full rounded-md border border-input px-3 py-2 text-sm"
                />
              </div>
              {form.carrier === "dhl" && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">משקל (ק&quot;ג)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={form.weight}
                      onChange={(e) => setForm({ ...form, weight: e.target.value })}
                      className="w-full rounded-md border border-input px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">תיאור תכולה</label>
                    <input
                      type="text"
                      value={form.contentDescription}
                      onChange={(e) =>
                        setForm({ ...form, contentDescription: e.target.value })
                      }
                      className="w-full rounded-md border border-input px-3 py-2 text-sm"
                    />
                  </div>
                </>
              )}
              <div>
                <label className="block text-sm font-medium mb-1">הערות</label>
                <textarea
                  value={form.remarks}
                  onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                  rows={2}
                  className="w-full rounded-md border border-input px-3 py-2 text-sm"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-2 text-sm">
              <InfoRow label="חברה" value={CARRIER_LABELS[shipment.carrier] || shipment.carrier} />
              <InfoRow label="סטטוס" value={shipment.carrierStatus || statusInfo.label} />
              <InfoRow label="מספר מעקב" value={shipment.trackingNumber || "—"} mono />
              <InfoRow label="מזהה חברת משלוחים" value={shipment.carrierRef || "—"} mono />
              <InfoRow label="מספר חבילות" value={String(shipment.packageCount)} />
              {shipment.weight && <InfoRow label="משקל" value={`${shipment.weight} ק"ג`} />}
              {shipment.contentDescription && (
                <InfoRow label="תיאור תכולה" value={shipment.contentDescription} />
              )}
              <InfoRow label="הערות" value={shipment.remarks || "—"} />
              <InfoRow
                label="נוצר"
                value={new Date(shipment.createdAt).toLocaleDateString("he-IL", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              />
              {shipment.deliveredAt && (
                <InfoRow
                  label="נמסר"
                  value={new Date(shipment.deliveredAt).toLocaleDateString("he-IL", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                />
              )}
            </div>
          )}
        </div>

        {/* Recipient Card */}
        <div className="rounded-lg border border-border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold border-b border-border pb-2">פרטי נמען</h2>

          {editing ? (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">שם הנמען</label>
                <input
                  type="text"
                  value={form.recipientName}
                  onChange={(e) => setForm({ ...form, recipientName: e.target.value })}
                  className="w-full rounded-md border border-input px-3 py-2 text-sm"
                />
              </div>
              {form.carrier === "dhl" && (
                <div>
                  <label className="block text-sm font-medium mb-1">שם באנגלית (לתווית DHL) <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    dir="ltr"
                    value={form.recipientNameEn}
                    onChange={(e) => setForm({ ...form, recipientNameEn: e.target.value })}
                    placeholder="Recipient full name in English"
                    className="w-full rounded-md border border-input px-3 py-2 text-sm text-left"
                  />
                  <p className="text-xs text-muted-foreground mt-1">DHL לא תומך בעברית על התווית</p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1">כתובת</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full rounded-md border border-input px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">עיר</label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="w-full rounded-md border border-input px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">ארץ</label>
                <select
                  value={form.country}
                  onChange={(e) => setForm({ ...form, country: e.target.value })}
                  className="w-full rounded-md border border-input px-3 py-2 text-sm bg-background"
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.hebrewName} - {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">מיקוד</label>
                <input
                  type="text"
                  value={form.postalCode}
                  onChange={(e) => {
                    setForm({ ...form, postalCode: e.target.value });
                    setPostalCodeError(null);
                  }}
                  className="w-full rounded-md border border-input px-3 py-2 text-sm"
                  placeholder={form.carrier === "dhl" ? "חובה עבור DHL" : ""}
                />
                {postalCodeError && <p className="text-xs text-red-500 mt-1">{postalCodeError}</p>}
              </div>
              {statesForCountry ? (
                <div>
                  <label className="block text-sm font-medium mb-1">מדינה (State) <span className="text-red-500">*</span></label>
                  <select
                    value={form.state}
                    onChange={(e) => setForm({ ...form, state: e.target.value })}
                    className="w-full rounded-md border border-input px-3 py-2 text-sm bg-background"
                  >
                    <option value="">בחר מדינה</option>
                    {statesForCountry.map((s) => (
                      <option key={s.code} value={s.code}>
                        {s.code} - {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : form.country === "US" ? (
                <div>
                  <label className="block text-sm font-medium mb-1">מדינה (State) <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    dir="ltr"
                    value={form.state}
                    onChange={(e) => setForm({ ...form, state: e.target.value.toUpperCase() })}
                    placeholder="e.g. NY, CA, FL"
                    maxLength={2}
                    className="w-full rounded-md border border-input px-3 py-2 text-sm text-left uppercase"
                  />
                </div>
              ) : null}
              <div>
                <label className="block text-sm font-medium mb-1">טלפון</label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full rounded-md border border-input px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">אימייל</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full rounded-md border border-input px-3 py-2 text-sm"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {saving ? "שומר..." : "💾 שמור"}
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted"
                >
                  ביטול
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2 text-sm">
              <InfoRow label="שם הנמען" value={shipment.recipientName} />
              {shipment.recipientNameEn && <InfoRow label="שם באנגלית" value={shipment.recipientNameEn} />}
              <InfoRow label="כתובת" value={shipment.address || "—"} />
              <InfoRow label="עיר" value={shipment.city || "—"} />
              <InfoRow label="ארץ" value={countryLabel} />
              {shipment.state && <InfoRow label="מדינה" value={shipment.state} />}
              {shipment.postalCode && <InfoRow label="מיקוד" value={shipment.postalCode} />}
              <InfoRow label="טלפון" value={shipment.phone || "—"} />
              <InfoRow label="אימייל" value={shipment.email || "—"} />
              <div className="border-t border-border pt-2 mt-3">
                <InfoRow
                  label="תלמיד"
                  value={
                    <Link
                      href={`/students/${shipment.studentId}`}
                      className="text-primary hover:underline font-medium"
                    >
                      {getStudentName(shipment.student)}
                    </Link>
                  }
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Raw carrier data (collapsible) */}
      {shipment.carrierRawData && (
        <details className="rounded-lg border border-border bg-card p-4">
          <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
            📋 נתונים גולמיים מחברת המשלוחים
          </summary>
          <pre
            dir="ltr"
            className="mt-3 max-h-64 overflow-auto rounded bg-muted p-3 text-xs font-mono"
          >
            {JSON.stringify(shipment.carrierRawData, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}

function InfoRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string | React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex justify-between py-1.5 border-b border-border/50 last:border-b-0">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-medium ${mono ? "font-mono text-xs" : ""}`}>{value}</span>
    </div>
  );
}
