"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Option {
  id: string;
  name: string;
}

interface Props {
  agents: Option[];
  courses: Option[];
}

export function CreatePaymentLinkForm({ agents, courses }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{
    registrationUrl: string;
    paymentPageUrl: string | null;
    id: string;
  } | null>(null);

  const [formData, setFormData] = useState({
    salesAgentId: agents[0]?.id || "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    courseId: "",
    totalAmount: "",
    couponCode: "",
    discountAmount: "",
    numPayments: "1",
    chargeDay: "",
    kesherPaymentPageId: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const finalAmount =
    Number(formData.totalAmount || 0) - Number(formData.discountAmount || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/payment-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          salesAgentId: formData.salesAgentId,
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email || undefined,
          phone: formData.phone || undefined,
          courseId: formData.courseId || undefined,
          totalAmount: Number(formData.totalAmount),
          couponCode: formData.couponCode || undefined,
          discountAmount: Number(formData.discountAmount || 0),
          numPayments: Number(formData.numPayments || 1),
          chargeDay: formData.chargeDay ? Number(formData.chargeDay) : undefined,
          kesherPaymentPageId: formData.kesherPaymentPageId || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setResult({
          registrationUrl: data.registrationUrl,
          paymentPageUrl: data.paymentPageUrl,
          id: data.id,
        });
      } else {
        setError(data.error || "אירעה שגיאה");
      }
    } catch {
      setError("שגיאת תקשורת עם השרת");
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    const fullUrl = `${window.location.origin}${result.registrationUrl}`;
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-6 space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">✅</span>
          <h2 className="text-lg font-bold text-green-800">קישור התשלום נוצר בהצלחה!</h2>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-green-700 mb-1">
              קישור רישום ותשלום (לשליחה לתלמיד):
            </label>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={fullUrl}
                className="flex-1 rounded-md border border-green-300 bg-white px-3 py-2 text-sm"
                dir="ltr"
              />
              <button
                onClick={() => navigator.clipboard.writeText(fullUrl)}
                className="rounded-md bg-green-600 px-3 py-2 text-sm text-white hover:bg-green-700"
              >
                העתק
              </button>
            </div>
          </div>

          {result.paymentPageUrl && (
            <div>
              <label className="block text-sm font-medium text-green-700 mb-1">
                קישור ישיר לסליקה (Kesher):
              </label>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={result.paymentPageUrl}
                  className="flex-1 rounded-md border border-green-300 bg-white px-3 py-2 text-sm"
                  dir="ltr"
                />
                <button
                  onClick={() => navigator.clipboard.writeText(result.paymentPageUrl!)}
                  className="rounded-md bg-green-600 px-3 py-2 text-sm text-white hover:bg-green-700"
                >
                  העתק
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <button
            onClick={() => router.push(`/sales/payment-links/${result.id}`)}
            className="rounded-md bg-primary px-4 py-2 text-sm text-white hover:bg-primary/90"
          >
            צפה בפרטי הקישור
          </button>
          <button
            onClick={() => {
              setResult(null);
              setFormData({
                ...formData,
                firstName: "",
                lastName: "",
                email: "",
                phone: "",
                totalAmount: "",
                couponCode: "",
                discountAmount: "",
              });
            }}
            className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted"
          >
            צור קישור נוסף
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-lg border border-border bg-card p-6">
      {error && (
        <div className="rounded bg-red-50 p-3 text-sm text-red-600">{error}</div>
      )}

      {/* Sales Agent */}
      <div>
        <label className="mb-1 block text-sm font-medium">איש מכירות *</label>
        <select
          name="salesAgentId"
          value={formData.salesAgentId}
          onChange={handleChange}
          required
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">בחר איש מכירות</option>
          {agents.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
      </div>

      {/* Student Info */}
      <fieldset className="space-y-4 rounded-md border border-border p-4">
        <legend className="px-2 text-sm font-semibold text-muted-foreground">פרטי התלמיד</legend>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium">שם פרטי *</label>
            <input
              required
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">שם משפחה *</label>
            <input
              required
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium">אימייל</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              dir="ltr"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">טלפון</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              dir="ltr"
            />
          </div>
        </div>
      </fieldset>

      {/* Course & Pricing */}
      <fieldset className="space-y-4 rounded-md border border-border p-4">
        <legend className="px-2 text-sm font-semibold text-muted-foreground">קורס ותמחור</legend>

        <div>
          <label className="mb-1 block text-sm font-medium">קורס</label>
          <select
            name="courseId"
            value={formData.courseId}
            onChange={handleChange}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">בחר קורס (אופציונלי)</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium">סכום כולל (₪) *</label>
            <input
              required
              type="number"
              name="totalAmount"
              value={formData.totalAmount}
              onChange={handleChange}
              min="1"
              step="0.01"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              dir="ltr"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">קופון</label>
            <input
              type="text"
              name="couponCode"
              value={formData.couponCode}
              onChange={handleChange}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">הנחה (₪)</label>
            <input
              type="number"
              name="discountAmount"
              value={formData.discountAmount}
              onChange={handleChange}
              min="0"
              step="0.01"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              dir="ltr"
            />
          </div>
        </div>

        {formData.totalAmount && (
          <div className="text-sm font-medium">
            סכום סופי: <span className="text-primary">₪{finalAmount.toLocaleString("he-IL")}</span>
          </div>
        )}
      </fieldset>

      {/* Payment Terms */}
      <fieldset className="space-y-4 rounded-md border border-border p-4">
        <legend className="px-2 text-sm font-semibold text-muted-foreground">תנאי תשלום</legend>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium">מספר תשלומים</label>
            <input
              type="number"
              name="numPayments"
              value={formData.numPayments}
              onChange={handleChange}
              min="1"
              max="36"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              dir="ltr"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">יום חיוב בחודש</label>
            <input
              type="number"
              name="chargeDay"
              value={formData.chargeDay}
              onChange={handleChange}
              min="1"
              max="28"
              placeholder="1-28"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              dir="ltr"
            />
          </div>
        </div>
      </fieldset>

      {/* Kesher Settings */}
      <fieldset className="space-y-4 rounded-md border border-border p-4">
        <legend className="px-2 text-sm font-semibold text-muted-foreground">הגדרות סליקה (Kesher)</legend>

        <div>
          <label className="mb-1 block text-sm font-medium">מזהה דף תשלום</label>
          <input
            type="text"
            name="kesherPaymentPageId"
            value={formData.kesherPaymentPageId}
            onChange={handleChange}
            placeholder="Payment Page ID מ-Kesher"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            dir="ltr"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            אם לא מוגדר, יווצר קישור רישום בלבד ללא סליקה ישירה.
          </p>
        </div>
      </fieldset>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-primary py-3 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
      >
        {loading ? "יוצר קישור..." : "צור קישור תשלום"}
      </button>
    </form>
  );
}
