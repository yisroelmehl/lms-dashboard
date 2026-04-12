"use client";

import { useState } from "react";

interface Props {
  syllabusItem: {
    id: string;
    title: string;
    description: string | null;
    type: string;
    maxScore: number | null;
    courseId: string;
    courseName: string;
  };
  student: {
    id: string;
    name: string;
    email: string;
  };
  existingSubmission: {
    answers: Record<string, unknown>;
    grade: number | null;
    feedback: string | null;
    submittedAt: string;
    gradedAt: string | null;
  } | null;
}

export default function EmbedAssignmentClient({
  syllabusItem,
  student,
  existingSubmission,
}: Props) {
  const [answers, setAnswers] = useState<string>(
    existingSubmission
      ? JSON.stringify(existingSubmission.answers, null, 2)
      : ""
  );
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(!!existingSubmission);
  const [error, setError] = useState<string | null>(null);

  const typeLabel =
    syllabusItem.type === "exam"
      ? "מבחן"
      : syllabusItem.type === "assignment"
      ? "מטלה"
      : syllabusItem.type === "quiz"
      ? "בוחן"
      : syllabusItem.type;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      let parsedAnswers: Record<string, unknown>;
      try {
        parsedAnswers = JSON.parse(answers);
      } catch {
        // If not valid JSON, wrap as text answer
        parsedAnswers = { text: answers };
      }

      const response = await fetch(
        `/api/assignments/${syllabusItem.id}/submit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentId: student.id,
            courseId: syllabusItem.courseId,
            answers: parsedAnswers,
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "שגיאה בשליחת המטלה");
      }

      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בשליחה");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-slate-800">
              {typeLabel}: {syllabusItem.title}
            </h1>
            <p className="text-sm text-slate-500">{syllabusItem.courseName}</p>
          </div>
          <div className="text-left text-sm text-slate-500">
            <p className="font-medium text-slate-700">{student.name}</p>
            <p>{student.email}</p>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto p-6">
        {/* Description */}
        {syllabusItem.description && (
          <div className="bg-white rounded-lg border border-slate-200 p-6 mb-6">
            <h2 className="font-semibold text-slate-700 mb-2">הנחיות</h2>
            <div
              className="text-slate-600 prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: syllabusItem.description }}
            />
            {syllabusItem.maxScore && (
              <p className="mt-3 text-sm text-slate-500">
                ניקוד מקסימלי: {syllabusItem.maxScore}
              </p>
            )}
          </div>
        )}

        {/* Already submitted */}
        {submitted && existingSubmission && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center space-y-3">
            <span className="text-3xl">✅</span>
            <h2 className="text-xl font-bold text-green-800">
              המטלה הוגשה בהצלחה
            </h2>
            <p className="text-green-700">
              הוגש ב-{new Date(existingSubmission.submittedAt).toLocaleString("he-IL")}
            </p>
            {existingSubmission.grade != null && (
              <p className="text-lg font-semibold text-green-800">
                ציון: {existingSubmission.grade}
                {syllabusItem.maxScore ? ` / ${syllabusItem.maxScore}` : ""}
              </p>
            )}
            {existingSubmission.feedback && (
              <div className="mt-4 bg-white rounded-md p-4 text-right">
                <h3 className="font-semibold text-slate-700 mb-1">משוב</h3>
                <p className="text-slate-600">{existingSubmission.feedback}</p>
              </div>
            )}
          </div>
        )}

        {/* Just submitted */}
        {submitted && !existingSubmission && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center space-y-3">
            <span className="text-3xl">✅</span>
            <h2 className="text-xl font-bold text-green-800">
              המטלה הוגשה בהצלחה!
            </h2>
            <p className="text-green-700">
              תודה {student.name}, התשובות שלך נשמרו.
            </p>
          </div>
        )}

        {/* Submission form */}
        {!submitted && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <label
                htmlFor="answers"
                className="block font-semibold text-slate-700 mb-2"
              >
                התשובה שלך
              </label>
              <textarea
                id="answers"
                value={answers}
                onChange={(e) => setAnswers(e.target.value)}
                placeholder="הכנס את התשובה שלך כאן..."
                className="w-full min-h-[200px] rounded-md border border-slate-300 px-4 py-3 text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !answers.trim()}
              className="w-full rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? "שולח..." : "הגש מטלה"}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
