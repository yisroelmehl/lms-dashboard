"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function LecturersHeader() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/lecturers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: formData.get("firstName"),
          lastName: formData.get("lastName") || " ",
          email: formData.get("email"),
          phone: formData.get("phone"),
        }),
      });
      if (res.ok) {
        setShowAddModal(false);
        router.refresh();
      } else {
        alert("שגיאה ביצירת מרצה");
      }
    } catch (e) {
      alert("שגיאה");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">סגל המרצים</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 font-medium shadow-sm"
        >
          + הוסף מרצה
        </button>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg border">
            <h2 className="mb-4 text-xl font-bold text-slate-800">הוספת מרצה חדש</h2>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">שם פרטי *</label>
                  <input name="firstName" required className="w-full rounded-md border p-2" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">שם משפחה</label>
                  <input name="lastName" className="w-full rounded-md border p-2" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">אימייל</label>
                  <input name="email" type="email" className="w-full rounded-md border p-2" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">טלפון</label>
                  <input name="phone" type="tel" className="w-full rounded-md border p-2" />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-md border bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  ביטול
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? "שומר..." : "הוסף מרצה"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}