"use client";

import { useState } from "react";
import Papa from "papaparse";

export function PaymentSyncForm() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ updated: number; skipped: number; errors: string[] } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = () => {
    if (!file) return;
    
    setLoading(true);
    setResult(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const res = await fetch("/api/sync/payments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ data: results.data }),
          });

          const data = await res.json();
          if (res.ok) {
            setResult(data);
          } else {
            setResult({ updated: 0, skipped: 0, errors: [data.error || "שגיאה בסנכרון הנתונים"] });
          }
        } catch (error) {
          setResult({ updated: 0, skipped: 0, errors: ["שגיאה בתקשורת מול השרת"] });
        } finally {
          setLoading(false);
        }
      },
      error: () => {
        setResult({ updated: 0, skipped: 0, errors: ["שגיאה בקריאת הקובץ. ודא שזהו קובץ CSV תקין."] });
        setLoading(false);
      }
    });
  };

  return (
    <div className="rounded-lg border border-border bg-card p-6 mt-6">
      <h2 className="mb-4 text-lg font-semibold flex items-center gap-2">
        <span>💰</span> סנכרון תשלומי גבייה מאקסל (CSV)
      </h2>
      <p className="text-sm text-muted-foreground mb-4">
        העלה קובץ אקסל (שמור כ-CSV) עם העמודות <strong>email</strong> ו-<strong>amount</strong> (סכום התשלום החודשי). <br />
        המערכת תחפש תלמידים לפי האימייל (או של המודל או הידני) ותעדכן להם את התשלום החודשי.
      </p>

      <div className="flex items-center gap-4">
        <input 
          type="file" 
          accept=".csv" 
          onChange={handleFileChange}
          className="block w-full max-w-sm text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
        <button
          onClick={handleUpload}
          disabled={!file || loading}
          className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors disabled:opacity-50"
        >
          {loading ? "מייבא..." : "התחל סנכרון תשלומים"}
        </button>
      </div>

      {result && (
        <div className={`mt-4 p-4 rounded-md ${result.errors.length > 0 && result.updated === 0 ? "bg-red-50" : "bg-green-50"}`}>
          <p className="font-semibold mb-2">תוצאות הסנכרון:</p>
          <ul className="text-sm space-y-1">
            <li className="text-green-700">✓ עותכנו תשלומים ל-{result.updated} תלמידים</li>
            <li className="text-slate-600">○ דולגו (אימייל לא נמצא): {result.skipped} שורות</li>
          </ul>
          {result.errors.length > 0 && (
            <div className="mt-2 text-sm text-red-600">
              <p className="font-semibold">שגיאות/אזהרות:</p>
              <ul className="list-disc list-inside mt-1 max-h-32 overflow-y-auto">
                {result.errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
