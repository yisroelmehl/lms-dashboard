"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ManageDiscountGroupsModal } from "./manage-discount-groups-modal";

interface SubOption {
  id: string;
  name: string;
}

interface TagWithPricing {
  id: string;
  name: string;
  defaultPriceILS: number | null;
  defaultPriceUSD: number | null;
  defaultNumPayments: number | null;
}

interface CourseOption {
  id: string;
  name: string;
  semesters: SubOption[];
  classGroups: SubOption[];
  tags: TagWithPricing[];
}

interface DiscountGroupOption {
  id: string;
  name: string;
  description: string | null;
  discountType: string;
  discountValue: number;
  color: string | null;
}

interface Props {
  agents: { id: string; name: string }[];
  courses: CourseOption[];
  tags: TagWithPricing[];
  discountGroups: DiscountGroupOption[];
}

export function CreatePaymentLinkForm({ agents, courses, tags, discountGroups: initialDiscountGroups }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [discountGroups, setDiscountGroups] = useState(initialDiscountGroups);
  const [showDiscountGroupsModal, setShowDiscountGroupsModal] = useState(false);

  const refreshDiscountGroups = useCallback(async () => {
    try {
      const res = await fetch("/api/discount-groups");
      if (res.ok) {
        const data = await res.json();
        setDiscountGroups(data.groups);
      }
    } catch { /* ignore */ }
  }, []);
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
    semesterId: "",
    classGroupId: "",
    discountGroupId: "",
    currency: "ILS",
    totalAmount: "",
    couponCode: "",
    discountAmount: "",
    numPayments: "1",
    chargeDay: "",
    showCouponField: false,
    showTotalOnForm: false,
    kesherPaymentPageId: "325869",
    isRegistrationOnly: false,
  });

  const [priceAutoFilled, setPriceAutoFilled] = useState(false);

  const selectedCourse = useMemo(
    () => courses.find((c) => c.id === formData.courseId),
    [courses, formData.courseId]
  );

  const selectedDiscountGroup = useMemo(
    () => discountGroups.find((g) => g.id === formData.discountGroupId),
    [discountGroups, formData.discountGroupId]
  );

  // Auto-fill pricing from course's subject tags when course changes
  useEffect(() => {
    if (!selectedCourse || !selectedCourse.tags.length) return;
    // Find the first tag with a price
    const tagWithPrice = selectedCourse.tags.find(
      (t) => (formData.currency === "ILS" ? t.defaultPriceILS : t.defaultPriceUSD) != null
    );
    if (!tagWithPrice) return;
    const price = formData.currency === "ILS" ? tagWithPrice.defaultPriceILS : tagWithPrice.defaultPriceUSD;
    if (price != null && !formData.totalAmount) {
      setFormData((prev) => ({
        ...prev,
        totalAmount: String(price),
        numPayments: tagWithPrice.defaultNumPayments ? String(tagWithPrice.defaultNumPayments) : prev.numPayments,
      }));
      setPriceAutoFilled(true);
    }
  }, [selectedCourse, formData.currency]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-calculate discount from discount group
  useEffect(() => {
    if (!selectedDiscountGroup) {
      return;
    }
    const total = Number(formData.totalAmount || 0);
    if (total <= 0) return;
    let discount = 0;
    if (selectedDiscountGroup.discountType === "percent") {
      discount = Math.round(total * selectedDiscountGroup.discountValue / 100);
    } else {
      discount = selectedDiscountGroup.discountValue;
    }
    setFormData((prev) => ({ ...prev, discountAmount: String(discount) }));
  }, [selectedDiscountGroup, formData.totalAmount]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      setFormData({ ...formData, [name]: (e.target as HTMLInputElement).checked });
    } else {
      setFormData({ ...formData, [name]: value });
      // Reset semester/classGroup when course changes, and clear auto-filled price
      if (name === "courseId") {
        setFormData((prev) => ({
          ...prev,
          courseId: value,
          semesterId: "",
          classGroupId: "",
          totalAmount: "",
          numPayments: "1",
          discountAmount: "",
        }));
        setPriceAutoFilled(false);
      }
      if (name === "totalAmount") {
        setPriceAutoFilled(false);
      }
    }
  };

  const finalAmount =
    Number(formData.totalAmount || 0) - Number(formData.discountAmount || 0);
  const numPayments = Number(formData.numPayments || 1);
  const monthlyAmount = numPayments > 1 ? finalAmount / numPayments : finalAmount;
  const currencySymbol = formData.currency === "USD" ? "$" : "₪";

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
          semesterId: formData.semesterId || undefined,
          classGroupId: formData.classGroupId || undefined,
          discountGroupId: formData.discountGroupId || undefined,
          currency: formData.currency,
          totalAmount: formData.isRegistrationOnly ? 0 : Number(formData.totalAmount),
          couponCode: formData.couponCode || undefined,
          discountAmount: formData.isRegistrationOnly ? 0 : Number(formData.discountAmount || 0),
          numPayments: formData.isRegistrationOnly ? 1 : numPayments,
          chargeDay: formData.chargeDay ? Number(formData.chargeDay) : undefined,
          showCouponField: formData.showCouponField,
          showTotalOnForm: formData.showTotalOnForm,
          kesherPaymentPageId: formData.kesherPaymentPageId || undefined,
          isRegistrationOnly: formData.isRegistrationOnly,
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
                discountGroupId: "",
                semesterId: "",
                classGroupId: "",
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

      {/* Course & Enrollment Targeting */}
      <fieldset className="space-y-4 rounded-md border border-border p-4">
        <legend className="px-2 text-sm font-semibold text-muted-foreground">קורס והרשמה</legend>

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

        {selectedCourse && selectedCourse.semesters.length > 0 && (
          <div>
            <label className="mb-1 block text-sm font-medium">מחזור לימודים</label>
            <select
              name="semesterId"
              value={formData.semesterId}
              onChange={handleChange}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">בחר מחזור (אופציונלי)</option>
              {selectedCourse.semesters.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        )}

        {selectedCourse && selectedCourse.classGroups.length > 0 && (
          <div>
            <label className="mb-1 block text-sm font-medium">אזור / קבוצה (Moodle)</label>
            <select
              name="classGroupId"
              value={formData.classGroupId}
              onChange={handleChange}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">בחר קבוצה (אופציונלי)</option>
              {selectedCourse.classGroups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
        )}
      </fieldset>

      {/* Link Type */}
      <fieldset className="space-y-4 rounded-md border border-border p-4">
        <legend className="px-2 text-sm font-semibold text-muted-foreground">סוג הקישור</legend>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="isRegistrationOnly"
              checked={!formData.isRegistrationOnly}
              onChange={() => setFormData({ ...formData, isRegistrationOnly: false })}
              className="w-4 h-4 text-primary"
            />
            <span className="text-sm font-medium">רישום עם תשלום וסליקה</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="isRegistrationOnly"
              checked={formData.isRegistrationOnly}
              onChange={() => setFormData({ ...formData, isRegistrationOnly: true })}
              className="w-4 h-4 text-primary"
            />
            <span className="text-sm font-medium">טופס רישום בלבד (ללא גבייה)</span>
          </label>
        </div>
      </fieldset>

      {/* Pricing */}
      {!formData.isRegistrationOnly && (
      <>
        <fieldset className="space-y-4 rounded-md border border-border p-4">
          <legend className="px-2 text-sm font-semibold text-muted-foreground">תמחור</legend>

        {/* Currency Toggle */}
        <div>
          <label className="mb-1 block text-sm font-medium">מטבע</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, currency: "ILS" })}
              className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                formData.currency === "ILS"
                  ? "border-primary bg-primary text-white"
                  : "border-input bg-background hover:bg-muted"
              }`}
            >
              ₪ שקל
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, currency: "USD" })}
              className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                formData.currency === "USD"
                  ? "border-primary bg-primary text-white"
                  : "border-input bg-background hover:bg-muted"
              }`}
            >
              $ דולר
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium">סכום כולל ({currencySymbol}) *</label>
            <input
              required
              type="number"
              name="totalAmount"
              value={formData.totalAmount}
              onChange={handleChange}
              min="1"
              step="0.01"
              className={`w-full rounded-md border px-3 py-2 text-sm ${priceAutoFilled ? "border-blue-300 bg-blue-50" : "border-input bg-background"}`}
              dir="ltr"
            />
            {priceAutoFilled && (
              <p className="mt-0.5 text-xs text-blue-600">מחיר ברירת מחדל לפי נושא</p>
            )}
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
            <label className="mb-1 block text-sm font-medium">הנחה ({currencySymbol})</label>
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
          <div className="text-sm font-medium space-y-1">
            <div> סכום סופי: <span className="text-primary">{currencySymbol}{finalAmount.toLocaleString("he-IL")}</span></div>
            {numPayments > 1 && (
              <div>תשלום חודשי: <span className="text-primary">{currencySymbol}{monthlyAmount.toLocaleString("he-IL", { maximumFractionDigits: 2 })}</span></div>
            )}
          </div>
        )}

        {/* Discount Group */}
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="text-sm font-medium">קבוצת הנחה</label>
            <button
              type="button"
              onClick={() => setShowDiscountGroupsModal(true)}
              className="text-xs text-primary hover:underline"
            >
              ניהול קבוצות
            </button>
          </div>
          <select
            name="discountGroupId"
            value={formData.discountGroupId}
            onChange={handleChange}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">ללא קבוצת הנחה</option>
            {discountGroups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name} ({g.discountType === "percent" ? `${g.discountValue}%` : `${currencySymbol}${g.discountValue}`})
              </option>
            ))}
          </select>
          {selectedDiscountGroup?.description && (
            <p className="mt-1 text-xs text-muted-foreground">{selectedDiscountGroup.description}</p>
          )}
        </div>
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
      </>
      )}

      {/* Form Display Options */}
      <fieldset className="space-y-4 rounded-md border border-border p-4">
        <legend className="px-2 text-sm font-semibold text-muted-foreground">הגדרות טופס רישום</legend>

        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              name="showCouponField"
              checked={formData.showCouponField}
              onChange={handleChange}
              className="rounded border-input"
            />
            <div>
              <span className="text-sm font-medium">הצג שדה קופון בטופס הרישום</span>
              <p className="text-xs text-muted-foreground">התלמיד יוכל להזין קוד קופון לקבלת הנחה</p>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              name="showTotalOnForm"
              checked={formData.showTotalOnForm}
              onChange={handleChange}
              className="rounded border-input"
            />
            <div>
              <span className="text-sm font-medium">הצג סכום כולל בטופס (במקום תשלום חודשי)</span>
              <p className="text-xs text-muted-foreground">ברירת מחדל: מוצג רק הסכום החודשי</p>
            </div>
          </label>
        </div>
      </fieldset>

      {/* Kesher Settings */}
      {!formData.isRegistrationOnly && (
      <fieldset className="space-y-4 rounded-md border border-border p-4">
        <legend className="px-2 text-sm font-semibold text-muted-foreground">הגדרות סליקה (Kesher)</legend>

        <div>
          <label className="mb-1 block text-sm font-medium">מזהה דף תשלום</label>
          <input
            type="text"
            name="kesherPaymentPageId"
            value={formData.kesherPaymentPageId}
            onChange={handleChange}
            placeholder="325855"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            dir="ltr"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            מזהה דף הסליקה ב-Kesher. לרוב אין צורך לשנות.
          </p>
        </div>
      </fieldset>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-primary py-3 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
      >
        {loading ? "יוצר קישור..." : formData.isRegistrationOnly ? "צור טופס הרשמה" : "צור קישור תשלום"}
      </button>

      <ManageDiscountGroupsModal
        open={showDiscountGroupsModal}
        onClose={() => {
          setShowDiscountGroupsModal(false);
          refreshDiscountGroups();
        }}
      />
    </form>
  );
}
