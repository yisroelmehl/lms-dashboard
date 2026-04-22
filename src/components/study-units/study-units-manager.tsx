"use client";

import { useState, useEffect } from "react";

interface StudyUnit {
  id: string;
  title: string;
  unitNumber: number;
}

interface StudySemester {
  id: string;
  name: string;
  number: number;
  studyUnits: StudyUnit[];
  _count?: { studyUnits: number };
}

interface StudySubject {
  id: string;
  name: string;
  studySemesters: StudySemester[];
}

export function StudyUnitsManager() {
  const [subjects, setSubjects] = useState<StudySubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [newSubjectName, setNewSubjectName] = useState("");
  const [creatingSubject, setCreatingSubject] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const [addingSemesterTo, setAddingSemesterTo] = useState<string | null>(null);
  const [newSemesterName, setNewSemesterName] = useState("");
  const [newSemesterNumber, setNewSemesterNumber] = useState(1);

  const [uploadingSemesterId, setUploadingSemesterId] = useState<string | null>(null);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadSeparator, setUploadSeparator] = useState("---");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());

  const fetchSubjects = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/study-subjects");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSubjects(data);
    } catch {
      setError("שגיאה בטעינת נושאי הלימוד");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSubjects(); }, []);

  const handleSyncFromTags = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/study-subjects/sync-from-tags", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        alert(`יובאו ${data.created} נושאים חדשים (${data.skipped} כבר קיימים)`);
        fetchSubjects();
      } else {
        alert(data.error || "שגיאה בייבוא");
      }
    } finally {
      setSyncing(false);
    }
  };

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectName.trim()) return;
    setCreatingSubject(true);
    try {
      const res = await fetch("/api/study-subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newSubjectName.trim() }),
      });
      if (!res.ok) {
        const d = await res.json();
        alert(d.error || "שגיאה ביצירת נושא");
        return;
      }
      setNewSubjectName("");
      fetchSubjects();
    } finally {
      setCreatingSubject(false);
    }
  };

  const handleCreateSemester = async (subjectId: string) => {
    if (!newSemesterName.trim()) return;
    try {
      const res = await fetch(`/api/study-subjects/${subjectId}/study-semesters`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newSemesterName.trim(), number: newSemesterNumber }),
      });
      if (!res.ok) {
        const d = await res.json();
        alert(d.error || "שגיאה ביצירת סמסטר");
        return;
      }
      setAddingSemesterTo(null);
      setNewSemesterName("");
      setNewSemesterNumber(1);
      fetchSubjects();
    } catch {
      alert("שגיאת תקשורת");
    }
  };

  const handleUpload = async (semesterId: string) => {
    if (!uploadFiles.length) { setUploadError("אנא בחר קבצים"); return; }
    setUploading(true);
    setUploadError("");
    const formData = new FormData();
    uploadFiles.forEach(f => formData.append("file", f));
    formData.append("studySemesterId", semesterId);
    formData.append("separator", uploadSeparator);
    try {
      const res = await fetch("/api/study-units/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) { setUploadError(data.error || "שגיאה בהעלאה"); return; }
      if (data.errors?.length) setUploadError(data.errors.join(" | "));
      else { setUploadingSemesterId(null); setUploadFiles([]); }
      alert(data.message);
      fetchSubjects();
    } catch {
      setUploadError("שגיאת תקשורת");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteUnit = async (unitId: string) => {
    if (!confirm("למחוק יחידת לימוד זו?")) return;
    await fetch(`/api/study-units/${unitId}`, { method: "DELETE" });
    fetchSubjects();
  };

  const toggleSubject = (id: string) => {
    setExpandedSubjects(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  if (loading) return <div className="text-center py-12 text-gray-500">טוען...</div>;
  if (error) return <div className="text-red-600 p-4">{error}</div>;

  return (
    <div className="space-y-6" dir="rtl">
      {/* Create subject */}
      <form onSubmit={handleCreateSubject} className="flex gap-2 items-center">
        <input
          type="text"
          value={newSubjectName}
          onChange={e => setNewSubjectName(e.target.value)}
          placeholder="שם נושא חדש (תנ״ך, הלכה...)"
          className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={creatingSubject || !newSubjectName.trim()}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap"
        >
          + צור נושא
        </button>
      </form>

      <div className="flex justify-end">
        <button
          onClick={handleSyncFromTags}
          disabled={syncing}
          className="text-xs px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 text-gray-600"
        >
          {syncing ? "מייבא..." : "↓ ייבא נושאים מדף הקורסים"}
        </button>
      </div>

      {subjects.length === 0 && (
        <div className="text-center py-12 text-gray-400 border-2 border-dashed rounded-lg">
          אין נושאים עדיין. צור נושא ראשון למעלה.
        </div>
      )}

      <div className="space-y-4">
        {subjects.map(subject => {
          const isExpanded = expandedSubjects.has(subject.id);
          const totalUnits = subject.studySemesters.reduce(
            (sum, s) => sum + (s.studyUnits?.length ?? s._count?.studyUnits ?? 0), 0
          );
          return (
            <div key={subject.id} className="border rounded-lg overflow-hidden shadow-sm">
              <button
                onClick={() => toggleSubject(subject.id)}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 text-right"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold">{subject.name}</span>
                  <span className="text-xs text-gray-500 bg-white border rounded-full px-2 py-0.5">
                    {subject.studySemesters.length} סמסטרים · {totalUnits} יחידות
                  </span>
                </div>
                <span className="text-gray-400">{isExpanded ? "▲" : "▼"}</span>
              </button>

              {isExpanded && (
                <div className="p-4 space-y-4">
                  {subject.studySemesters.map(semester => (
                    <div key={semester.id} className="border rounded-lg p-3 bg-white">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">{semester.name}</span>
                        <button
                          onClick={() => {
                            setUploadingSemesterId(uploadingSemesterId === semester.id ? null : semester.id);
                            setUploadFiles([]);
                            setUploadError("");
                          }}
                          className="text-xs px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                        >
                          + העלה קובץ
                        </button>
                      </div>

                      {uploadingSemesterId === semester.id && (
                        <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg text-sm space-y-2">
                          <input
                            type="file"
                            accept=".docx,.pdf,.txt"
                            multiple
                            onChange={e => setUploadFiles(Array.from(e.target.files || []))}
                            className="w-full border rounded p-1.5 text-sm bg-white"
                          />
                          {uploadFiles.length > 0 && (
                            <p className="text-xs text-green-700">{uploadFiles.length} קבצים נבחרו</p>
                          )}
                          <div className="flex gap-2 items-center">
                            <label className="text-xs text-gray-600 whitespace-nowrap">מפריד:</label>
                            <input
                              type="text"
                              value={uploadSeparator}
                              onChange={e => setUploadSeparator(e.target.value)}
                              className="w-20 border rounded px-2 py-1 text-xs"
                            />
                            <span className="text-xs text-gray-400">(מחלק קובץ ליחידות)</span>
                          </div>
                          {uploadError && <p className="text-red-600 text-xs">{uploadError}</p>}
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleUpload(semester.id)}
                              disabled={uploading || !uploadFiles.length}
                              className="px-3 py-1.5 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:opacity-50"
                            >
                              {uploading ? "מעבד..." : "העלה ופרק ליחידות"}
                            </button>
                            <button
                              onClick={() => setUploadingSemesterId(null)}
                              className="px-3 py-1.5 border text-xs rounded hover:bg-gray-50"
                            >
                              ביטול
                            </button>
                          </div>
                        </div>
                      )}

                      {semester.studyUnits && semester.studyUnits.length > 0 ? (
                        <ul className="space-y-1">
                          {semester.studyUnits.map(unit => (
                            <li key={unit.id} className="flex items-center justify-between text-xs bg-gray-50 px-2 py-1.5 rounded">
                              <span className="text-gray-700 truncate flex-1">{unit.title}</span>
                              <button
                                onClick={() => handleDeleteUnit(unit.id)}
                                className="text-red-400 hover:text-red-600 mr-2 flex-shrink-0"
                                title="מחק"
                              >
                                ✕
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-gray-400 text-center py-2">אין יחידות עדיין</p>
                      )}
                    </div>
                  ))}

                  {addingSemesterTo === subject.id ? (
                    <div className="border border-dashed rounded-lg p-3 space-y-2 text-sm">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newSemesterName}
                          onChange={e => setNewSemesterName(e.target.value)}
                          placeholder="שם סמסטר (סמסטר א, מחצית א...)"
                          className="flex-1 border rounded px-2 py-1.5 text-sm"
                        />
                        <input
                          type="number"
                          value={newSemesterNumber}
                          onChange={e => setNewSemesterNumber(Number(e.target.value))}
                          min={1}
                          className="w-16 border rounded px-2 py-1.5 text-sm"
                          title="מספר סמסטר"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleCreateSemester(subject.id)}
                          disabled={!newSemesterName.trim()}
                          className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50"
                        >
                          צור
                        </button>
                        <button
                          onClick={() => { setAddingSemesterTo(null); setNewSemesterName(""); }}
                          className="px-3 py-1.5 border text-xs rounded hover:bg-gray-50"
                        >
                          ביטול
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setAddingSemesterTo(subject.id)}
                      className="w-full text-xs text-blue-600 border border-dashed border-blue-300 rounded-lg py-2 hover:bg-blue-50"
                    >
                      + הוסף סמסטר
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
