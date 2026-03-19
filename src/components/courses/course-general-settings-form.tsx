"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export function CourseGeneralSettingsForm({
  courseId,
  initialData,
}: {
  courseId: string;
  initialData: any;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  
  const [dayOfWeek, setDayOfWeek] = useState(initialData.dayOfWeek ?? "");
  const [startDate, setStartDate] = useState(initialData.startDate ? new Date(initialData.startDate).toISOString().split('T')[0] : "");
  const [hebrewStartDate, setHebrewStartDate] = useState(initialData.hebrewStartDate || "");
  const [hours, setHours] = useState(initialData.hours || "");
  const [mainLecturerId, setMainLecturerId] = useState(initialData.mainLecturerId || "");
  
  const [lecturers, setLecturers] = useState<any[]>([]);
  const [showAddLecturer, setShowAddLecturer] = useState(false);
  const [newLecturerName, setNewLecturerName] = useState("");
  const [newLecturerEmail, setNewLecturerEmail] = useState("");

  useEffect(() => {
    fetch("/api/lecturers")
      .then((res) => res.json())
      .then((data) => setLecturers(data || []))
      .catch(console.error);
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await fetch(`/api/courses/${courseId}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dayOfWeek: dayOfWeek === "" ? null : dayOfWeek,
          startDate: startDate || null,
          hebrewStartDate,
          hours,
          mainLecturerId,
        }),
      });
      router.refresh();
      alert("הגדרות נשמרו בהצלחה!");
    } catch (error) {
      console.error(error);
      alert("שגיאה בשמירת הגדרות");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddLecturer() {
    if (!newLecturerName) return;
    try {
      const parts = newLecturerName.split(" ");
      const firstName = parts[0];
      const lastName = parts.slice(1).join(" ") || " ";
      const res = await fetch("/api/lecturers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, email: newLecturerEmail }),
      });
      const newLecturer = await res.json();
      setLecturers([...lecturers, newLecturer]);
      setMainLecturerId(newLecturer.id);
      setShowAddLecturer(false);
      setNewLecturerName("");
      setNewLecturerEmail("");
    } catch (error) {
      console.error(error);
      alert("שגיאה בהוספת מרצה");
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h2 className="text-lg font-semibold mb-4">הגדרות כלליות לקורס</h2>
      <form onSubmit={handleSave} className="space-y-4">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">יום בשבוע</label>
            <select
              value={dayOfWeek}
              onChange={(e) => setDayOfWeek(e.target.value)}
              className="w-full rounded-md border p-2"
            >
              <option value="">בחר יום</option>
              <option value="0">ראשון</option>
              <option value="1">שני</option>
              <option value="2">שלישי</option>
              <option value="3">רביעי</option>
              <option value="4">חמישי</option>
              <option value="5">שישי</option>
              <option value="6">שבת</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">שעות הקורס</label>
            <input
              type="text"
              placeholder="18:00 - 21:00"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              className="w-full rounded-md border p-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">תאריך התחלה לועזי</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-md border p-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">תאריך התחלה עברי</label>
            <input
              type="text"
              placeholder="למשל: א' אלול תשפ״ו"
              value={hebrewStartDate}
              onChange={(e) => setHebrewStartDate(e.target.value)}
              className="w-full rounded-md border p-2"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">מרצה ראשי / רב</label>
            <div className="flex gap-2">
              <select
                value={mainLecturerId}
                onChange={(e) => setMainLecturerId(e.target.value)}
                className="flex-1 rounded-md border p-2 bg-background"
              >
                <option value="">ללא מרצה ראשי</option>
                {lecturers.map((l) => (
                  <option key={l.id} value={l.id}>{l.firstName} {l.lastName}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowAddLecturer(!showAddLecturer)}
                className="px-4 py-2 bg-slate-100 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-200"
              >
                + הוסף מרצה
              </button>
            </div>
            
            {showAddLecturer && (
              <div className="mt-2 p-4 border rounded-md bg-slate-50 flex gap-2">
                <input 
                  type="text" 
                  placeholder="שם מלא" 
                  value={newLecturerName}
                  onChange={(e) => setNewLecturerName(e.target.value)}
                  className="flex-1 border p-2 rounded-md bg-white"
                />
                <input 
                  type="email" 
                  placeholder="אימייל" 
                  value={newLecturerEmail}
                  onChange={(e) => setNewLecturerEmail(e.target.value)}
                  className="flex-1 border p-2 rounded-md bg-white"
                />
                <button type="button" onClick={handleAddLecturer} className="bg-blue-600 text-white px-4 rounded-md font-medium hover:bg-blue-700">שמור מרצה</button>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "שומר..." : "שמור הגדרות"}
          </button>
        </div>
      </form>
    </div>
  );
}