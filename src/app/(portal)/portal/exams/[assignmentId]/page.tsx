"use client";

import { useEffect, useMemo, useRef, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Question {
  id: string;
  questionText: string;
  questionType: "open" | "multiple_choice" | "true_false" | "fill_in_the_blank";
  points: number;
  options: Array<{ id?: string; text?: string }> | null;
  sortOrder: number;
}

interface Submission {
  id: string;
  startedAt: string | null;
  submittedAt: string | null;
  answers: Array<{ questionId: string; answer: string }> | null;
  grade: number | null;
  maxGrade: number | null;
  gradingStatus: string;
  aiOverallEval: string | null;
  aiPerQuestion: Array<{ questionId: string; score: number; max: number; feedback?: string }> | null;
  teacherFeedback: string | null;
}

interface Assignment {
  id: string;
  attempt: number;
  deadline: string | null;
  template: {
    id: string;
    title: string;
    description: string | null;
    instructions: string | null;
    timeLimit: number | null;
    questions: Question[];
    course: { fullNameMoodle: string | null; fullNameOverride: string | null } | null;
  };
  submission: Submission | null;
}

export default function PortalExamTakePage({ params }: { params: Promise<{ assignmentId: string }> }) {
  const { assignmentId } = use(params);
  const router = useRouter();

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [now, setNow] = useState(Date.now());
  const startedRef = useRef(false);

  // Load assignment
  useEffect(() => {
    fetch(`/api/portal/exams/${assignmentId}`)
      .then(r => {
        if (r.status === 401) { router.push("/portal"); return null; }
        if (r.status === 404) { setError("מבחן לא נמצא"); return null; }
        return r.json();
      })
      .then(data => {
        if (data?.assignment) {
          setAssignment(data.assignment);
          // pre-fill if submission exists
          if (data.assignment.submission?.answers) {
            const map: Record<string, string> = {};
            for (const a of data.assignment.submission.answers) map[a.questionId] = a.answer;
            setAnswers(map);
          }
        }
      })
      .finally(() => setLoading(false));
  }, [assignmentId, router]);

  // Auto-start: when student opens exam, register startedAt
  useEffect(() => {
    if (!assignment || startedRef.current) return;
    if (assignment.submission?.submittedAt) return; // already submitted
    if (assignment.submission?.startedAt) { startedRef.current = true; return; }

    startedRef.current = true;
    fetch(`/api/portal/exams/${assignmentId}/start`, { method: "POST" })
      .then(r => r.json())
      .then(data => {
        if (data?.startedAt && assignment) {
          setAssignment({
            ...assignment,
            submission: {
              ...(assignment.submission || {} as Submission),
              id: data.submissionId,
              startedAt: data.startedAt,
              submittedAt: null,
              answers: null,
              grade: null,
              maxGrade: null,
              gradingStatus: "pending",
              aiOverallEval: null,
              aiPerQuestion: null,
              teacherFeedback: null,
            },
          });
        }
      });
  }, [assignment, assignmentId]);

  // Timer tick
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Compute remaining time
  const timeRemaining = useMemo(() => {
    if (!assignment?.template?.timeLimit || !assignment.submission?.startedAt) return null;
    const start = new Date(assignment.submission.startedAt).getTime();
    const end = start + assignment.template.timeLimit * 60 * 1000;
    return Math.max(0, end - now);
  }, [assignment, now]);

  const isReadOnly = !!assignment?.submission?.submittedAt;
  const isExpired =
    timeRemaining === 0 ||
    (assignment?.deadline && new Date(assignment.deadline) < new Date() && !isReadOnly);

  const handleSubmit = async () => {
    if (!assignment) return;
    if (!confirm("להגיש את המבחן? לא ניתן יהיה לשנות תשובות לאחר ההגשה.")) return;

    setSubmitting(true);
    try {
      const payload = {
        answers: Object.entries(answers).map(([questionId, answer]) => ({ questionId, answer })),
      };
      const res = await fetch(`/api/portal/exams/${assignmentId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "שגיאה בהגשה");
        return;
      }
      // Refresh
      router.push(`/portal/exams/${assignmentId}?submitted=1`);
      setTimeout(() => location.reload(), 100);
    } finally {
      setSubmitting(false);
    }
  };

  // Auto-submit when timer expires
  useEffect(() => {
    if (timeRemaining === 0 && !isReadOnly && !submitting && assignment?.submission?.startedAt) {
      handleSubmit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRemaining, isReadOnly, submitting]);

  if (loading) return <FullPage>טוען מבחן...</FullPage>;
  if (error) return <FullPage>{error}</FullPage>;
  if (!assignment) return null;

  const submission = assignment.submission;
  const showResults = isReadOnly && submission?.gradingStatus !== "pending";

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      {/* Sticky header */}
      <header className="sticky top-0 z-30 bg-blue-900 text-white shadow-md">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <Link href="/portal/exams" className="text-sm hover:opacity-80">← חזרה</Link>
          <div className="flex-1 text-center min-w-0">
            <h1 className="font-bold text-sm sm:text-base truncate">{assignment.template.title}</h1>
          </div>
          {timeRemaining !== null && !isReadOnly && (
            <div className={`text-sm font-mono px-3 py-1 rounded ${timeRemaining < 60000 ? "bg-red-500" : "bg-blue-700"}`}>
              {formatTime(timeRemaining)}
            </div>
          )}
          {isReadOnly && (
            <span className="text-xs px-2 py-1 bg-green-500 rounded">הוגש</span>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-5 pb-32">
        {/* Description */}
        {(assignment.template.description || assignment.template.instructions) && (
          <div className="bg-white rounded-xl border p-5 space-y-2">
            {assignment.template.description && (
              <p className="text-sm text-gray-700">{assignment.template.description}</p>
            )}
            {assignment.template.instructions && (
              <p className="text-xs text-gray-500 whitespace-pre-wrap">{assignment.template.instructions}</p>
            )}
          </div>
        )}

        {/* Result banner */}
        {showResults && submission && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-5 space-y-3">
            <h2 className="font-bold text-green-800">המבחן הוגש ונבדק</h2>
            {submission.grade !== null && submission.maxGrade && (
              <div className="text-3xl font-bold text-green-900">
                {Math.round(submission.grade)} / {submission.maxGrade}
              </div>
            )}
            {submission.aiOverallEval && (
              <div className="text-sm text-gray-700 whitespace-pre-wrap border-t border-green-200 pt-3">
                <p className="font-medium text-green-800 mb-1">משוב AI:</p>
                {submission.aiOverallEval}
              </div>
            )}
            {submission.teacherFeedback && (
              <div className="text-sm text-gray-700 whitespace-pre-wrap border-t border-green-200 pt-3">
                <p className="font-medium text-green-800 mb-1">משוב המורה:</p>
                {submission.teacherFeedback}
              </div>
            )}
          </div>
        )}

        {isReadOnly && submission?.gradingStatus === "pending" && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 text-blue-800 text-sm">
            המבחן הוגש. הציון יעודכן כאן לאחר הבדיקה.
          </div>
        )}

        {/* Questions */}
        <div className="space-y-4">
          {assignment.template.questions.map((q, i) => {
            const perQ = submission?.aiPerQuestion?.find(x => x.questionId === q.id);
            return (
              <div key={q.id} className="bg-white rounded-xl border p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-semibold text-gray-900 whitespace-pre-wrap flex-1">
                    <span className="text-blue-600">{i + 1}.</span> {q.questionText}
                  </p>
                  <span className="text-xs text-gray-500 whitespace-nowrap">{q.points} נק'</span>
                </div>

                <QuestionInput
                  question={q}
                  value={answers[q.id] || ""}
                  onChange={v => setAnswers(prev => ({ ...prev, [q.id]: v }))}
                  disabled={isReadOnly || !!isExpired}
                />

                {showResults && perQ && (
                  <div className="border-t pt-3 mt-3 text-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">ציון לשאלה:</span>
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        perQ.score === perQ.max ? "bg-green-100 text-green-700" :
                        perQ.score === 0 ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"
                      }`}>
                        {perQ.score} / {perQ.max}
                      </span>
                    </div>
                    {perQ.feedback && (
                      <p className="text-xs text-gray-600 whitespace-pre-wrap">{perQ.feedback}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>

      {/* Submit button — sticky bottom */}
      {!isReadOnly && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 z-30">
          <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
            <p className="text-xs text-gray-500">
              {Object.keys(answers).length} / {assignment.template.questions.length} שאלות נענו
            </p>
            <button
              onClick={handleSubmit}
              disabled={submitting || !!isExpired}
              className="px-6 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
            >
              {submitting ? "מגיש..." : "הגש מבחן"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function QuestionInput({ question, value, onChange, disabled }: {
  question: Question;
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
}) {
  if (question.questionType === "multiple_choice" && Array.isArray(question.options)) {
    return (
      <div className="space-y-2">
        {question.options.map((opt, i) => {
          const optValue = opt.id || opt.text || "";
          const isSelected = value === optValue;
          return (
            <label key={i} className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition ${
              isSelected ? "bg-blue-50 border-blue-400" : "hover:bg-slate-50"
            } ${disabled ? "opacity-70 cursor-not-allowed" : ""}`}>
              <input
                type="radio"
                name={`q-${question.id}`}
                value={optValue}
                checked={isSelected}
                onChange={() => onChange(optValue)}
                disabled={disabled}
              />
              <span className="text-sm">{opt.text}</span>
            </label>
          );
        })}
      </div>
    );
  }

  if (question.questionType === "true_false") {
    return (
      <div className="flex gap-2">
        {[
          { v: "true", label: "נכון" },
          { v: "false", label: "לא נכון" },
        ].map(opt => (
          <button
            key={opt.v}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt.v)}
            className={`flex-1 p-3 border rounded-lg text-sm transition ${
              value === opt.v ? "bg-blue-50 border-blue-400 text-blue-700 font-medium" : "hover:bg-slate-50"
            } ${disabled ? "opacity-70 cursor-not-allowed" : ""}`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    );
  }

  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
      rows={4}
      className="w-full border rounded-lg p-3 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
      placeholder="הקלד את תשובתך כאן..."
    />
  );
}

function FullPage({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 text-gray-600" dir="rtl">
      {children}
    </div>
  );
}

function formatTime(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
