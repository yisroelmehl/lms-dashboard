"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AddStudentModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      
      if (res.ok) {
        onClose();
        // Redirect to the new student's profile page
        router.push(`/students/${data.student.id}`);
        router.refresh();
      } else {
        setError(data.error || "אירעה שגיאה ביצירת התלמיד");
      }
    } catch {
      setError("שגיאת תקשורת עם השרת");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-card p-6 shadow-lg border border-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">הוספת תלמיד חדש (ידני)</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            ✕
          </button>
        </div>
        
        <p className="text-sm text-muted-foreground mb-6">
          הזן פרטים ראשוניים. לאחר יצירת הכרטיס, תוכל לשלוח לתלמיד לינק להשלמת שאר הפרטים שלו (כתובת, חברותא וכו').
        </p>

        {error && (
          <div className="mb-4 rounded bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">שם פרטי *</label>
              <input
                required
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
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
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">כתובת אימייל *</label>
            <input
              required
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              dir="ltr"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">טלפון נייד</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              dir="ltr"
              placeholder="050-0000000"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="mt-6 flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              ביטול
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "יוצר כרטיס..." : "צור כרטיס תלמיד"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
