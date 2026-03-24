"use client";

import { useState, useEffect } from "react";

interface Student {
  id: string;
  hebrewName: string | null;
  firstNameOverride: string | null;
  lastNameOverride: string | null;
  firstNameMoodle: string | null;
  lastNameMoodle: string | null;
  city: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
}

// Common countries with ISO 2-letter codes
const COUNTRIES = [
  { code: "IL", label: "Israel - ישראל" },
  { code: "US", label: "United States - ארה״ב" },
  { code: "GB", label: "United Kingdom - בריטניה" },
  { code: "FR", label: "France - צרפת" },
  { code: "DE", label: "Germany - גרמניה" },
  { code: "NL", label: "Netherlands - הולנד" },
  { code: "BE", label: "Belgium - בלגיה" },
  { code: "IT", label: "Italy - איטליה" },
  { code: "ES", label: "Spain - ספרד" },
  { code: "CA", label: "Canada - קנדה" },
  { code: "AU", label: "Australia - אוסטרליה" },
  { code: "SG", label: "Singapore - סינגפור" },
  { code: "HK", label: "Hong Kong - הונג קונג" },
  { code: "JP", label: "Japan - יפן" },
  { code: "CN", label: "China - סין" },
  { code: "IN", label: "India - הודו" },
  { code: "BR", label: "Brazil - ברזיל" },
  { code: "MX", label: "Mexico - מקסיקו" },
];

export function CreateShipmentModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [studentsLoaded, setStudentsLoaded] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [carrier, setCarrier] = useState("yahav_baldar");
  const [recipientName, setRecipientName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("IL");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [packageCount, setPackageCount] = useState(1);
  const [remarks, setRemarks] = useState("");
  const [sendNow, setSendNow] = useState(true);
  // DHL-specific fields
  const [weight, setWeight] = useState("");
  const [contentDescription, setContentDescription] = useState("ספרים / חומרי לימוד");
  const [postalCode, setPostalCode] = useState("");

  // Load all students once
  useEffect(() => {
    if (studentsLoaded) return;
    setLoadingStudents(true);
    fetch("/api/students")
      .then((res) => res.json())
      .then((data) => {
        setAllStudents(data.students || []);
        setStudentsLoaded(true);
      })
      .catch(() => {})
      .finally(() => setLoadingStudents(false));
  }, [studentsLoaded]);

  const filteredStudents = searchQuery.length >= 2
    ? allStudents.filter((s) => {
        const name = (s.hebrewName || `${s.firstNameOverride || s.firstNameMoodle || ""} ${s.lastNameOverride || s.lastNameMoodle || ""}`).toLowerCase();
        return name.includes(searchQuery.toLowerCase());
      }).slice(0, 10)
    : [];

  async function selectStudent(student: Student) {
    setSelectedStudent(student);
    setSearchQuery("");

    const name = student.hebrewName ||
      `${student.firstNameOverride || student.firstNameMoodle || ""} ${student.lastNameOverride || student.lastNameMoodle || ""}`.trim();
    setRecipientName(name);

    // Fetch full student details for address/phone/email
    try {
      const res = await fetch(`/api/students/${student.id}`);
      if (res.ok) {
        const full = await res.json();
        if (full.city) setCity(full.city);
        if (full.address) setAddress(full.address);
        const ph = full.phoneOverride || full.phoneMoodle;
        if (ph) setPhone(ph);
        const em = full.emailOverride || full.emailMoodle;
        if (em) setEmail(em);
      }
    } catch {
      // ignore - user can fill manually
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedStudent) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/shipments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: selectedStudent.id,
          carrier,
          recipientName,
          address,
          city,
          country,
          phone,
          email,
          packageCount,
          remarks,
          sendNow,
          ...(carrier === "dhl" && {
            weight: weight || "1",
            contentDescription,
            postalCode,
          }),
        }),
      });

      if (res.ok) {
        onCreated();
        onClose();
      }
    } catch (e) {
      console.error("Failed to create shipment:", e);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-lg bg-card border border-border shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold">📦 משלוח חדש</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground text-xl"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {/* Student selection */}
          <div>
            <label className="block text-sm font-medium mb-1">בחר תלמיד</label>
            {selectedStudent ? (
              <div className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2">
                <span className="font-medium">
                  {selectedStudent.hebrewName ||
                    `${selectedStudent.firstNameOverride || selectedStudent.firstNameMoodle || ""} ${selectedStudent.lastNameOverride || selectedStudent.lastNameMoodle || ""}`.trim()}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedStudent(null)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  שנה
                </button>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="חפש לפי שם תלמיד..."
                  className="w-full rounded-md border border-input px-3 py-2 text-sm"
                />
                {loadingStudents && (
                  <div className="absolute left-3 top-2.5 text-xs text-muted-foreground">
                    טוען...
                  </div>
                )}
                {filteredStudents.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full rounded-md border border-border bg-card shadow-lg max-h-48 overflow-y-auto">
                    {filteredStudents.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => selectStudent(s)}
                        className="w-full px-3 py-2 text-sm text-right hover:bg-muted/50 border-b border-border last:border-b-0"
                      >
                        {s.hebrewName ||
                          `${s.firstNameOverride || s.firstNameMoodle || ""} ${s.lastNameOverride || s.lastNameMoodle || ""}`.trim()}
                        {s.city && (
                          <span className="text-xs text-muted-foreground mr-2">
                            ({s.city})
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Carrier */}
          <div>
            <label className="block text-sm font-medium mb-1">חברת משלוחים</label>
            <select
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
              className="w-full rounded-md border border-input px-3 py-2 text-sm bg-background"
            >
              <option value="yahav_baldar">יהב / בלדר (ארץ)</option>
              <option value="dhl">DHL (חו&quot;ל)</option>
              <option value="other">אחר</option>
            </select>
          </div>

          {/* Recipient details */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">שם הנמען</label>
              <input
                type="text"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                required
                className="w-full rounded-md border border-input px-3 py-2 text-sm"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">כתובת</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full rounded-md border border-input px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">עיר</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                required
                className="w-full rounded-md border border-input px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">ארץ</label>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full rounded-md border border-input px-3 py-2 text-sm bg-background"
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">טלפון</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-md border border-input px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">אימייל</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-input px-3 py-2 text-sm"
              />
            </div>
          </div>

          {/* DHL-specific fields */}
          {carrier === "dhl" && (
            <div className="grid grid-cols-2 gap-3 rounded-md border border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/30 p-3">
              <div className="col-span-2 text-xs font-medium text-yellow-700 dark:text-yellow-400">
                🌍 פרטים למשלוח בינלאומי (DHL)
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">מיקוד</label>
                <input
                  type="text"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  className="w-full rounded-md border border-input px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">משקל (ק&quot;ג)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="1"
                  className="w-full rounded-md border border-input px-3 py-2 text-sm"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">תיאור תכולה (לצרכי מכס)</label>
                <input
                  type="text"
                  value={contentDescription}
                  onChange={(e) => setContentDescription(e.target.value)}
                  className="w-full rounded-md border border-input px-3 py-2 text-sm"
                />
              </div>
            </div>
          )}

          {/* Package details */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">מספר חבילות</label>
              <input
                type="number"
                min={1}
                value={packageCount}
                onChange={(e) => setPackageCount(parseInt(e.target.value) || 1)}
                className="w-full rounded-md border border-input px-3 py-2 text-sm"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={sendNow}
                  onChange={(e) => setSendNow(e.target.checked)}
                  className="rounded"
                />
                שלח מיד לחברת המשלוחים
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">הערות</label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-input px-3 py-2 text-sm"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted"
            >
              ביטול
            </button>
            <button
              type="submit"
              disabled={!selectedStudent || submitting}
              className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {submitting ? "יוצר משלוח..." : "צור משלוח"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
