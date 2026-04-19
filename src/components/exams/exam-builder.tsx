"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DriveFilePicker } from "./drive-file-picker";

interface LearningUnitFile {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
}

interface LearningUnit {
  id: string;
  name: string;
  description: string | null;
  files: LearningUnitFile[];
}

interface Course {
  id: string;
  name: string;
  driveFolderId: string | null;
  learningUnits: LearningUnit[];
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
  const [selectedDriveFiles, setSelectedDriveFiles] = useState<DriveFile[]>([]);
  const [selectedUnitIds, setSelectedUnitIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [examDate, setExamDate] = useState("");
  const [dueDate, setDueDate] = useState("");

  const selectedCourse = courses.find((c) => c.id === courseId);
  const hasLearningUnits = (selectedCourse?.learningUnits.length ?? 0) > 0;

  const toggleUnit = (unitId: string) => {
    setSelectedUnitIds((prev) => {
      const next = new Set(prev);
      if (next.has(unitId)) next.delete(unitId);
      else next.add(unitId);
      return next;
    });
  };

  const selectedUnitsWithFiles = selectedCourse?.learningUnits.filter((u) =>
    selectedUnitIds.has(u.id)
  ) ?? [];

  const totalSelectedFiles = selectedUnitsWithFiles.reduce(
    (acc, u) => acc + u.files.length,
    0
  );

  const handleCreate = async () => {
    if (!courseId || !title) {
      setError("יש לבחור קורס ולהזין כותרת");
      return;
    }

    const hasSource =
      prompt ||
      selectedDriveFiles.length > 0 ||
      selectedUnitIds.size > 0;

    if (!hasSource) {
      setError("יש לכתוב פרומפט, לבחור יחידות לימוד, או לבחור קבצים מהדרייב");
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
          fileIds: selectedDriveFiles.map((f) => f.id),
          fileNames: selectedDriveFiles.map((f) => f.name),
          fileMimeTypes: selectedDriveFiles.map((f) => f.mimeType),
          learningUnitIds: Array.from(selectedUnitIds),
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
      {/* Course + Details */}
      <div className="rounded-lg border border-border bg-card p-6 space-y-4">
        <h2 className="text-lg font-semibold">פרטי המבחן</h2>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium mb-1">קורס *</label>
            <select
              value={courseId}
              onChange={(e) => {
                setCourseId(e.target.value);
                setSelectedUnitIds(new Set());
                setSelectedDriveFiles([]);
              }}
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

      {/* Learning Unit Selector */}
      {courseId && (
        <div className="rounded-lg border border-border bg-card p-6 space-y-3">
          <h2 className="text-lg font-semibold">בחר יחידות לימוד כמקור</h2>

          {!hasLearningUnits ? (
            <p className="text-sm text-muted-foreground">
              לקורס זה אין יחידות לימוד עם קבצים עדיין.{" "}
              <a
                href={`/courses/${courseId}`}
                className="text-primary underline"
                target="_blank"
              >
                לניהול יחידות הלימוד של הקורס
              </a>
            </p>
          ) : (
            <div className="space-y-2">
              {selectedCourse!.learningUnits.map((unit) => {
                const checked = selectedUnitIds.has(unit.id);
                return (
                  <label
                    key={unit.id}
                    className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                      checked
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleUnit(unit.id)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{unit.name}</p>
                      {unit.description && (
                        <p className="text-xs text-muted-foreground">{unit.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {unit.files.length === 0
                          ? "אין קבצים"
                          : `${unit.files.length} קבצים: ${unit.files.map((f) => f.fileName).join(", ")}`}
                      </p>
                    </div>
                  </label>
                );
              })}

              {selectedUnitIds.size > 0 && (
                <p className="text-xs text-primary mt-1">
                  נבחרו {selectedUnitIds.size} יחידות · {totalSelectedFiles} קבצים ייכללו ביצירה
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Drive File Picker */}
      {selectedCourse?.driveFolderId && (
        <DriveFilePicker
          folderId={selectedCourse.driveFolderId}
          selectedFiles={selectedDriveFiles}
          onSelectionChange={setSelectedDriveFiles}
        />
      )}

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
            placeholder="תאר את סוג המבחן: נושאים, רמת קושי, דגשים מיוחדים..."
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

      {error && (
        <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

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
