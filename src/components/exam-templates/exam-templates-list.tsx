"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PlusIcon } from "@heroicons/react/24/outline";

export function ExamTemplatesList() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchTemplates = async () => {
    try {
      const res = await fetch("/api/exam-templates");
      const data = await res.json();
      if (res.ok) setTemplates(data.templates);
      else setError(data.error);
    } catch {
      setError("שגיאה בגישה לשרת");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("האם למחוק מבחן זה לחלוטין?")) return;
    try {
      await fetch(`/api/exam-templates/${id}`, { method: "DELETE" });
      fetchTemplates();
    } catch {
      alert("שגיאה במחיקה");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">מבחנים ומטלות</h2>
        <Link 
          href="/exams/create"
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition"
        >
          <PlusIcon className="w-5 h-5" />
          <span>צור חדש באמצעות אשף</span>
        </Link>
      </div>

      {loading ? (
         <div className="text-center text-muted-foreground py-10">טוען...</div>
      ) : error ? (
         <div className="text-red-500">{error}</div>
      ) : templates.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 border border-dashed rounded-lg text-gray-500">
          אין מבחנים במערכת. צור את המבחן הראשון!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map(template => (
            <div key={template.id} className="bg-white rounded-lg border border-border p-5 hover:border-blue-400 transition">
              <div className="flex justify-between items-start mb-2">
                <Link href={`/exams/${template.id}`} className="font-semibold text-lg hover:text-blue-600 line-clamp-1">
                  {template.title}
                </Link>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                  template.status === "published" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
                }`}>
                  {template.status === "published" ? "פורסם" : "טיוטה"}
                </span>
              </div>
              <div className="text-sm text-gray-500 mb-4 line-clamp-2 min-h-10">
                {template.description || "ללא תיאור"}
              </div>
              
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs">
                  {template.type === "exam" ? "מבחן" : "מטלה"}
                </span>
                <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs">
                  {template._count.questions} שאלות
                </span>
                <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs">
                  {template._count.examTemplateUnits} יחידות מקושרות
                </span>
                {template.course && (
                  <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded text-xs">
                    {template.course.fullNameOverride || template.course.fullNameMoodle}
                  </span>
                )}
              </div>

              <div className="border-t pt-3 flex justify-between items-center">
                <Link href={`/exams/${template.id}`} className="text-blue-600 text-sm font-medium hover:underline">
                  עריכת שאלות
                </Link>
                <button onClick={() => handleDelete(template.id)} className="text-red-500 text-sm hover:underline">
                  מחיקה
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
