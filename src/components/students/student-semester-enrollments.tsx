"use client";

import { useState } from "react";
import { formatDateHe } from "@/lib/utils";
import { HebrewDateDisplay } from "@/components/ui/hebrew-date-display";

interface SemesterEnrollmentProps {
  studentId: string;
  enrollmentId: string;
  courseId: string;
  courseName: string;
  semesters: {
    id: string;
    name: string;
    sortOrder: number;
    enrollment?: {
      id: string;
      status: string;
      joinedAt: string | null;
    };
  }[];
}

export function StudentSemesterEnrollments({
  studentId,
  enrollmentId,
  courseName,
  semesters,
}: SemesterEnrollmentProps) {
  const [editing, setEditing] = useState<string | null>(null);
  const [localData, setLocalData] = useState(
    semesters.map((s) => ({
      semesterId: s.id,
      status: s.enrollment?.status || "unregistered", // default for no record
      joinedAt: s.enrollment?.joinedAt ? s.enrollment.joinedAt.split("T")[0] : "",
    }))
  );
  const [loading, setLoading] = useState<string | null>(null);

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active": return { label: "פעיל / לומד", color: "bg-green-100 text-green-700" };
      case "completed": return { label: "סיים בהצלחה", color: "bg-blue-100 text-blue-700" };
      case "suspended": return { label: "מוקפא", color: "bg-amber-100 text-amber-700" };
      case "withdrawn": return { label: "פרש", color: "bg-red-100 text-red-700" };
      case "exempt": return { label: "פטור / אושר מראש", color: "bg-purple-100 text-purple-700" };
      default: return { label: "טרם נרשם / לא פעיל", color: "bg-slate-100 text-slate-500" };
    }
  };

  const handleUpdate = async (semesterId: string) => {
    const data = localData.find((d) => d.semesterId === semesterId);
    if (!data || data.status === "unregistered") {
      setEditing(null);
      return;
    }

    setLoading(semesterId);
    try {
      await fetch(`/api/students/${studentId}/semesters`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          semesterId,
          enrollmentId,
          status: data.status,
          joinedAt: data.joinedAt || null,
        }),
      });
      setEditing(null);
    } catch (e) {
      console.error(e);
      alert("שגיאה בשמירת נתוני הסמסטר");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4 mt-4 text-sm">
      <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
        <span>📅</span> מעקב סמסטרים: {courseName}
      </h3>
      
      {semesters.length === 0 ? (
        <p className="text-muted-foreground">לא הוגדרו סמסטרים לקורס זה במערכת.</p>
      ) : (
        <div className="space-y-2">
          {semesters.map((semester) => {
            const data = localData.find((d) => d.semesterId === semester.id)!;
            const isEditing = editing === semester.id;
            const statusInfo = getStatusLabel(data.status);

            return (
              <div key={semester.id} className={`flex items-center justify-between p-2 rounded border ${isEditing ? "border-blue-300 bg-blue-50" : "border-slate-100 bg-slate-50"} transition-colors`}>
                <div className="w-1/3 font-medium text-slate-700">{semester.name}</div>
                
                {isEditing ? (
                  <div className="flex-1 flex items-center justify-end gap-3">
                    <select 
                      value={data.status} 
                      onChange={(e) => setLocalData(prev => prev.map(p => p.semesterId === semester.id ? { ...p, status: e.target.value } : p))}
                      className="border rounded px-2 py-1 text-xs"
                    >
                      <option value="unregistered">לא רשום</option>
                      <option value="active">פעיל</option>
                      <option value="completed">סיים</option>
                      <option value="exempt">פטור</option>
                      <option value="suspended">הקפאה</option>
                      <option value="withdrawn">פרש</option>
                    </select>

                    <div className="flex flex-col items-start gap-0.5 text-xs">
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground">תאריך:</span>
                        <input 
                          type="date" 
                          value={data.joinedAt}
                          onChange={(e) => setLocalData(prev => prev.map(p => p.semesterId === semester.id ? { ...p, joinedAt: e.target.value } : p))}
                          className="border rounded px-2 py-1 text-xs w-32"
                        />
                      </div>
                      <HebrewDateDisplay dateValue={data.joinedAt} />
                    </div>
                    
                    <button 
                      onClick={() => handleUpdate(semester.id)} 
                      disabled={loading === semester.id}
                      className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700 disabled:opacity-50"
                    >
                      {loading === semester.id ? "שומר..." : "שמור"}
                    </button>
                    <button 
                      onClick={() => setEditing(null)} 
                      className="text-slate-500 hover:text-slate-700 text-xs px-2"
                    >
                      ביטול
                    </button>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-between pl-2">
                    <div className="flex gap-4 items-center">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                      {data.joinedAt && data.status !== "unregistered" && (
                        <span className="text-xs text-muted-foreground">
                          מ: {formatDateHe(new Date(data.joinedAt))}
                        </span>
                      )}
                    </div>
                    <button 
                      onClick={() => setEditing(semester.id)}
                      className="text-xs text-blue-600 hover:underline px-2 py-1"
                    >
                      ערוך
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
