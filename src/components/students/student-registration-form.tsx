"use client";

import { useState } from "react";

interface InitialData {
  hebrewName: string;
  email: string;
  phone: string;
  city: string;
  address: string;
  dateOfBirth: string;
  torahBackground: string;
  smichaBackground: string;
  studyPreferences: string;
  hasChavrusa: boolean;
  participationType: string;
}

export function StudentRegistrationForm({
  studentId,
  initialData,
}: {
  studentId: string;
  initialData: InitialData;
}) {
  const [formData, setFormData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = type === "checkbox" ? (e.target as HTMLInputElement).checked : undefined;
    
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      const res = await fetch(`/api/students/${studentId}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hebrewName: formData.hebrewName,
          phone: formData.phone,
          city: formData.city,
          address: formData.address,
          dateOfBirth: formData.dateOfBirth,
          torahBackground: formData.torahBackground,
          smichaBackground: formData.smichaBackground,
          studyPreferences: formData.studyPreferences,
          hasChavrusa: formData.hasChavrusa,
          participationType: formData.participationType,
        }),
      });

      if (res.ok) {
        setSuccess(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        const data = await res.json();
        setError(data.error || "אירעה שגיאה בשמירת הנתונים");
      }
    } catch {
      setError("שגיאה בחיבור לשרת");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 mb-6">
          <span className="text-2xl text-green-600">✓</span>
        </div>
        <h2 className="text-2xl font-semibold text-slate-800 mb-2">תודה רבה!</h2>
        <p className="text-slate-600 mb-8 text-lg">
          הפרטים שלך נקלטו במערכת בהצלחה. אתה יכול לסגור חלון זה.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8" dir="rtl">
      {error && (
        <div className="rounded-md bg-red-50 p-4 mb-6">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Basic Info Section */}
      <div>
        <h3 className="text-lg font-medium text-slate-900 border-b pb-2 mb-4">פרטים אישיים</h3>
        <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700">אימייל <span className="text-slate-400 text-xs">(לקריאה בלבד)</span></label>
            <input
              type="text"
              disabled
              value={formData.email}
              className="mt-1 block w-full rounded-md border border-slate-300 bg-slate-100 px-3 py-2 text-slate-500 shadow-sm sm:text-sm cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">שם בעברית (מלא)</label>
            <input
              type="text"
              name="hebrewName"
              value={formData.hebrewName}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
              placeholder="ישראל ישראלי"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">טלפון נייד</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
              placeholder="050-0000000"
              required
              dir="ltr"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">תאריך לידה</label>
            <input
              type="date"
              name="dateOfBirth"
              value={formData.dateOfBirth}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">עיר מגורים</label>
            <input
              type="text"
              name="city"
              value={formData.city}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">כתובת מגורים מלאה</label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
            />
          </div>
        </div>
      </div>

      {/* Academic Background */}
      <div className="pt-4">
        <h3 className="text-lg font-medium text-slate-900 border-b pb-2 mb-4">רקע אקדמי ותורני</h3>
        <div className="space-y-6">
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">אופן השתתפות מועדף בשיעורים</label>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2">
                <input type="radio" name="participationType" value="פיזי" checked={formData.participationType === "פיזי"} onChange={handleChange} className="text-blue-600" />
                <span>השתתפות פיזית בכיתה</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="participationType" value="זום" checked={formData.participationType === "זום"} onChange={handleChange} className="text-blue-600" />
                <span>צפייה מרחוק בשידורי זום (Live)</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="participationType" value="הקלטות" checked={formData.participationType === "הקלטות"} onChange={handleChange} className="text-blue-600" />
                <span>למידה באמצעות הקלטות</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">האם יש לך חברותא ללימודים בקורס?</label>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2">
                <input type="radio" name="hasChavrusa" value="true" checked={formData.hasChavrusa === true} onChange={() => setFormData(p => ({ ...p, hasChavrusa: true }))} className="text-blue-600" />
                <span>כן</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="hasChavrusa" value="false" checked={formData.hasChavrusa === false} onChange={() => setFormData(p => ({ ...p, hasChavrusa: false }))} className="text-blue-600" />
                <span>לא, אשמח שישדכו לי מישהו</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">רקע תורני כללי (איפה למדת בעבר? איזה ישיבות?)</label>
            <textarea
              name="torahBackground"
              rows={3}
              value={formData.torahBackground}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
              placeholder="למשל: למדתי בישיבת חברון / בעל תשובה 5 שנים / כולל חזון איש..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">רקע קודם בלימודי הסמכה לרבנות (אם יש)</label>
            <textarea
              name="smichaBackground"
              rows={2}
              value={formData.smichaBackground}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
              placeholder="האם נבחנת ברבנות הראשית בעבר? באילו נושאים?"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">ציפיות והעדפות אישיות בלימוד</label>
            <textarea
              name="studyPreferences"
              rows={2}
              value={formData.studyPreferences}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
              placeholder="מה חשוב לך לקבל מהתכנית? דגשים אישיים..."
            />
          </div>

        </div>
      </div>

      <div className="pt-6 border-t border-slate-200">
        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors text-lg"
        >
          {loading ? "מעדכן נתונים..." : "שליחת טופס"}
        </button>
      </div>
    </form>
  );
}
