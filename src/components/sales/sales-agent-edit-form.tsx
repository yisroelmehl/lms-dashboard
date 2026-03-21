"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  agent: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    isActive: boolean;
  };
}

export function SalesAgentEditForm({ agent }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    firstName: agent.firstName,
    lastName: agent.lastName,
    email: agent.email,
    phone: agent.phone,
    isActive: agent.isActive,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData({ ...formData, [name]: type === "checkbox" ? checked : value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      const res = await fetch(`/api/sales-agents/${agent.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setSuccess(true);
        router.refresh();
        setTimeout(() => setSuccess(false), 3000);
      } else {
        const data = await res.json();
        setError(data.error || "אירעה שגיאה");
      }
    } catch {
      setError("שגיאת תקשורת");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-border bg-card p-4 space-y-4">
      <h2 className="text-lg font-semibold">עריכת פרטים</h2>

      {error && <div className="rounded bg-red-50 p-2 text-sm text-red-600">{error}</div>}
      {success && <div className="rounded bg-green-50 p-2 text-sm text-green-600">נשמר בהצלחה</div>}

      <div>
        <label className="mb-1 block text-sm font-medium">שם פרטי</label>
        <input
          type="text"
          name="firstName"
          value={formData.firstName}
          onChange={handleChange}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">שם משפחה</label>
        <input
          type="text"
          name="lastName"
          value={formData.lastName}
          onChange={handleChange}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>
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
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          name="isActive"
          checked={formData.isActive}
          onChange={handleChange}
          id="isActive"
          className="rounded border-input"
        />
        <label htmlFor="isActive" className="text-sm">פעיל</label>
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-primary py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
      >
        {loading ? "שומר..." : "שמור שינויים"}
      </button>
    </form>
  );
}
