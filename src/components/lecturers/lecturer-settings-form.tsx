"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function LecturerSettingsForm({ lecturer }: { lecturer: any }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [firstName, setFirstName] = useState(lecturer.firstName);
  const [lastName, setLastName] = useState(lecturer.lastName);
  const [email, setEmail] = useState(lecturer.email || "");
  const [phone, setPhone] = useState(lecturer.phone || "");
  const [baseRate, setBaseRate] = useState(lecturer.baseRatePerLesson || 0);
  const [bonusRate, setBonusRate] = useState(lecturer.bonusRate || 0);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await fetch(`/api/lecturers/${lecturer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName, lastName, email, phone,
          baseRatePerLesson: Number(baseRate),
          bonusRate: Number(bonusRate),
        }),
      });
      router.refresh();
      alert("פרטי המרצה נשמרו!");
    } catch (e) {
      alert("שגיאה בשמירה");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h2 className="text-lg font-semibold mb-4">הגדרות ופרטים אישיים</h2>
      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 sm:col-span-1">
            <label className="text-sm font-medium mb-1 block">שם פרטי</label>
            <input value={firstName} onChange={e => setFirstName(e.target.value)} required className="w-full border rounded p-2" />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className="text-sm font-medium mb-1 block">שם משפחה</label>
            <input value={lastName} onChange={e => setLastName(e.target.value)} className="w-full border rounded p-2" />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className="text-sm font-medium mb-1 block">אימייל</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full border rounded p-2" />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className="text-sm font-medium mb-1 block">טלפון</label>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full border rounded p-2" />
          </div>
        </div>

        <hr className="my-4" />
        <h3 className="font-medium text-slate-700">הגדרות תשלום (בשקלים)</h3>
        
        <div className="grid grid-cols-2 gap-4 mt-2">
          <div>
            <label className="text-sm font-medium mb-1 block">תעריף בסיס לשיעור</label>
            <div className="relative">
              <span className="absolute right-3 top-2 text-muted-foreground">₪</span>
              <input type="number" value={baseRate} onChange={e => setBaseRate(e.target.value)} className="w-full border rounded py-2 pr-8 pl-2 text-left" dir="ltr" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">תוספת נסיעות/בונוס</label>
            <div className="relative">
              <span className="absolute right-3 top-2 text-muted-foreground">₪</span>
              <input type="number" value={bonusRate} onChange={e => setBonusRate(e.target.value)} className="w-full border rounded py-2 pr-8 pl-2 text-left" dir="ltr" />
            </div>
          </div>
        </div>

        <div className="pt-4 flex justify-end">
          <button type="submit" disabled={saving} className="bg-blue-600 text-white px-4 py-2 rounded font-medium hover:bg-blue-700 disabled:opacity-50">
            {saving ? "שומר..." : "שמור פרטים"}
          </button>
        </div>
      </form>
    </div>
  );
}