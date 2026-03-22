"use client";

import { useState, useEffect } from "react";

interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discountType: string;
  discountValue: number;
  currency: string;
  maxUses: number | null;
  usedCount: number;
  courseId: string | null;
  isActive: boolean;
  expiresAt: string | null;
  course?: { id: string; fullNameMoodle: string; fullNameOverride: string | null } | null;
}

export function ManageCouponsModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newCode, setNewCode] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newType, setNewType] = useState("fixed");
  const [newValue, setNewValue] = useState("");
  const [newCurrency, setNewCurrency] = useState("ILS");
  const [newMaxUses, setNewMaxUses] = useState("");
  const [newExpiresAt, setNewExpiresAt] = useState("");

  useEffect(() => {
    if (open) {
      loadCoupons();
      setError(null);
    }
  }, [open]);

  async function loadCoupons() {
    setLoading(true);
    try {
      const res = await fetch("/api/coupons");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setCoupons(data.coupons);
    } catch {
      setError("שגיאה בטעינת קופונים");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!newCode.trim() || !newValue) return;
    setError(null);
    try {
      const res = await fetch("/api/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: newCode.trim(),
          description: newDescription || null,
          discountType: newType,
          discountValue: Number(newValue),
          currency: newCurrency,
          maxUses: newMaxUses ? Number(newMaxUses) : null,
          expiresAt: newExpiresAt || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "שגיאה ביצירת קופון");
        return;
      }
      setNewCode("");
      setNewDescription("");
      setNewValue("");
      setNewMaxUses("");
      setNewExpiresAt("");
      loadCoupons();
    } catch {
      setError("שגיאה ביצירת קופון");
    }
  }

  async function handleToggle(id: string, isActive: boolean) {
    try {
      await fetch(`/api/coupons/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });
      loadCoupons();
    } catch {
      setError("שגיאה בעדכון קופון");
    }
  }

  async function handleDelete(id: string) {
    try {
      await fetch(`/api/coupons/${id}`, { method: "DELETE" });
      loadCoupons();
    } catch {
      setError("שגיאה במחיקת קופון");
    }
  }

  function generateCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewCode(code);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-2xl rounded-lg bg-card p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">ניהול קופונים</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>

        {error && <p className="mb-3 text-sm text-destructive">{error}</p>}

        {/* Create new coupon */}
        <div className="mb-4 space-y-2 rounded-md border border-border p-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value.toUpperCase())}
              placeholder="קוד קופון"
              className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
              dir="ltr"
            />
            <button
              type="button"
              onClick={generateCode}
              className="rounded-md border border-input bg-muted px-3 py-2 text-xs hover:bg-muted/80"
            >
              ייצר אוטומטי
            </button>
          </div>
          <input
            type="text"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder="תיאור (אופציונלי)"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            dir="rtl"
          />
          <div className="grid grid-cols-4 gap-2">
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
              className="rounded-md border border-input bg-background px-2 py-1 text-sm"
            >
              <option value="fixed">סכום קבוע</option>
              <option value="percent">אחוז (%)</option>
            </select>
            <input
              type="number"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              placeholder={newType === "percent" ? "אחוז" : "סכום"}
              min="0"
              className="rounded-md border border-input bg-background px-2 py-1 text-sm"
              dir="ltr"
            />
            {newType === "fixed" && (
              <select
                value={newCurrency}
                onChange={(e) => setNewCurrency(e.target.value)}
                className="rounded-md border border-input bg-background px-2 py-1 text-sm"
              >
                <option value="ILS">₪ שקלים</option>
                <option value="USD">$ דולר</option>
              </select>
            )}
            <input
              type="number"
              value={newMaxUses}
              onChange={(e) => setNewMaxUses(e.target.value)}
              placeholder="מקס שימושים (אופציונלי)"
              min="1"
              className="rounded-md border border-input bg-background px-2 py-1 text-sm"
              dir="ltr"
            />
          </div>
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground">תוקף עד (אופציונלי)</label>
              <input
                type="date"
                value={newExpiresAt}
                onChange={(e) => setNewExpiresAt(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                dir="ltr"
              />
            </div>
            <button
              onClick={handleCreate}
              disabled={!newCode.trim() || !newValue}
              className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              צור קופון
            </button>
          </div>
        </div>

        {/* Coupons list */}
        <div className="max-h-72 space-y-2 overflow-y-auto">
          {loading ? (
            <p className="py-4 text-center text-sm text-muted-foreground">טוען...</p>
          ) : coupons.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              אין קופונים. צור קופון חדש למעלה.
            </p>
          ) : (
            coupons.map((coupon) => (
              <div key={coupon.id} className="rounded-md border border-border p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <code className="rounded bg-muted px-2 py-0.5 text-sm font-bold">{coupon.code}</code>
                    <span className="text-sm">
                      {coupon.discountType === "percent"
                        ? `${coupon.discountValue}%`
                        : `${coupon.currency === "USD" ? "$" : "₪"}${coupon.discountValue}`}
                    </span>
                    {!coupon.isActive && (
                      <span className="rounded bg-red-100 px-1.5 py-0.5 text-xs text-red-700">לא פעיל</span>
                    )}
                    {coupon.maxUses && (
                      <span className="text-xs text-muted-foreground">
                        {coupon.usedCount}/{coupon.maxUses} שימושים
                      </span>
                    )}
                    {coupon.expiresAt && (
                      <span className="text-xs text-muted-foreground">
                        עד {new Date(coupon.expiresAt).toLocaleDateString("he-IL")}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggle(coupon.id, coupon.isActive)}
                      className={`text-xs ${coupon.isActive ? "text-orange-600 hover:text-orange-700" : "text-green-600 hover:text-green-700"}`}
                    >
                      {coupon.isActive ? "השבת" : "הפעל"}
                    </button>
                    <button
                      onClick={() => handleDelete(coupon.id)}
                      className="text-xs text-muted-foreground hover:text-destructive"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                {coupon.description && (
                  <p className="mt-1 text-xs text-muted-foreground">{coupon.description}</p>
                )}
                {coupon.course && (
                  <p className="mt-1 text-xs text-blue-600">
                    מוגבל ל: {coupon.course.fullNameOverride || coupon.course.fullNameMoodle}
                  </p>
                )}
              </div>
            ))
          )}
        </div>

        <div className="mt-4 flex justify-end">
          <button onClick={onClose} className="rounded-md border border-border px-4 py-2 text-sm hover:bg-accent">
            סגור
          </button>
        </div>
      </div>
    </div>
  );
}
