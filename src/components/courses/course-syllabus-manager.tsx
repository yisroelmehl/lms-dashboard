"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CourseSyllabusMappingModal } from "./course-syllabus-mapping-modal";
import { PublishToMoodleModal } from "./publish-to-moodle-modal";
import { GenerateQuizModal } from "./generate-quiz-modal";

interface Semester {
  id: string;
  name: string;
}

interface SyllabusItem {
  id: string;
  semesterId: string | null;
  title: string;
  type: string; // 'lesson', 'exam', 'assignment'
  sortOrder: number;
  isMapped: boolean;
  moodleCmId: number | null;
  moodleActivityType: string | null;
  publishedToMoodle: boolean;
  quizData: any;
  scheduledAt: string | Date | null;
  recordingUrl: string | null;
  zoomJoinUrl: string | null;
}

interface CourseSyllabusManagerProps {
  courseId: string;
  moodleCourseId: number | null;
  semesters: Semester[];
  initialItems: SyllabusItem[];
}

export function CourseSyllabusManager({
  courseId,
  moodleCourseId,
  semesters,
  initialItems,
}: CourseSyllabusManagerProps) {
  const router = useRouter();
  const [items, setItems] = useState<SyllabusItem[]>(initialItems);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    title: "",
    type: "lesson",
    semesterId: semesters.length > 0 ? semesters[0].id : "",
    sortOrder: "10",
    moodleCmId: "" as string,
    scheduledAt: "",
    recordingUrl: "",
    zoomJoinUrl: "",
  });

  const [isMappingOpen, setIsMappingOpen] = useState(false);
  const [publishItem, setPublishItem] = useState<SyllabusItem | null>(null);
  const [generateQuizItem, setGenerateQuizItem] = useState<SyllabusItem | null>(null);
  const [moodleActivities, setMoodleActivities] = useState<{ cmid: number; name: string; modname: string; sectionName: string }[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);

  // Fetch Moodle activities when editing starts
  useEffect(() => {
    if (editingId && moodleActivities.length === 0) {
      setActivitiesLoading(true);
      fetch(`/api/courses/${courseId}/moodle-activities`)
        .then(res => res.json())
        .then(data => {
          if (data.activities) setMoodleActivities(data.activities);
        })
        .catch(() => {})
        .finally(() => setActivitiesLoading(false));
    }
  }, [editingId, courseId, moodleActivities.length]);

  const handleOpenAdd = () => {
    setFormData({
      title: "",
      type: "lesson",
      semesterId: semesters.length > 0 ? semesters[0].id : "",
      sortOrder: (items.length * 10 + 10).toString(),
      moodleCmId: "",
      scheduledAt: "",
      recordingUrl: "",
      zoomJoinUrl: "",
    });
    setIsAdding(true);
    setEditingId(null);
    setError("");
  };

  const handleOpenEdit = (item: SyllabusItem) => {
    setFormData({
      title: item.title,
      type: item.type,
      semesterId: item.semesterId || "",
      sortOrder: item.sortOrder.toString(),
      moodleCmId: item.moodleCmId ? item.moodleCmId.toString() : "",
      scheduledAt: item.scheduledAt ? new Date(item.scheduledAt).toISOString().slice(0, 16) : "",
      recordingUrl: item.recordingUrl || "",
      zoomJoinUrl: item.zoomJoinUrl || "",
    });
    setEditingId(item.id);
    setIsAdding(false);
    setError("");
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setError("");
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const url = `/api/courses/${courseId}/syllabus`;
      const method = editingId ? "PUT" : "POST";
      const { moodleCmId, scheduledAt, recordingUrl, zoomJoinUrl, ...rest } = formData;
      const extras = {
        scheduledAt: scheduledAt || null,
        recordingUrl: recordingUrl || null,
        zoomJoinUrl: zoomJoinUrl || null,
      };
      const body = editingId
        ? { ...rest, ...extras, id: editingId, moodleCmId: moodleCmId ? parseInt(moodleCmId) : null }
        : { ...rest, ...extras };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (res.ok) {
        if (editingId) {
          setItems(items.map((i) => (i.id === editingId ? data.item : i)));
        } else {
          setItems([...items, data.item]);
        }
        setItems(prev => [...prev].sort((a, b) => a.sortOrder - b.sortOrder));
        handleCancel();
        router.refresh();
      } else {
        setError(data.error || "שגיאה בשמירת פריט סילבוס");
      }
    } catch {
      setError("שגיאה בתקשורת מול השרת");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (itemId: string) => {
    if (!confirm("האם ברצונך למחוק פריט זה מהסילבוס? זה לא ימחק את הפעילות במודל, רק את הקישור במערכת.")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/syllabus?itemId=${itemId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setItems(items.filter((i) => i.id !== itemId));
        router.refresh();
      } else {
        setError("שגיאה במחיקת הפריט");
      }
    } catch {
      setError("שגיאה בתקשורת");
    } finally {
      setLoading(false);
    }
  };

  // Group items by semester
  const groupedItems = items.reduce((acc, item) => {
    const semId = item.semesterId || "unassigned";
    if (!acc[semId]) acc[semId] = [];
    acc[semId].push(item);
    return acc;
  }, {} as Record<string, SyllabusItem[]>);

  return (
    <div className="rounded-lg border border-border bg-card p-6 mt-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <span>📚</span> מנהל סילבוס (מפגשים ומבחנים)
        </h2>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMappingOpen(true)}
            className="rounded-md border border-indigo-600 text-indigo-700 bg-indigo-50 px-3 py-1.5 text-sm font-medium hover:bg-indigo-100 transition-colors"
          >
            🔄 מפה פעילויות למודל
          </button>
          {!isAdding && !editingId && (
            <button
              onClick={handleOpenAdd}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              + הוסף פריט לסילבוס
            </button>
          )}
        </div>
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        כאן תגדיר את התוכנית התיאורטית של הקורס. לאחר מכן תוכל למפות כל פריט לפעילות ספציפית במודל.
      </p>

      {error && <div className="mb-4 text-sm text-red-600 bg-red-50 p-3 rounded">{error}</div>}

      {(isAdding || editingId) && (
        <form onSubmit={handleSave} className="mb-6 bg-slate-50 p-4 rounded-md border border-slate-200">
          <h3 className="font-medium mb-3">{editingId ? "ערוך פריט" : "פריט סילבוס חדש"}</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="md:col-span-2">
              <label className="block text-xs text-muted-foreground mb-1">שם הפריט (למשל: מפגש 1, מבחן אמצע) *</label>
              <input required type="text" name="title" value={formData.title} onChange={handleChange} className="w-full border rounded px-3 py-1.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">סוג *</label>
              <select name="type" value={formData.type} onChange={handleChange} className="w-full border rounded px-3 py-1.5 text-sm bg-white">
                <option value="lesson">שיעור / מפגש</option>
                <option value="exam">מבחן</option>
                <option value="assignment">מטלה / תרגיל</option>
                <option value="quiz">חידון</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">שיוך לסמסטר</label>
              <select name="semesterId" value={formData.semesterId} onChange={handleChange} className="w-full border rounded px-3 py-1.5 text-sm bg-white">
                <option value="">ללא שיוך</option>
                {semesters.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>

          {/* Schedule + media (relevant mainly for lessons) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">תאריך ושעת המפגש</label>
              <input
                type="datetime-local"
                name="scheduledAt"
                value={formData.scheduledAt}
                onChange={handleChange}
                className="w-full border rounded px-3 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">🎥 URL הקלטה</label>
              <input
                type="url"
                dir="ltr"
                name="recordingUrl"
                value={formData.recordingUrl}
                onChange={handleChange}
                placeholder="https://stream..."
                className="w-full border rounded px-3 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">📺 קישור Zoom</label>
              <input
                type="url"
                dir="ltr"
                name="zoomJoinUrl"
                value={formData.zoomJoinUrl}
                onChange={handleChange}
                placeholder="https://zoom.us/j/..."
                className="w-full border rounded px-3 py-1.5 text-sm"
              />
            </div>
          </div>

          {/* Moodle mapping - shown in edit mode */}
          {editingId && (
            <div className="mb-4">
              <label className="block text-xs text-muted-foreground mb-1">🔗 שיוך ידני לפעילות במודל</label>
              {activitiesLoading ? (
                <p className="text-xs text-slate-400">טוען פעילויות מהמודל...</p>
              ) : moodleActivities.length > 0 ? (
                <select
                  name="moodleCmId"
                  value={formData.moodleCmId}
                  onChange={handleChange}
                  className={`w-full border rounded px-3 py-1.5 text-sm bg-white ${formData.moodleCmId ? 'border-green-300 bg-green-50' : ''}`}
                >
                  <option value="">-- ללא שיוך למודל --</option>
                  {moodleActivities.map((a) => (
                    <option key={a.cmid} value={a.cmid}>
                      [{a.sectionName}] {a.name} ({a.modname})
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-xs text-slate-400">לא נמצאו פעילויות במודל לקורס זה</p>
              )}
            </div>
          )}
          <div className="flex gap-3">
            <button type="submit" disabled={loading} className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm hover:bg-blue-700 disabled:opacity-50">
              {loading ? "שומר..." : "שמור"}
            </button>
            <button type="button" onClick={handleCancel} disabled={loading} className="text-slate-600 border border-slate-300 px-4 py-1.5 rounded text-sm hover:bg-slate-100">
              ביטול
            </button>
          </div>
        </form>
      )}

      {items.length === 0 ? (
        <div className="text-center py-8 bg-slate-50 rounded border border-dashed border-slate-300">
          <p className="text-sm text-slate-500">הסילבוס ריק. הוסף שיעורים ומבחנים כדי לבנות את תוכנית הקורס.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Unassigned items */}
          {groupedItems["unassigned"] && groupedItems["unassigned"].length > 0 && (
            <div>
              <h4 className="text-sm font-bold text-slate-700 border-b pb-2 mb-2">ללא שיוך לסמסטר</h4>
              <div className="space-y-2">
                {groupedItems["unassigned"].map((item) => <SyllabusItemRow key={item.id} item={item} onEdit={handleOpenEdit} onDelete={handleDelete} onPublish={setPublishItem} onGenerateQuiz={setGenerateQuizItem} loading={loading} />)}
              </div>
            </div>
          )}

          {/* Assigned items, ordered by semester */}
          {semesters.map((semester) => {
            const semItems = groupedItems[semester.id] || [];
            if (semItems.length === 0) return null;
            return (
              <div key={semester.id}>
                <h4 className="text-sm font-bold text-blue-800 border-b pb-2 mb-2">{semester.name}</h4>
                <div className="space-y-2">
                  {semItems.map((item) => <SyllabusItemRow key={item.id} item={item} onEdit={handleOpenEdit} onDelete={handleDelete} onPublish={setPublishItem} onGenerateQuiz={setGenerateQuizItem} loading={loading} />)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Mapping Modal */}
      <CourseSyllabusMappingModal
        isOpen={isMappingOpen}
        onClose={() => {
          setIsMappingOpen(false);
          router.refresh();
        }}
        courseId={courseId}
        syllabusItems={items}
      />

      {/* Generate Quiz Modal */}
      {generateQuizItem && (
        <GenerateQuizModal
          syllabusItem={generateQuizItem}
          onClose={() => setGenerateQuizItem(null)}
          onGenerated={() => {
            setItems(items.map((i) =>
              i.id === generateQuizItem.id ? { ...i, quizData: true } : i
            ));
            setGenerateQuizItem(null);
            router.refresh();
          }}
        />
      )}

      {/* Publish to Moodle Modal */}
      {publishItem && (
        <PublishToMoodleModal
          syllabusItem={publishItem}
          courseId={courseId}
          moodleCourseId={moodleCourseId}
          onClose={() => setPublishItem(null)}
          onPublished={() => {
            setItems(items.map((i) =>
              i.id === publishItem.id ? { ...i, publishedToMoodle: true } : i
            ));
            setPublishItem(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function SyllabusItemRow({ item, onEdit, onDelete, onPublish, onGenerateQuiz, loading }: { item: SyllabusItem, onEdit: (i: SyllabusItem) => void, onDelete: (id: string) => void, onPublish: (i: SyllabusItem) => void, onGenerateQuiz: (i: SyllabusItem) => void, loading: boolean }) {
  const icon = item.type === "lesson" ? "📹" : item.type === "exam" ? "📝" : item.type === "quiz" ? "❓" : "📄";
  const typeLabel = item.type === "lesson" ? "שיעור" : item.type === "exam" ? "מבחן" : item.type === "quiz" ? "חידון" : "מטלה";
  const canPublish = (item.type === "exam" || item.type === "assignment" || item.type === "quiz") && !item.publishedToMoodle;

  return (
    <div className="flex items-center justify-between p-3 border rounded-md hover:bg-slate-50 transition-colors">
      <div className="flex items-center gap-3">
        <span className="text-lg">{icon}</span>
        <div>
          <p className="font-medium text-sm">{item.title}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-slate-500">{typeLabel}</span>
            {item.isMapped ? (
              <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">ממופה למודל ✓</span>
            ) : (
              <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">טרם מופה</span>
            )}
            {item.quizData && (
              <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-medium">חידון AI 🪄</span>
            )}
            {item.publishedToMoodle && (
              <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-medium">פורסם למודל 🚀</span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {(item.type === "exam" || item.type === "assignment" || item.type === "quiz") && !item.quizData && (
          <button onClick={() => onGenerateQuiz(item)} disabled={loading} className="text-indigo-600 text-sm hover:underline disabled:opacity-50">🪄 צור חידון AI</button>
        )}
        {canPublish && (
          <button onClick={() => onPublish(item)} disabled={loading} className="text-purple-600 text-sm hover:underline disabled:opacity-50">פרסם למודל</button>
        )}
        <button onClick={() => onEdit(item)} disabled={loading} className="text-blue-600 text-sm hover:underline disabled:opacity-50">ערוך</button>
        <button onClick={() => onDelete(item.id)} disabled={loading} className="text-red-500 text-sm hover:underline disabled:opacity-50">מחק</button>
      </div>
    </div>
  );
}
