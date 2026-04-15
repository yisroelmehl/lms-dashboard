"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DriveFilePicker } from "./drive-file-picker";

interface Course {
  id: string;
  name: string;
  driveFolderId: string | null;
}

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
}

export function ExamBuilder({ courses }: { courses: Course[] }) {
  const router = useRouter();
  const [courseId, setCourseId] = useState("");
  const [title, setTitle] = useState("");
  const [type, setType] = useState<"exam" | "assignment">("exam");
  const [prompt, setPrompt] = useState("");
  const [questionCount, setQuestionCount] = useState(10);
  const [questionType, setQuestionType] = useState("mixed");
  const [pointsPerQuestion, setPointsPerQuestion] = useState(10);
  const [selectedFiles, setSelectedFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [examDate, setExamDate] = useState("");
  const [dueDate, setDueDate] = useState("");

  const selectedCourse = courses.find((c) => c.id === courseId);

  const handleCreate = async () => {
    if (!courseId || !title) {
      setError("יש לבחור קורס ולהזין כותרת");
      return;
    }

    if (!prompt && selectedFiles.length === 0) {
      setError("יש לכתוב פרומפט או לבחור קבצים מהדרייב");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Step 1: Create the exam template
      const createRes = await fetch("/api/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId,
          title,
          type,
          examDate: examDate || null,
          dueDate: dueDate || null,
        }),
      });

      if (!createRes.ok) {
        const data = await createRes.json();
        throw new Error(data.error || "שגיאה ביצירת המבחן");
      }

      const exam = await createRes.json();

      // Step 2: Generate with AI
      const genRes = await fetch(`/api/exams/${exam.id}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          fileIds: selectedFiles.map((f) => f.id),
          fileNames: selectedFiles.map((f) => f.name),
          fileMimeTypes: selectedFiles.map((f) => f.mimeType),
          questionCount,
          questionType,
          pointsPerQuestion,
        }),
      });

      if (!genRes.ok) {
        const data = await genRes.json();
        throw new Error(data.error || "שגיאה ביצירת השאלות");
      }

      router.push(`/exams/${exam.id}`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Course Selection */}
      <div className="rounded-lg border border-border bg-card p-6 space-y-4">
        <h2 className="text-lg font-semibold">פרטי המבחן</h2>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium mb-1">קורס *</label>
            <select
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">בחר קורס...</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">כותרת *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="שם המבחן או המטלה"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">סוג</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as "exam" | "assignment")}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="exam">מבחן</option>
              <option value="assignment">מטלה</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">תאריך מבחן</label>
            <input
              type="date"
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Drive File Picker */}
      {selectedCourse?.driveFolderId ? (
        <DriveFilePicker
          folderId={selectedCourse.driveFolderId}
          selectedFiles={selectedFiles}
          onSelectionChange={setSelectedFiles}
        />
      ) : courseId ? (
        <div className="rounded-lg border border-border bg-card p-6 text-center">
          <p className="text-muted-foreground">
            לקורס זה לא מוגדרת תיקיית Google Drive.
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            ניתן להגדיר תיקיית Drive בהגדרות הקורס, או לכתוב פרומפט ישיר.
          </p>
        </div>
      ) : null}

      {/* AI Configuration */}
      <div className="rounded-lg border border-border bg-card p-6 space-y-4">
        <h2 className="text-lg font-semibold">הגדרות יצירת שאלות</h2>

        <div>
          <label className="block text-sm font-medium mb-1">
            פרומפט / הנחיות ליצירת המבחן
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="תאר מה סוג המבחן שאתה רוצה: נושאים, רמת קושי, דגשים מיוחדים..."
            rows={4}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="block text-sm font-medium mb-1">מספר שאלות</label>
            <select
              value={questionCount}
              onChange={(e) => setQuestionCount(Number(e.target.value))}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {[3, 5, 7, 10, 15, 20].map((n) => (
                <option key={n} value={n}>
                  {n} שאלות
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">סוג שאלות</label>
            <select
              value={questionType}
              onChange={(e) => setQuestionType(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="mixed">מעורב</option>
              <option value="multiple_choice">אמריקאיות בלבד</option>
              <option value="open_ended">פתוחות בלבד</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">ניקוד לשאלה</label>
            <select
              value={pointsPerQuestion}
              onChange={(e) => setPointsPerQuestion(Number(e.target.value))}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {[5, 10, 15, 20, 25].map((n) => (
                <option key={n} value={n}>
                  {n} נקודות
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Submit */}
      <div className="flex justify-end">
        <button
          onClick={handleCreate}
          disabled={loading}
          className="rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? "יוצר מבחן..." : "יצירת מבחן עם AI"}
        </button>
      </div>
    </div>
  );
}
