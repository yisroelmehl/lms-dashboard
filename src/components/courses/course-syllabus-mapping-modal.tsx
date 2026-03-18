"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface MoodleActivity {
  cmid: number;
  name: string;
  modname: string;
  sectionName: string;
}

interface SyllabusItem {
  id: string;
  title: string;
  type: string;
  isMapped: boolean;
  moodleCmId: number | null;
  moodleActivityType: string | null;
}

export function CourseSyllabusMappingModal({
  isOpen,
  onClose,
  courseId,
  syllabusItems,
}: {
  isOpen: boolean;
  onClose: () => void;
  courseId: string;
  syllabusItems: SyllabusItem[];
}) {
  const router = useRouter();
  const [activities, setActivities] = useState<MoodleActivity[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState("");
  
  // Local state to hold the unsaved mappings temporarily before API call
  const [mappings, setMappings] = useState<Record<string, number | null>>({});

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      setError("");
      
      // Initialize local mappings state from database props
      const initialMappings: Record<string, number | null> = {};
      for (const item of syllabusItems) {
        initialMappings[item.id] = item.moodleCmId;
      }
      setMappings(initialMappings);

      // Fetch moodle activities
      fetch(`/api/courses/${courseId}/moodle-activities`)
        .then(res => res.json())
        .then(data => {
          if (data.error) {
            setError(data.error);
          } else {
            setActivities(data.activities || []);
          }
        })
        .catch(() => setError("שגיאה בטעינת פעילויות מהמודל"))
        .finally(() => setLoading(false));
    }
  }, [isOpen, courseId, syllabusItems]);

  const handleMapChange = (itemId: string, cmidValue: string) => {
    const cmid = cmidValue ? parseInt(cmidValue) : null;
    setMappings(prev => ({ ...prev, [itemId]: cmid }));
  };

  const handleSaveMapping = async (item: SyllabusItem) => {
    setSaving(item.id);
    const selectedCmid = mappings[item.id];
    const selectedActivity = activities.find(a => a.cmid === selectedCmid);
    
    try {
      await fetch(`/api/courses/${courseId}/syllabus/map`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: item.id,
          moodleCmId: selectedCmid,
          moodleActivityType: selectedActivity?.modname || null,
        }),
      });
      router.refresh();
    } catch {
      alert("שגיאה בשמירת מיפוי. אנא נסה שוב.");
    } finally {
      setSaving(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-lg bg-card shadow-xl border border-border overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-border bg-slate-50">
          <div>
            <h2 className="text-xl font-bold text-indigo-900">מיפוי סילבוס לפעילויות במודל</h2>
            <p className="text-sm text-slate-500 mt-1">
              בחר עבור כל פריט סילבוס שיצרת, מהי הפעילות המתאימה שלו במודל (כדי שנעקוב אחרי הביצוע והציונים).
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-2 rounded-full hover:bg-slate-200">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-white">
          {error && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded">{error}</div>}
          
          {loading ? (
            <div className="text-center py-12 text-slate-500">טוען פעילויות מהמודל...</div>
          ) : activities.length === 0 ? (
            <div className="text-center py-12 bg-amber-50 rounded text-amber-700">
              לא נמצאו פעילויות מקושרות מהמודל. ייתכן שהקורס ריק, או שאין חיבור למודל.
            </div>
          ) : syllabusItems.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded text-slate-600">
              הסילבוס התיאורטי שלך ריק. הוסף קודם מפגשים ומבחנים במסך מנהל הסילבוס לפני שתמפה אותם.
            </div>
          ) : (
            <table className="w-full text-sm text-right">
              <thead>
                <tr className="border-b-2 border-slate-200 text-slate-600">
                  <th className="pb-3 pr-2 w-1/4">פריט בסילבוס (שלך)</th>
                  <th className="pb-3 pr-2 w-1/6">סוג הפריט</th>
                  <th className="pb-3 pr-2 w-1/2">בחירת פעילות מקבילה במודל</th>
                  <th className="pb-3 pr-2 w-24 text-center">פעולה</th>
                </tr>
              </thead>
              <tbody>
                {syllabusItems.map((item) => {
                  const currentSavedMapped = item.moodleCmId;
                  const localMapped = mappings[item.id];
                  const hasChanged = localMapped !== currentSavedMapped;
                  const isSaved = item.isMapped && !hasChanged;

                  return (
                    <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="py-4 pr-2 font-medium text-slate-800">
                        {item.title}
                        {isSaved && <span className="mr-2 text-green-600 text-xs">✓</span>}
                      </td>
                      <td className="py-4 pr-2 text-slate-500">
                        {item.type === "lesson" ? "📹 שיעור" : item.type === "exam" ? "📝 מבחן" : "📄 מטלה"}
                      </td>
                      <td className="py-4 pr-2">
                        <select 
                          className={`w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 ${isSaved ? 'bg-green-50 border-green-200' : hasChanged ? 'bg-amber-50 border-amber-300' : 'bg-white'}`}
                          value={localMapped === null ? "" : localMapped.toString()}
                          onChange={(e) => handleMapChange(item.id, e.target.value)}
                        >
                          <option value="">-- בחר פעילות --</option>
                          {activities.map((a) => (
                            <option key={a.cmid} value={a.cmid}>
                              [{a.sectionName}] {a.name} ({a.modname})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-4 pr-2 text-center">
                        <button
                          onClick={() => handleSaveMapping(item)}
                          disabled={saving === item.id || !hasChanged}
                          className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                            !hasChanged 
                              ? "bg-slate-100 text-slate-400 cursor-not-allowed" 
                              : "bg-indigo-600 text-white hover:bg-indigo-700"
                          }`}
                        >
                          {saving === item.id ? "שומר..." : isSaved ? "נשמר" : "שמור שידוך"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="p-6 border-t border-border bg-slate-50 text-left">
          <button
            onClick={onClose}
            className="rounded-md border border-slate-300 bg-white px-6 py-2 text-sm font-medium hover:bg-slate-50"
          >
            סגור חלונית
          </button>
        </div>
      </div>
    </div>
  );
}
