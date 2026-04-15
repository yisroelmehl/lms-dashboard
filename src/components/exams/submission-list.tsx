"use client";

import { useState } from "react";
import { SubmissionFeedback } from "./submission-feedback";

interface Submission {
  id: string;
  fileName: string;
  fileType: string;
  studentName: string | null;
  gradingStatus: string;
  grade: number | null;
  maxGrade: number | null;
  feedback: any;
  extractedText: string | null;
  createdAt: string;
  student: {
    id: string;
    firstNameMoodle: string | null;
    firstNameOverride: string | null;
    lastNameMoodle: string | null;
    lastNameOverride: string | null;
  } | null;
}

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: "ממתין", color: "bg-gray-100 text-gray-700" },
  processing: { label: "בבדיקה...", color: "bg-yellow-100 text-yellow-700" },
  graded: { label: "נבדק", color: "bg-green-100 text-green-700" },
  error: { label: "שגיאה", color: "bg-red-100 text-red-700" },
};

interface Props {
  submissions: Submission[];
  examId: string;
  courseStudents?: { id: string; name: string }[];
  onRefresh: () => void;
}

export function SubmissionList({
  submissions,
  examId,
  courseStudents = [],
  onRefresh,
}: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [grading, setGrading] = useState(false);

  const getStudentName = (sub: Submission) => {
    if (sub.student) {
      const first =
        sub.student.firstNameOverride || sub.student.firstNameMoodle || "";
      const last =
        sub.student.lastNameOverride || sub.student.lastNameMoodle || "";
      return `${first} ${last}`.trim();
    }
    return sub.studentName || "לא זוהה";
  };

  const handleGradeAll = async () => {
    setGrading(true);
    try {
      const res = await fetch(`/api/exams/${examId}/grade`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "שגיאה בבדיקה");
      }
      onRefresh();
    } catch {
      alert("שגיאה בתהליך הבדיקה");
    } finally {
      setGrading(false);
    }
  };

  const handleAssignStudent = async (submissionId: string, studentId: string) => {
    try {
      await fetch(`/api/exams/${examId}/submissions/${submissionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId }),
      });
      onRefresh();
    } catch {
      alert("שגיאה בשיוך תלמיד");
    }
  };

  if (submissions.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
        עדיין לא הועלו הגשות
      </div>
    );
  }

  const pendingCount = submissions.filter(
    (s) => s.gradingStatus === "pending" || s.gradingStatus === "error"
  ).length;

  return (
    <div className="space-y-4">
      {pendingCount > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
          <span className="text-sm">
            {pendingCount} הגשות ממתינות לבדיקה
          </span>
          <button
            onClick={handleGradeAll}
            disabled={grading}
            className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {grading ? "בודק..." : "בדיקה אוטומטית"}
          </button>
        </div>
      )}

      <div className="rounded-lg border border-border bg-card">
        {submissions.map((sub, i) => {
          const status = statusLabels[sub.gradingStatus] || statusLabels.pending;
          const isExpanded = expandedId === sub.id;

          return (
            <div
              key={sub.id}
              className={`${i > 0 ? "border-t border-border" : ""}`}
            >
              <div
                className="flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-muted/50"
                onClick={() => setExpandedId(isExpanded ? null : sub.id)}
              >
                <span className="text-lg">
                  {sub.fileType === "image" ? "🖼️" : sub.fileType === "docx" ? "📄" : "📕"}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{sub.fileName}</p>
                  <p className="text-sm text-muted-foreground">
                    {getStudentName(sub)}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.color}`}
                >
                  {status.label}
                </span>
                {sub.grade !== null && (
                  <span className="text-sm font-medium">
                    {sub.grade}/{sub.maxGrade}
                  </span>
                )}
                <span
                  className={`transition-transform ${isExpanded ? "rotate-180" : ""}`}
                >
                  ▼
                </span>
              </div>

              {isExpanded && (
                <div className="border-t border-border bg-muted/20 px-4 py-4 space-y-3">
                  {/* Student assignment */}
                  {!sub.student && courseStudents.length > 0 && (
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium">שייך לתלמיד:</label>
                      <select
                        className="rounded-md border border-input bg-background px-2 py-1 text-sm"
                        defaultValue=""
                        onChange={(e) => {
                          if (e.target.value)
                            handleAssignStudent(sub.id, e.target.value);
                        }}
                      >
                        <option value="">בחר תלמיד...</option>
                        {courseStudents.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Feedback */}
                  {sub.feedback && (
                    <SubmissionFeedback feedback={sub.feedback} />
                  )}

                  {/* Extracted text preview */}
                  {sub.extractedText && (
                    <details className="text-sm">
                      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                        טקסט שחולץ מהקובץ
                      </summary>
                      <pre className="mt-2 max-h-48 overflow-y-auto rounded bg-muted p-3 text-xs whitespace-pre-wrap">
                        {sub.extractedText.substring(0, 2000)}
                        {sub.extractedText.length > 2000 && "..."}
                      </pre>
                    </details>
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
