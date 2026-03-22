"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface Props {
  token: string;
  linkId: string;
  initialData: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  hasKesherPayment: boolean;
  kesherPaymentPageId: string | null;
  finalAmount: number;
  numPayments: number;
  currency: string;
  showCouponField: boolean;
  showTotalOnForm: boolean;
  couponCode: string | null;
}

export function PaymentRegistrationForm({
  token,
  linkId,
  initialData,
  hasKesherPayment,
  kesherPaymentPageId,
  finalAmount,
  numPayments,
  currency,
  showCouponField,
  showTotalOnForm,
  couponCode: presetCoupon,
}: Props) {
  const [status, setStatus] = useState<"form" | "saving" | "success" | "payment_success">("form");
  const [error, setError] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [couponValidation, setCouponValidation] = useState<{
    valid: boolean;
    message: string;
    discountType?: string;
    discountValue?: number;
  } | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Poll payment status after showing iframe
  const startPolling = useCallback(() => {
    if (pollIntervalRef.current) return;
    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/payment-links/${linkId}/status`);
        if (res.ok) {
          const data = await res.json();
          if (data.status === "paid") {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
            setStatus("payment_success");
          }
        }
      } catch { /* ignore polling errors */ }
    }, 3000);
  }, [linkId]);

  useEffect(() => {
    if (showPayment) {
      startPolling();
    }
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [showPayment, startPolling]);

  // Manually verify payment via Kesher API
  const verifyPayment = async () => {
    setVerifying(true);
    setError("");
    try {
      const res = await fetch(`/api/payment-links/${linkId}/verify`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        if (data.status === "paid") {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
          setStatus("payment_success");
          return;
        }
        // Show debug info to help diagnose
        const debugStr = data.debug ? ` (Debug: ${JSON.stringify(data.debug)})` : "";
        setError(`לא נמצא תשלום. אם שילמת, אנא המתן מספר שניות ונסה שוב.${debugStr}`);
      } else {
        setError("שגיאה בבדיקת התשלום. נסה שוב.");
      }
    } catch {
      setError("שגיאה בבדיקת התשלום. נסה שוב.");
    } finally {
      setVerifying(false);
    }
  };

  const [formData, setFormData] = useState({
    firstName: initialData.firstName,
    lastName: initialData.lastName,
    email: initialData.email,
    phone: initialData.phone,
    hebrewName: "",
    city: "",
    address: "",
    dateOfBirth: "",
    torahBackground: "",
    smichaBackground: "",
    studyPreferences: "",
    hasChavrusa: false,
    participationType: "",
    couponCode: "",
  });

  const currencySymbol = currency === "USD" ? "$" : "₪";
  const monthlyAmount = numPayments > 1 ? finalAmount / numPayments : finalAmount;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    });
  };

  const handleSubmitRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!termsAccepted) {
      setError("יש לאשר את התקנון כדי להמשיך");
      return;
    }

    setStatus("saving");
    setError("");

    try {
      const res = await fetch(`/api/payment-links/${linkId}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          registrationData: formData,
          termsAccepted: true,
        }),
      });

      if (res.ok) {
        if (hasKesherPayment && kesherPaymentPageId) {
          setShowPayment(true);
          setStatus("form");
        } else {
          setStatus("success");
        }
      } else {
        const data = await res.json();
        setError(data.error || "אירעה שגיאה בשמירת הנתונים");
        setStatus("form");
      }
    } catch {
      setError("שגיאת תקשורת עם השרת");
      setStatus("form");
    }
  };

  const validateCoupon = async (code: string) => {
    if (!code.trim()) {
      setCouponValidation(null);
      return;
    }
    setValidatingCoupon(true);
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json();
      if (data.valid) {
        setCouponValidation({
          valid: true,
          message: data.discountType === "percent"
            ? `הנחה של ${data.discountValue}%`
            : `הנחה של ${data.currency === "USD" ? "$" : "₪"}${data.discountValue}`,
          discountType: data.discountType,
          discountValue: data.discountValue,
        });
      } else {
        setCouponValidation({ valid: false, message: data.error || "קופון לא תקין" });
      }
    } catch {
      setCouponValidation({ valid: false, message: "שגיאה בבדיקת הקופון" });
    } finally {
      setValidatingCoupon(false);
    }
  };

  if (status === "payment_success") {
    return (
      <div className="text-center space-y-4 py-8">
        <span className="text-5xl">🎉</span>
        <h2 className="text-2xl font-bold text-green-700">התשלום בוצע בהצלחה!</h2>
        <p className="text-gray-600">
          תודה רבה, {formData.firstName}! הרישום והתשלום שלך התקבלו.<br />
          תקבל אישור באימייל בקרוב.
        </p>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="text-center space-y-4 py-8">
        <span className="text-5xl">🎉</span>
        <h2 className="text-2xl font-bold text-green-700">הרישום הושלם בהצלחה!</h2>
        <p className="text-muted-foreground">
          {hasKesherPayment
            ? "התשלום התקבל והרישום שלך אושר. תקבל אישור באימייל בקרוב."
            : "פרטיך נשמרו בהצלחה. המשרד ייצור איתך קשר להשלמת התשלום."}
        </p>
      </div>
    );
  }

  // Build Kesher payment URL with success/failure redirect URLs
  const buildPaymentUrl = () => {
    if (!kesherPaymentPageId) return "";
    const params = new URLSearchParams();
    params.set("name", `${formData.firstName} ${formData.lastName}`);
    params.set("total", String(finalAmount));
    params.set("currency", currency === "USD" ? "2" : "1");
    if (numPayments > 1) params.set("numpayment", String(numPayments));
    if (formData.phone) params.set("tel", formData.phone);
    if (formData.email) params.set("mail", formData.email);
    params.set("firstName", formData.firstName);
    params.set("lastName", formData.lastName);
    params.set("adddata", token);
    // addactiondata is appended to the action URL configured in Kesher dashboard
    // This ensures our webhook receives the token even via action path
    params.set("addactiondata", token);
    params.set("hidetotaldetails", "true"); // Clean iframe look
    return `https://ultra.kesherhk.info/external/paymentPage/${kesherPaymentPageId}?${params.toString()}`;
  };

  return (
    <div className="space-y-6">
      {/* Registration Form */}
      {!showPayment && (
        <form onSubmit={handleSubmitRegistration} className="space-y-6">
          {error && (
            <div className="rounded bg-red-50 p-3 text-sm text-red-600">{error}</div>
          )}

          {/* Personal Details */}
          <fieldset className="space-y-4">
            <legend className="text-lg font-semibold mb-2">פרטים אישיים</legend>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium">שם פרטי *</label>
                <input
                  required
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
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
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">שם עברי מלא</label>
              <input
                type="text"
                name="hebrewName"
                value={formData.hebrewName}
                onChange={handleChange}
                placeholder="לדוגמה: ישראל בן אברהם"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium">אימייל *</label>
                <input
                  required
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">טלפון *</label>
                <input
                  required
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  dir="ltr"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium">עיר</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">כתובת</label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">תאריך לידה</label>
              <input
                type="date"
                name="dateOfBirth"
                value={formData.dateOfBirth}
                onChange={handleChange}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                dir="ltr"
              />
            </div>
          </fieldset>

          {/* Study Background */}
          <fieldset className="space-y-4">
            <legend className="text-lg font-semibold mb-2">רקע לימודי</legend>

            <div>
              <label className="mb-1 block text-sm font-medium">רקע בלימוד תורה</label>
              <textarea
                name="torahBackground"
                value={formData.torahBackground}
                onChange={handleChange}
                rows={2}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">רקע בסמיכה</label>
              <textarea
                name="smichaBackground"
                value={formData.smichaBackground}
                onChange={handleChange}
                rows={2}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">העדפות לימוד</label>
              <textarea
                name="studyPreferences"
                value={formData.studyPreferences}
                onChange={handleChange}
                rows={2}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">סוג השתתפות</label>
              <select
                name="participationType"
                value={formData.participationType}
                onChange={handleChange}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">בחר</option>
                <option value="live">שידור חי</option>
                <option value="recorded">הקלטות</option>
                <option value="in_person">פיזי</option>
                <option value="hybrid">משולב</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                name="hasChavrusa"
                checked={formData.hasChavrusa}
                onChange={handleChange}
                id="hasChavrusa"
                className="rounded border-gray-300"
              />
              <label htmlFor="hasChavrusa" className="text-sm">יש לי חברותא</label>
            </div>
          </fieldset>

          {/* Coupon Field - only shown if agent enabled it */}
          {showCouponField && (
            <fieldset className="space-y-4">
              <legend className="text-lg font-semibold mb-2">קופון</legend>
              <div>
                <label className="mb-1 block text-sm font-medium">קוד קופון</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    name="couponCode"
                    value={formData.couponCode}
                    onChange={(e) => {
                      handleChange(e);
                      setCouponValidation(null);
                    }}
                    placeholder="הזן קוד קופון לקבלת הנחה"
                    className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={() => validateCoupon(formData.couponCode)}
                    disabled={!formData.couponCode.trim() || validatingCoupon}
                    className="rounded-md bg-blue-100 px-4 py-2 text-sm text-blue-700 hover:bg-blue-200 disabled:opacity-50"
                  >
                    {validatingCoupon ? "בודק..." : "בדוק קופון"}
                  </button>
                </div>
                {couponValidation && (
                  <p className={`mt-1 text-xs ${couponValidation.valid ? "text-green-600" : "text-red-600"}`}>
                    {couponValidation.valid ? "✓ " : "✗ "}{couponValidation.message}
                  </p>
                )}
                {!couponValidation && presetCoupon && formData.couponCode === presetCoupon && (
                  <p className="mt-1 text-xs text-green-600">✓ קופון תקין</p>
                )}
              </div>
            </fieldset>
          )}

          {/* Terms */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
            <h3 className="text-sm font-semibold">תקנון ותנאי שימוש</h3>
            <div className="max-h-32 overflow-y-auto text-xs text-gray-600 space-y-2">
              <p>
                בהרשמה זו אני מאשר/ת כי קראתי את תנאי ההשתתפות בקורס,
                מסכים/ה לתנאי התשלום כפי שפורטו, ומתחייב/ת לעמוד בהם.
              </p>
              <p>
                ביטול ההרשמה יתאפשר עד 14 ימי עסקים מיום ההרשמה או מיום קבלת
                מסמך גילוי נאות, לפי המאוחר מביניהם, בהתאם לחוק הגנת הצרכן.
              </p>
              <p>
                כל החומרים המועברים במסגרת הקורס הם בבעלות המוסד ואין להעבירם לצד שלישי.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                id="terms"
                className="rounded border-gray-300"
              />
              <label htmlFor="terms" className="text-sm font-medium">
                קראתי ומסכים/ה לתנאי השימוש והתקנון *
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={status === "saving" || !termsAccepted}
            className="w-full rounded-md bg-blue-600 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {status === "saving"
              ? "שומר..."
              : hasKesherPayment
              ? "שמור והמשך לתשלום"
              : "שלח רישום"}
          </button>
        </form>
      )}

      {/* Kesher Payment - shown after registration is saved */}
      {showPayment && hasKesherPayment && kesherPaymentPageId && (
        <div className="space-y-4">
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <h2 className="text-lg font-bold text-blue-800">השלמת תשלום</h2>
            <p className="text-sm text-blue-600 mt-1">
              פרטיך נשמרו בהצלחה. כעת יש להשלים את התשלום:
            </p>
            <div className="mt-2 text-sm font-semibold text-blue-800">
              {showTotalOnForm ? (
                <span>סכום לתשלום: {currencySymbol}{finalAmount.toLocaleString("he-IL")}</span>
              ) : numPayments > 1 ? (
                <span>{numPayments} תשלומים של {currencySymbol}{monthlyAmount.toLocaleString("he-IL", { maximumFractionDigits: 2 })}</span>
              ) : (
                <span>סכום לתשלום: {currencySymbol}{finalAmount.toLocaleString("he-IL")}</span>
              )}
            </div>
          </div>

          <div className="mt-6 w-full max-w-2xl mx-auto overflow-hidden rounded-lg border border-gray-200 shadow-md h-[700px]">
            <iframe
              src={buildPaymentUrl()}
              className="w-full h-full border-0"
              title="Kesher Payment Page"
              sandbox="allow-scripts allow-forms allow-same-origin allow-top-navigation allow-popups"
            />
          </div>

          <div className="flex flex-col items-center justify-center gap-2 mt-4">
            <div className="flex items-center gap-2 text-sm text-blue-600 animate-pulse bg-blue-50 px-4 py-2 rounded-full border border-blue-100">
              <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>ממתין להשלמת התשלום בדף הסליקה...</span>
            </div>
            
            <p className="text-xs text-muted-foreground mt-2 max-w-md text-center">
              לאחר ביצוע התשלום בחלונית, העמוד יתרענן אוטומטית. אם שילמת ולא קרה כלום, לחץ על הכפתור למטה.
            </p>
          </div>

          {error && (
            <div className="rounded bg-red-50 p-3 text-sm text-red-600 text-center">{error}</div>
          )}

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={verifyPayment}
              disabled={verifying}
              className="px-6 py-2 rounded-md border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {verifying ? "בודק מול חברת האשראי..." : "בדוק סטטוס תשלום ידנית"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
