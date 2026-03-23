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
  initialData?: any;
}

export function CreatePaymentLinkForm({ agents, courses, tags, discountGroups: initialDiscountGroups, initialData }: Props) {
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
  
  // Inline coupon creation
  const [showCouponCreator, setShowCouponCreator] = useState(false);
  const [creatingCoupon, setCreatingCoupon] = useState(false);
  const [couponCreatorData, setCouponCreatorData] = useState({
    code: "",
    discountType: "fixed" as "fixed" | "percent",
    discountValue: "",
    maxUses: "",
  });
  const [couponCreatorError, setCouponCreatorError] = useState("");

  const handleCreateCoupon = async () => {
    if (!couponCreatorData.code.trim() || !couponCreatorData.discountValue) {
      setCouponCreatorError("קוד וערך הנחה הם שדות חובה");
      return;
    }
    setCreatingCoupon(true);
    setCouponCreatorError("");
    try {
      const res = await fetch("/api/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: couponCreatorData.code.trim().toUpperCase(),
          discountType: couponCreatorData.discountType,
          discountValue: Number(couponCreatorData.discountValue),
          currency: formData.currency,
          maxUses: couponCreatorData.maxUses ? Number(couponCreatorData.maxUses) : null,
          courseId: formData.courseId || null,
        }),
      });
      if (res.ok) {
        // Auto-fill the coupon code field
        setFormData(prev => ({ ...prev, couponCode: couponCreatorData.code.trim().toUpperCase() }));
        setShowCouponCreator(false);
        setCouponCreatorData({ code: "", discountType: "fixed", discountValue: "", maxUses: "" });
      } else {
        const data = await res.json();
        setCouponCreatorError(data.error || "שגיאה ביצירת קופון");
      }
    } catch {
      setCouponCreatorError("שגיאת תקשורת");
    } finally {
      setCreatingCoupon(false);
    }
  };

  const [result, setResult] = useState<{
    registrationUrl: string;
    paymentPageUrl: string | null;
    id: string;
  } | null>(null);

  const [formData, setFormData] = useState({
    salesAgentId: initialData?.salesAgentId || agents[0]?.id || "",
    firstName: initialData?.firstName || "",
    lastName: initialData?.lastName || "",
    email: initialData?.email || "",
    phone: initialData?.phone || "",
    courseId: initialData?.courseId || "",
    semesterId: initialData?.semesterId || "",
    classGroupId: initialData?.classGroupId || "",
    discountGroupId: initialData?.discountGroupId || "",
    currency: initialData?.currency || "ILS",
    totalAmount: initialData?.totalAmount ? String(initialData.totalAmount) : "",
    couponCode: initialData?.couponCode || "",
    discountAmount: initialData?.discountAmount ? String(initialData.discountAmount) : "",
    numPayments: initialData?.numPayments ? String(initialData.numPayments) : "1",
    chargeDay: initialData?.chargeDay ? String(initialData.chargeDay) : "",
    showCouponField: initialData?.showCouponField ?? false,
    showTotalOnForm: initialData?.showTotalOnForm ?? false,
    kesherPaymentPageId: initialData?.kesherPaymentPageId || "325869",
    isRegistrationOnly: initialData?.isRegistrationOnly ?? false,
    financeNotes: initialData?.financeNotes || "",
    studiesNotes: initialData?.studiesNotes || "",
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
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
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
      const url = initialData?.id ? `/api/payment-links/${initialData.id}` : "/api/payment-links";
      const method = initialData?.id ? "PATCH" : "POST";
      
      const res = await fetch(url, {
        method,
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
        if (initialData?.id) {
          // It's an edit - just redirect back or show success
          alert("נשמר בהצלחה!");
          router.push(`/sales/payment-links`);
          router.refresh();
        } else {
          setResult({
            registrationUrl: data.registrationUrl || `/pay/${data.token}`,
            paymentPageUrl: data.paymentPageUrl || null,
            id: data.id,
          });
        }
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
    
    // Auto-scroll to top when showing success message
    if (typeof window !== "undefined") {
      setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 50);
    }
    
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
              <a
                href={fullUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md bg-white border border-green-600 px-3 py-2 text-sm text-green-700 hover:bg-green-50"
              >
                פתח קישור
              </a>
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
                <a
                  href={result.paymentPageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-md bg-white border border-green-600 px-3 py-2 text-sm text-green-700 hover:bg-green-50"
                >
                  פתח קישור
                </a>
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
            <div className="mb-1 flex items-center justify-between">
              <label className="text-sm font-medium">קופון</label>
              <button
                type="button"
                onClick={() => setShowCouponCreator(!showCouponCreator)}
                className="text-xs text-primary hover:underline"
              >
                {showCouponCreator ? "סגור" : "צור קופון חדש"}
              </button>
            </div>
            <input
              type="text"
              name="couponCode"
              value={formData.couponCode}
              onChange={handleChange}
              placeholder="קוד קופון קיים"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            {showCouponCreator && (
              <div className="mt-2 rounded-md border border-blue-200 bg-blue-50 p-3 space-y-2">
                <p className="text-xs font-semibold text-blue-700">יצירת קופון חדש</p>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={couponCreatorData.code}
                    onChange={(e) => setCouponCreatorData(prev => ({ ...prev, code: e.target.value }))}
                    placeholder="קוד קופון"
                    className="rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                    dir="ltr"
                  />
                  <select
                    value={couponCreatorData.discountType}
                    onChange={(e) => setCouponCreatorData(prev => ({ ...prev, discountType: e.target.value as "fixed" | "percent" }))}
                    className="rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                  >
                    <option value="fixed">סכום קבוע ({currencySymbol})</option>
                    <option value="percent">אחוז (%)</option>
                  </select>
                  <input
                    type="number"
                    value={couponCreatorData.discountValue}
                    onChange={(e) => setCouponCreatorData(prev => ({ ...prev, discountValue: e.target.value }))}
                    placeholder="ערך הנחה"
                    min="0"
                    step="0.01"
                    className="rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                    dir="ltr"
                  />
                  <input
                    type="number"
                    value={couponCreatorData.maxUses}
                    onChange={(e) => setCouponCreatorData(prev => ({ ...prev, maxUses: e.target.value }))}
                    placeholder="מקסימום שימושים (ריק=ללא הגבלה)"
                    min="1"
                    className="rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                    dir="ltr"
                  />
                </div>
                {couponCreatorError && (
                  <p className="text-xs text-red-600">{couponCreatorError}</p>
                )}
                <button
                  type="button"
                  onClick={handleCreateCoupon}
                  disabled={creatingCoupon}
                  className="w-full rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {creatingCoupon ? "יוצר..." : "צור קופון"}
                </button>
              </div>
            )}
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

      {/* Internal Notes */}
      <fieldset className="space-y-4 rounded-md border border-amber-200 bg-amber-50/50 p-4">
        <legend className="px-2 text-sm font-bold text-amber-800">הערות פנימיות (להנהלה בלבד)</legend>
        <p className="text-xs text-amber-700 mb-2">הערות אלו לא יוצגו לתלמיד ויופיעו בכרטיס התלמיד לאחר הרישום.</p>
        
        <div>
          <label className="mb-1 block text-sm font-medium text-amber-900">הערות למנהל הכספים</label>
          <textarea
            name="financeNotes"
            value={formData.financeNotes}
            onChange={handleChange}
            rows={2}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            placeholder="לדוגמה: הבטחנו פריסה שונה, ישם תשלום במזומן בנוסף..."
          />
        </div>
        
        <div>
          <label className="mb-1 block text-sm font-medium text-amber-900">הערות למנהל הלימודים</label>
          <textarea
            name="studiesNotes"
            value={formData.studiesNotes}
            onChange={handleChange}
            rows={2}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            placeholder="לדוגמה: התלמיד צריך אישור חריג להיעדר משיעורי ערב..."
          />
        </div>
      </fieldset>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-primary py-3 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
      >
        {loading 
          ? (initialData?.id ? "שומר..." : "יוצר קישור...") 
          : (initialData?.id 
              ? "שמור שינויים" 
              : formData.isRegistrationOnly 
                  ? "הוספת תלמיד ללא תשלום" 
                  : "הוספת תלמיד עם תשלום")}
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
