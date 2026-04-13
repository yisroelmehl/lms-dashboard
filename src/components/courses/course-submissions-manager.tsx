"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Submission {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  answers: Record<string, string>;
  grade: number | null;
  feedback: string | null;
  submittedAt: string;
  gradedAt: string | null;
}

interface QuizQuestion {
  id: string;
  type: "multiple_choice" | "open_ended";
  question: string;
  options?: string[];
  correctAnswer?: number;
  rubric?: string;
}

interface SyllabusItemWithQuiz {
  id: string;
  title: string;
  type: string;
  quizData: { title: string; questions: QuizQuestion[] } | null;
  maxScore: number | null;
  publishedToMoodle: boolean;
}

export function CourseSubmissionsManager({
  courseId,
  syllabusItems,
}: {
  courseId: string;
  syllabusItems: SyllabusItemWithQuiz[];
}) {
  const examItems = syllabusItems.filter(
    (i) => (i.type === "exam" || i.type === "assignment" || i.type === "quiz") && i.publishedToMoodle
  );

  const [selectedItemId, setSelectedItemId] = useState<string>(examItems[0]?.id || "");
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(false);
  const [gradingId, setGradingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [aiGrading, setAiGrading] = useState<Record<string, { loading: boolean; result?: { score: number; feedback: string } }>>({});

  const selectedItem = syllabusItems.find((i) => i.id === selectedItemId);
  const questions: QuizQuestion[] = selectedItem?.quizData?.questions || [];

  useEffect(() => {
    if (!selectedItemId) return;
    setLoading(true);
    fetch(`/api/assignments/${selectedItemId}/submissions`)
      .then((r) => r.json())
      .then((data) => {
        setSubmissions(data);
        setExpandedId(null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedItemId]);

  function getAutoGrade(answers: Record<string, string>): { correct: number; total: number; score: number } {
    let correct = 0;
    let total = 0;
    for (const q of questions) {
      if (q.type === "multiple_choice") {
        total++;
        if (parseInt(answers[q.id] ?? "") === q.correctAnswer) correct++;
      }
    }
    return { correct, total, score: total > 0 ? Math.round((correct / total) * 100) : 0 };
  }

  async function handleGradeSubmit(submissionId: string, grade: number, feedback: string) {
    try {
      const res = await fetch(`/api/assignments/${selectedItemId}/submissions`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId, grade, feedback }),
      });
      if (res.ok) {
        setSubmissions((prev) =>
          prev.map((s) =>
            s.id === submissionId
              ? { ...s, grade, feedback, gradedAt: new Date().toISOString() }
              : s
          )
        );
        setGradingId(null);
      }
    } catch {}
  }

  async function handleAiGrade(submissionId: string, questionId: string) {
    const key = `${submissionId}_${questionId}`;
    setAiGrading((prev) => ({ ...prev, [key]: { loading: true } }));
    try {
      const res = await fetch("/api/ai/grade-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId, questionId }),
      });
      const data = await res.json();
      if (data.success) {
        setAiGrading((prev) => ({
          ...prev,
          [key]: { loading: false, result: { score: data.score, feedback: data.feedback } },
        }));
      } else {
        setAiGrading((prev) => ({ ...prev, [key]: { loading: false } }));
      }
    } catch {
      setAiGrading((prev) => ({ ...prev, [key]: { loading: false } }));
    }
  }

  async function handleAiGradeAll(submissionId: string) {
    const openQuestions = questions.filter((q) => q.type === "open_ended");
    for (const q of openQuestions) {
      await handleAiGrade(submissionId, q.id);
    }
  }

  function calculateFinalGrade(sub: Submission): number | null {
    const mcGrade = getAutoGrade(sub.answers);
    const openQuestions = questions.filter((q) => q.type === "open_ended");
    
    // Check if all open questions have AI grades
    const openGrades: number[] = [];
    for (const q of openQuestions) {
      const key = `${sub.id}_${q.id}`;
      if (aiGrading[key]?.result) {
        openGrades.push(aiGrading[key].result!.score);
      }
    }

    if (openQuestions.length > 0 && openGrades.length < openQuestions.length) {
      return null; // Not all graded yet
    }

    const totalQuestions = questions.length;
    if (totalQuestions === 0) return null;

    const mcCount = questions.filter((q) => q.type === "multiple_choice").length;
    const openCount = openQuestions.length;

    // Weighted average: each question has equal weight
    const mcTotal = mcGrade.correct * (100 / totalQuestions) * mcCount / (mcCount || 1);
    const openTotal = openGrades.length > 0
      ? openGrades.reduce((a, b) => a + b, 0) / openGrades.length * (openCount / totalQuestions)
      : 0;
    
    // Simpler: per-question scoring
    let totalScore = 0;
    for (const q of questions) {
      if (q.type === "multiple_choice") {
        if (parseInt(sub.answers[q.id] ?? "") === q.correctAnswer) {
          totalScore += 100;
        }
      } else {
        const key = `${sub.id}_${q.id}`;
        if (aiGrading[key]?.result) {
          totalScore += aiGrading[key].result!.score;
        }
      }
    }

    return Math.round(totalScore / totalQuestions);
  }

  if (examItems.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold mb-2">📋 הגשות מבחנים ומטלות</h2>
        <p className="text-sm text-muted-foreground">אין מטלות או מבחנים שפורסמו בקורס זה</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h2 className="text-lg font-semibold mb-4">📋 הגשות מבחנים ומטלות</h2>

      {/* Item selector */}
      <div className="flex items-center gap-3 mb-4">
        <label className="text-sm text-muted-foreground">בחר מטלה:</label>
        <select
          value={selectedItemId}
          onChange={(e) => setSelectedItemId(e.target.value)}
          className="border rounded-md px-3 py-1.5 text-sm bg-white"
        >
          {examItems.map((item) => (
            <option key={item.id} value={item.id}>
              {item.title} ({item.type === "exam" ? "מבחן" : item.type === "quiz" ? "חידון" : "מטלה"})
              {item.quizData ? " — חידון AI" : ""}
            </option>
          ))}
        </select>
        <span className="text-xs text-slate-500">
          {submissions.length} הגשות
        </span>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground py-4 text-center">טוען הגשות...</p>
      ) : submissions.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">אין הגשות למטלה זו</p>
      ) : (
        <div className="space-y-2">
          {/* Summary stats */}
          <div className="flex gap-4 mb-3 text-sm">
            <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full">
              {submissions.length} הגשות
            </span>
            <span className="bg-green-50 text-green-700 px-3 py-1 rounded-full">
              {submissions.filter((s) => s.grade != null).length} נבדקו
            </span>
            <span className="bg-amber-50 text-amber-700 px-3 py-1 rounded-full">
              {submissions.filter((s) => s.grade == null).length} ממתינות
            </span>
            {submissions.filter((s) => s.grade != null).length > 0 && (
              <span className="bg-purple-50 text-purple-700 px-3 py-1 rounded-full">
                ממוצע: {Math.round(
                  submissions.filter((s) => s.grade != null).reduce((sum, s) => sum + (s.grade || 0), 0) /
                  submissions.filter((s) => s.grade != null).length
                )}
              </span>
            )}
          </div>

          {/* Submissions table */}
          <table className="w-full">
            <thead>
              <tr className="border-b text-xs text-muted-foreground">
                <th className="px-3 py-2 text-right">תלמיד</th>
                <th className="px-3 py-2 text-right">תאריך הגשה</th>
                {questions.length > 0 && <th className="px-3 py-2 text-right">אמריקאיות</th>}
                <th className="px-3 py-2 text-right">ציון</th>
                <th className="px-3 py-2 text-right">סטטוס</th>
                <th className="px-3 py-2 text-right">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((sub) => {
                const mcGrade = questions.length > 0 ? getAutoGrade(sub.answers) : null;
                const isExpanded = expandedId === sub.id;
                return (
                  <>
                    <tr key={sub.id} className="border-b hover:bg-slate-50 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : sub.id)}>
                      <td className="px-3 py-2">
                        <Link href={`/students/${sub.studentId}`} className="text-sm font-medium text-blue-600 hover:underline" onClick={(e) => e.stopPropagation()}>
                          {sub.studentName}
                        </Link>
                      </td>
                      <td className="px-3 py-2 text-sm text-slate-600">
                        {new Date(sub.submittedAt).toLocaleString("he-IL")}
                      </td>
                      {questions.length > 0 && (
                        <td className="px-3 py-2 text-sm">
                          {mcGrade && mcGrade.total > 0
                            ? <span className={mcGrade.score >= 60 ? "text-green-700" : "text-red-600"}>{mcGrade.correct}/{mcGrade.total} ({mcGrade.score})</span>
                            : "—"}
                        </td>
                      )}
                      <td className="px-3 py-2 text-sm font-semibold">
                        {sub.grade != null ? sub.grade : "—"}
                      </td>
                      <td className="px-3 py-2">
                        {sub.grade != null ? (
                          <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full">נבדק</span>
                        ) : (
                          <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">ממתין</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); setExpandedId(isExpanded ? null : sub.id); }}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          {isExpanded ? "סגור" : "צפה"}
                        </button>
                      </td>
                    </tr>

                    {/* Expanded row — show answers */}
                    {isExpanded && (
                      <tr key={`${sub.id}-expanded`}>
                        <td colSpan={6} className="bg-slate-50 p-4">
                          <SubmissionDetail
                            submission={sub}
                            questions={questions}
                            aiGrading={aiGrading}
                            onAiGrade={(qId) => handleAiGrade(sub.id, qId)}
                            onAiGradeAll={() => handleAiGradeAll(sub.id)}
                            onSaveGrade={(grade, feedback) => handleGradeSubmit(sub.id, grade, feedback)}
                            calculatedGrade={calculateFinalGrade(sub)}
                          />
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SubmissionDetail({
  submission,
  questions,
  aiGrading,
  onAiGrade,
  onAiGradeAll,
  onSaveGrade,
  calculatedGrade,
}: {
  submission: Submission;
  questions: QuizQuestion[];
  aiGrading: Record<string, { loading: boolean; result?: { score: number; feedback: string } }>;
  onAiGrade: (questionId: string) => void;
  onAiGradeAll: () => void;
  onSaveGrade: (grade: number, feedback: string) => void;
  calculatedGrade: number | null;
}) {
  const [manualGrade, setManualGrade] = useState(submission.grade?.toString() || calculatedGrade?.toString() || "");
  const [manualFeedback, setManualFeedback] = useState(submission.feedback || "");
  const [saving, setSaving] = useState(false);

  const hasOpenQuestions = questions.some((q) => q.type === "open_ended");

  // Update manual grade when AI grades complete
  useEffect(() => {
    if (calculatedGrade != null && !submission.grade) {
      setManualGrade(calculatedGrade.toString());
    }
  }, [calculatedGrade, submission.grade]);

  async function handleSave() {
    const grade = parseFloat(manualGrade);
    if (isNaN(grade)) return;
    setSaving(true);
    await onSaveGrade(grade, manualFeedback);
    setSaving(false);
  }

  return (
    <div className="space-y-4">
      {/* Quiz answers */}
      {questions.length > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm">תשובות התלמיד</h4>
            {hasOpenQuestions && (
              <button
                onClick={onAiGradeAll}
                className="bg-indigo-600 text-white text-xs px-3 py-1.5 rounded-md hover:bg-indigo-700"
              >
                🤖 בדוק שאלות פתוחות עם AI
              </button>
            )}
          </div>
          {questions.map((q, i) => {
            const answer = submission.answers[q.id];
            const aiKey = `${submission.id}_${q.id}`;
            const aiResult = aiGrading[aiKey];
            const isCorrectMC = q.type === "multiple_choice" && parseInt(answer ?? "") === q.correctAnswer;

            return (
              <div key={q.id} className={`border rounded-md p-3 ${
                q.type === "multiple_choice"
                  ? isCorrectMC ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
                  : "border-slate-200 bg-white"
              }`}>
                <div className="flex items-start gap-2 mb-1">
                  <span className="font-mono text-xs bg-slate-200 px-1.5 py-0.5 rounded">{i + 1}</span>
                  <span className="text-xs px-1.5 py-0.5 rounded" style={{
                    background: q.type === "multiple_choice" ? "#dbeafe" : "#fef3c7",
                    color: q.type === "multiple_choice" ? "#1d4ed8" : "#92400e",
                  }}>
                    {q.type === "multiple_choice" ? "אמריקאית" : "פתוחה"}
                  </span>
                  {q.type === "multiple_choice" && (
                    <span className={`text-xs font-bold ${isCorrectMC ? "text-green-600" : "text-red-600"}`}>
                      {isCorrectMC ? "✓ נכון" : "✗ שגוי"}
                    </span>
                  )}
                </div>
                <p className="text-sm font-medium mb-2">{q.question}</p>

                {q.type === "multiple_choice" && q.options && (
                  <div className="space-y-1">
                    {q.options.map((opt, j) => {
                      const isChosen = parseInt(answer ?? "") === j;
                      const isRight = j === q.correctAnswer;
                      return (
                        <div key={j} className={`text-xs px-2 py-1 rounded ${
                          isRight ? "bg-green-100 text-green-800 font-medium" :
                          isChosen ? "bg-red-100 text-red-700" :
                          "text-slate-600"
                        }`}>
                          {String.fromCharCode(1488 + j)}. {opt}
                          {isRight && " ✓"}
                          {isChosen && !isRight && " ← תשובת התלמיד"}
                        </div>
                      );
                    })}
                  </div>
                )}

                {q.type === "open_ended" && (
                  <div>
                    <div className="bg-slate-100 rounded p-2 text-sm mb-2">
                      {answer || <span className="text-slate-400">לא ענה</span>}
                    </div>
                    {aiResult?.loading ? (
                      <div className="flex items-center gap-2 text-xs text-indigo-600">
                        <span className="inline-block w-3 h-3 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
                        AI בודק...
                      </div>
                    ) : aiResult?.result ? (
                      <div className="border border-indigo-200 bg-indigo-50 rounded p-2">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-indigo-800">ציון AI: {aiResult.result.score}/100</span>
                        </div>
                        <p className="text-xs text-indigo-700">{aiResult.result.feedback}</p>
                      </div>
                    ) : (
                      <button
                        onClick={() => onAiGrade(q.id)}
                        className="text-xs text-indigo-600 hover:underline"
                      >
                        🤖 בדוק עם AI
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Legacy text answer */
        <div>
          <h4 className="font-semibold text-sm mb-2">תשובת התלמיד</h4>
          <div className="bg-slate-100 rounded p-3 text-sm whitespace-pre-wrap">
            {submission.answers?.text || JSON.stringify(submission.answers)}
          </div>
        </div>
      )}

      {/* Grade form */}
      <div className="border-t pt-3 flex items-end gap-3">
        <div>
          <label className="text-xs text-slate-500 block mb-1">ציון סופי</label>
          <input
            type="number"
            min={0}
            max={100}
            value={manualGrade}
            onChange={(e) => setManualGrade(e.target.value)}
            className="border rounded px-2 py-1 text-sm w-20"
          />
        </div>
        <div className="flex-1">
          <label className="text-xs text-slate-500 block mb-1">משוב</label>
          <input
            type="text"
            value={manualFeedback}
            onChange={(e) => setManualFeedback(e.target.value)}
            placeholder="כתוב משוב לתלמיד..."
            className="border rounded px-2 py-1 text-sm w-full"
          />
        </div>
        <button
          onClick={handleSave}
          disabled={saving || !manualGrade}
          className="bg-green-600 text-white text-sm px-4 py-1.5 rounded hover:bg-green-700 disabled:opacity-50"
        >
          {saving ? "שומר..." : "💾 שמור ציון"}
        </button>
      </div>
    </div>
  );
}
