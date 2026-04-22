"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function PortalForm() {
  const params = useSearchParams();
  const error = params.get("error");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      await fetch("/api/student-auth/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-950 to-blue-900 flex flex-col" dir="rtl">
      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-16 text-center">
        <div className="mb-8">
          <div className="text-6xl mb-4">📚</div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">
            למען ילמדו
          </h1>
          <p className="text-blue-200 text-lg md:text-xl max-w-md mx-auto">
            פורטל הסטודנטים — כניסה לקורסים ומעקב אישי
          </p>
        </div>

        {/* Login card */}
        <div className="w-full max-w-sm bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 shadow-2xl">
          {sent ? (
            <div className="text-center">
              <div className="text-4xl mb-4">✉️</div>
              <h2 className="text-white text-xl font-bold mb-2">הקישור נשלח!</h2>
              <p className="text-blue-200 text-sm">
                בדוק את תיבת הדואר שלך ולחץ על הקישור להתחברות.
              </p>
              <button
                onClick={() => setSent(false)}
                className="mt-4 text-blue-300 text-sm underline"
              >
                שלח שוב
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-white text-xl font-bold mb-1">כניסה לפורטל</h2>
              <p className="text-blue-300 text-sm mb-6">
                הכנס את כתובת המייל שלך ונשלח לך קישור כניסה
              </p>

              {error === "expired" && (
                <div className="mb-4 text-red-300 text-sm bg-red-900/30 rounded-lg px-3 py-2">
                  הקישור פג תוקף. בקש קישור חדש.
                </div>
              )}
              {error === "invalid" && (
                <div className="mb-4 text-red-300 text-sm bg-red-900/30 rounded-lg px-3 py-2">
                  קישור לא תקין.
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3">
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="כתובת מייל"
                  required
                  className="w-full rounded-xl bg-white/10 border border-white/30 text-white placeholder-blue-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  dir="ltr"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-500 hover:bg-blue-400 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-colors text-sm"
                >
                  {loading ? "שולח..." : "שלח קישור כניסה"}
                </button>
              </form>
            </>
          )}
        </div>

        {/* Features */}
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-2xl w-full text-center">
          {[
            { icon: "🎓", title: "הקורסים שלך", desc: "גישה מהירה לכל הקורסים שנרשמת אליהם" },
            { icon: "📋", title: "מבחנים ומשימות", desc: "צפה בציונים ובמשימות הפתוחות שלך" },
            { icon: "🔒", title: "כניסה מאובטחת", desc: "קישור אישי לכל התחברות — ללא סיסמה" },
          ].map(f => (
            <div key={f.title} className="bg-white/5 rounded-xl p-5 border border-white/10">
              <div className="text-3xl mb-2">{f.icon}</div>
              <h3 className="text-white font-semibold text-sm mb-1">{f.title}</h3>
              <p className="text-blue-300 text-xs">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <footer className="text-center text-blue-400 text-xs py-4">
        © למען ילמדו — כל הזכויות שמורות
      </footer>
    </div>
  );
}

export default function PortalPage() {
  return (
    <Suspense>
      <PortalForm />
    </Suspense>
  );
}
