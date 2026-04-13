"use client";

import { useState } from "react";

interface QuizQuestion {
  id: string;
  type: "multiple_choice" | "open_ended";
  question: string;
  options?: string[];
  correctAnswer?: number;
}

interface Props {
  syllabusItem: {
    id: string;
    title: string;
    description: string | null;
    type: string;
    maxScore: number | null;
    courseId: string;
    courseName: string;
    quizData: {
      title: string;
      questions: QuizQuestion[];
    } | null;
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
  const questions = syllabusItem.quizData?.questions || [];
  const hasQuiz = questions.length > 0;

  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    if (existingSubmission?.answers && typeof existingSubmission.answers === "object") {
      const existing: Record<string, string> = {};
      for (const [k, v] of Object.entries(existingSubmission.answers)) {
        existing[k] = String(v ?? "");
      }
      return existing;
    }
    return {};
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(!!existingSubmission);
  const [error, setError] = useState<string | null>(null);
  const [autoGrade, setAutoGrade] = useState<{ score: number; correct: number; total: number } | null>(null);

  const typeLabel =
    syllabusItem.type === "exam" ? "מבחן" :
    syllabusItem.type === "assignment" ? "מטלה" :
    syllabusItem.type === "quiz" ? "חידון" : syllabusItem.type;

  function setAnswer(questionId: string, value: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  function calculateAutoGrade(): { score: number; correct: number; total: number } {
    let correct = 0;
    let totalMc = 0;
    for (const q of questions) {
      if (q.type === "multiple_choice") {
        totalMc++;
        const studentAnswer = parseInt(answers[q.id] ?? "");
        if (studentAnswer === q.correctAnswer) correct++;
      }
    }
    const score = totalMc > 0 ? Math.round((correct / totalMc) * 100) : 0;
    return { score, correct, total: totalMc };
  }

  function isCorrect(q: QuizQuestion): boolean | null {
    if (q.type !== "multiple_choice" || q.correctAnswer == null) return null;
    return parseInt(answers[q.id] ?? "") === q.correctAnswer;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (hasQuiz) {
      for (const q of questions) {
        if (!answers[q.id] && answers[q.id] !== "0") {
          setError(`יש לענות על כל השאלות לפני ההגשה (שאלה ${questions.indexOf(q) + 1})`);
          return;
        }
      }
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/assignments/${syllabusItem.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: student.id,
          courseId: syllabusItem.courseId,
          answers: hasQuiz ? answers : { text: answers["text"] || "" },
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "שגיאה בשליחת המטלה");
      }

      if (hasQuiz) {
        const grade = calculateAutoGrade();
        setAutoGrade(grade);
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
              {typeLabel}: {syllabusItem.quizData?.title || syllabusItem.title}
            </h1>
            <p className="text-sm text-slate-500">{syllabusItem.courseName}</p>
          </div>
          <div className="text-left text-sm text-slate-500">
            <p className="font-medium text-slate-700">{student.name}</p>
            <p>{student.email}</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-6">
        {/* Description */}
        {syllabusItem.description && (
          <div className="bg-white rounded-lg border border-slate-200 p-6 mb-6">
            <h2 className="font-semibold text-slate-700 mb-2">הנחיות</h2>
            <div className="text-slate-600 text-sm whitespace-pre-wrap">{syllabusItem.description}</div>
          </div>
        )}

        {/* Already submitted — show results */}
        {submitted && (
          <div className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center space-y-3">
              <span className="text-4xl">✅</span>
              <h2 className="text-xl font-bold text-green-800">ה{typeLabel} הוגש בהצלחה!</h2>

              {existingSubmission?.submittedAt && (
                <p className="text-green-700 text-sm">
                  הוגש ב-{new Date(existingSubmission.submittedAt).toLocaleString("he-IL")}
                </p>
              )}

              {autoGrade && autoGrade.total > 0 && (
                <div className="bg-white rounded-lg p-4 inline-block mx-auto">
                  <p className="text-3xl font-bold text-slate-800">{autoGrade.score}</p>
                  <p className="text-sm text-slate-500">
                    {autoGrade.correct} מתוך {autoGrade.total} שאלות אמריקאיות נכונות
                  </p>
                </div>
              )}

              {existingSubmission?.grade != null && (
                <p className="text-lg font-semibold text-green-800">
                  ציון: {existingSubmission.grade}
                  {syllabusItem.maxScore ? ` / ${syllabusItem.maxScore}` : ""}
                </p>
              )}

              {existingSubmission?.feedback && (
                <div className="mt-4 bg-white rounded-md p-4 text-right">
                  <h3 className="font-semibold text-slate-700 mb-1">משוב</h3>
                  <p className="text-slate-600 whitespace-pre-wrap">{existingSubmission.feedback}</p>
                </div>
              )}
            </div>

            {/* Review — show answers with correct/wrong */}
            {hasQuiz && (
              <div className="space-y-4">
                <h3 className="font-semibold text-slate-700">סקירת תשובות</h3>
                {questions.map((q, i) => {
                  const correct = isCorrect(q);
                  return (
                    <div key={q.id} className={`border rounded-lg p-4 ${
                      correct === true ? "border-green-300 bg-green-50" :
                      correct === false ? "border-red-300 bg-red-50" :
                      "border-slate-200 bg-white"
                    }`}>
                      <div className="flex items-start gap-2 mb-2">
                        <span className="text-sm font-mono bg-slate-200 px-2 py-0.5 rounded">{i + 1}</span>
                        {correct === true && <span className="text-green-600 font-bold">✓</span>}
                        {correct === false && <span className="text-red-600 font-bold">✗</span>}
                      </div>
                      <p className="font-medium text-sm mb-2">{q.question}</p>

                      {q.type === "multiple_choice" && q.options && (
                        <ul className="space-y-1">
                          {q.options.map((opt, j) => {
                            const isStudentChoice = parseInt(answers[q.id] ?? "") === j;
                            const isRightAnswer = j === q.correctAnswer;
                            return (
                              <li key={j} className={`text-sm px-3 py-1.5 rounded ${
                                isRightAnswer ? "bg-green-100 text-green-800 font-medium" :
                                isStudentChoice ? "bg-red-100 text-red-700" :
                                "text-slate-600"
                              }`}>
                                {String.fromCharCode(1488 + j)}. {opt}
                                {isRightAnswer && " ✓"}
                                {isStudentChoice && !isRightAnswer && " (בחרת)"}
                              </li>
                            );
                          })}
                        </ul>
                      )}

                      {q.type === "open_ended" && (
                        <div className="bg-slate-50 rounded-md p-3 text-sm text-slate-700 mt-2">
                          <strong>תשובתך:</strong> {answers[q.id] || "—"}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Quiz form — not yet submitted */}
        {!submitted && hasQuiz && (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="flex items-center gap-3 text-sm text-slate-500 mb-2">
              <span>{questions.length} שאלות</span>
              {syllabusItem.maxScore && <span>ניקוד מקסימלי: {syllabusItem.maxScore}</span>}
            </div>

            {questions.map((q, i) => (
              <div key={q.id} className="bg-white rounded-lg border border-slate-200 p-5">
                <div className="flex items-start gap-2 mb-3">
                  <span className="text-sm font-mono bg-slate-200 text-slate-700 px-2 py-0.5 rounded">{i + 1}</span>
                  <span className="text-xs px-2 py-0.5 rounded font-medium" style={{
                    background: q.type === "multiple_choice" ? "#dbeafe" : "#fef3c7",
                    color: q.type === "multiple_choice" ? "#1d4ed8" : "#92400e",
                  }}>
                    {q.type === "multiple_choice" ? "אמריקאית" : "פתוחה"}
                  </span>
                </div>
                <p className="font-medium text-slate-800 mb-3">{q.question}</p>

                {q.type === "multiple_choice" && q.options && (
                  <div className="space-y-2">
                    {q.options.map((opt, j) => (
                      <label
                        key={j}
                        className={`flex items-center gap-3 p-3 rounded-md border cursor-pointer transition-colors ${
                          answers[q.id] === String(j)
                            ? "border-blue-500 bg-blue-50"
                            : "border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <input
                          type="radio"
                          name={q.id}
                          value={j}
                          checked={answers[q.id] === String(j)}
                          onChange={(e) => setAnswer(q.id, e.target.value)}
                          className="accent-blue-600"
                        />
                        <span className="text-sm">{String.fromCharCode(1488 + j)}. {opt}</span>
                      </label>
                    ))}
                  </div>
                )}

                {q.type === "open_ended" && (
                  <textarea
                    value={answers[q.id] || ""}
                    onChange={(e) => setAnswer(q.id, e.target.value)}
                    rows={4}
                    placeholder="כתוב כאן את תשובתך..."
                    className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                )}
              </div>
            ))}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="flex justify-center pt-4">
              <button
                type="submit"
                disabled={submitting}
                className="bg-blue-600 text-white px-8 py-3 rounded-lg text-sm font-bold hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    שולח...
                  </>
                ) : (
                  "📨 הגש תשובות"
                )}
              </button>
            </div>
          </form>
        )}

        {/* Fallback — no quiz data, plain textarea (legacy) */}
        {!submitted && !hasQuiz && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-white rounded-lg border border-slate-200 p-5">
              <label className="block font-medium text-sm text-slate-700 mb-2">תשובתך</label>
              <textarea
                value={answers["text"] || ""}
                onChange={(e) => setAnswer("text", e.target.value)}
                rows={8}
                placeholder="כתוב כאן את תשובתך..."
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm resize-none"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="flex justify-center">
              <button
                type="submit"
                disabled={submitting || !answers["text"]?.trim()}
                className="bg-blue-600 text-white px-8 py-3 rounded-lg text-sm font-bold hover:bg-blue-700 disabled:bg-slate-300"
              >
                {submitting ? "שולח..." : "📨 הגש תשובות"}
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
