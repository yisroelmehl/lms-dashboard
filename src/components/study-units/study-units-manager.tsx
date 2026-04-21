"use client";

import { useState, useEffect } from "react";
import { StudyUnitUploadModal } from "./study-unit-upload-modal";

interface Course {
  id: string;
  fullNameOverride: string | null;
  fullNameMoodle: string | null;
}

interface Tag {
  id: string;
  name: string;
}

interface StudyUnit {
  id: string;
  title: string;
  description: string | null;
  content: string;
  unitNumber: number;
  course: Course | null;
  tag: Tag | null;
}

export function StudyUnitsManager() {
  const [units, setUnits] = useState<StudyUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Filters
  const [courses, setCourses] = useState<Course[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedTag, setSelectedTag] = useState("");

  const fetchUnits = async () => {
    setLoading(true);
    try {
      let url = "/api/study-units?";
      if (selectedCourse) url += `courseId=${selectedCourse}&`;
      if (selectedTag) url += `tagId=${selectedTag}&`;
      
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) setUnits(data.units);
      else setError(data.error);
    } catch {
      setError("שגיאה בשליפת היחידות");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Fetch courses and tags for filters
    Promise.all([
      fetch("/api/courses").then(r => r.json()),
      fetch("/api/tags?category=subject").then(r => r.json())
    ]).then(([cData, tData]) => {
      setCourses(cData.courses || cData || []);
      setTags(tData.tags || tData || []);
    });
  }, []);

  useEffect(() => {
    fetchUnits();
  }, [selectedCourse, selectedTag]);

  const handleDelete = async (id: string) => {
    if (!confirm("האם למחוק יחידת לימוד זו באופן מוחלט?")) return;
    
    try {
      const res = await fetch(`/api/study-units/${id}`, { method: "DELETE" });
      if (res.ok) fetchUnits();
      else alert("שגיאה במחיקה");
    } catch {
      alert("שגיאת תקשורת");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">יחידות לימוד וחומרי עזר</h2>
        <button
          onClick={() => setIsUploadModalOpen(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700"
        >
          + ייבוא קובץ טקסט/Word/PDF
        </button>
      </div>

      <div className="flex gap-4 p-4 bg-white rounded-lg border border-gray-200">
        <div>
          <label className="block text-xs text-gray-500 mb-1">סנן לפי קורס</label>
          <select 
            value={selectedCourse} 
            onChange={e => setSelectedCourse(e.target.value)}
            className="border rounded px-3 py-1.5 text-sm"
          >
            <option value="">הכל</option>
            {courses.map(c => (
              <option key={c.id} value={c.id}>{c.fullNameOverride || c.fullNameMoodle}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">סנן לפי נושא (תגית)</label>
          <select 
            value={selectedTag} 
            onChange={e => setSelectedTag(e.target.value)}
            className="border rounded px-3 py-1.5 text-sm"
          >
            <option value="">הכל</option>
            {tags.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10">טוען...</div>
      ) : error ? (
        <div className="text-red-500">{error}</div>
      ) : units.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 border border-dashed rounded-lg text-gray-500">
          לא נמצאו יחידות לימוד. התחל בייבוא קובץ חדש.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {units.map(unit => (
            <div key={unit.id} className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md transition">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-lg line-clamp-1">{unit.title}</h3>
                <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs">
                  יחידה {unit.unitNumber}
                </span>
              </div>
              <div className="text-xs text-gray-500 mb-4 h-10 line-clamp-2">
                {unit.content.substring(0, 150)}...
              </div>
              <div className="flex gap-2 mb-4">
                {unit.course && <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs">{unit.course.fullNameOverride || unit.course.fullNameMoodle}</span>}
                {unit.tag && <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded text-xs">{unit.tag.name}</span>}
              </div>
              <div className="border-t pt-3 flex justify-between">
                <button className="text-blue-600 text-sm hover:underline">פרטים ועריכה</button>
                <button onClick={() => handleDelete(unit.id)} className="text-red-500 text-sm hover:underline">מחיקה</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {isUploadModalOpen && (
        <StudyUnitUploadModal
          courses={courses}
          tags={tags}
          onClose={() => setIsUploadModalOpen(false)}
          onSuccess={() => {
            setIsUploadModalOpen(false);
            fetchUnits();
          }}
        />
      )}
    </div>
  );
}
