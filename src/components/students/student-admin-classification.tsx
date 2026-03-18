"use client";

import { useState } from "react";

interface Props {
  student: {
    id: string;
    sector: string | null;
    studyLevel: string | null;
    engagementLevel: string | null;
    paymentStatus: string | null;
    monthlyPayment: number | null;
    paymentNotes: string | null;
  };
}

export function StudentAdminClassification({ student }: Props) {
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    sector: student.sector || "",
    studyLevel: student.studyLevel || "",
    engagementLevel: student.engagementLevel || "",
    paymentStatus: student.paymentStatus || "",
    monthlyPayment: student.monthlyPayment?.toString() || "",
    paymentNotes: student.paymentNotes || "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/students/${student.id}/classification`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          monthlyPayment: formData.monthlyPayment ? parseFloat(formData.monthlyPayment) : null,
        }),
      });
      if (res.ok) {
        setEditing(false);
      } else {
        setError("שגיאה בשמירת נתונים");
      }
    } catch {
      setError("שגיאה בחיבור");
    } finally {
      setLoading(false);
    }
  };

  if (!editing) {
    return (
      <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-6 relative">
        <button
          onClick={() => setEditing(true)}
          className="absolute top-4 left-4 text-xs font-medium bg-white border border-indigo-200 text-indigo-700 px-3 py-1.5 rounded-md hover:bg-indigo-100 transition"
        >
          ערוך סיווג הנהלה
        </button>
        <h2 className="text-lg font-semibold text-indigo-900 mb-4 flex items-center gap-2">
          <span>🛡️</span> סיווג הנהלה וסטטוס (פנימי)
        </h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
          <div>
            <p className="text-xs text-indigo-500 font-medium mb-1">מגזר</p>
            <p className="font-semibold text-indigo-900">{formData.sector || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-indigo-500 font-medium mb-1">רמת לימודים</p>
            <p className="font-semibold text-indigo-900">{formData.studyLevel || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-indigo-500 font-medium mb-1">רמת השתתפות</p>
            <p className="font-semibold text-indigo-900">{formData.engagementLevel || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-indigo-500 font-medium mb-1">סטטוס תשלום</p>
            <p className={`font-semibold ${formData.paymentStatus === "בפיגור" ? "text-red-600" : "text-indigo-900"}`}>
              {formData.paymentStatus || "—"} 
              {formData.monthlyPayment ? ` (₪${formData.monthlyPayment})` : ""}
            </p>
          </div>
        </div>
        {formData.paymentNotes && (
          <div className="mt-4 text-sm text-indigo-800 bg-white/60 p-3 rounded">
            <span className="font-medium mr-1">הערות הנהלה/גבייה:</span> {formData.paymentNotes}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-indigo-200 bg-white p-6 shadow-sm ring-1 ring-indigo-500">
      <h2 className="text-lg font-semibold text-indigo-900 mb-4">עריכת סיווג הנהלה</h2>
      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">מגזר</label>
          <select name="sector" value={formData.sector} onChange={handleChange} className="w-full rounded border p-2 text-sm bg-slate-50">
            <option value="">בחר...</option>
            <option value="ליטאי">ליטאי</option>
            <option value="חסידי">חסידי</option>
            <option value="ספרדי">ספרדי</option>
            <option value="דתי לאומי">דתי לאומי</option>
            <option value="חוזר בתשובה">חוזר בתשובה</option>
            <option value="אחר">אחר</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">רמת לימודים</label>
          <select name="studyLevel" value={formData.studyLevel} onChange={handleChange} className="w-full rounded border p-2 text-sm bg-slate-50">
            <option value="">בחר...</option>
            <option value="מצוין">מצוין</option>
            <option value="רגיל">רגיל</option>
            <option value="מתקשה">מתקשה</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">רמת פעילות והשתתפות</label>
          <select name="engagementLevel" value={formData.engagementLevel} onChange={handleChange} className="w-full rounded border p-2 text-sm bg-slate-50">
            <option value="">בחר...</option>
            <option value="גבוהה">גבוהה (פעיל מאוד)</option>
            <option value="בינונית">בינונית (סביר)</option>
            <option value="נמוכה">נמוכה (כמעט ולא פעיל)</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">סטטוס תשלום</label>
          <select name="paymentStatus" value={formData.paymentStatus} onChange={handleChange} className="w-full rounded border p-2 text-sm bg-slate-50">
            <option value="">בחר...</option>
            <option value="תקין">תקין</option>
            <option value="בפיגור">בפיגור</option>
            <option value="פטור">פטור (מלגה/עובד)</option>
            <option value="ממתין להסדרה">ממתין להסדרה</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">תשלום חודשי (₪)</label>
          <input type="number" name="monthlyPayment" value={formData.monthlyPayment} onChange={handleChange} className="w-full rounded border p-2 text-sm bg-slate-50" placeholder="לדוג' 450" />
        </div>
        <div className="md:col-span-3">
          <label className="block text-xs font-medium text-slate-700 mb-1">הערות תשלום והנהלה</label>
          <input type="text" name="paymentNotes" value={formData.paymentNotes} onChange={handleChange} className="w-full rounded border p-2 text-sm bg-slate-50" placeholder="הערות אישיות למנהלים..." />
        </div>
      </div>
      
      <div className="flex justify-end gap-3">
        <button onClick={() => setEditing(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded border">
          ביטול
        </button>
        <button onClick={handleSave} disabled={loading} className="px-4 py-2 text-sm text-white bg-indigo-600 hover:bg-indigo-700 rounded disabled:opacity-50">
          {loading ? "שומר..." : "שמור הגדרות"}
        </button>
      </div>
    </div>
  );
}
